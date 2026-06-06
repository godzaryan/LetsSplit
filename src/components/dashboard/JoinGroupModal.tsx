'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function JoinGroupModal({ onClose }: { onClose: () => void }) {
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Find group by invite code
      const { data: group, error: findError } = await supabase
        .from('groups')
        .select('id, name, invite_code, invite_expires_at')
        .eq('invite_code', inviteCode.trim())
        .single();

      if (findError || !group) {
        throw new Error('Invalid invite code. Please check and try again.');
      }

      // Check if invite has expired
      if (group.invite_expires_at && new Date(group.invite_expires_at) < new Date()) {
        throw new Error('This invite code has expired.');
      }

      // Check if already a member
      const { data: existing } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', group.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        throw new Error('You are already a member of this group!');
      }

      // Join the group
      const { error: joinError } = await supabase
        .from('group_members')
        .insert({
          group_id: group.id,
          user_id: user.id,
          role: 'member',
          added_by: user.id,
        });

      if (joinError) throw joinError;

      onClose();
      router.push(`/dashboard/group/${group.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to join group');
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 200,
      padding: '20px',
      backdropFilter: 'blur(4px)',
    }}
    onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="glass animate-fade-in" style={{
        width: '100%',
        maxWidth: '440px',
        borderRadius: '20px',
        padding: '32px',
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>
          Join a group
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '24px' }}>
          Enter the invite code shared by a group member.
        </p>

        <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              Invite Code
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g., Ab3xK9mQ"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              required
              autoFocus
              style={{
                textAlign: 'center',
                fontSize: '18px',
                fontWeight: 600,
                letterSpacing: '2px',
              }}
              id="join-group-code"
            />
          </div>

          {error && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '10px',
              background: 'rgba(255, 107, 107, 0.1)',
              border: '1px solid rgba(255, 107, 107, 0.2)',
              color: 'var(--accent-danger)',
              fontSize: '13px',
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button type="button" onClick={onClose} className="btn-secondary" style={{ flex: 1 }}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !inviteCode.trim()}
              style={{
                flex: 1,
                opacity: loading || !inviteCode.trim() ? 0.6 : 1,
              }}
              id="join-group-submit"
            >
              {loading ? 'Joining...' : 'Join Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
