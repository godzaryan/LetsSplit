import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AnimatedIcon from '@/components/ui/AnimatedIcon';
import { Users, Upload, Download, BarChart3, Rocket, Hand, TrendingUp, TrendingDown, CalendarClock, Tag, Trophy, ArrowRight } from 'lucide-react';

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
  let lastMonthSpend = 0;
  let categorySpend: Record<string, number> = {};
  let groupTotalSpend: Record<string, number> = {};
  let groupMySpend: Record<string, number> = {};
  let groupBalances: Record<string, number> = {};
  let largestExpense: any = null;
  let largestExpenseAmount = 0;
  let recentActivity: any[] = [];
  const upcomingBills: { name: string, amount: number, groupId: string, cycle: string }[] = [];

  if (groupIds.length > 0) {
    const { data: expenses } = await supabase
      .from('expenses')
      .select(`
        id, group_id, total_amount, date, description, labels,
        expense_payers ( member_id, amount_paid ),
        expense_splits ( member_id, amount_owed )
      `)
      .in('group_id', groupIds)
      .eq('is_deleted', false);

    const { data: settlements } = await supabase
      .from('settlements')
      .select('*')
      .in('group_id', groupIds);

    const now = new Date();
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    expenses?.forEach((exp: any) => {
      const userPaid = exp.expense_payers?.filter((p: any) => userMemberIds.includes(p.member_id)).reduce((sum: number, p: any) => sum + Number(p.amount_paid), 0) || 0;
      const userOwes = exp.expense_splits?.filter((s: any) => userMemberIds.includes(s.member_id)).reduce((sum: number, s: any) => sum + Number(s.amount_owed), 0) || 0;
      
      groupBalances[exp.group_id] = (groupBalances[exp.group_id] || 0) + (userPaid - userOwes);
      groupTotalSpend[exp.group_id] = (groupTotalSpend[exp.group_id] || 0) + Number(exp.total_amount);
      groupMySpend[exp.group_id] = (groupMySpend[exp.group_id] || 0) + userPaid;

      const expDate = new Date(exp.date);
      const isThisMonth = expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
      const isLastMonth = expDate.getMonth() === lastMonthDate.getMonth() && expDate.getFullYear() === lastMonthDate.getFullYear();

      if (isThisMonth) {
        thisMonthSpend += userOwes;

        // Categories tracking
        if (userOwes > 0) {
          if (exp.labels && exp.labels.length > 0) {
            exp.labels.forEach((label: string) => {
              categorySpend[label] = (categorySpend[label] || 0) + (userOwes / exp.labels.length);
            });
          } else {
            categorySpend['Uncategorized'] = (categorySpend['Uncategorized'] || 0) + userOwes;
          }

          // Largest Expense
          if (userOwes > largestExpenseAmount) {
            largestExpenseAmount = userOwes;
            largestExpense = exp;
          }
        }
      } else if (isLastMonth) {
        lastMonthSpend += userOwes;
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

    // Add unpaid scheduled expenses to "You Owe" visually
    let unpaidScheduled = 0;
    const nowForCycle = new Date();
    const currentCycleStr = `${nowForCycle.getUTCFullYear()}-${String(nowForCycle.getUTCMonth() + 1).padStart(2, '0')}-01`;

    const { data: recurring } = await supabase
      .from('recurring_expenses')
      .select('id, name, amount, group_id, cycle, recurring_expense_splits(member_id, amount_owed)')
      .in('group_id', groupIds)
      .eq('is_active', true);

    const recurringIds = recurring?.map((r: any) => r.id) || [];

    const { data: settledExpenses } = await supabase
      .from('expenses')
      .select('recurring_expense_id, cycle_date')
      .in('recurring_expense_id', recurringIds.length > 0 ? recurringIds : ['00000000-0000-0000-0000-000000000000'])
      .eq('is_deleted', false);

    recurring?.forEach((r: any) => {
      const isSettled = settledExpenses?.some((e: any) => {
        if (r.cycle === 'one-time') return e.recurring_expense_id === r.id;
        return e.recurring_expense_id === r.id && e.cycle_date === currentCycleStr;
      });
      
      if (!isSettled) {
        let userShare = 0;
        r.recurring_expense_splits?.forEach((s: any) => {
          if (userMemberIds.includes(s.member_id)) {
            userShare += Number(s.amount_owed);
          }
        });
        if (userShare > 0) {
          upcomingBills.push({ name: r.name, amount: userShare, groupId: r.group_id, cycle: r.cycle });
          unpaidScheduled += userShare;
        }
      }
    });

    globalOwe += unpaidScheduled;

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

  const currencySymbol = '₹';

  // Calculate Spend Trend
  let spendTrend = 0;
  let spendTrendStr = 'No data last month';
  let spendTrendColor = 'var(--text-muted)';
  let SpendTrendIcon = TrendingUp;

  if (lastMonthSpend > 0) {
    spendTrend = ((thisMonthSpend - lastMonthSpend) / lastMonthSpend) * 100;
    const formattedTrend = Math.abs(spendTrend).toFixed(1);
    if (spendTrend > 0) {
      spendTrendStr = `${formattedTrend}% more than last month`;
      spendTrendColor = 'var(--accent-danger)';
      SpendTrendIcon = TrendingUp;
    } else {
      spendTrendStr = `${formattedTrend}% less than last month`;
      spendTrendColor = 'var(--accent-success)';
      SpendTrendIcon = TrendingDown;
    }
  } else if (thisMonthSpend > 0) {
    spendTrendStr = '100% more than last month';
    spendTrendColor = 'var(--accent-danger)';
    SpendTrendIcon = TrendingUp;
  }

  // Sort categories by amount
  const sortedCategories = Object.entries(categorySpend)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5); // Top 5 categories
  
  const colors = ['#6c5ce7', '#00b894', '#fdcb6e', '#e17055', '#0984e3', '#e84393'];

  return (
    <div className="page-container">
      {/* Welcome header */}
      <div className="animate-fade-in" style={{ marginBottom: '40px' }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: 800,
          letterSpacing: '-1px',
          marginBottom: '8px',
          color: 'var(--text-primary)',
          lineHeight: '1.2'
        }}>
          Welcome back,<br />
          <span className="gradient-text">{displayName}</span>
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                {memberships?.map((m: any, i: number) => {
                  const total = groupTotalSpend[m.groups.id] || 0;
                  const mySpend = groupMySpend[m.groups.id] || 0;
                  const balance = groupBalances[m.groups.id] || 0;
                  return (
                  <a key={m.groups.id} href={`/dashboard/group/${m.groups.id}`} className="card animate-fade-in" style={{
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px',
                    textDecoration: 'none',
                    color: 'inherit',
                    animationDelay: `${300 + (i * 50)}ms`,
                    animationFillMode: 'both',
                    cursor: 'pointer',
                    background: 'linear-gradient(145deg, var(--bg-tertiary) 0%, rgba(108, 92, 231, 0.03) 100%)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '16px',
                    transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  >
                    {/* Decorative background element */}
                    <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(108, 92, 231, 0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '14px',
                        background: 'rgba(108, 92, 231, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '22px',
                        fontWeight: 800,
                        color: 'var(--accent-primary-light)',
                        boxShadow: 'inset 0 0 0 1px rgba(108, 92, 231, 0.2)',
                        flexShrink: 0
                      }}>
                        {m.groups.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ fontWeight: 800, fontSize: '17px', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)' }}>{m.groups.name}</h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: '6px', background: 'var(--bg-secondary)', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                            {m.groups.currency} Based
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ width: '100%', height: '1px', background: 'var(--border-subtle)' }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <div>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>Total Spend</p>
                        <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {m.groups.currency}{total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {balance === 0 ? (
                          <>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>Settled</p>
                            <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-muted)' }}>All good</p>
                          </>
                        ) : balance > 0 ? (
                          <>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>You are owed</p>
                            <p style={{ fontSize: '15px', fontWeight: 800, color: 'var(--accent-success)' }}>
                              +{m.groups.currency}{balance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </p>
                          </>
                        ) : (
                          <>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>You owe</p>
                            <p style={{ fontSize: '15px', fontWeight: 800, color: 'var(--accent-danger)' }}>
                              -{m.groups.currency}{Math.abs(balance).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </a>
                )})}
              </div>

              {upcomingBills.length > 0 && (
                <div className="card animate-fade-in" style={{ padding: '24px', animationDelay: '400ms' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <AnimatedIcon animationType="rotate"><CalendarClock size={20} color="var(--accent-warning)" /></AnimatedIcon>
                    <h3 style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text-primary)' }}>Upcoming Bills</h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {upcomingBills.map((bill: any, idx) => (
                      <a key={idx} href={`/dashboard/group/${bill.groupId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div style={{ 
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                          padding: '12px', borderRadius: '10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)',
                          transition: 'all 0.2s'
                        }}
                        >
                          <div>
                            <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>{bill.name}</p>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                              {bill.cycle === 'one-time' ? 'One-time bill' : 'Due this month'}
                            </p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <p style={{ fontSize: '15px', fontWeight: 800, color: 'var(--accent-warning)' }}>
                              {currencySymbol}{bill.amount.toFixed(2)}
                            </p>
                            <ArrowRight size={16} color="var(--text-muted)" />
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column (Creative Widgets) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Insights Panel */}
          {totalGroups > 0 && (
            <div className="card animate-fade-in" style={{ padding: '24px', animationDelay: '300ms' }}>
              <h3 style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text-primary)', marginBottom: '20px' }}>Financial Insights</h3>
              
              {/* Spend Trend */}
              <div style={{ marginBottom: '24px' }}>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase' }}>Monthly Trend</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AnimatedIcon animationType="hover-bounce"><SpendTrendIcon size={20} color={spendTrendColor} /></AnimatedIcon>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: spendTrendColor }}>{spendTrendStr}</p>
                </div>
              </div>

              {/* Largest Expense */}
              {largestExpense && (
                <div style={{ marginBottom: '24px' }}>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase' }}>Largest Expense</p>
                  <div style={{ 
                    background: 'linear-gradient(145deg, rgba(108, 92, 231, 0.1) 0%, rgba(108, 92, 231, 0.02) 100%)', 
                    border: '1px solid rgba(108, 92, 231, 0.2)', 
                    padding: '16px', 
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(108, 92, 231, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary-light)', flexShrink: 0 }}>
                      <AnimatedIcon animationType="rotate"><Trophy size={18} color="currentColor" /></AnimatedIcon>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {largestExpense.description}
                      </p>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Your share: <span style={{ fontWeight: 600, color: 'var(--accent-primary-light)' }}>{currencySymbol}{largestExpenseAmount.toFixed(2)}</span></p>
                    </div>
                  </div>
                </div>
              )}

              {/* Categories */}
              {sortedCategories.length > 0 && (
                <div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '12px', textTransform: 'uppercase' }}>Top Categories</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {sortedCategories.map(([category, amount], idx) => {
                      const percentage = (amount / thisMonthSpend) * 100;
                      const color = colors[idx % colors.length];
                      return (
                        <div key={category}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Tag size={12} color={color} />
                              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{category}</span>
                            </div>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>{currencySymbol}{amount.toFixed(0)}</span>
                          </div>
                          <div style={{ width: '100%', height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${percentage}%`, height: '100%', background: color, borderRadius: '3px', transition: 'width 1s ease-out' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Recent Activity */}
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
