-- ============================================
-- 1. GROUP SETTINGS FOR EXPENSE EDITING
-- ============================================

ALTER TABLE public.groups 
ADD COLUMN IF NOT EXISTS allow_any_member_to_edit_expenses BOOLEAN DEFAULT false;

-- Function to evaluate expense edit permissions dynamically
CREATE OR REPLACE FUNCTION public.can_edit_expense(p_group_id UUID, p_expense_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_allow_all BOOLEAN;
  v_created_by UUID;
  v_role TEXT;
BEGIN
  -- 1. Must be a group member
  IF NOT public.is_group_member(p_group_id) THEN
    RETURN false;
  END IF;

  -- 2. Check if group allows anyone to edit
  SELECT allow_any_member_to_edit_expenses INTO v_allow_all FROM public.groups WHERE id = p_group_id;
  IF v_allow_all THEN
    RETURN true;
  END IF;

  -- 3. Check if user is admin/owner
  v_role := public.get_group_role(p_group_id);
  IF v_role IN ('owner', 'admin') THEN
    RETURN true;
  END IF;

  -- 4. Check if user is the creator or a payer
  IF p_expense_id IS NOT NULL THEN
    SELECT created_by INTO v_created_by FROM public.expenses WHERE id = p_expense_id;
    IF v_created_by = public.get_member_id(p_group_id) THEN
      RETURN true;
    END IF;
    
    -- Check if user is a payer for this expense
    IF EXISTS (
      SELECT 1 FROM public.expense_payers 
      WHERE expense_id = p_expense_id 
      AND member_id = public.get_member_id(p_group_id)
    ) THEN
      RETURN true;
    END IF;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update Policies
DROP POLICY IF EXISTS "expenses_update" ON public.expenses;
CREATE POLICY "expenses_update" ON public.expenses
  FOR UPDATE USING (public.can_edit_expense(group_id, id));

DROP POLICY IF EXISTS "expenses_delete" ON public.expenses;
CREATE POLICY "expenses_delete" ON public.expenses
  FOR DELETE USING (public.can_edit_expense(group_id, id));


-- ============================================
-- 2. UNIVERSAL AUDIT SYSTEM
-- ============================================

-- Alter audit_logs to support multiple entity types
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS entity_type TEXT DEFAULT 'expense';
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS entity_id UUID;

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);

-- Overhaul existing expense trigger to use entity_type
CREATE OR REPLACE FUNCTION public.log_expense_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (expense_id, group_id, action, changed_by, new_data, entity_type, entity_id)
    VALUES (NEW.id, NEW.group_id, 'created', auth.uid(), to_jsonb(NEW), 'expense', NEW.id);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (expense_id, group_id, action, changed_by, old_data, new_data, entity_type, entity_id)
    VALUES (NEW.id, NEW.group_id, 'updated', auth.uid(), to_jsonb(OLD), to_jsonb(NEW), 'expense', NEW.id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (expense_id, group_id, action, changed_by, old_data, entity_type, entity_id)
    VALUES (NULL, OLD.group_id, 'deleted', auth.uid(), to_jsonb(OLD), 'expense', OLD.id);
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Universal Trigger Function for other tables
CREATE OR REPLACE FUNCTION public.log_universal_change()
RETURNS TRIGGER AS $$
DECLARE
  v_group_id UUID;
  v_entity_type TEXT;
  v_changed_by UUID;
BEGIN
  -- Map table names to entity types
  IF TG_TABLE_NAME = 'groups' THEN
    v_entity_type := 'group_settings';
  ELSIF TG_TABLE_NAME = 'maids' THEN
    v_entity_type := 'maid';
  ELSIF TG_TABLE_NAME = 'recurring_expenses' THEN
    v_entity_type := 'scheduled_expense';
  ELSIF TG_TABLE_NAME = 'cylinder_usage' THEN
    v_entity_type := 'cylinder_usage';
  END IF;

  v_changed_by := auth.uid();

  IF TG_OP = 'INSERT' THEN
    IF TG_TABLE_NAME = 'groups' THEN v_group_id := NEW.id; ELSE v_group_id := NEW.group_id; END IF;
    INSERT INTO public.audit_logs (group_id, entity_type, entity_id, action, changed_by, new_data)
    VALUES (v_group_id, v_entity_type, NEW.id, 'created', v_changed_by, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF TG_TABLE_NAME = 'groups' THEN v_group_id := NEW.id; ELSE v_group_id := NEW.group_id; END IF;
    -- Avoid spam logs if nothing actually changed
    IF to_jsonb(OLD) = to_jsonb(NEW) THEN
      RETURN NEW;
    END IF;
    INSERT INTO public.audit_logs (group_id, entity_type, entity_id, action, changed_by, old_data, new_data)
    VALUES (v_group_id, v_entity_type, NEW.id, 'updated', v_changed_by, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF TG_TABLE_NAME = 'groups' THEN v_group_id := OLD.id; ELSE v_group_id := OLD.group_id; END IF;
    INSERT INTO public.audit_logs (group_id, entity_type, entity_id, action, changed_by, old_data)
    VALUES (v_group_id, v_entity_type, OLD.id, 'deleted', v_changed_by, to_jsonb(OLD));
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach Triggers to Tables
DROP TRIGGER IF EXISTS audit_groups_changes ON public.groups;
CREATE TRIGGER audit_groups_changes
  AFTER UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.log_universal_change();

DROP TRIGGER IF EXISTS audit_maids_changes ON public.maids;
CREATE TRIGGER audit_maids_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.maids
  FOR EACH ROW EXECUTE FUNCTION public.log_universal_change();

DROP TRIGGER IF EXISTS audit_recurring_expenses_changes ON public.recurring_expenses;
CREATE TRIGGER audit_recurring_expenses_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.recurring_expenses
  FOR EACH ROW EXECUTE FUNCTION public.log_universal_change();

DROP TRIGGER IF EXISTS audit_cylinder_usage_changes ON public.cylinder_usage;
CREATE TRIGGER audit_cylinder_usage_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.cylinder_usage
  FOR EACH ROW EXECUTE FUNCTION public.log_universal_change();
