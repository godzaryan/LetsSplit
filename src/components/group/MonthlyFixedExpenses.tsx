'use client';

import { useState, useMemo } from 'react';
import AnimatedIcon from '../ui/AnimatedIcon';
import { Calendar, ChevronLeft, ChevronRight, CheckCircle2, Clock } from 'lucide-react';

interface MonthlyFixedExpensesProps {
  recurringExpenses: any[];
  expenses: any[]; // The actual expenses to see if they are paid for this cycle
  currencySymbol: string;
  currentRole: string;
  onPay: (recurringTemplate: any, cycleDateStr: string) => void;
  onManage: () => void;
}

export default function MonthlyFixedExpenses({
  recurringExpenses,
  expenses,
  currencySymbol,
  currentRole,
  onPay,
  onManage
}: MonthlyFixedExpensesProps) {
  // Start with current month
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const changeMonth = (offset: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1));
  };

  // Format month string, e.g., "June 2026"
  const monthString = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  // The start of the cycle
  const cycleDateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-01`;

  // Get active recurring expenses for this month
  const activeForMonth = useMemo(() => {
    return recurringExpenses.filter(re => {
      const start = new Date(re.start_date);
      const end = re.end_date ? new Date(re.end_date) : null;
      // Truncate to month for comparison
      const startMonth = new Date(start.getFullYear(), start.getMonth(), 1);
      const endMonth = end ? new Date(end.getFullYear(), end.getMonth(), 1) : null;

      if (currentMonth < startMonth) return false;
      if (endMonth && currentMonth > endMonth) return false;
      return true;
    });
  }, [recurringExpenses, currentMonth]);

  // Map to find which ones are paid this month
  // An expense is considered the payment if recurring_expense_id matches AND cycle_date matches cycleDateStr
  const paidMapping = useMemo(() => {
    const mapping: Record<string, any> = {};
    expenses.forEach(ex => {
      if (ex.recurring_expense_id && ex.cycle_date === cycleDateStr && !ex.is_deleted) {
        mapping[ex.recurring_expense_id] = ex;
      }
    });
    return mapping;
  }, [expenses, cycleDateStr]);

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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {activeForMonth.map(re => {
              const paidExpense = paidMapping[re.id];
              const isPaid = !!paidExpense;

              return (
                <div key={re.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'var(--bg-hover)',
                  borderRadius: '12px',
                  border: '1px solid var(--border-subtle)'
                }}>
                  <div style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
                    <h4 style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', wordBreak: 'break-word', marginBottom: '2px' }}>
                      {re.name}
                    </h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Base: {currencySymbol}{Number(re.amount).toFixed(2)} / {re.cycle}
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {isPaid ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700, color: 'var(--accent-success)' }}>
                          <CheckCircle2 size={14} /> Paid
                        </span>
                        <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>
                          {currencySymbol}{Number(paidExpense.total_amount).toFixed(2)}
                        </span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: 'var(--accent-warning)' }}>
                          <Clock size={14} /> Pending
                        </span>
                        {currentRole === 'owner' && (
                          <button
                            onClick={() => onPay(re, cycleDateStr)}
                            className="btn-primary"
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                          >
                            Pay / Adjust
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
