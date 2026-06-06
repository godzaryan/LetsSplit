import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
      padding: '20px',
    }}>
      <div className="animate-fade-in" style={{ textAlign: 'center', maxWidth: '420px' }}>
        <div style={{
          fontSize: '80px',
          fontWeight: 900,
          lineHeight: 1,
          marginBottom: '8px',
          background: 'var(--gradient-primary)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          404
        </div>
        <h2 style={{ fontWeight: 700, fontSize: '20px', marginBottom: '8px' }}>
          Page not found
        </h2>
        <p style={{
          color: 'var(--text-secondary)',
          fontSize: '14px',
          marginBottom: '24px',
          lineHeight: 1.7,
        }}>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <Link href="/" className="btn-primary" style={{ textDecoration: 'none' }}>
            Go Home
          </Link>
          <Link href="/dashboard" className="btn-secondary" style={{ textDecoration: 'none' }}>
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
