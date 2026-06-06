-- ============================================
-- LetsSplit Row-Level Security Policies
-- Run AFTER schema.sql in Supabase SQL Editor
-- ============================================

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Check if current user is a member of a group
CREATE OR REPLACE FUNCTION public.is_group_member(g_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = g_id
      AND user_id = auth.uid()
      AND is_ghost = false
      AND status = 'approved'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get current user's role in a group
CREATE OR REPLACE FUNCTION public.get_group_role(g_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM public.group_members
  WHERE group_id = g_id
    AND user_id = auth.uid()
    AND is_ghost = false
    AND status = 'approved'
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get current user's member_id in a group
CREATE OR REPLACE FUNCTION public.get_member_id(g_id UUID)
RETURNS UUID AS $$
  SELECT id FROM public.group_members
  WHERE group_id = g_id
    AND user_id = auth.uid()
    AND is_ghost = false
    AND status = 'approved'
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get group_id from an expense
CREATE OR REPLACE FUNCTION public.get_expense_group(e_id UUID)
RETURNS UUID AS $$
  SELECT group_id FROM public.expenses WHERE id = e_id LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_payers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USERS POLICIES
-- ============================================
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "users_select_group_peers" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm1
      JOIN public.group_members gm2 ON gm1.group_id = gm2.group_id
      WHERE gm1.user_id = auth.uid() AND gm2.user_id = users.id
    )
  );

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================
-- GROUPS POLICIES
-- ============================================
CREATE POLICY "groups_select_member" ON public.groups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = id
        AND user_id = auth.uid()
        AND is_ghost = false
    )
  );

-- Allow reading group by invite code (for joining)
CREATE POLICY "groups_select_by_invite" ON public.groups
  FOR SELECT USING (
    invite_code IS NOT NULL
    AND (invite_expires_at IS NULL OR invite_expires_at > now())
  );

CREATE POLICY "groups_insert" ON public.groups
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "groups_update" ON public.groups
  FOR UPDATE USING (get_group_role(id) IN ('owner', 'admin'))
  WITH CHECK (get_group_role(id) IN ('owner', 'admin'));

CREATE POLICY "groups_delete" ON public.groups
  FOR DELETE USING (get_group_role(id) = 'owner');

-- ============================================
-- GROUP MEMBERS POLICIES
-- ============================================
CREATE POLICY "gm_select" ON public.group_members
  FOR SELECT USING (
    is_group_member(group_id)
    OR
    user_id = auth.uid()
  );

-- Owner/Admin can add members; users can join themselves via invite; group creator can add themselves as owner
CREATE POLICY "gm_insert" ON public.group_members
  FOR INSERT WITH CHECK (
    -- Owner/Admin adding someone
    get_group_role(group_id) IN ('owner', 'admin')
    OR
    -- User joining themselves via invite (role must be 'member', status must be 'pending')
    (user_id = auth.uid() AND role = 'member' AND status = 'pending')
    OR
    -- Creator of the group adding themselves as owner during group creation
    (
      EXISTS (
        SELECT 1 FROM public.groups
        WHERE id = group_id AND created_by = auth.uid()
      )
      AND user_id = auth.uid()
      AND role = 'owner'
      AND status = 'approved'
    )
  );

CREATE POLICY "gm_update" ON public.group_members
  FOR UPDATE USING (
    get_group_role(group_id) IN ('owner', 'admin')
  ) WITH CHECK (
    get_group_role(group_id) IN ('owner', 'admin')
  );

-- Owner/Admin can remove members (but not themselves if owner)
CREATE POLICY "gm_delete" ON public.group_members
  FOR DELETE USING (
    get_group_role(group_id) IN ('owner', 'admin')
    AND (user_id IS NULL OR user_id != auth.uid()) -- Can't remove yourself
  );

-- ============================================
-- EXPENSES POLICIES
-- ============================================
CREATE POLICY "expenses_select" ON public.expenses
  FOR SELECT USING (
    is_group_member(group_id) AND is_deleted = false
  );

CREATE POLICY "expenses_insert" ON public.expenses
  FOR INSERT WITH CHECK (is_group_member(group_id));

CREATE POLICY "expenses_update" ON public.expenses
  FOR UPDATE USING (
    is_group_member(group_id)
    AND (
      created_by = get_member_id(group_id)
      OR get_group_role(group_id) IN ('owner', 'admin')
    )
  );

