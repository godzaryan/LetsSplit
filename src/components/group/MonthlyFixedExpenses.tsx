'use client';

import { useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import AnimatedIcon from '../ui/AnimatedIcon';
import { Calendar, ChevronLeft, ChevronRight, CheckCircle2, Circle, ChevronDown, ChevronUp } from 'lucide-react';

interface MonthlyFixedExpensesProps {
  groupId: string;
  recurringExpenses: any[];
  members: any[];
  currencySymbol: string;
  currentRole: string;
  currentMemberId: string;
  onManage: () => void;
}

export default function MonthlyFixedExpenses({
  groupId,
  recurringExpenses,
  members,
  currencySymbol,
  currentRole,
  currentMemberId,
  onManage
}: MonthlyFixedExpensesProps) {
  const [loadingPaymentId, setLoadingPaymentId] = useState<string | null>(null);
  const [expandedExpenses, setExpandedExpenses] = useState<Record<string, boolean>>({});
  const supabase = createClient();

  const toggleExpand = (id: string) => {
    setExpandedExpenses(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Start with current month
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const changeMonth = (offset: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1));
  };

  const getMemberName = (memberId: string) => {
    const member = members.find((m: any) => m.id === memberId);
    if (!member) return 'Unknown';
    if (member.is_ghost) return member.ghost_name;
    return member.users?.display_name || 'Unknown';
  };

  // Format month string, e.g., "June 2026"
  const monthString = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const cycleDateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-01`;

  // Get active recurring expenses for this month
  const activeForMonth = useMemo(() => {
    return recurringExpenses.filter(re => {
      const start = new Date(re.start_date);
      const end = re.end_date ? new Date(re.end_date) : null;
      const startMonth = new Date(start.getFullYear(), start.getMonth(), 1);
      const endMonth = end ? new Date(end.getFullYear(), end.getMonth(), 1) : null;

      if (currentMonth < startMonth) return false;
      if (endMonth && currentMonth > endMonth) return false;
      return true;
    });
  }, [recurringExpenses, currentMonth]);

  const handleTogglePayment = async (re: any, memberId: string, amount: number, isPaid: boolean, paymentId: string | undefined) => {
    if (currentRole !== 'owner') return;
    
    // We use a composite string to identify what's loading
    const loadKey = `${re.id}-${memberId}`;
    setLoadingPaymentId(loadKey);

    try {
      if (isPaid && paymentId) {
        // 1. Fetch payment to get settlement_id
        const { data: paymentRecord } = await supabase.from('scheduled_expense_payments').select('settlement_id').eq('id', paymentId).single();
        
        // 2. Delete payment
        await supabase.from('scheduled_expense_payments').delete().eq('id', paymentId);
        
        // 3. Delete settlement if exists
        if (paymentRecord?.settlement_id) {
          await supabase.from('settlements').delete().eq('id', paymentRecord.settlement_id);
        }
        
        window.location.reload(); 
      } else {
        // Mark paid
        // 1. Create settlement
        const { data: settlementData, error: stErr } = await supabase.from('settlements').insert({
          group_id: groupId,
          paid_by: memberId,
          paid_to: currentMemberId, // Assuming owner is currentMemberId and they paid the base bill
          amount: amount
        }).select().single();
        
        if (stErr) throw stErr;

        // 2. Insert scheduled payment checklist record
        await supabase.from('scheduled_expense_payments').insert({
          recurring_expense_id: re.id,
          cycle_date: cycleDateStr,
          member_id: memberId,
          amount: amount,
          marked_by: currentMemberId,
          settlement_id: settlementData.id
        });
        
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPaymentId(null);
    }
  };

  if (recurringExpenses.length === 0 && currentRole !== 'owner') {
    return null; // Don't show if empty and not owner
  }

  return (
    <div className="card" style={{ marginBottom: '24px', padding: '0', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--bg-secondary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'rgba(108, 92, 231, 0.1)', color: 'var(--accent-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <AnimatedIcon animationType="rotate"><Calendar size={18} color="currentColor" /></AnimatedIcon>
          </div>
          <h3 style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>Scheduled Expenses</h3>
        </div>
        
        {currentRole === 'owner' && (
          <button onClick={onManage} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
            Manage
          </button>
        )}
      </div>

      {/* Month Navigation */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        padding: '16px',
        background: 'var(--bg-card)'
      }}>
        <button onClick={() => changeMonth(-1)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex' }}>
          <AnimatedIcon animationType="none"><ChevronLeft size={20} color="currentColor" /></AnimatedIcon>
        </button>
        <span style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text-primary)', minWidth: '120px', textAlign: 'center' }}>
          {monthString}
        </span>
        <button onClick={() => changeMonth(1)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex' }}>
          <AnimatedIcon animationType="none"><ChevronRight size={20} color="currentColor" /></AnimatedIcon>
        </button>
      </div>

      {/* List */}
      <div style={{ padding: '0 20px 20px 20px' }}>
        {activeForMonth.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '14px' }}>
            No scheduled expenses configured for this month.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {activeForMonth.map(re => {
              const payments = re.scheduled_expense_payments || [];
              const splits = re.recurring_expense_splits || [];
              const isExpanded = expandedExpenses[re.id];
              
              const paidCount = splits.filter((split: any) => 
                payments.some((p: any) => p.member_id === split.member_id && p.cycle_date === cycleDateStr)
              ).length;
              const totalCount = splits.length;

              return (
                <div key={re.id} style={{
                  background: 'var(--bg-hover)',
                  borderRadius: '16px',
                  border: '1px solid var(--border-subtle)',
                  overflow: 'hidden'
                }}>
                  {/* Expense Header */}
                  <div 
                    onClick={() => toggleExpand(re.id)}
                    style={{
                      padding: '16px',
                      borderBottom: isExpanded ? '1px solid var(--border-subtle)' : 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <div>
                      <h4 style={{ fontWeight: 800, fontSize: '15px', color: 'white', wordBreak: 'break-word', marginBottom: '2px' }}>
                        {re.name}
                      </h4>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        Total: {currencySymbol}{Number(re.amount).toFixed(2)} / {re.cycle}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        fontSize: '12px', fontWeight: 700,
                        color: paidCount === totalCount && totalCount > 0 ? 'var(--accent-success)' : 'var(--text-secondary)',
                        background: paidCount === totalCount && totalCount > 0 ? 'rgba(0, 204, 102, 0.1)' : 'var(--bg-secondary)',
                        padding: '4px 10px', borderRadius: '12px'
                      }}>
                        {paidCount}/{totalCount} Paid
                      </div>
                      <div style={{ color: 'var(--text-muted)' }}>
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </div>
                  </div>

                  {/* Checklist */}
                  {isExpanded && (
                    <div style={{ padding: '8px 16px' }}>
                    {splits.map((split: any) => {
                      // Find if this member paid for this cycle
                      const paymentRecord = payments.find((p: any) => p.member_id === split.member_id && p.cycle_date === cycleDateStr);
                      const isPaid = !!paymentRecord;
                      const isMe = split.member_id === currentMemberId;
                      const isLoading = loadingPaymentId === `${re.id}-${split.member_id}`;

                      return (
                        <div key={split.member_id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 0',
                          borderBottom: '1px solid var(--border-subtle)',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                              {getMemberName(split.member_id).charAt(0)}
                            </div>
                            <div>
                              <div style={{ fontWeight: isMe ? 800 : 600, fontSize: '14px', color: isMe ? 'white' : 'var(--text-primary)' }}>
                                {getMemberName(split.member_id)} {isMe && '(you)'}
                              </div>
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                Share: {currencySymbol}{Number(split.amount_owed).toFixed(2)}
                              </div>
                            </div>
                          </div>

                          <div>
                            {currentRole === 'owner' ? (
                              <button 
                                onClick={() => handleTogglePayment(re, split.member_id, split.amount_owed, isPaid, paymentRecord?.id)}
                                disabled={isLoading}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '6px',
                                  padding: '6px 12px', borderRadius: '8px',
                                  border: isPaid ? '1px solid rgba(0, 204, 102, 0.3)' : '1px solid var(--border-active)',
                                  background: isPaid ? 'rgba(0, 204, 102, 0.1)' : 'transparent',
                                  color: isPaid ? 'var(--accent-success)' : 'var(--text-secondary)',
                                  cursor: isLoading ? 'wait' : 'pointer',
                                  fontSize: '13px', fontWeight: 600,
                                  transition: 'all 0.2s ease'
                                }}
                              >
                                {isLoading ? (
                                  <span style={{ opacity: 0.7 }}>...</span>
                                ) : isPaid ? (
                                  <><CheckCircle2 size={16} /> Paid</>
                                ) : (
                                  <><Circle size={16} /> Mark Paid</>
                                )}
                              </button>
                            ) : (
                              <div style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                padding: '6px 12px', borderRadius: '8px',
                                background: isPaid ? 'rgba(0, 204, 102, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                                color: isPaid ? 'var(--accent-success)' : 'var(--text-muted)',
                                fontSize: '13px', fontWeight: 600
                              }}>
                                {isPaid ? <><CheckCircle2 size={16} /> Paid</> : <><Circle size={16} /> Unpaid</>}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
