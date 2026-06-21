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
CREATE POLICY "re_select" ON public.recurring_expenses
  FOR SELECT USING (is_group_member(group_id));

DROP POLICY IF EXISTS "re_insert" ON public.recurring_expenses;
CREATE POLICY "re_insert" ON public.recurring_expenses
  FOR INSERT WITH CHECK (is_group_member(group_id));

DROP POLICY IF EXISTS "re_update" ON public.recurring_expenses;
CREATE POLICY "re_update" ON public.recurring_expenses
  FOR UPDATE USING (is_group_member(group_id));

DROP POLICY IF EXISTS "re_delete" ON public.recurring_expenses;
CREATE POLICY "re_delete" ON public.recurring_expenses
  FOR DELETE USING (is_group_member(group_id));

-- 3. Policies for recurring_expense_splits
DROP POLICY IF EXISTS "res_select" ON public.recurring_expense_splits;
CREATE POLICY "res_select" ON public.recurring_expense_splits
  FOR SELECT USING (is_group_member(get_recurring_expense_group(recurring_expense_id)));

DROP POLICY IF EXISTS "res_insert" ON public.recurring_expense_splits;
CREATE POLICY "res_insert" ON public.recurring_expense_splits
  FOR INSERT WITH CHECK (is_group_member(get_recurring_expense_group(recurring_expense_id)));

DROP POLICY IF EXISTS "res_update" ON public.recurring_expense_splits;
CREATE POLICY "res_update" ON public.recurring_expense_splits
  FOR UPDATE USING (is_group_member(get_recurring_expense_group(recurring_expense_id)));

DROP POLICY IF EXISTS "res_delete" ON public.recurring_expense_splits;
CREATE POLICY "res_delete" ON public.recurring_expense_splits
  FOR DELETE USING (is_group_member(get_recurring_expense_group(recurring_expense_id)));

-- 4. Policies for scheduled_expense_payments
DROP POLICY IF EXISTS "sep_select" ON public.scheduled_expense_payments;
CREATE POLICY "sep_select" ON public.scheduled_expense_payments
  FOR SELECT USING (is_group_member(get_recurring_expense_group(recurring_expense_id)));

DROP POLICY IF EXISTS "sep_insert" ON public.scheduled_expense_payments;
CREATE POLICY "sep_insert" ON public.scheduled_expense_payments
  FOR INSERT WITH CHECK (is_group_member(get_recurring_expense_group(recurring_expense_id)));

DROP POLICY IF EXISTS "sep_update" ON public.scheduled_expense_payments;
CREATE POLICY "sep_update" ON public.scheduled_expense_payments
  FOR UPDATE USING (is_group_member(get_recurring_expense_group(recurring_expense_id)));

DROP POLICY IF EXISTS "sep_delete" ON public.scheduled_expense_payments;
CREATE POLICY "sep_delete" ON public.scheduled_expense_payments
  FOR DELETE USING (is_group_member(get_recurring_expense_group(recurring_expense_id)));

-- 5. Policies for recurring_expense_payers (legacy)
DROP POLICY IF EXISTS "rep_select" ON public.recurring_expense_payers;
CREATE POLICY "rep_select" ON public.recurring_expense_payers
  FOR SELECT USING (is_group_member(get_recurring_expense_group(recurring_expense_id)));

DROP POLICY IF EXISTS "rep_insert" ON public.recurring_expense_payers;
CREATE POLICY "rep_insert" ON public.recurring_expense_payers
  FOR INSERT WITH CHECK (is_group_member(get_recurring_expense_group(recurring_expense_id)));

DROP POLICY IF EXISTS "rep_update" ON public.recurring_expense_payers;
CREATE POLICY "rep_update" ON public.recurring_expense_payers
  FOR UPDATE USING (is_group_member(get_recurring_expense_group(recurring_expense_id)));

DROP POLICY IF EXISTS "rep_delete" ON public.recurring_expense_payers;
CREATE POLICY "rep_delete" ON public.recurring_expense_payers
  FOR DELETE USING (is_group_member(get_recurring_expense_group(recurring_expense_id)));
