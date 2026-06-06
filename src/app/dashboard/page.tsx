import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  return (
    <div style={{ padding: '32px', maxWidth: '900px' }}>
      {/* Welcome header */}
      <div className="animate-fade-in" style={{ marginBottom: '40px' }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: 800,
          letterSpacing: '-0.5px',
          marginBottom: '8px',
        }}>
          Welcome back, <span className="gradient-text">{displayName}</span> 👋
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
          Here&apos;s an overview of your expense groups and balances.
        </p>
      </div>

      {/* Quick Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '32px',
      }}>
        {[
          { label: 'Total Groups', value: '0', icon: '👥', color: '#6c5ce7' },
          { label: 'You Owe', value: '₹0.00', icon: '📤', color: '#ff6b6b' },
          { label: 'You\'re Owed', value: '₹0.00', icon: '📥', color: '#00b894' },
          { label: 'This Month', value: '₹0.00', icon: '📊', color: '#00cec9' },
        ].map((stat, i) => (
          <div key={i} className="card animate-fade-in" style={{
            animationDelay: `${i * 80}ms`,
            animationFillMode: 'both',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {stat.label}
                </p>
                <p style={{ fontSize: '24px', fontWeight: 700, color: stat.color }}>
                  {stat.value}
                </p>
              </div>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: `${stat.color}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
              }}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
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
          background: 'rgba(108, 92, 231, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '36px',
          margin: '0 auto 20px',
        }}>
          🚀
        </div>
        <h3 style={{ fontWeight: 700, fontSize: '18px', marginBottom: '8px' }}>
          Get started with LetsSplit
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '400px', margin: '0 auto 24px', lineHeight: 1.7 }}>
          Create your first group or join an existing one using an invite code. Start tracking shared expenses effortlessly!
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn-primary" id="create-group-cta">
            + Create Group
          </button>
          <button className="btn-secondary" id="join-group-cta">
            Join with Code
          </button>
        </div>
      </div>
    </div>
  );
}
