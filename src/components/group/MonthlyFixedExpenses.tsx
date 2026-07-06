'use client';

import { useState, useMemo, useEffect } from 'react';
import AnimatedIcon from '../ui/AnimatedIcon';
import { Calendar, ChevronLeft, ChevronRight, CheckCircle, ChevronDown, ChevronUp, Edit3 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { fetchMaidDataForMonth, calculateMaidPayout } from '@/lib/services/maid';

interface MonthlyFixedExpensesProps {
  groupId: string;
  recurringExpenses: any[];
  members: any[];
  expenses: any[];
  currencySymbol: string;
  currentRole: string;
  currentMemberId: string;
  onManage: () => void;
  onSettleMonth?: (expense: any, cycleDateStr: string) => void;
}

export default function MonthlyFixedExpenses({
  groupId,
  recurringExpenses,
  members,
  expenses,
  currencySymbol,
  currentRole,
  currentMemberId,
  onManage,
  onSettleMonth
}: MonthlyFixedExpensesProps) {
  const [expandedExpenses, setExpandedExpenses] = useState<Record<string, boolean>>({});
  const [maidTargetAmount, setMaidTargetAmount] = useState<number | null>(null);

  // Start with current month
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const toggleExpand = (id: string) => {
    setExpandedExpenses(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const changeMonth = (offset: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1));
  };

  const getMemberName = (memberId: string) => {
    const member = members.find((m: any) => m.id === memberId);
    if (!member) return 'Unknown';
    if (member.is_ghost) return member.ghost_name;
    return member.users?.display_name || member.users?.email || 'Unknown';
  };

  const cycleDateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-01`;
  const monthString = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const activeForMonth = useMemo(() => {
    return recurringExpenses.filter(re => {
      if (re.name.toLowerCase() === 'cylinder') return false;
      
      const start = new Date(re.start_date);
      const end = re.end_date ? new Date(re.end_date) : null;
      const startMonth = new Date(start.getFullYear(), start.getMonth(), 1);
      const endMonth = end ? new Date(end.getFullYear(), end.getMonth(), 1) : null;

      if (currentMonth < startMonth) return false;
      if (endMonth && currentMonth > endMonth) return false;
      
      // If one-time, only show in the exact start month
      if (re.cycle === 'one-time') {
        if (currentMonth.getFullYear() !== startMonth.getFullYear() || currentMonth.getMonth() !== startMonth.getMonth()) return false;
      }
      
      // If yearly, only show in the same month each year
      if (re.cycle === 'yearly') {
        if (currentMonth.getMonth() !== startMonth.getMonth()) return false;
      }
      
      return true;
    });
  }, [recurringExpenses, currentMonth]);

  useEffect(() => {
    const hasMaid = activeForMonth.some(e => e.name.toLowerCase() === 'maid');
    if (hasMaid) {
      const loadMaidData = async () => {
        const supabase = createClient();
        try {
          const maidsData = await fetchMaidDataForMonth(supabase, groupId, currentMonth);
          if (maidsData && maidsData.length > 0) {
            let total = 0;
            maidsData.forEach((data: any) => {
              const calc = calculateMaidPayout(data.maid, data.attendance, data.bonuses, currentMonth);
              total += calc ? calc.finalPayout : Number(data.maid.monthly_salary || 0);
            });
            setMaidTargetAmount(total);
          } else {
            setMaidTargetAmount(null);
          }
        } catch (e) {
          console.error('Failed to load Maid data for month', e);
        }
      };
      loadMaidData();
    } else {
      setMaidTargetAmount(null);
    }
  }, [activeForMonth, currentMonth, groupId]);

  if (recurringExpenses.length === 0 && currentRole !== 'owner') {
    return null;
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button onClick={() => changeMonth(-1)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
            <ChevronLeft size={18} />
          </button>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', minWidth: '90px', textAlign: 'center' }}>
            {monthString}
          </span>
          <button onClick={() => changeMonth(1)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* List */}
      <div style={{ padding: '0' }}>
        {activeForMonth.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
            No active scheduled expenses for this month.
          </div>
        ) : (
          activeForMonth.map((expense) => {
            // Find all linked expenses for this cycle
            const linkedExpenses = expenses.filter((e: any) => e.recurring_expense_id === expense.id && e.cycle_date === cycleDateStr);
            const totalLinkedAmount = linkedExpenses.reduce((sum, e) => sum + Number(e.total_amount || 0), 0);
            
            const isMaid = expense.name.toLowerCase() === 'maid';
            const targetAmount = isMaid && maidTargetAmount !== null 
              ? maidTargetAmount 
              : Number(expense.amount || 0);

            // Calculate settlement status
            const isFullySettled = targetAmount > 0 ? totalLinkedAmount >= targetAmount : linkedExpenses.length > 0;
            const isPartiallySettled = totalLinkedAmount > 0 && !isFullySettled;
            const isExpanded = expandedExpenses[expense.id];

            let statusNode: React.ReactNode = null;
            
            const isOverpaid = targetAmount > 0 && totalLinkedAmount > targetAmount;
            
            if (isOverpaid) {
              statusNode = (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>Paid Extra</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 500 }}>
                    <span style={{ color: 'var(--text-primary)', background: 'var(--bg-tertiary)', padding: '2px 8px', borderRadius: '12px' }}>
                      Target: {currencySymbol}{targetAmount.toFixed(2)}
                    </span>
                    <span style={{ color: 'var(--accent-primary)', background: 'rgba(230, 0, 0, 0.1)', padding: '2px 8px', borderRadius: '12px' }}>
                      Extra: {currencySymbol}{(totalLinkedAmount - targetAmount).toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            } else if (isFullySettled) {
              statusNode = (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--accent-success)' }}>Settled</span>
                  <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-primary)', background: 'var(--bg-tertiary)', padding: '2px 8px', borderRadius: '12px' }}>
                    Total: {currencySymbol}{totalLinkedAmount.toFixed(2)}
                  </div>
                </div>
              );
            } else if (isPartiallySettled) {
              statusNode = (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--accent-warning)' }}>Partially Settled</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 500 }}>
                    <span style={{ color: 'var(--text-primary)', background: 'var(--bg-tertiary)', padding: '2px 8px', borderRadius: '12px' }}>
                      Paid: {currencySymbol}{totalLinkedAmount.toFixed(2)}
                    </span>
                    <span style={{ color: 'var(--accent-warning)', background: 'rgba(255, 170, 0, 0.1)', padding: '2px 8px', borderRadius: '12px' }}>
                      Left: {currencySymbol}{Math.max(0, targetAmount - totalLinkedAmount).toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            } else {
              statusNode = (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Pending</span>
                  <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-primary)', background: 'var(--bg-tertiary)', padding: '2px 8px', borderRadius: '12px' }}>
                    Target: {targetAmount === 0 ? 'Variable' : `${currencySymbol}${targetAmount.toFixed(2)}`}
                  </div>
                </div>
              );
            }

            // Aggregate payers from all linked expenses
            const aggregatedPayers = linkedExpenses.reduce((acc: any, e: any) => {
              e.expense_payers?.forEach((payer: any) => {
                if (!acc[payer.member_id]) {
                  acc[payer.member_id] = { ...payer, amount_paid: 0 };
                }
                acc[payer.member_id].amount_paid += Number(payer.amount_paid || 0);
              });
              return acc;
            }, {});
            const mergedPayers: any[] = Object.values(aggregatedPayers);

            return (
              <div key={expense.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                {/* Clickable Header */}
                <div 
                  onClick={() => toggleExpand(expense.id)}
                  style={{ 
                    padding: '16px 20px', 
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                    cursor: 'pointer',
                    background: isExpanded ? 'rgba(255,255,255,0.02)' : 'transparent',
                    transition: 'background 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                      width: '40px', height: '40px', borderRadius: '10px', 
                      background: isFullySettled ? 'rgba(0, 204, 102, 0.1)' : 'rgba(255, 170, 0, 0.1)', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center' 
                    }}>
                      {isFullySettled ? (
                        <CheckCircle size={20} color="var(--accent-success)" />
                      ) : (
                        <Calendar size={20} color="var(--accent-warning)" />
                      )}
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{expense.name}</h4>
                      <div style={{ margin: 0, fontSize: '13px', color: isFullySettled ? 'var(--accent-success)' : isPartiallySettled ? 'var(--accent-warning)' : 'var(--text-muted)', marginTop: '2px' }}>
                        {statusNode}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {isExpanded ? <ChevronUp size={20} color="var(--text-secondary)" /> : <ChevronDown size={20} color="var(--text-secondary)" />}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div style={{ padding: '0 20px 20px 72px', background: 'rgba(255,255,255,0.02)' }}>
                    
                    {totalLinkedAmount > 0 ? (
                      <div style={{ background: 'var(--bg-tertiary)', borderRadius: '12px', padding: '16px', marginTop: '8px', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actual Payments</span>
                          <span style={{ fontSize: '12px', color: isFullySettled ? 'var(--accent-success)' : 'var(--accent-warning)', fontWeight: 600 }}>Recorded in Ledger</span>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {mergedPayers.map((payer: any) => (
                            <div key={payer.member_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: isFullySettled ? 'var(--accent-success)' : 'var(--accent-warning)' }}></div>
                                <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                                  {getMemberName(payer.member_id)} {payer.member_id === currentMemberId && '(You)'}
                                </span>
                              </div>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                {currencySymbol}{payer.amount_paid}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div style={{ marginTop: '8px' }}>
                        <div style={{ marginBottom: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
                          This month has not been settled in the ledger yet. Add an expense manually and link it to this template.
                        </div>
                      </div>
                    )}
                    
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Manage Button */}
      {currentRole === 'owner' && (
        <div style={{ padding: '12px 20px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-subtle)' }}>
          <button 
            onClick={onManage}
            style={{ 
              width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-active)', 
              background: 'transparent', color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600, 
              cursor: 'pointer' 
            }}
          >
            Manage Scheduled Templates
          </button>
        </div>
      )}

    </div>
  );
}
