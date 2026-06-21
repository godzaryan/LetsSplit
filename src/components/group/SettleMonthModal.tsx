import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { X, CheckCircle, Calculator, AlertCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  recurringExpense: any;
  members: any[];
  currentCycleStr: string;
  groupId: string;
  currentMemberId: string;
}

export default function SettleMonthModal({ isOpen, onClose, recurringExpense, members, currentCycleStr, groupId, currentMemberId }: Props) {
  const [actualTotal, setActualTotal] = useState<number>(Number(recurringExpense?.amount) || 0);
  const [payments, setPayments] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (recurringExpense) {
      setActualTotal(Number(recurringExpense.amount));
      
      // Default: Assume nobody paid yet, or pre-fill with targets?
      // Pre-filling with 0 forces the owner to type exactly who paid what.
      const initial: Record<string, number> = {};
      recurringExpense.recurring_expense_splits?.forEach((s: any) => {
        initial[s.member_id] = 0;
      });
      setPayments(initial);
    }
  }, [recurringExpense]);

  if (!isOpen || !recurringExpense) return null;

  const handleAmountChange = (memberId: string, val: string) => {
    const num = parseFloat(val);
    setPayments(prev => ({ ...prev, [memberId]: isNaN(num) ? 0 : num }));
  };

  const currentTotalPaid = Object.values(payments).reduce((sum, val) => sum + (val || 0), 0);
  const isBalanced = Math.abs(currentTotalPaid - actualTotal) < 0.01;
  const diff = actualTotal - currentTotalPaid;

  const handleSave = async () => {
    if (!isBalanced) {
      setError(`Payments must equal the Actual Total. Currently off by ₹${diff.toFixed(2)}.`);
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // 1. Create the Expense
      const dateForDb = new Date().toISOString().split('T')[0];
      const { data: newExp, error: expErr } = await supabase.from('expenses').insert({
        group_id: groupId,
        description: `${recurringExpense.name} - ${new Date(currentCycleStr).toLocaleString('default', { month: 'long', year: 'numeric' })}`,
        total_amount: actualTotal,
        date: dateForDb,
        labels: ['Scheduled'],
        created_by: currentMemberId,
        recurring_expense_id: recurringExpense.id,
        cycle_date: currentCycleStr,
        split_type: recurringExpense.split_type
      }).select('id').single();

      if (expErr) throw expErr;

      // 2. Create Expense Payers (Who actually gave cash)
      const payersToInsert = Object.entries(payments)
        .filter(([_, amt]) => amt > 0)
        .map(([member_id, amount_paid]) => ({
          expense_id: newExp.id,
          member_id,
          amount_paid
        }));

      if (payersToInsert.length > 0) {
        const { error: payersErr } = await supabase.from('expense_payers').insert(payersToInsert);
        if (payersErr) throw payersErr;
      }

      // 3. Create Expense Splits (Who owes what - based on original targets)
      // If actualTotal changed from target, we need to scale the splits proportionally so they add up to actualTotal.
      const originalTarget = Number(recurringExpense.amount);
      const ratio = actualTotal / originalTarget;

      const splitsToInsert = recurringExpense.recurring_expense_splits.map((s: any) => ({
        expense_id: newExp.id,
        member_id: s.member_id,
        amount_owed: Number((Number(s.amount_owed) * ratio).toFixed(2)),
        percentage: s.percentage,
        shares: s.shares
      }));

      // Fix rounding errors in splits to match actualTotal exactly
      const splitsTotal = splitsToInsert.reduce((sum: number, s: any) => sum + s.amount_owed, 0);
      const splitDiff = actualTotal - splitsTotal;
      if (Math.abs(splitDiff) > 0.001 && splitsToInsert.length > 0) {
        splitsToInsert[0].amount_owed = Number((splitsToInsert[0].amount_owed + splitDiff).toFixed(2));
      }

      const { error: splitsErr } = await supabase.from('expense_splits').insert(splitsToInsert);
      if (splitsErr) throw splitsErr;

      window.location.reload();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to settle month.');
      setIsSubmitting(false);
    }
  };

  const getMemberName = (id: string) => {
    const m = members.find(m => m.id === id);
    if (!m) return 'Unknown';
    return m.users?.raw_user_meta_data?.full_name || m.users?.email || 'User';
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      padding: '20px'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '450px', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-xl)', overflow: 'hidden', padding: 0 }}>
        
        {/* Header */}
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Settle {recurringExpense.name}</h2>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              For {new Date(currentCycleStr).toLocaleString('default', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '8px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          
          {error && (
            <div style={{ padding: '12px', background: 'rgba(231, 76, 60, 0.1)', color: 'var(--danger)', borderRadius: '12px', fontSize: '13px', marginBottom: '20px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{error}</span>
            </div>
          )}

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Actual Total Paid
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontWeight: 600 }}>₹</span>
              <input 
                type="number" 
                value={actualTotal}
                onChange={(e) => setActualTotal(parseFloat(e.target.value) || 0)}
                style={{
                  width: '100%', padding: '14px 16px 14px 36px', borderRadius: '12px',
                  border: '1px solid var(--border-active)', background: 'var(--bg-tertiary)',
                  color: 'white', fontSize: '18px', fontWeight: 700,
                  outline: 'none', transition: 'border-color 0.2s'
                }}
              />
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', margin: 0 }}>
              Original target was ₹{recurringExpense.amount}. Edit this if there were discounts or flat repairs.
            </p>
          </div>

          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Who Paid What? (Cash Pooling)
          </label>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recurringExpense.recurring_expense_splits?.map((split: any) => {
              const memberName = getMemberName(split.member_id);
              const isYou = split.member_id === currentMemberId;
              
              return (
                <div key={split.member_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {memberName} {isYou && <span style={{ color: 'var(--accent-primary)', fontSize: '12px' }}>(You)</span>}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Target: ₹{split.amount_owed}
                    </span>
                  </div>
                  
                  <div style={{ position: 'relative', width: '120px' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: '13px' }}>₹</span>
                    <input 
                      type="number"
                      value={payments[split.member_id] === 0 ? '' : payments[split.member_id]}
                      onChange={(e) => handleAmountChange(split.member_id, e.target.value)}
                      placeholder="0"
                      style={{
                        width: '100%', padding: '10px 10px 10px 24px', borderRadius: '8px',
                        border: '1px solid var(--border-active)', background: 'var(--bg-tertiary)',
                        color: 'white', fontSize: '14px', fontWeight: 600,
                        outline: 'none', textAlign: 'right'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Math Check Footer */}
          <div style={{ 
            marginTop: '24px', padding: '16px', borderRadius: '12px', 
            background: isBalanced ? 'rgba(46, 204, 113, 0.1)' : 'rgba(243, 156, 18, 0.1)',
            border: `1px solid ${isBalanced ? 'rgba(46, 204, 113, 0.3)' : 'rgba(243, 156, 18, 0.3)'}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Calculator size={18} color={isBalanced ? 'var(--success)' : 'var(--warning)'} />
              <span style={{ fontSize: '14px', fontWeight: 600, color: isBalanced ? 'var(--success)' : 'var(--warning)' }}>
                {isBalanced ? 'Perfectly Balanced' : `Off by ₹${Math.abs(diff).toFixed(2)}`}
              </span>
            </div>
            <span style={{ fontSize: '16px', fontWeight: 800, color: 'white' }}>
              ₹{currentTotalPaid.toFixed(2)} / ₹{actualTotal.toFixed(2)}
            </span>
          </div>

        </div>

        {/* Actions */}
        <div style={{ padding: '20px', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '12px' }}>
          <button 
            onClick={onClose}
            style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--border-active)', background: 'transparent', color: 'white', fontWeight: 600, cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={!isBalanced || isSubmitting}
            style={{ 
              flex: 1, padding: '12px', borderRadius: '12px', border: 'none', 
              background: isBalanced ? 'var(--accent-primary)' : 'var(--border-active)', 
              color: isBalanced ? 'white' : 'var(--text-muted)', 
              fontWeight: 600, cursor: isBalanced ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            {isSubmitting ? 'Saving...' : (
              <>
                <CheckCircle size={18} />
                Add to Ledger
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
