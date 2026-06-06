-- ============================================
-- LetsSplit Database Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. USERS TABLE (extends auth.users)
-- ============================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  upi_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 2. GROUPS TABLE
-- ============================================
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  currency TEXT DEFAULT 'INR' NOT NULL,
  icon_url TEXT,
  invite_code TEXT UNIQUE DEFAULT substr(replace(encode(gen_random_bytes(6), 'base64'), '/', ''), 1, 8),
  invite_expires_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_groups_invite_code ON public.groups(invite_code);
CREATE INDEX idx_groups_created_by ON public.groups(created_by);

-- ============================================
-- 3. GROUP MEMBERS TABLE
-- ============================================
CREATE TABLE public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  is_ghost BOOLEAN DEFAULT false NOT NULL,
  ghost_name TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  added_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  -- Ghost must have a name, real user must have user_id
  CONSTRAINT ghost_name_required CHECK (
    (is_ghost = true AND ghost_name IS NOT NULL) OR
    (is_ghost = false AND user_id IS NOT NULL)
  )
);

-- Unique constraint: one real user per group
CREATE UNIQUE INDEX idx_group_members_unique_user
  ON public.group_members(group_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX idx_group_members_user_id ON public.group_members(user_id);

-- ============================================
-- 4. EXPENSES TABLE
-- ============================================
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount > 0),
  currency TEXT NOT NULL DEFAULT 'INR',
  split_type TEXT NOT NULL DEFAULT 'equal' CHECK (split_type IN ('equal', 'exact', 'percentage', 'shares', 'itemized')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url TEXT,
  created_by UUID NOT NULL REFERENCES public.group_members(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  is_deleted BOOLEAN DEFAULT false NOT NULL
);

CREATE INDEX idx_expenses_group_id ON public.expenses(group_id);
CREATE INDEX idx_expenses_created_by ON public.expenses(created_by);
CREATE INDEX idx_expenses_date ON public.expenses(date);

-- ============================================
-- 5. EXPENSE PAYERS TABLE (multi-payer support)
-- ============================================
CREATE TABLE public.expense_payers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.group_members(id) ON DELETE RESTRICT,
  amount_paid NUMERIC(12,2) NOT NULL CHECK (amount_paid > 0)
);

CREATE INDEX idx_expense_payers_expense_id ON public.expense_payers(expense_id);

-- ============================================
-- 6. EXPENSE ITEMS TABLE (itemized receipts)
-- ============================================
CREATE TABLE public.expense_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  is_shared BOOLEAN DEFAULT false NOT NULL
);

CREATE INDEX idx_expense_items_expense_id ON public.expense_items(expense_id);

-- ============================================
-- 7. EXPENSE SPLITS TABLE
-- ============================================
CREATE TABLE public.expense_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.expense_items(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.group_members(id) ON DELETE RESTRICT,
  amount_owed NUMERIC(12,2) NOT NULL CHECK (amount_owed >= 0),
  percentage NUMERIC(5,2),
  shares INTEGER
);

CREATE INDEX idx_expense_splits_expense_id ON public.expense_splits(expense_id);
CREATE INDEX idx_expense_splits_member_id ON public.expense_splits(member_id);

-- ============================================
-- 8. SETTLEMENTS TABLE
-- ============================================
CREATE TABLE public.settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  from_member UUID NOT NULL REFERENCES public.group_members(id) ON DELETE RESTRICT,
  to_member UUID NOT NULL REFERENCES public.group_members(id) ON DELETE RESTRICT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  note TEXT,
  settled_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_by UUID NOT NULL REFERENCES public.group_members(id) ON DELETE RESTRICT,
  CONSTRAINT different_members CHECK (from_member != to_member)
);

CREATE INDEX idx_settlements_group_id ON public.settlements(group_id);
CREATE INDEX idx_settlements_from ON public.settlements(from_member);
CREATE INDEX idx_settlements_to ON public.settlements(to_member);

-- ============================================
-- 9. AUDIT LOGS TABLE (immutable)
-- ============================================
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID REFERENCES public.expenses(id) ON DELETE SET NULL,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted')),
  changed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_audit_logs_group_id ON public.audit_logs(group_id);
CREATE INDEX idx_audit_logs_expense_id ON public.audit_logs(expense_id);

-- ============================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
