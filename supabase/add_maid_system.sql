-- ============================================
-- MAID MANAGEMENT SYSTEM
-- ============================================

-- 1. MAIDS TABLE
CREATE TABLE IF NOT EXISTS public.maids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  monthly_salary DECIMAL(10, 2) NOT NULL DEFAULT 0,
  allowed_holidays_per_month INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(group_id) -- One maid profile per group for now
);

CREATE INDEX idx_maids_group_id ON public.maids(group_id);

-- 2. MAID ATTENDANCE TABLE
CREATE TABLE IF NOT EXISTS public.maid_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maid_id UUID NOT NULL REFERENCES public.maids(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent')),
  marked_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(maid_id, date) -- Only one attendance record per day per maid
);

CREATE INDEX idx_maid_attendance_maid_id ON public.maid_attendance(maid_id);
CREATE INDEX idx_maid_attendance_date ON public.maid_attendance(date);

-- 3. MAID BONUSES TABLE
CREATE TABLE IF NOT EXISTS public.maid_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maid_id UUID NOT NULL REFERENCES public.maids(id) ON DELETE CASCADE,
  month DATE NOT NULL, -- e.g., '2026-06-01'
  amount DECIMAL(10, 2) NOT NULL,
  reason TEXT,
  added_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_maid_bonuses_maid_id ON public.maid_bonuses(maid_id);
CREATE INDEX idx_maid_bonuses_month ON public.maid_bonuses(month);

-- 4. RLS POLICIES

-- Maids
ALTER TABLE public.maids ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view maids in their groups" ON public.maids FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.group_members WHERE group_id = maids.group_id AND user_id = auth.uid())
);
CREATE POLICY "Users can manage maids in their groups" ON public.maids FOR ALL USING (
  EXISTS (SELECT 1 FROM public.group_members WHERE group_id = maids.group_id AND user_id = auth.uid())
);

-- Maid Attendance
ALTER TABLE public.maid_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view maid attendance" ON public.maid_attendance FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.maids m 
    JOIN public.group_members gm ON m.group_id = gm.group_id 
    WHERE m.id = maid_attendance.maid_id AND gm.user_id = auth.uid()
  )
);
CREATE POLICY "Users can manage maid attendance" ON public.maid_attendance FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.maids m 
    JOIN public.group_members gm ON m.group_id = gm.group_id 
    WHERE m.id = maid_attendance.maid_id AND gm.user_id = auth.uid()
  )
);

-- Maid Bonuses
ALTER TABLE public.maid_bonuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view maid bonuses" ON public.maid_bonuses FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.maids m 
    JOIN public.group_members gm ON m.group_id = gm.group_id 
    WHERE m.id = maid_bonuses.maid_id AND gm.user_id = auth.uid()
  )
);
CREATE POLICY "Users can manage maid bonuses" ON public.maid_bonuses FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.maids m 
    JOIN public.group_members gm ON m.group_id = gm.group_id 
    WHERE m.id = maid_bonuses.maid_id AND gm.user_id = auth.uid()
  )
);
