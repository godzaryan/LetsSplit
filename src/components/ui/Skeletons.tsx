export function DashboardSkeleton() {
  return (
    <div style={{ padding: '32px', maxWidth: '900px' }}>
      {/* Welcome skeleton */}
      <div style={{ marginBottom: '40px' }}>
        <div className="skeleton skeleton-title" style={{ width: '280px' }} />
        <div className="skeleton skeleton-text short" />
      </div>

      {/* Stats skeleton */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '32px',
      }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton-card">
            <div className="skeleton skeleton-text" style={{ width: '80px' }} />
            <div className="skeleton" style={{ height: '28px', width: '120px', marginTop: '8px' }} />
          </div>
        ))}
      </div>

      {/* Empty state skeleton */}
      <div className="skeleton-card" style={{ padding: '60px 32px', textAlign: 'center' }}>
        <div className="skeleton skeleton-avatar" style={{ width: '80px', height: '80px', margin: '0 auto 16px' }} />
        <div className="skeleton skeleton-title" style={{ width: '200px', margin: '0 auto 8px' }} />
        <div className="skeleton skeleton-text" style={{ width: '300px', margin: '0 auto' }} />
      </div>
    </div>
  );
}

export function GroupSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header skeleton */}
      <div style={{
        padding: '24px 32px',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        <div className="skeleton skeleton-title" style={{ width: '200px', marginBottom: '8px' }} />
        <div className="skeleton skeleton-text short" style={{ marginBottom: '20px' }} />
        <div style={{ display: 'flex', gap: '24px', marginBottom: '16px' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: '14px', width: '100px' }} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton" style={{ height: '36px', width: '100px', borderRadius: '10px 10px 0 0' }} />
          ))}
        </div>
      </div>

      {/* Content skeleton */}
      <div style={{ flex: 1, padding: '24px 32px' }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton-card" style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div className="skeleton" style={{ width: '42px', height: '42px', borderRadius: '12px' }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton skeleton-text" style={{ width: '180px' }} />
                <div className="skeleton skeleton-text" style={{ width: '120px', height: '10px' }} />
              </div>
              <div className="skeleton" style={{ width: '80px', height: '20px' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AuthSkeleton() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
      padding: '20px',
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div className="skeleton skeleton-avatar" style={{ width: '40px', height: '40px', borderRadius: '12px', margin: '0 auto 12px' }} />
          <div className="skeleton skeleton-text" style={{ width: '120px', margin: '0 auto' }} />
        </div>
        <div className="skeleton-card" style={{ padding: '32px' }}>
          <div className="skeleton" style={{ height: '44px', borderRadius: '12px', marginBottom: '24px' }} />
          <div className="skeleton" style={{ height: '1px', marginBottom: '24px' }} />
          {[1, 2].map((i) => (
            <div key={i} style={{ marginBottom: '16px' }}>
              <div className="skeleton skeleton-text" style={{ width: '60px', marginBottom: '6px' }} />
              <div className="skeleton" style={{ height: '44px', borderRadius: '12px' }} />
            </div>
          ))}
          <div className="skeleton" style={{ height: '44px', borderRadius: '12px', marginTop: '16px' }} />
        </div>
      </div>
    </div>
  );
}