CREATE POLICY "expenses_delete" ON public.expenses
  FOR DELETE USING (
    is_group_member(group_id)
    AND (
      created_by = get_member_id(group_id)
      OR get_group_role(group_id) IN ('owner', 'admin')
    )
  );

-- ============================================
-- EXPENSE PAYERS POLICIES
-- ============================================
CREATE POLICY "ep_select" ON public.expense_payers
  FOR SELECT USING (is_group_member(get_expense_group(expense_id)));

CREATE POLICY "ep_insert" ON public.expense_payers
  FOR INSERT WITH CHECK (is_group_member(get_expense_group(expense_id)));

CREATE POLICY "ep_update" ON public.expense_payers
  FOR UPDATE USING (is_group_member(get_expense_group(expense_id)));

CREATE POLICY "ep_delete" ON public.expense_payers
  FOR DELETE USING (is_group_member(get_expense_group(expense_id)));

-- ============================================
-- EXPENSE ITEMS POLICIES
-- ============================================
CREATE POLICY "ei_select" ON public.expense_items
  FOR SELECT USING (is_group_member(get_expense_group(expense_id)));

CREATE POLICY "ei_insert" ON public.expense_items
  FOR INSERT WITH CHECK (is_group_member(get_expense_group(expense_id)));

CREATE POLICY "ei_update" ON public.expense_items
  FOR UPDATE USING (is_group_member(get_expense_group(expense_id)));

CREATE POLICY "ei_delete" ON public.expense_items
  FOR DELETE USING (is_group_member(get_expense_group(expense_id)));

-- ============================================
-- EXPENSE SPLITS POLICIES
-- ============================================
CREATE POLICY "es_select" ON public.expense_splits
  FOR SELECT USING (is_group_member(get_expense_group(expense_id)));

CREATE POLICY "es_insert" ON public.expense_splits
  FOR INSERT WITH CHECK (is_group_member(get_expense_group(expense_id)));

CREATE POLICY "es_update" ON public.expense_splits
  FOR UPDATE USING (is_group_member(get_expense_group(expense_id)));

CREATE POLICY "es_delete" ON public.expense_splits
  FOR DELETE USING (is_group_member(get_expense_group(expense_id)));

-- ============================================
-- SETTLEMENTS POLICIES
-- ============================================
CREATE POLICY "settlements_select" ON public.settlements
  FOR SELECT USING (is_group_member(group_id));

CREATE POLICY "settlements_insert" ON public.settlements
  FOR INSERT WITH CHECK (is_group_member(group_id));

-- Settlements are immutable - no updates
CREATE POLICY "settlements_no_update" ON public.settlements
  FOR UPDATE USING (false);

-- Only owner can delete
CREATE POLICY "settlements_delete" ON public.settlements
  FOR DELETE USING (get_group_role(group_id) = 'owner');

-- ============================================
-- AUDIT LOGS POLICIES (read-only for members)
-- ============================================
CREATE POLICY "audit_select" ON public.audit_logs
  FOR SELECT USING (is_group_member(group_id));

-- No insert/update/delete via client - handled by triggers
CREATE POLICY "audit_no_insert" ON public.audit_logs
  FOR INSERT WITH CHECK (false);

CREATE POLICY "audit_no_update" ON public.audit_logs
  FOR UPDATE USING (false);

CREATE POLICY "audit_no_delete" ON public.audit_logs
  FOR DELETE USING (false);

-- ============================================
-- AUDIT LOG TRIGGER (auto-logs expense changes)
-- ============================================
CREATE OR REPLACE FUNCTION public.log_expense_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (expense_id, group_id, action, changed_by, new_data)
    VALUES (NEW.id, NEW.group_id, 'created', auth.uid(), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (expense_id, group_id, action, changed_by, old_data, new_data)
    VALUES (NEW.id, NEW.group_id, 'updated', auth.uid(), to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (expense_id, group_id, action, changed_by, old_data)
    VALUES (NULL, OLD.group_id, 'deleted', auth.uid(), to_jsonb(OLD));
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_expense_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.log_expense_change();

-- ============================================
-- STORAGE BUCKET + POLICY (receipts)
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "receipts_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'receipts'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "receipts_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'receipts'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "receipts_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'receipts'
    AND auth.role() = 'authenticated'
  );
