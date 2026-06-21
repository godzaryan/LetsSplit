import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import GroupView from '@/components/group/GroupView';

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: groupId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  // Fetch group details
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('*')
    .eq('id', groupId)
    .single();

  if (groupError || !group) notFound();

  // Fetch members
  const { data: members, error: membersError } = await supabase
    .from('group_members')
    .select(`
      id,
      user_id,
      is_ghost,
      ghost_name,
      role,
      status,
      joined_at,
      users!group_members_user_id_fkey (
        id,
        display_name,
        email,
        avatar_url,
        upi_id
      )
    `)
    .eq('group_id', groupId)
    .order('role', { ascending: true });

  if (membersError) {
    console.error('Error fetching members:', membersError);
  }

  // Check if current user is an approved member
  const currentUserMember = members?.find(m => m.user_id === user.id);
  if (!currentUserMember || currentUserMember.status === 'pending') {
    redirect('/dashboard'); // Deny access to pending users
  }

  // Fetch regular expenses (ignore scheduled ones from the P2P ledger)
  const { data: expenses } = await supabase
    .from('expenses')
    .select(`
      id,
      description,
      total_amount,
      currency,
      split_type,
      date,
      receipt_url,
      created_by,
      created_at,
      recurring_expense_id,
      cycle_date,
      labels,
      expense_payers (
        id, member_id, amount_paid
      ),
      expense_splits (
        id, member_id, amount_owed, percentage, shares
      )
    `)
    .eq('group_id', groupId)
    .eq('is_deleted', false)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  // Fetch settlements
  const { data: settlements } = await supabase
    .from('settlements')
    .select('*')
    .eq('group_id', groupId)
    .order('settled_at', { ascending: false });

  // Fetch recurring/scheduled expenses and their payments
  const { data: recurringExpenses } = await supabase
    .from('recurring_expenses')
    .select(`
      id,
      name,
      amount,
      cycle,
      start_date,
      end_date,
      split_type,
      is_active,
      recurring_expense_splits (
        id,
        member_id,
        amount_owed,
        percentage,
        shares
      )
    `)
    .eq('group_id', groupId)
    .eq('is_active', true);

  // Get current user's membership
  const currentMember = members?.find((m: any) => m.user_id === user.id);

  if (!currentMember) redirect('/dashboard');

  return (
    <GroupView
      group={group}
      members={members || []}
      expenses={expenses || []}
      recurringExpenses={recurringExpenses || []}
      settlements={settlements || []}
      currentUserId={user.id}
      currentMemberId={currentMember.id}
      currentRole={currentMember.role}
    />
  );
}
