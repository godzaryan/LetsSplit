-- ============================================
-- CYLINDER USAGE TRACKING SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS public.cylinder_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  morning BOOLEAN DEFAULT false NOT NULL,
  afternoon BOOLEAN DEFAULT false NOT NULL,
  night BOOLEAN DEFAULT false NOT NULL,
  marked_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(group_id, date) -- Only one usage record per day per group
);

CREATE INDEX IF NOT EXISTS idx_cylinder_usage_group_id ON public.cylinder_usage(group_id);
CREATE INDEX IF NOT EXISTS idx_cylinder_usage_date ON public.cylinder_usage(date);

-- RLS POLICIES
ALTER TABLE public.cylinder_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view cylinder usage in their groups" ON public.cylinder_usage;
CREATE POLICY "Users can view cylinder usage in their groups" ON public.cylinder_usage FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.group_members WHERE group_id = cylinder_usage.group_id AND user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can manage cylinder usage in their groups" ON public.cylinder_usage;
CREATE POLICY "Users can manage cylinder usage in their groups" ON public.cylinder_usage FOR ALL USING (
  EXISTS (SELECT 1 FROM public.group_members WHERE group_id = cylinder_usage.group_id AND user_id = auth.uid())
);
-- ============================================
-- MAID MANAGEMENT SYSTEM
-- ============================================

-- 1. MAIDS TABLE
CREATE TABLE IF NOT EXISTS public.maids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  monthly_salary DECIMAL(10, 2) NOT NULL DEFAULT 0,
  allowed_holidays_per_month INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(group_id) -- One maid profile per group for now
);

CREATE INDEX IF NOT EXISTS idx_maids_group_id ON public.maids(group_id);

-- 2. MAID ATTENDANCE TABLE
CREATE TABLE IF NOT EXISTS public.maid_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maid_id UUID NOT NULL REFERENCES public.maids(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent')),
  marked_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(maid_id, date) -- Only one attendance record per day per maid
);

CREATE INDEX IF NOT EXISTS idx_maid_attendance_maid_id ON public.maid_attendance(maid_id);
CREATE INDEX IF NOT EXISTS idx_maid_attendance_date ON public.maid_attendance(date);

-- 3. MAID BONUSES TABLE
CREATE TABLE IF NOT EXISTS public.maid_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maid_id UUID NOT NULL REFERENCES public.maids(id) ON DELETE CASCADE,
  month DATE NOT NULL, -- e.g., '2026-06-01'
  amount DECIMAL(10, 2) NOT NULL,
  reason TEXT,
  added_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_maid_bonuses_maid_id ON public.maid_bonuses(maid_id);
CREATE INDEX IF NOT EXISTS idx_maid_bonuses_month ON public.maid_bonuses(month);

-- 4. RLS POLICIES

-- Maids
ALTER TABLE public.maids ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view maids in their groups" ON public.maids;
CREATE POLICY "Users can view maids in their groups" ON public.maids FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.group_members WHERE group_id = maids.group_id AND user_id = auth.uid())
);
DROP POLICY IF EXISTS "Users can manage maids in their groups" ON public.maids;
CREATE POLICY "Users can manage maids in their groups" ON public.maids FOR ALL USING (
  EXISTS (SELECT 1 FROM public.group_members WHERE group_id = maids.group_id AND user_id = auth.uid())
);

-- Maid Attendance
ALTER TABLE public.maid_attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view maid attendance" ON public.maid_attendance;
CREATE POLICY "Users can view maid attendance" ON public.maid_attendance FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.maids m 
    JOIN public.group_members gm ON m.group_id = gm.group_id 
    WHERE m.id = maid_attendance.maid_id AND gm.user_id = auth.uid()
  )
);
DROP POLICY IF EXISTS "Users can manage maid attendance" ON public.maid_attendance;
CREATE POLICY "Users can manage maid attendance" ON public.maid_attendance FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.maids m 
    JOIN public.group_members gm ON m.group_id = gm.group_id 
    WHERE m.id = maid_attendance.maid_id AND gm.user_id = auth.uid()
  )
);

