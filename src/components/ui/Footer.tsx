'use client';

import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();

  // Hide footer on dashboard to prevent double scrollbars and layout breaking
  if (pathname?.startsWith('/dashboard')) {
    return null;
  }

  return (
    <footer style={{
      textAlign: 'center',
      padding: '24px 16px',
      fontSize: '13px',
      color: 'var(--text-muted)',
      borderTop: '1px solid var(--border-subtle)',
      background: 'var(--bg-secondary)',
      marginTop: 'auto'
    }}>
      <p style={{ margin: 0, fontWeight: 500 }}>
        © {new Date().getFullYear()} Akash Kumar. Made with ❤️
      </p>
    </footer>
  );
}
