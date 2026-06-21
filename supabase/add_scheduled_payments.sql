-- ============================================
-- Scheduled Expenses Checklist Migration
-- ============================================

-- 1. Add removed_defaults to groups to track dismissed default expenses
ALTER TABLE public.groups ADD COLUMN removed_defaults TEXT[] DEFAULT '{}'::TEXT[];

-- 2. Create the checklist payments table
CREATE TABLE public.scheduled_expense_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_expense_id UUID NOT NULL REFERENCES public.recurring_expenses(id) ON DELETE CASCADE,
  cycle_date DATE NOT NULL,
  member_id UUID NOT NULL REFERENCES public.group_members(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  paid_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  marked_by UUID REFERENCES public.group_members(id) ON DELETE SET NULL,
  UNIQUE(recurring_expense_id, cycle_date, member_id)
);

CREATE INDEX idx_sep_recurring_cycle ON public.scheduled_expense_payments(recurring_expense_id, cycle_date);
