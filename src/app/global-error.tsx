'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{
        margin: 0,
        fontFamily: 'Inter, system-ui, sans-serif',
        background: '#0a0a0f',
        color: '#e8e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
      }}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'rgba(255, 107, 107, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '36px',
            margin: '0 auto 20px',
          }}>
            💥
          </div>
          <h1 style={{ fontWeight: 800, fontSize: '24px', marginBottom: '8px' }}>
            Something went wrong
          </h1>
          <p style={{
            color: '#9898b0',
            fontSize: '15px',
            marginBottom: '24px',
            maxWidth: '400px',
          }}>
            A critical error occurred. Please try refreshing the page.
          </p>
          <button
            onClick={reset}
            style={{
              padding: '14px 28px',
              borderRadius: '12px',
              background: '#6c5ce7',
              color: 'white',
              border: 'none',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
