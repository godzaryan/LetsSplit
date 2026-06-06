'use client';

import { useEffect, useState } from 'react';

export default function GlobalLoader() {
  const [activeRequests, setActiveRequests] = useState(0);

  useEffect(() => {
    // Only intercept if we have a Supabase URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return;

    const originalFetch = window.fetch;

    window.fetch = async function (...args) {
      const url = typeof args[0] === 'string' ? args[0] : args[0] instanceof Request ? args[0].url : '';
      
      // Check if this request is headed to our Supabase instance
      const isSupabaseRequest = url.startsWith(supabaseUrl);

      if (isSupabaseRequest) {
        setActiveRequests((prev) => prev + 1);
      }

      try {
        const response = await originalFetch.apply(this, args);
        return response;
      } finally {
        if (isSupabaseRequest) {
          setActiveRequests((prev) => Math.max(0, prev - 1));
        }
      }
    };

    return () => {
      // Restore original fetch on unmount
      window.fetch = originalFetch;
    };
  }, []);

  if (activeRequests === 0) return null;

  return (
    <div 
      className="animate-fade-in"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999, // Needs to be above everything, including modals
        backdropFilter: 'blur(6px)',
      }}
    >
      <div style={{
        background: 'var(--bg-secondary)',
        padding: '24px 32px',
        borderRadius: '20px',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid rgba(108, 92, 231, 0.2)',
          borderTopColor: 'var(--accent-primary)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{
          color: 'var(--text-primary)',
          fontSize: '15px',
          fontWeight: 600,
          letterSpacing: '0.5px'
        }}>
          Syncing with database...
        </p>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
}
