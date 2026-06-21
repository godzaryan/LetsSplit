-- ============================================
-- 3. RPC: Sync Scheduled Expenses Auto-Generator
-- ============================================
CREATE OR REPLACE FUNCTION public.sync_scheduled_expenses(g_id UUID, target_cycle DATE)
RETURNS VOID AS $$
DECLARE
  re RECORD;
  new_exp_id UUID;
  split RECORD;
  start_m DATE;
  end_m DATE;
BEGIN
  FOR re IN 
    SELECT * FROM public.recurring_expenses 
    WHERE group_id = g_id 
      AND is_active = true 
  LOOP
    -- Truncate start_date and end_date to the first of the month for comparison
    start_m := date_trunc('month', re.start_date)::DATE;
    IF re.end_date IS NOT NULL THEN
      end_m := date_trunc('month', re.end_date)::DATE;
    ELSE
      end_m := NULL;
    END IF;

    -- Check if target_cycle falls within the active range
    IF start_m <= target_cycle AND (end_m IS NULL OR end_m >= target_cycle) THEN
      -- Check if expense already exists for this cycle
      IF NOT EXISTS (SELECT 1 FROM public.expenses WHERE recurring_expense_id = re.id AND cycle_date = target_cycle AND is_deleted = false) THEN
        -- Create Expense
        INSERT INTO public.expenses (group_id, description, total_amount, date, labels, created_by, recurring_expense_id, cycle_date, split_type)
        VALUES (g_id, re.name || ' (' || to_char(target_cycle, 'FMMonth YYYY') || ')', re.amount, target_cycle, ARRAY['Scheduled'], re.created_by, re.id, target_cycle, re.split_type)
        RETURNING id INTO new_exp_id;

        -- Create Expense Payer (assuming created_by paid the whole amount)
        INSERT INTO public.expense_payers (expense_id, member_id, amount_paid)
        VALUES (new_exp_id, re.created_by, re.amount);

        -- Create Expense Splits
        FOR split IN SELECT * FROM public.recurring_expense_splits WHERE recurring_expense_id = re.id LOOP
          INSERT INTO public.expense_splits (expense_id, member_id, amount_owed, percentage, shares)
          VALUES (new_exp_id, split.member_id, split.amount_owed, split.percentage, split.shares);
        END LOOP;
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
