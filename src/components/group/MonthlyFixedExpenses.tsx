'use client';

import { useState, useMemo } from 'react';
import AnimatedIcon from '../ui/AnimatedIcon';
import { Calendar, ChevronLeft, ChevronRight, CheckCircle, ChevronDown, ChevronUp, Edit3 } from 'lucide-react';
import SettleMonthModal from './SettleMonthModal';

interface MonthlyFixedExpensesProps {
  groupId: string;
  recurringExpenses: any[];
  members: any[];
  expenses: any[];
  currencySymbol: string;
  currentRole: string;
  currentMemberId: string;
  onManage: () => void;
}

export default function MonthlyFixedExpenses({
  groupId,
  recurringExpenses,
  members,
  expenses,
  currencySymbol,
  currentRole,
  currentMemberId,
  onManage
}: MonthlyFixedExpensesProps) {
  const [expandedExpenses, setExpandedExpenses] = useState<Record<string, boolean>>({});
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [expenseToSettle, setExpenseToSettle] = useState<any>(null);

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
      const start = new Date(re.start_date);
      const end = re.end_date ? new Date(re.end_date) : null;
      const startMonth = new Date(start.getFullYear(), start.getMonth(), 1);
      const endMonth = end ? new Date(end.getFullYear(), end.getMonth(), 1) : null;

      if (currentMonth < startMonth) return false;
      if (endMonth && currentMonth > endMonth) return false;
      return true;
    });
  }, [recurringExpenses, currentMonth]);

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
            // Find if this cycle is settled in the ledger
            const settledLedgerEntry = expenses.find((e: any) => e.recurring_expense_id === expense.id && e.cycle_date === cycleDateStr);
            const isSettled = !!settledLedgerEntry;
            const isExpanded = expandedExpenses[expense.id];

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
                      background: isSettled ? 'rgba(46, 204, 113, 0.1)' : 'rgba(243, 156, 18, 0.1)', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center' 
                    }}>
                      {isSettled ? (
                        <CheckCircle size={20} color="var(--success)" />
                      ) : (
                        <Calendar size={20} color="var(--warning)" />
                      )}
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{expense.name}</h4>
                      <p style={{ margin: 0, fontSize: '13px', color: isSettled ? 'var(--success)' : 'var(--text-muted)', marginTop: '2px' }}>
                        {isSettled ? `Settled • Total: ${currencySymbol}${settledLedgerEntry.total_amount}` : `Pending • Target: ${currencySymbol}${expense.amount}`}
                      </p>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {isExpanded ? <ChevronUp size={20} color="var(--text-secondary)" /> : <ChevronDown size={20} color="var(--text-secondary)" />}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div style={{ padding: '0 20px 20px 72px', background: 'rgba(255,255,255,0.02)' }}>
                    
                    {isSettled ? (
                      <div style={{ background: 'var(--bg-tertiary)', borderRadius: '12px', padding: '16px', marginTop: '8px', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actual Payments</span>
                          <span style={{ fontSize: '12px', color: 'var(--success)', fontWeight: 600 }}>Recorded in Ledger</span>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {settledLedgerEntry.expense_payers?.map((payer: any) => (
                            <div key={payer.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)' }}></div>
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
                          This month has not been settled in the ledger yet.
                        </div>
                        {currentRole === 'owner' && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpenseToSettle(expense);
                              setSettleModalOpen(true);
                            }}
                            style={{
                              padding: '10px 16px', borderRadius: '8px', border: 'none',
                              background: 'var(--accent-primary)', color: 'white',
                              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: '6px'
                            }}
                          >
                            <Edit3 size={16} />
                            Settle Month
                          </button>
                        )}
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

      {/* Settlement Modal */}
      <SettleMonthModal 
        isOpen={settleModalOpen}
        onClose={() => setSettleModalOpen(false)}
        recurringExpense={expenseToSettle}
        members={members}
        currentCycleStr={cycleDateStr}
        groupId={groupId}
        currentMemberId={currentMemberId}
      />
    </div>
  );
}
