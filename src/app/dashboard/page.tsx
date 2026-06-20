import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AnimatedIcon from '@/components/ui/AnimatedIcon';
import { Users, Upload, Download, BarChart3, Rocket, Hand } from 'lucide-react';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';

  // Fetch user's group memberships
  const { data: memberships } = await supabase
    .from('group_members')
    .select(`
      id, group_id,
      groups ( id, name, icon_url, currency )
    `)
    .eq('user_id', user.id)
    .eq('is_ghost', false);

  const totalGroups = memberships?.length || 0;
  const userMemberIds = memberships?.map(m => m.id) || [];
  const groupIds = memberships?.map(m => m.group_id) || [];

  let globalOwe = 0;
  let globalOwed = 0;
  let thisMonthSpend = 0;
  let recentActivity: any[] = [];

  if (groupIds.length > 0) {
    const { data: expenses } = await supabase
      .from('expenses')
      .select(`
        id, group_id, total_amount, date,
        expense_payers ( member_id, amount_paid ),
        expense_splits ( member_id, amount_owed )
      `)
      .in('group_id', groupIds)
      .eq('is_deleted', false);

    const { data: settlements } = await supabase
      .from('settlements')
      .select('*')
      .in('group_id', groupIds);

    const groupBalances: Record<string, number> = {};
    const now = new Date();

    expenses?.forEach((exp: any) => {
      const userPaid = exp.expense_payers?.filter((p: any) => userMemberIds.includes(p.member_id)).reduce((sum: number, p: any) => sum + Number(p.amount_paid), 0) || 0;
      const userOwes = exp.expense_splits?.filter((s: any) => userMemberIds.includes(s.member_id)).reduce((sum: number, s: any) => sum + Number(s.amount_owed), 0) || 0;
      
      groupBalances[exp.group_id] = (groupBalances[exp.group_id] || 0) + (userPaid - userOwes);

      const expDate = new Date(exp.date);
      if (expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear()) {
        thisMonthSpend += userOwes;
      }
    });

    settlements?.forEach((s: any) => {
      const amount = Number(s.amount);
      if (userMemberIds.includes(s.from_member)) {
        groupBalances[s.group_id] = (groupBalances[s.group_id] || 0) + amount;
      }
      if (userMemberIds.includes(s.to_member)) {
        groupBalances[s.group_id] = (groupBalances[s.group_id] || 0) - amount;
      }
    });

    Object.values(groupBalances).forEach(balance => {
      if (balance > 0.01) globalOwed += balance;
      else if (balance < -0.01) globalOwe += Math.abs(balance);
    });

    const { data: logs } = await supabase
      .from('audit_logs')
      .select(`
        id, action, created_at, new_data, old_data,
        groups(name),
        users:changed_by(display_name, email)
      `)
      .in('group_id', groupIds)
      .order('created_at', { ascending: false })
      .limit(5);
    
    recentActivity = logs || [];
  }

  // Determine user's primary currency (default INR)
  // In a real app we'd fetch this from user profile or use the most frequent group currency
  const currencySymbol = '₹';

  return (
    <div className="page-container">
      {/* Welcome header */}
      <div className="animate-fade-in" style={{ marginBottom: '40px' }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: 800,
          letterSpacing: '-1px',
          marginBottom: '8px',
          color: 'var(--text-primary)'
        }}>
          Welcome back, <span className="gradient-text">{displayName}</span> 👋
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
          Here&apos;s an overview of your expense groups and balances.
        </p>
      </div>

      <div className="dashboard-grid">
        {/* Left Column (Main Stats & Actions) */}
        <div>
          {/* Quick Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '32px',
          }}>
            {[
              { label: 'Total Groups', value: totalGroups.toString(), icon: <AnimatedIcon animationType="hover-bounce"><Users size={20} color="currentColor" /></AnimatedIcon>, color: 'var(--accent-primary-light)' },
              { label: 'You Owe', value: `${currencySymbol}${globalOwe.toFixed(2)}`, icon: <AnimatedIcon animationType="hover-bounce"><Upload size={20} color="currentColor" /></AnimatedIcon>, color: 'var(--accent-danger)' },
              { label: 'You\'re Owed', value: `${currencySymbol}${globalOwed.toFixed(2)}`, icon: <AnimatedIcon animationType="hover-bounce"><Download size={20} color="currentColor" /></AnimatedIcon>, color: 'var(--accent-success)' },
              { label: 'This Month', value: `${currencySymbol}${thisMonthSpend.toFixed(2)}`, icon: <AnimatedIcon animationType="hover-pulse"><BarChart3 size={20} color="currentColor" /></AnimatedIcon>, color: 'var(--accent-warning)' },
            ].map((stat, i) => (
              <div key={i} className="card animate-fade-in" style={{
                animationDelay: `${i * 80}ms`,
                animationFillMode: 'both',
                padding: '20px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {stat.label}
                    </p>
                    <p style={{ fontSize: '24px', fontWeight: 800, color: stat.color }}>
                      {stat.value}
                    </p>
                  </div>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    color: stat.color,
                  }}>
                    {stat.icon}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Main Action Area / Group List */}
          {totalGroups === 0 ? (
            <div className="card animate-fade-in" style={{
              textAlign: 'center',
              padding: '60px 32px',
              animationDelay: '300ms',
              animationFillMode: 'both',
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'rgba(230, 0, 0, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '36px',
                margin: '0 auto 20px',
                boxShadow: '0 0 30px rgba(230, 0, 0, 0.2)',
                color: 'var(--accent-primary)'
              }}>
                <AnimatedIcon animationType="hover-bounce"><Rocket size={40} color="currentColor" /></AnimatedIcon>
              </div>
              <h3 style={{ fontWeight: 800, fontSize: '20px', marginBottom: '8px', color: 'var(--text-primary)' }}>
                Get started with LetsSplit
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '15px', maxWidth: '400px', margin: '0 auto 24px', lineHeight: 1.7 }}>
                Create your first group or join an existing one using an invite code. Start tracking shared expenses effortlessly!
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="btn-primary" id="create-group-cta" style={{ padding: '12px 24px', fontSize: '15px' }}>
                  + Create Group
                </button>
                <button className="btn-secondary" id="join-group-cta" style={{ padding: '12px 24px', fontSize: '15px' }}>
                  Join with Code
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontWeight: 800, fontSize: '18px', color: 'var(--text-primary)' }}>Your Active Groups</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
                {memberships?.map((m: any, i: number) => (
                  <a key={m.groups.id} href={`/dashboard/group/${m.groups.id}`} className="card animate-fade-in" style={{
                    padding: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    textDecoration: 'none',
                    color: 'inherit',
                    animationDelay: `${300 + (i * 50)}ms`,
                    animationFillMode: 'both',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: 'var(--bg-tertiary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px',
                      fontWeight: 700,
                      color: 'var(--text-primary)'
                    }}>
                      {m.groups.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 style={{ fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>{m.groups.name}</h4>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{m.groups.currency} Based</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column (Creative Widgets) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Feature Spotlight Widget */}
          <div className="card animate-fade-in" style={{ 
            background: 'var(--gradient-hero)', 
            border: '1px solid var(--border-active)',
            padding: '24px',
            position: 'relative',
            overflow: 'hidden',
            animationDelay: '400ms',
          }}>
            <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'var(--accent-primary)', opacity: 0.2, filter: 'blur(40px)', borderRadius: '50%' }} />
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span style={{ fontSize: '10px', fontWeight: 800, padding: '4px 8px', background: 'var(--accent-primary)', color: 'white', borderRadius: '4px', letterSpacing: '1px', textTransform: 'uppercase' }}>Coming Soon</span>
            </div>
            <h3 style={{ fontWeight: 800, fontSize: '18px', color: 'white', marginBottom: '8px' }}>AI Receipt Scanner</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '16px' }}>
              Say goodbye to manual data entry. Simply snap a picture of your dinner receipt, and LetsSplit will automatically detect the items and split them among your friends.
            </p>
            <button className="btn-secondary" style={{ width: '100%', fontSize: '13px', padding: '10px', border: '1px solid rgba(255,255,255,0.1)' }} disabled>
              Notify Me When Live
            </button>
          </div>

          {/* Recent Activity Placeholder */}
          <div className="card animate-fade-in" style={{ padding: '24px', animationDelay: '500ms' }}>
            <h3 style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text-primary)', marginBottom: '16px' }}>Recent Activity</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {recentActivity.length === 0 ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', opacity: 0.5 }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                      <AnimatedIcon animationType="rotate"><Hand size={16} color="currentColor" /></AnimatedIcon>
                    </div>
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Welcome to LetsSplit!</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Just now</p>
                    </div>
                  </div>

                  <div style={{ width: '100%', height: '1px', background: 'var(--border-subtle)' }} />
                  
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', fontStyle: 'italic' }}>
                    Your activity across all groups will appear here.
                  </p>
                </>
              ) : (
                recentActivity.map((log: any) => {
                  const actor = log.users?.display_name || log.users?.email?.split('@')[0] || 'Someone';
                  const actionMap: Record<string, string> = { created: 'added an expense', updated: 'updated an expense', deleted: 'deleted an expense' };
                  const colorMap: Record<string, string> = { created: 'var(--accent-success)', updated: 'var(--accent-warning)', deleted: 'var(--accent-danger)' };
                  const desc = log.new_data?.description || log.old_data?.description || 'an item';
                  const d = new Date(log.created_at);
                  const timeStr = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                  
                  return (
                    <div key={log.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{ 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%', 
                        background: colorMap[log.action] || 'var(--border-active)',
                        marginTop: '6px',
                        flexShrink: 0
                      }} />
                      <div>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{actor}</span>
                          {' '} {actionMap[log.action] || 'modified something'} {' '}
                          <span style={{ fontStyle: 'italic', color: 'var(--text-primary)' }}>&quot;{desc}&quot;</span>
                          {' '} in <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{log.groups?.name || 'a group'}</span>
                        </p>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{timeStr}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
