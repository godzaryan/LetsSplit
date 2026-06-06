import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardShell from '@/components/dashboard/DashboardShell';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Fetch user's groups
  const { data: memberships } = await supabase
    .from('group_members')
    .select(`
      id,
      role,
      status,
      groups (
        id,
        name,
        icon_url,
        currency
      )
    `)
    .eq('user_id', user.id)
    .eq('is_ghost', false);

  // Fetch user profile
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  const groups = memberships?.map((m: any) => ({
    id: m.groups.id,
    name: m.groups.name,
    icon_url: m.groups.icon_url,
    currency: m.groups.currency,
    role: m.role,
    status: m.status,
    memberId: m.id,
  })) || [];

  return (
    <DashboardShell user={profile} groups={groups}>
      {children}
    </DashboardShell>
  );
}
