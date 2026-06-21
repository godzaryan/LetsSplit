-- ============================================
-- Fix: Add missing linking columns to Expenses
-- ============================================

ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS recurring_expense_id UUID REFERENCES public.recurring_expenses(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS cycle_date DATE;
