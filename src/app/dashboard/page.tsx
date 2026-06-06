import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  // Fetch user's group memberships
  const { data: memberships } = await supabase
    .from('group_members')
    .select('id, group_id')
    .eq('user_id', user.id)
    .eq('is_ghost', false);

  const totalGroups = memberships?.length || 0;
  const userMemberIds = memberships?.map(m => m.id) || [];
  const groupIds = memberships?.map(m => m.group_id) || [];

  let globalOwe = 0;
  let globalOwed = 0;
  let thisMonthSpend = 0;

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
              { label: 'Total Groups', value: totalGroups.toString(), icon: '👥', color: 'var(--accent-primary-light)' },
              { label: 'You Owe', value: `${currencySymbol}${globalOwe.toFixed(2)}`, icon: '📤', color: 'var(--accent-danger)' },
              { label: 'You\'re Owed', value: `${currencySymbol}${globalOwed.toFixed(2)}`, icon: '📥', color: 'var(--accent-success)' },
              { label: 'This Month', value: `${currencySymbol}${thisMonthSpend.toFixed(2)}`, icon: '📊', color: 'var(--accent-warning)' },
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

          {/* Empty state / Main Action Area */}
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
            }}>
              🚀
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', opacity: 0.5 }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                  👋
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
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
