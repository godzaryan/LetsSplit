'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

interface AuditLogViewerProps {
  groupId: string;
  getMemberName: (memberId: string) => string;
  currencySymbol: string;
}

interface AuditEntry {
  id: string;
  expense_id: string | null;
  action: string;
  changed_by: string;
  old_data: any;
  new_data: any;
  created_at: string;
  users?: { display_name: string; email: string };
}

export default function AuditLogViewer({
  groupId,
  getMemberName,
  currencySymbol,
}: AuditLogViewerProps) {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchLogs = async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          id,
          expense_id,
          action,
          changed_by,
          old_data,
          new_data,
          created_at,
          users:changed_by (
            display_name,
            email
          )
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        setLogs(data as any);
      }
      setLoading(false);
    };

    fetchLogs();
  }, [groupId, supabase]);

  const actionColors: Record<string, string> = {
    created: 'var(--accent-success)',
    updated: 'var(--accent-warning)',
    deleted: 'var(--accent-danger)',
  };

  const actionIcons: Record<string, string> = {
    created: '➕',
    updated: '✏️',
    deleted: '🗑️',
  };

  const getChangedByName = (log: AuditEntry) => {
    const u = log.users as any;
    return u?.display_name || u?.email?.split('@')[0] || 'System';
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
        Loading audit logs...
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: '700px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ fontWeight: 700, fontSize: '16px', marginBottom: '2px' }}>Audit Log</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Immutable record of all expense changes
          </p>
        </div>
        <span style={{
          padding: '4px 10px',
          borderRadius: '6px',
          fontSize: '11px',
          fontWeight: 600,
          background: 'rgba(108, 92, 231, 0.1)',
          color: 'var(--accent-primary-light)',
        }}>
          {logs.length} entries
        </span>
      </div>

      {logs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>📜</div>
          <p style={{ fontWeight: 600, marginBottom: '4px' }}>No activity yet</p>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Changes to expenses will appear here.
          </p>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          {/* Timeline line */}
          <div style={{
            position: 'absolute',
            left: '15px',
            top: '0',
            bottom: '0',
            width: '2px',
            background: 'var(--border-subtle)',
          }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {logs.map((log) => {
              const description = log.new_data?.description || log.old_data?.description || 'Unknown expense';
              const amount = log.new_data?.total_amount || log.old_data?.total_amount;

              return (
                <div key={log.id} style={{
                  display: 'flex',
                  gap: '16px',
                  paddingLeft: '4px',
                }}>
                  {/* Timeline dot */}
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'var(--bg-primary)',
                    border: `2px solid ${actionColors[log.action] || 'var(--border-subtle)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    flexShrink: 0,
                    zIndex: 1,
                  }}>
                    {actionIcons[log.action] || '•'}
                  </div>

                  {/* Content */}
                  <div className="card" style={{
                    flex: 1,
                    padding: '14px 16px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ flex: '1 1 min-content', minWidth: '150px' }}>
                        <p style={{ fontSize: '13px', fontWeight: 500, wordBreak: 'break-word' }}>
                          <span style={{ fontWeight: 700 }}>{getChangedByName(log)}</span>
                          {' '}
                          <span style={{ color: actionColors[log.action] }}>
                            {log.action}
                          </span>
                          {' '}
                          <span style={{ color: 'var(--text-secondary)' }}>
                            &quot;{description}&quot;
                          </span>
                        </p>
                        {amount && (
                          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Amount: {currencySymbol}{Number(amount).toFixed(2)}
                          </p>
                        )}
                        {log.action === 'updated' && log.old_data && log.new_data && (
                          <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                            {log.old_data.total_amount !== log.new_data.total_amount && (
                              <p>
                                Amount: {currencySymbol}{Number(log.old_data.total_amount).toFixed(2)}
                                {' → '}
                                {currencySymbol}{Number(log.new_data.total_amount).toFixed(2)}
                              </p>
                            )}
                            {log.old_data.description !== log.new_data.description && (
                              <p>
                                Description: &quot;{log.old_data.description}&quot; → &quot;{log.new_data.description}&quot;
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      <span style={{
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        marginLeft: '12px',
                      }}>
                        {formatTime(log.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
