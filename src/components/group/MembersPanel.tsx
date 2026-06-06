'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface MembersPanelProps {
  group: any;
  members: any[];
  currentUserId: string;
  currentRole: string;
}

export default function MembersPanel({
  group,
  members,
  currentUserId,
  currentRole,
}: MembersPanelProps) {
  const [showAddGhost, setShowAddGhost] = useState(false);
  const [ghostName, setGhostName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const canManage = currentRole === 'owner' || currentRole === 'admin';

  const handleAddGhost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ghostName.trim()) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('group_members')
        .insert({
          group_id: group.id,
          is_ghost: true,
          ghost_name: ghostName.trim(),
          role: 'member',
          added_by: user?.id,
        });

      if (error) throw error;
      setGhostName('');
      setShowAddGhost(false);
      router.refresh();
    } catch (err) {
      console.error('Failed to add ghost member:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
      router.refresh();
    } catch (err) {
      console.error('Failed to remove member:', err);
    }
  };

  const roleColors: Record<string, string> = {
    owner: '#fdcb6e',
    admin: '#6c5ce7',
    member: 'var(--text-muted)',
  };

  const roleBadgeBg: Record<string, string> = {
    owner: 'rgba(253, 203, 110, 0.1)',
    admin: 'rgba(108, 92, 231, 0.1)',
    member: 'rgba(104, 104, 160, 0.1)',
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '600px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ fontWeight: 700, fontSize: '16px' }}>
          Members ({members.length})
        </h3>
        {canManage && (
          <button
            className="btn-secondary"
            onClick={() => setShowAddGhost(!showAddGhost)}
            style={{ fontSize: '12px', padding: '8px 14px' }}
          >
            + Add Guest
          </button>
        )}
      </div>

      {/* Add ghost form */}
      {showAddGhost && (
        <form onSubmit={handleAddGhost} className="card" style={{ marginBottom: '16px', padding: '16px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
            Add a guest member who doesn&apos;t have an account. You can track expenses for them.
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              className="input-field"
              placeholder="Guest name (e.g., Mom, Uncle Raj)"
              value={ghostName}
              onChange={(e) => setGhostName(e.target.value)}
              required
              autoFocus
              style={{ flex: 1 }}
            />
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !ghostName.trim()}
              style={{ fontSize: '13px', whiteSpace: 'nowrap' }}
            >
              {loading ? 'Adding...' : 'Add'}
            </button>
          </div>
        </form>
      )}

      {/* Members list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {members.map((member: any) => {
          const isGhost = member.is_ghost;
          const name = isGhost ? member.ghost_name : (member.users?.display_name || member.users?.email?.split('@')[0] || 'Unknown');
          const email = isGhost ? null : member.users?.email;
          const isSelf = member.user_id === currentUserId;

          return (
            <div key={member.id} className="card" style={{
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
            }}>
              {/* Avatar */}
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: isGhost ? 'rgba(0, 206, 201, 0.1)' : 'rgba(108, 92, 231, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '16px',
                flexShrink: 0,
                color: isGhost ? 'var(--accent-secondary)' : 'var(--accent-primary-light)',
                overflow: 'hidden',
              }}>
                {member.users?.avatar_url ? (
                  <img src={member.users.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  name.charAt(0).toUpperCase()
                )}
              </div>

              {/* Name & email */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontWeight: isSelf ? 700 : 500,
                    fontSize: '14px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {name}{isSelf && ' (you)'}
                  </span>
                  {isGhost && (
                    <span style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: 'rgba(0, 206, 201, 0.1)',
                      color: 'var(--accent-secondary)',
                      fontWeight: 600,
                    }}>
                      GUEST
                    </span>
                  )}
                </div>
                {email && (
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '1px' }}>{email}</p>
                )}
              </div>

              {/* Role badge */}
              <span style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                background: roleBadgeBg[member.role],
                color: roleColors[member.role],
                flexShrink: 0,
              }}>
                {member.role}
              </span>

              {/* Remove button */}
              {canManage && !isSelf && member.role !== 'owner' && (
                <button
                  onClick={() => handleRemoveMember(member.id)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,107,107,0.1)';
                    e.currentTarget.style.color = 'var(--accent-danger)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-muted)';
                  }}
                  title="Remove member"
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