-- Maid Bonuses
ALTER TABLE public.maid_bonuses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view maid bonuses" ON public.maid_bonuses;
CREATE POLICY "Users can view maid bonuses" ON public.maid_bonuses FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.maids m 
    JOIN public.group_members gm ON m.group_id = gm.group_id 
    WHERE m.id = maid_bonuses.maid_id AND gm.user_id = auth.uid()
  )
);
DROP POLICY IF EXISTS "Users can manage maid bonuses" ON public.maid_bonuses;
CREATE POLICY "Users can manage maid bonuses" ON public.maid_bonuses FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.maids m 
    JOIN public.group_members gm ON m.group_id = gm.group_id 
    WHERE m.id = maid_bonuses.maid_id AND gm.user_id = auth.uid()
  )
);
-- Update maids table to support soft deletion and history tracking
ALTER TABLE public.maids ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.maids ADD COLUMN IF NOT EXISTS left_date DATE;
ALTER TABLE public.maids ADD COLUMN IF NOT EXISTS joined_date DATE NOT NULL DEFAULT CURRENT_DATE;
-- ============================================
-- Recurring Expenses Tables
-- ============================================

CREATE TABLE IF NOT EXISTS public.recurring_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  cycle TEXT NOT NULL CHECK (cycle IN ('daily', 'weekly', 'monthly', 'yearly', 'one-time')),
  start_date DATE NOT NULL,
  end_date DATE,
  split_type TEXT NOT NULL DEFAULT 'equal' CHECK (split_type IN ('equal', 'exact', 'percentage', 'shares')),
  created_by UUID NOT NULL REFERENCES public.group_members(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_recurring_expenses_group_id ON public.recurring_expenses(group_id);

CREATE TABLE IF NOT EXISTS public.recurring_expense_payers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_expense_id UUID NOT NULL REFERENCES public.recurring_expenses(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.group_members(id) ON DELETE CASCADE,
  amount_paid NUMERIC(12,2) NOT NULL CHECK (amount_paid > 0)
);

CREATE INDEX IF NOT EXISTS idx_re_payers_expense_id ON public.recurring_expense_payers(recurring_expense_id);

CREATE TABLE IF NOT EXISTS public.recurring_expense_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_expense_id UUID NOT NULL REFERENCES public.recurring_expenses(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.group_members(id) ON DELETE CASCADE,
  amount_owed NUMERIC(12,2) NOT NULL CHECK (amount_owed >= 0),
  percentage NUMERIC(5,2),
  shares INTEGER
);

CREATE INDEX IF NOT EXISTS idx_re_splits_expense_id ON public.recurring_expense_splits(recurring_expense_id);

-- Alter existing expenses table to track recurring cycle
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS recurring_expense_id UUID REFERENCES public.recurring_expenses(id) ON DELETE SET NULL;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS cycle_date DATE;

-- Update Trigger for recurring_expenses
DROP TRIGGER IF EXISTS set_updated_at ON public.recurring_expenses;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.recurring_expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Note: Since you're running this manually in Supabase SQL editor, copy the entire block above and hit 'Run'
-- Drop the existing constraint that requires amount > 0
ALTER TABLE public.recurring_expenses DROP CONSTRAINT IF EXISTS recurring_expenses_amount_check;

-- Add new constraint that allows amount >= 0 for variable expenses like Electricity Bill
ALTER TABLE public.recurring_expenses ADD CONSTRAINT recurring_expenses_amount_check CHECK (amount >= 0);
-- ============================================
-- Scheduled Expenses Checklist Migration
-- ============================================

-- 1. Add removed_defaults to groups to track dismissed default expenses
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS removed_defaults TEXT[] DEFAULT '{}'::TEXT[];

-- 2. Create the checklist payments table
CREATE TABLE IF NOT EXISTS public.scheduled_expense_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_expense_id UUID NOT NULL REFERENCES public.recurring_expenses(id) ON DELETE CASCADE,
  cycle_date DATE NOT NULL,
  member_id UUID NOT NULL REFERENCES public.group_members(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  paid_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  marked_by UUID REFERENCES public.group_members(id) ON DELETE SET NULL,
  UNIQUE(recurring_expense_id, cycle_date, member_id)
);

CREATE INDEX IF NOT EXISTS idx_sep_recurring_cycle ON public.scheduled_expense_payments(recurring_expense_id, cycle_date);
-- ============================================
-- RLS Policies for Scheduled Expenses
-- ============================================

-- Helper function to get group_id from a recurring_expense
CREATE OR REPLACE FUNCTION public.get_recurring_expense_group(re_id UUID)
RETURNS UUID AS $$
  SELECT group_id FROM public.recurring_expenses WHERE id = re_id LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 1. Enable RLS on the new tables
ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_expense_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_expense_payers ENABLE ROW LEVEL SECURITY; -- (if still present)

-- 2. Policies for recurring_expenses
DROP POLICY IF EXISTS "re_select" ON public.recurring_expenses;
DROP POLICY IF EXISTS "re_select" ON public.recurring_expenses;
CREATE POLICY "re_select" ON public.recurring_expenses
  FOR SELECT USING (is_group_member(group_id));

DROP POLICY IF EXISTS "re_insert" ON public.recurring_expenses;
DROP POLICY IF EXISTS "re_insert" ON public.recurring_expenses;
CREATE POLICY "re_insert" ON public.recurring_expenses
  FOR INSERT WITH CHECK (is_group_member(group_id));

DROP POLICY IF EXISTS "re_update" ON public.recurring_expenses;
DROP POLICY IF EXISTS "re_update" ON public.recurring_expenses;
CREATE POLICY "re_update" ON public.recurring_expenses
  FOR UPDATE USING (is_group_member(group_id));

DROP POLICY IF EXISTS "re_delete" ON public.recurring_expenses;
DROP POLICY IF EXISTS "re_delete" ON public.recurring_expenses;
CREATE POLICY "re_delete" ON public.recurring_expenses
  FOR DELETE USING (is_group_member(group_id));

-- 3. Policies for recurring_expense_splits
DROP POLICY IF EXISTS "res_select" ON public.recurring_expense_splits;
DROP POLICY IF EXISTS "res_select" ON public.recurring_expense_splits;
CREATE POLICY "res_select" ON public.recurring_expense_splits
  FOR SELECT USING (is_group_member(get_recurring_expense_group(recurring_expense_id)));

DROP POLICY IF EXISTS "res_insert" ON public.recurring_expense_splits;
DROP POLICY IF EXISTS "res_insert" ON public.recurring_expense_splits;
CREATE POLICY "res_insert" ON public.recurring_expense_splits
  FOR INSERT WITH CHECK (is_group_member(get_recurring_expense_group(recurring_expense_id)));

DROP POLICY IF EXISTS "res_update" ON public.recurring_expense_splits;
DROP POLICY IF EXISTS "res_update" ON public.recurring_expense_splits;
CREATE POLICY "res_update" ON public.recurring_expense_splits
  FOR UPDATE USING (is_group_member(get_recurring_expense_group(recurring_expense_id)));

DROP POLICY IF EXISTS "res_delete" ON public.recurring_expense_splits;
DROP POLICY IF EXISTS "res_delete" ON public.recurring_expense_splits;
CREATE POLICY "res_delete" ON public.recurring_expense_splits
  FOR DELETE USING (is_group_member(get_recurring_expense_group(recurring_expense_id)));

-- 4. Policies for scheduled_expense_payments
DROP POLICY IF EXISTS "sep_select" ON public.scheduled_expense_payments;
DROP POLICY IF EXISTS "sep_select" ON public.scheduled_expense_payments;
CREATE POLICY "sep_select" ON public.scheduled_expense_payments
  FOR SELECT USING (is_group_member(get_recurring_expense_group(recurring_expense_id)));

DROP POLICY IF EXISTS "sep_insert" ON public.scheduled_expense_payments;
DROP POLICY IF EXISTS "sep_insert" ON public.scheduled_expense_payments;
CREATE POLICY "sep_insert" ON public.scheduled_expense_payments
  FOR INSERT WITH CHECK (is_group_member(get_recurring_expense_group(recurring_expense_id)));

DROP POLICY IF EXISTS "sep_update" ON public.scheduled_expense_payments;
DROP POLICY IF EXISTS "sep_update" ON public.scheduled_expense_payments;
CREATE POLICY "sep_update" ON public.scheduled_expense_payments
  FOR UPDATE USING (is_group_member(get_recurring_expense_group(recurring_expense_id)));

DROP POLICY IF EXISTS "sep_delete" ON public.scheduled_expense_payments;
DROP POLICY IF EXISTS "sep_delete" ON public.scheduled_expense_payments;
CREATE POLICY "sep_delete" ON public.scheduled_expense_payments
  FOR DELETE USING (is_group_member(get_recurring_expense_group(recurring_expense_id)));

-- 5. Policies for recurring_expense_payers (legacy)
DROP POLICY IF EXISTS "rep_select" ON public.recurring_expense_payers;
DROP POLICY IF EXISTS "rep_select" ON public.recurring_expense_payers;
CREATE POLICY "rep_select" ON public.recurring_expense_payers
  FOR SELECT USING (is_group_member(get_recurring_expense_group(recurring_expense_id)));

DROP POLICY IF EXISTS "rep_insert" ON public.recurring_expense_payers;
DROP POLICY IF EXISTS "rep_insert" ON public.recurring_expense_payers;
CREATE POLICY "rep_insert" ON public.recurring_expense_payers
  FOR INSERT WITH CHECK (is_group_member(get_recurring_expense_group(recurring_expense_id)));

DROP POLICY IF EXISTS "rep_update" ON public.recurring_expense_payers;
DROP POLICY IF EXISTS "rep_update" ON public.recurring_expense_payers;
CREATE POLICY "rep_update" ON public.recurring_expense_payers
  FOR UPDATE USING (is_group_member(get_recurring_expense_group(recurring_expense_id)));

DROP POLICY IF EXISTS "rep_delete" ON public.recurring_expense_payers;
DROP POLICY IF EXISTS "rep_delete" ON public.recurring_expense_payers;
CREATE POLICY "rep_delete" ON public.recurring_expense_payers
  FOR DELETE USING (is_group_member(get_recurring_expense_group(recurring_expense_id)));
-- ============================================
-- 1. MAIDS TABLE UPGRADES
-- ============================================

-- Remove the single maid per group constraint to allow historical tracking and replacements
ALTER TABLE public.maids DROP CONSTRAINT IF EXISTS maids_group_id_key;

-- Add tracking for maid lifecycle and payment types
ALTER TABLE public.maids 
  ADD COLUMN IF NOT EXISTS joined_date DATE,
  ADD COLUMN IF NOT EXISTS left_date DATE,
  ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'fixed' CHECK (payment_type IN ('fixed', 'daily'));

-- ============================================
-- 2. RECURRING EXPENSES UPGRADES (Variable Bills)
-- ============================================

-- Add support for variable amount bills (like electricity)
ALTER TABLE public.recurring_expenses 
  ADD COLUMN IF NOT EXISTS is_variable BOOLEAN DEFAULT false NOT NULL;

-- Remove the strict > 0 constraint on amount to allow 0 for variable placeholders
ALTER TABLE public.recurring_expenses DROP CONSTRAINT IF EXISTS recurring_expenses_amount_check;
ALTER TABLE public.recurring_expenses ADD CONSTRAINT recurring_expenses_amount_check CHECK (amount >= 0);

-- ============================================
-- 3. CYLINDER MANAGEMENT SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS public.cylinders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  start_date DATE NOT NULL,
  empty_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'empty')),
  added_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cylinders_group_id ON public.cylinders(group_id);

-- Update trigger
DROP TRIGGER IF EXISTS set_updated_at ON public.cylinders;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.cylinders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Link cylinder usage to specific cylinders
ALTER TABLE public.cylinder_usage 
  ADD COLUMN IF NOT EXISTS cylinder_id UUID REFERENCES public.cylinders(id) ON DELETE CASCADE;

-- RLS for cylinders
ALTER TABLE public.cylinders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view cylinders in their groups" ON public.cylinders;
CREATE POLICY "Users can view cylinders in their groups" ON public.cylinders FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.group_members WHERE group_id = cylinders.group_id AND user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can manage cylinders in their groups" ON public.cylinders;
CREATE POLICY "Users can manage cylinders in their groups" ON public.cylinders FOR ALL USING (
  EXISTS (SELECT 1 FROM public.group_members WHERE group_id = cylinders.group_id AND user_id = auth.uid())
);
