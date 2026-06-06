'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import ConfirmDialog from '../ui/ConfirmDialog';

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
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);
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

  const handleRemoveMember = (memberId: string) => {
    setMemberToRemove(memberId);
  };

  const executeRemoveMember = async () => {
    if (!memberToRemove) return;

    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('id', memberToRemove);

      if (error) throw error;
      setMemberToRemove(null);
      router.refresh();
    } catch (err: any) {
      console.error('Failed to remove member:', err);
      setMemberToRemove(null);
      setErrorAlert(err.message || 'Failed to remove member');
    }
  };

  const handleApproveMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('group_members')
        .update({ status: 'approved' })
        .eq('id', memberId);

      if (error) throw error;
      router.refresh();
    } catch (err: any) {
      console.error('Failed to approve member:', err);
      setErrorAlert(err.message || 'Failed to approve member');
    }
  };

  const handleRejectMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
      router.refresh();
    } catch (err: any) {
      console.error('Failed to reject member:', err);
      setErrorAlert(err.message || 'Failed to reject member');
    }
  };

  const approvedMembers = members.filter(m => m.status === 'approved' || m.status === undefined);
  const pendingMembers = members.filter(m => m.status === 'pending');

  const roleColors: Record<string, string> = {
    owner: '#ffaa00',
    admin: 'var(--accent-primary-light)',
    member: 'var(--text-muted)',
  };

  const roleBadgeBg: Record<string, string> = {
    owner: 'rgba(255, 170, 0, 0.1)',
    admin: 'rgba(230, 0, 0, 0.1)',
    member: 'rgba(255, 255, 255, 0.05)',
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '600px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-primary)' }}>
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

      {/* Pending Requests Section (Only visible to managers) */}
      {canManage && pendingMembers.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h4 style={{ fontWeight: 700, fontSize: '13px', color: 'var(--accent-warning)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Pending Requests ({pendingMembers.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {pendingMembers.map((member) => {
              const name = member.users?.display_name || member.users?.email?.split('@')[0] || 'Unknown';
              const email = member.users?.email;
              return (
                <div key={member.id} style={{
                  padding: '14px 18px',
                  background: 'rgba(255, 170, 0, 0.05)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 170, 0, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '14px',
                  flexWrap: 'wrap',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '50%',
                      background: 'rgba(255, 170, 0, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: '16px', color: 'var(--accent-warning)', overflow: 'hidden'
                    }}>
                      {member.users?.avatar_url ? (
                        <img src={member.users.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{name}</div>
                      {email && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{email}</div>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => handleApproveMember(member.id)} className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px', minHeight: 'auto' }}>
                      Approve
                    </button>
                    <button onClick={() => handleRejectMember(member.id)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', minHeight: 'auto', background: 'rgba(255, 26, 26, 0.1)', color: 'var(--accent-danger)' }}>
                      Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Members list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {approvedMembers.map((member: any) => {
          const isGhost = member.is_ghost;
          const name = isGhost ? member.ghost_name : (member.users?.display_name || member.users?.email?.split('@')[0] || 'Unknown');
          const email = isGhost ? null : member.users?.email;
          const isSelf = member.user_id === currentUserId;

          return (
            <div key={member.id} style={{
              padding: '14px 18px',
              background: 'var(--bg-hover)',
              borderRadius: '12px',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              flexWrap: 'wrap',
            }}>
              {/* Avatar */}
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: isGhost ? 'rgba(255, 170, 0, 0.1)' : 'rgba(230, 0, 0, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '16px',
                flexShrink: 0,
                color: isGhost ? 'var(--accent-warning)' : 'var(--accent-primary-light)',
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
                    fontWeight: isSelf ? 800 : 600,
                    fontSize: '14px',
                    color: 'var(--text-primary)',
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
                      background: 'rgba(255, 170, 0, 0.1)',
                      color: 'var(--accent-warning)',
                      fontWeight: 700,
                    }}>
                      GUEST
                    </span>
                  )}
                </div>
                {email && (
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{email}</p>
                )}
              </div>

              {/* Role badge */}
              <span style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
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
                    fontSize: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 26, 26, 0.15)';
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

      {/* Dialogs */}
      <ConfirmDialog
        isOpen={!!memberToRemove}
        title="Remove Member"
        message="Are you sure you want to remove this member from the group?"
        confirmText="Remove"
        type="danger"
        onConfirm={executeRemoveMember}
        onCancel={() => setMemberToRemove(null)}
      />

      <ConfirmDialog
        isOpen={!!errorAlert}
        title="Error"
        message={errorAlert || ''}
        confirmText="OK"
        isAlert={true}
        onConfirm={() => setErrorAlert(null)}
        onCancel={() => setErrorAlert(null)}
      />
    </div>
  );
}
