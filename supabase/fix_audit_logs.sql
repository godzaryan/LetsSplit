-- Fix for audit_logs foreign key constraint violation during group deletion
-- This updates the audit log triggers to silently skip inserting logs if the parent group is already deleted (e.g. during a cascade delete).

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
    -- Only log deletion if the group still exists (prevents FK violation during cascade delete of a group)
    IF NOT EXISTS (SELECT 1 FROM public.groups WHERE id = OLD.group_id) THEN
      RETURN OLD;
    END IF;

    INSERT INTO public.audit_logs (expense_id, group_id, action, changed_by, old_data, entity_type, entity_id)
    VALUES (NULL, OLD.group_id, 'deleted', auth.uid(), to_jsonb(OLD), 'expense', OLD.id);
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


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
    
    -- Only log deletion if the group still exists (prevents FK violation during cascade delete of a group)
    IF NOT EXISTS (SELECT 1 FROM public.groups WHERE id = v_group_id) THEN
      RETURN OLD;
    END IF;

    INSERT INTO public.audit_logs (group_id, entity_type, entity_id, action, changed_by, old_data)
    VALUES (v_group_id, v_entity_type, OLD.id, 'deleted', v_changed_by, to_jsonb(OLD));
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
