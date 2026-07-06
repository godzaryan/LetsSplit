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
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.cylinders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Link cylinder usage to specific cylinders
ALTER TABLE public.cylinder_usage 
  ADD COLUMN IF NOT EXISTS cylinder_id UUID REFERENCES public.cylinders(id) ON DELETE CASCADE;

-- RLS for cylinders
ALTER TABLE public.cylinders ENABLE ROW LEVEL SECURITY;

CREATE POLICY ""Users can view cylinders in their groups"" ON public.cylinders FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.group_members WHERE group_id = cylinders.group_id AND user_id = auth.uid())
);

CREATE POLICY ""Users can manage cylinders in their groups"" ON public.cylinders FOR ALL USING (
  EXISTS (SELECT 1 FROM public.group_members WHERE group_id = cylinders.group_id AND user_id = auth.uid())
);
