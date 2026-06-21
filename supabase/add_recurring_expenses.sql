-- ============================================
-- Recurring Expenses Tables
-- ============================================

CREATE TABLE public.recurring_expenses (
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

CREATE INDEX idx_recurring_expenses_group_id ON public.recurring_expenses(group_id);

CREATE TABLE public.recurring_expense_payers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_expense_id UUID NOT NULL REFERENCES public.recurring_expenses(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.group_members(id) ON DELETE CASCADE,
  amount_paid NUMERIC(12,2) NOT NULL CHECK (amount_paid > 0)
);

CREATE INDEX idx_re_payers_expense_id ON public.recurring_expense_payers(recurring_expense_id);

CREATE TABLE public.recurring_expense_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_expense_id UUID NOT NULL REFERENCES public.recurring_expenses(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.group_members(id) ON DELETE CASCADE,
  amount_owed NUMERIC(12,2) NOT NULL CHECK (amount_owed >= 0),
  percentage NUMERIC(5,2),
  shares INTEGER
);

CREATE INDEX idx_re_splits_expense_id ON public.recurring_expense_splits(recurring_expense_id);

-- Alter existing expenses table to track recurring cycle
ALTER TABLE public.expenses ADD COLUMN recurring_expense_id UUID REFERENCES public.recurring_expenses(id) ON DELETE SET NULL;
ALTER TABLE public.expenses ADD COLUMN cycle_date DATE;

-- Update Trigger for recurring_expenses
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.recurring_expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Note: Since you're running this manually in Supabase SQL editor, copy the entire block above and hit 'Run'
