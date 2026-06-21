-- ============================================
-- CYLINDER USAGE TRACKING SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS public.cylinder_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  morning BOOLEAN DEFAULT false NOT NULL,
  afternoon BOOLEAN DEFAULT false NOT NULL,
  night BOOLEAN DEFAULT false NOT NULL,
  marked_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(group_id, date) -- Only one usage record per day per group
);

CREATE INDEX idx_cylinder_usage_group_id ON public.cylinder_usage(group_id);
CREATE INDEX idx_cylinder_usage_date ON public.cylinder_usage(date);

-- RLS POLICIES
ALTER TABLE public.cylinder_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cylinder usage in their groups" ON public.cylinder_usage FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.group_members WHERE group_id = cylinder_usage.group_id AND user_id = auth.uid())
);

CREATE POLICY "Users can manage cylinder usage in their groups" ON public.cylinder_usage FOR ALL USING (
  EXISTS (SELECT 1 FROM public.group_members WHERE group_id = cylinder_usage.group_id AND user_id = auth.uid())
);
