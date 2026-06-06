'use client';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      padding: '40px',
    }}>
      <div style={{ textAlign: 'center', maxWidth: '420px' }}>
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: 'rgba(255, 107, 107, 0.1)',
          border: '2px solid rgba(255, 107, 107, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '32px',
          margin: '0 auto 20px',
          animation: 'pulse-glow 2s infinite',
        }}>
          ⚠️
        </div>
        <h2 style={{ fontWeight: 700, fontSize: '20px', marginBottom: '8px' }}>
          Oops, something broke
        </h2>
        <p style={{
          color: 'var(--text-secondary)',
          fontSize: '14px',
          marginBottom: '24px',
          lineHeight: 1.7,
        }}>
          {error.message || 'An unexpected error occurred while loading this page.'}
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button className="btn-primary" onClick={reset}>
            Try Again
          </button>
          <a href="/dashboard" className="btn-secondary" style={{ textDecoration: 'none' }}>
            Go Home
          </a>
        </div>
        {error.digest && (
          <p style={{
            marginTop: '20px',
            fontSize: '11px',
            color: 'var(--text-muted)',
            fontFamily: 'monospace',
          }}>
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
