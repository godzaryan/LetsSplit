-- ============================================
-- Add Audit Trigger for Settlements
-- ============================================

CREATE OR REPLACE FUNCTION public.log_settlement_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- For settlements, we don't have an expense_id, but audit_logs schema allows null expense_id.
    -- We can log 'settlement_created' in the action column.
    INSERT INTO public.audit_logs (expense_id, group_id, action, changed_by, new_data)
    VALUES (NULL, NEW.group_id, 'settlement_created', auth.uid(), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (expense_id, group_id, action, changed_by, old_data)
    VALUES (NULL, OLD.group_id, 'settlement_deleted', auth.uid(), to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_settlement_changes ON public.settlements;
CREATE TRIGGER audit_settlement_changes
  AFTER INSERT OR DELETE ON public.settlements
  FOR EACH ROW EXECUTE FUNCTION public.log_settlement_change();
