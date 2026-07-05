'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function Footer() {
  const pathname = usePathname();

  // Hide footer on dashboard to prevent double scrollbars and layout breaking
  if (pathname?.startsWith('/dashboard')) {
    return null;
  }

  return (
    <footer style={{
      padding: '32px 16px',
      fontSize: '14px',
      color: 'var(--text-muted)',
      borderTop: '1px solid var(--border-subtle)',
      background: 'var(--bg-secondary)',
      marginTop: 'auto',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '16px'
    }}>
      <div style={{
        display: 'flex',
        gap: '24px',
        flexWrap: 'wrap',
        justifyContent: 'center',
        fontWeight: 500
      }}>
        <Link href="/terms" style={{ color: 'inherit', textDecoration: 'none' }}>
          Terms & Conditions
        </Link>
        <Link href="/privacy" style={{ color: 'inherit', textDecoration: 'none' }}>
          Privacy Policy
        </Link>
      </div>
      <p style={{ margin: 0, fontWeight: 400, textAlign: 'center', fontSize: '13px', opacity: 0.8 }}>
        © {new Date().getFullYear()} <a href="https://kraftd.in/" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline', fontWeight: 600 }}>Kraftd</a>. All rights reserved.
      </p>
    </footer>
  );
}
