-- ============================================
-- SQL Script for Group Approval System
-- RUN THIS IN YOUR SUPABASE SQL EDITOR
-- ============================================

-- 1. Add status column to group_members
ALTER TABLE public.group_members 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved' 
CHECK (status IN ('pending', 'approved', 'rejected'));

-- 2. Update is_group_member function to only return true if status is approved
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

-- 3. Update get_group_role function
CREATE OR REPLACE FUNCTION public.get_group_role(g_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM public.group_members
  WHERE group_id = g_id
    AND user_id = auth.uid()
    AND is_ghost = false
    AND status = 'approved'
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 4. Update get_member_id function
CREATE OR REPLACE FUNCTION public.get_member_id(g_id UUID)
RETURNS UUID AS $$
  SELECT id FROM public.group_members
  WHERE group_id = g_id
    AND user_id = auth.uid()
    AND is_ghost = false
    AND status = 'approved'
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 5. Update group_members select policy so pending members can see their own membership
DROP POLICY IF EXISTS "gm_select" ON public.group_members;
CREATE POLICY "gm_select" ON public.group_members
  FOR SELECT USING (
    -- You can see members if you are an approved member
    is_group_member(group_id)
    OR
    -- You can see your own membership even if pending
    user_id = auth.uid()
  );

-- 6. Update groups select policy so pending members can see the basic group details
DROP POLICY IF EXISTS "groups_select_member" ON public.groups;
CREATE POLICY "groups_select_member" ON public.groups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = id
        AND user_id = auth.uid()
        AND is_ghost = false
    )
  );

-- 7. Update group_members insert policy to allow pending inserts
DROP POLICY IF EXISTS "gm_insert" ON public.group_members;
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

-- Note: Other tables (expenses, settlements, etc.) are already protected because 
-- they use is_group_member() which we just updated to require status = 'approved'.
