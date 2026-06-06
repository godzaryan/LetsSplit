'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function UpiPromptModal({ userId, onComplete }: { userId: string, onComplete: () => void }) {
  const [upiId, setUpiId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  // Pattern for validating UPI ID (e.g., username@bank)
  const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedId = upiId.trim();

    if (!trimmedId) {
      setError('UPI ID cannot be empty');
      return;
    }

    if (!upiRegex.test(trimmedId)) {
      setError('Invalid UPI ID format. Expected format: username@bank');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({ upi_id: trimmedId })
        .eq('id', userId);

      if (updateError) throw updateError;
      
      onComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to save UPI ID');
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999, // Extremely high to block everything
      padding: '20px',
      backdropFilter: 'blur(8px)',
    }}>
      <div className="glass animate-fade-in" style={{
        width: '100%',
        maxWidth: '420px',
        borderRadius: '24px',
        padding: '32px',
        border: '1px solid var(--accent-primary)',
        boxShadow: '0 0 40px rgba(230, 0, 0, 0.2)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>💳</div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>Action Required</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.5 }}>
            To send and receive settlements seamlessly, please link your UPI ID to your account.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>
              Your UPI ID
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g., yourname@okicici"
              value={upiId}
              onChange={(e) => {
                setUpiId(e.target.value);
                setError('');
              }}
              style={{
                width: '100%',
                fontSize: '15px',
                padding: '14px 16px',
              }}
              disabled={loading}
            />
          </div>

          {error && (
            <div style={{
              padding: '12px',
              borderRadius: '12px',
              background: 'rgba(255, 26, 26, 0.1)',
              border: '1px solid rgba(255, 26, 26, 0.2)',
              color: 'var(--accent-danger)',
              fontSize: '13px',
              fontWeight: 500,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading || !upiId.trim()}
            style={{
              padding: '14px',
              fontSize: '15px',
              fontWeight: 700,
              marginTop: '8px',
              opacity: loading || !upiId.trim() ? 0.7 : 1,
            }}
          >
            {loading ? 'Verifying...' : 'Link UPI ID & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
