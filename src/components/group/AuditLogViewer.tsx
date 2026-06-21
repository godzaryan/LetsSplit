'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { FileText, Users, Settings, CalendarClock, Flame, Plus, Pencil, Trash2 } from 'lucide-react';

interface AuditLogViewerProps {
  groupId: string;
  getMemberName: (memberId: string) => string;
  currencySymbol: string;
}

interface AuditEntry {
  id: string;
  expense_id: string | null;
  entity_type: string;
  entity_id: string | null;
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  const PAGE_SIZE = 50;
  const observer = useRef<IntersectionObserver | null>(null);
  const supabase = createClient();

  const fetchLogs = async (offset = 0) => {
    try {
      if (offset === 0) setLoading(true);
      else setLoadingMore(true);

      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          id,
          expense_id,
          entity_type,
          entity_id,
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
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) throw error;

      if (data) {
        if (offset === 0) {
          setLogs(data as any);
        } else {
          setLogs(prev => [...prev, ...(data as any)]);
        }
        setHasMore(data.length === PAGE_SIZE);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchLogs(0);
  }, [groupId]);

  const lastElementRef = useCallback((node: HTMLDivElement) => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        fetchLogs(logs.length);
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore, logs.length]);

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

  // Icon mapping based on entity type
  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'group_settings': return <Settings size={14} />;
      case 'maid': return <Users size={14} />;
      case 'scheduled_expense': return <CalendarClock size={14} />;
      case 'cylinder_usage': return <Flame size={14} />;
      case 'expense':
      default: return <FileText size={14} />;
    }
  };

  // Color mapping based on action
  const getActionColor = (action: string) => {
    if (action === 'created') return 'var(--accent-success)';
    if (action === 'deleted') return 'var(--accent-danger)';
    return 'var(--accent-warning)';
  };

  // Parse log message details based on entity type
  const renderLogDetails = (log: AuditEntry) => {
    const type = log.entity_type || 'expense';
    const action = log.action;
    const oldD = log.old_data || {};
    const newD = log.new_data || {};

    if (type === 'expense') {
      const description = newD.description || oldD.description || 'Unknown expense';
      return (
        <>
          <p style={{ fontSize: '13px', fontWeight: 500, wordBreak: 'break-word' }}>
            <span style={{ fontWeight: 700 }}>{getChangedByName(log)}</span> {action} expense <span style={{ color: 'var(--text-secondary)' }}>"{description}"</span>
          </p>
          {action === 'updated' && (
            <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
              {oldD.total_amount !== newD.total_amount && (
                <p>Amount: {currencySymbol}{Number(oldD.total_amount).toFixed(2)} → {currencySymbol}{Number(newD.total_amount).toFixed(2)}</p>
              )}
              {oldD.description !== newD.description && (
                <p>Description: "{oldD.description}" → "{newD.description}"</p>
              )}
            </div>
          )}
        </>
      );
    }

    if (type === 'group_settings') {
      return (
        <>
          <p style={{ fontSize: '13px', fontWeight: 500 }}>
            <span style={{ fontWeight: 700 }}>{getChangedByName(log)}</span> updated Group Settings
          </p>
          <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
            {oldD.allow_any_member_to_edit_expenses !== newD.allow_any_member_to_edit_expenses && (
              <p>Expense Edit Permission: {newD.allow_any_member_to_edit_expenses ? 'Anyone can edit' : 'Restricted to Creator/Payer/Admin'}</p>
            )}
            {oldD.labels !== newD.labels && (
              <p>Labels updated</p>
            )}
          </div>
        </>
      );
    }

    if (type === 'maid') {
      const name = newD.name || oldD.name || 'Maid';
      return (
        <>
          <p style={{ fontSize: '13px', fontWeight: 500 }}>
            <span style={{ fontWeight: 700 }}>{getChangedByName(log)}</span> {action} Maid details for <span style={{ color: 'var(--text-secondary)' }}>"{name}"</span>
          </p>
          {action === 'updated' && (
            <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
              {oldD.monthly_salary !== newD.monthly_salary && (
                <p>Salary: {currencySymbol}{oldD.monthly_salary} → {currencySymbol}{newD.monthly_salary}</p>
              )}
              {oldD.is_active !== newD.is_active && (
                <p>Status: {newD.is_active ? 'Active' : 'Inactive (Left)'}</p>
              )}
            </div>
          )}
        </>
      );
    }

    if (type === 'scheduled_expense') {
      const name = newD.name || oldD.name || 'Scheduled Expense';
      return (
        <>
          <p style={{ fontSize: '13px', fontWeight: 500 }}>
            <span style={{ fontWeight: 700 }}>{getChangedByName(log)}</span> {action} Scheduled Expense <span style={{ color: 'var(--text-secondary)' }}>"{name}"</span>
          </p>
          {action === 'updated' && (
            <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
              {oldD.amount !== newD.amount && (
                <p>Amount: {currencySymbol}{oldD.amount} → {currencySymbol}{newD.amount}</p>
              )}
            </div>
          )}
        </>
      );
    }

    if (type === 'cylinder_usage') {
      const date = newD.date || oldD.date;
      return (
        <>
          <p style={{ fontSize: '13px', fontWeight: 500 }}>
            <span style={{ fontWeight: 700 }}>{getChangedByName(log)}</span> logged Cylinder usage for <span style={{ color: 'var(--text-secondary)' }}>{date}</span>
          </p>
          <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
            <p>
              Morning: {newD.morning ? 'Yes' : 'No'} | 
              Afternoon: {newD.afternoon ? 'Yes' : 'No'} | 
              Night: {newD.night ? 'Yes' : 'No'}
            </p>
          </div>
        </>
      );
    }

    // Fallback
    return (
      <p style={{ fontSize: '13px', fontWeight: 500 }}>
        <span style={{ fontWeight: 700 }}>{getChangedByName(log)}</span> {action} {type}
      </p>
    );
  };

  if (loading && logs.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
        Loading universal audit logs...
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: '700px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ fontWeight: 700, fontSize: '16px', marginBottom: '2px' }}>Universal Audit Timeline</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Immutable record of all actions across your group
          </p>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>📜</div>
          <p style={{ fontWeight: 600, marginBottom: '4px' }}>No activity yet</p>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Changes to the group will appear here.
          </p>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          {/* Timeline line */}
          <div style={{
            position: 'absolute', left: '15px', top: '0', bottom: '0', width: '2px', background: 'var(--border-subtle)',
          }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {logs.map((log, index) => {
              const isLastElement = index === logs.length - 1;
              return (
                <div key={log.id} ref={isLastElement ? lastElementRef : null} style={{ display: 'flex', gap: '16px', paddingLeft: '4px' }}>
                  
                  {/* Timeline dot */}
                  <div style={{
                    width: '24px', height: '24px', borderRadius: '50%', background: 'var(--bg-primary)',
                    border: `2px solid ${getActionColor(log.action)}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, zIndex: 1, color: getActionColor(log.action)
                  }}>
                    {getEntityIcon(log.entity_type || 'expense')}
                  </div>

                  {/* Content */}
                  <div className="card" style={{ flex: 1, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ flex: '1 1 min-content', minWidth: '150px' }}>
                        {renderLogDetails(log)}
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0, marginLeft: '12px' }}>
                        {formatTime(log.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {loadingMore && (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>
              Loading older logs...
            </div>
          )}
          {!hasMore && logs.length > 0 && (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--border-active)', fontSize: '13px', fontWeight: 600 }}>
              End of history
            </div>
          )}
        </div>
      )}
    </div>
  );
}
