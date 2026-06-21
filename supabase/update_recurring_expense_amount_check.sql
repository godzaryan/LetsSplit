-- Drop the existing constraint that requires amount > 0
ALTER TABLE public.recurring_expenses DROP CONSTRAINT IF EXISTS recurring_expenses_amount_check;

-- Add new constraint that allows amount >= 0 for variable expenses like Electricity Bill
ALTER TABLE public.recurring_expenses ADD CONSTRAINT recurring_expenses_amount_check CHECK (amount >= 0);
