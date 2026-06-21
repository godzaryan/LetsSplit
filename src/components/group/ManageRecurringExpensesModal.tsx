'use client';

import { createClient } from '@/lib/supabase/client';
import { useState } from 'react';
import AnimatedIcon from '../ui/AnimatedIcon';
import { X, Plus, Settings } from 'lucide-react';

interface ManageRecurringExpensesModalProps {
  groupId: string;
  members: any[];
  currencySymbol: string;
  currentMemberId: string;
  recurringExpenses: any[];
  onClose: () => void;
}

type SplitType = 'equal' | 'exact' | 'percentage' | 'shares';
const DEFAULT_EXPENSES = ['Rent', 'Water', 'Cylinder', 'Maid', 'Wifi'];

export default function ManageRecurringExpensesModal({
  groupId,
  members,
  currencySymbol,
  currentMemberId,
  recurringExpenses,
  onClose
}: ManageRecurringExpensesModalProps) {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [cycle, setCycle] = useState('monthly');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  
  // Split State
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [payers, setPayers] = useState<Record<string, string>>({ [currentMemberId]: '' });
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set(members.map((m: any) => m.id)));
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>({});
  const [percentages, setPercentages] = useState<Record<string, string>>({});
  const [shareValues, setShareValues] = useState<Record<string, string>>({});

  const supabase = createClient();

  const getMemberName = (memberId: string) => {
    const member = members.find((m: any) => m.id === memberId);
    if (!member) return 'Unknown';
    if (member.is_ghost) return member.ghost_name;
    return member.users?.display_name || 'Unknown';
  };

  const resetForm = () => {
    setEditId(null);
    setName('');
    setAmount('');
    setCycle('monthly');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate('');
    setSplitType('equal');
    setPayers({ [currentMemberId]: '' });
    setSelectedMembers(new Set(members.map((m: any) => m.id)));
    setExactAmounts({});
    setPercentages({});
    setShareValues({});
    setError('');
  };

  const handleEdit = (re: any) => {
    setEditId(re.id);
    setName(re.name);
    setAmount(String(re.amount));
    setCycle(re.cycle);
    setStartDate(re.start_date);
    setEndDate(re.end_date || '');
    setSplitType(re.split_type as SplitType);

    const p: Record<string, string> = {};
    re.recurring_expense_payers?.forEach((payer: any) => p[payer.member_id] = String(payer.amount_paid));
    setPayers(p);

    const s = new Set<string>();
    const ex: Record<string, string> = {};
    const pc: Record<string, string> = {};
    const sh: Record<string, string> = {};

    re.recurring_expense_splits?.forEach((split: any) => {
      s.add(split.member_id);
      ex[split.member_id] = String(split.amount_owed);
      pc[split.member_id] = String(split.percentage || 0);
      sh[split.member_id] = String(split.shares || 1);
    });

    setSelectedMembers(s);
    setExactAmounts(ex);
    setPercentages(pc);
    setShareValues(sh);
    setView('form');
  };

  const handleDeactivate = async (id: string) => {
    setLoading(true);
    try {
      await supabase.from('recurring_expenses').update({ is_active: false }).eq('id', id);
      onClose(); // Just close to refresh data
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalNum = parseFloat(amount);
    if (!name.trim() || totalNum <= 0) return;

    setLoading(true);
    setError('');

    try {
      let reId = editId;

      if (reId) {
        // Update
        const { error: updErr } = await supabase.from('recurring_expenses').update({
          name: name.trim(), amount: totalNum, cycle,
          start_date: startDate, end_date: endDate || null,
          split_type: splitType
        }).eq('id', reId);
        if (updErr) throw updErr;

        await supabase.from('recurring_expense_payers').delete().eq('recurring_expense_id', reId);
        await supabase.from('recurring_expense_splits').delete().eq('recurring_expense_id', reId);
      } else {
        // Insert
        const { data: inserted, error: insErr } = await supabase.from('recurring_expenses').insert({
          group_id: groupId, name: name.trim(), amount: totalNum, cycle,
          start_date: startDate, end_date: endDate || null,
          split_type: splitType, created_by: currentMemberId
        }).select().single();
        if (insErr) throw insErr;
        reId = inserted.id;
      }

      // Insert Payers
      const payerRows = Object.entries(payers)
        .filter(([, v]) => parseFloat(v) > 0)
        .map(([mId, amt]) => ({
          recurring_expense_id: reId,
          member_id: mId,
          amount_paid: parseFloat(amt)
        }));

      if (payerRows.length > 0) {
        const { error: pErr } = await supabase.from('recurring_expense_payers').insert(payerRows);
        if (pErr) throw pErr;
      }

      // Insert Splits
      const activeMembers = members.filter(m => selectedMembers.has(m.id));
      const splitRows = activeMembers.map((m: any) => {
        let owed = 0;
        if (splitType === 'equal') owed = totalNum / activeMembers.length;
        if (splitType === 'exact') owed = parseFloat(exactAmounts[m.id] || '0');
        if (splitType === 'percentage') owed = totalNum * (parseFloat(percentages[m.id] || '0') / 100);
        
        let shares = 1;
        if (splitType === 'shares') {
          shares = parseInt(shareValues[m.id] || '1');
          const totalShares = activeMembers.reduce((sum, mx) => sum + parseInt(shareValues[mx.id] || '1'), 0);
          owed = totalNum * (shares / totalShares);
        }

        return {
          recurring_expense_id: reId,
          member_id: m.id,
          amount_owed: owed,
          percentage: splitType === 'percentage' ? parseFloat(percentages[m.id] || '0') : null,
          shares: splitType === 'shares' ? shares : null
        };
      });

      if (splitRows.length > 0) {
        const { error: sErr } = await supabase.from('recurring_expense_splits').insert(splitRows);
        if (sErr) throw sErr;
      }

      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save recurring expense');
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200, padding: '20px', backdropFilter: 'blur(4px)'
    }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="glass animate-fade-in" style={{
        width: '100%', maxWidth: '520px', maxHeight: '90vh',
        overflowY: 'auto', borderRadius: '20px', padding: '28px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700 }}>
            {view === 'list' ? 'Manage Scheduled Expenses' : editId ? 'Edit Scheduled Expense' : 'Add Scheduled Expense'}
          </h2>
          <button onClick={view === 'form' ? () => setView('list') : onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        {view === 'list' ? (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              {recurringExpenses.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px' }}>No scheduled expenses configured yet.</p>
              ) : (
                recurringExpenses.map(re => (
                  <div key={re.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 16px', background: 'var(--bg-hover)', borderRadius: '12px', border: '1px solid var(--border-subtle)'
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: 'white', wordBreak: 'break-word' }}>{re.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{currencySymbol}{re.amount} / {re.cycle}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleEdit(re)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>Edit</button>
                      <button onClick={() => handleDeactivate(re.id)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px', color: 'var(--accent-danger)' }}>Remove</button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <button onClick={() => { resetForm(); setView('form'); }} className="btn-primary" style={{ width: '100%', padding: '12px', fontWeight: 600 }}>
              + Add Scheduled Expense
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Quick Defaults */}
            {!editId && (
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Quick Select</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {DEFAULT_EXPENSES.map(def => (
                    <button key={def} type="button" onClick={() => setName(def)} style={{
                      padding: '6px 12px', borderRadius: '16px', fontSize: '12px',
                      background: name === def ? 'rgba(108, 92, 231, 0.1)' : 'var(--bg-secondary)',
                      color: name === def ? 'var(--accent-primary-light)' : 'var(--text-secondary)',
                      border: `1px solid ${name === def ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                      cursor: 'pointer'
                    }}>
                      {def}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Name</label>
              <input type="text" className="input-field" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Rent" />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Base Amount ({currencySymbol})</label>
                <input type="number" className="input-field" value={amount} onChange={(e) => setAmount(e.target.value)} required min="0.01" step="0.01" placeholder="0.00" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Cycle</label>
                <select className="input-field" value={cycle} onChange={(e) => setCycle(e.target.value)}>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="one-time">One-time</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Start Month/Date</label>
                <input type="date" className="input-field" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>End Month/Date (Optional)</label>
                <input type="date" className="input-field" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>

            {/* Split Type (Simplified for space) */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Split Type</label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {(['equal', 'exact', 'percentage', 'shares'] as SplitType[]).map((type) => (
                  <button key={type} type="button" onClick={() => setSplitType(type)} style={{
                    flex: 1, padding: '8px', borderRadius: '8px',
                    border: `1px solid ${splitType === type ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                    background: splitType === type ? 'rgba(108, 92, 231, 0.1)' : 'transparent',
                    color: splitType === type ? 'var(--accent-primary-light)' : 'var(--text-muted)',
                    fontSize: '12px', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize'
                  }}>
                    {type === 'percentage' ? '%' : type}
                  </button>
                ))}
              </div>
            </div>

            {/* Who Pays & Split Configuration (combined for ease) */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Who pays and split configuration (Default values)</label>
              <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)', maxHeight: '200px', overflowY: 'auto' }}>
                <p style={{ fontSize: '12px', color: 'var(--accent-primary-light)', marginBottom: '12px' }}>Specify who pays the base amount and select who owes.</p>
                {/* Payers Config */}
                {Object.entries(payers).map(([mId, amt], i) => (
                  <div key={`payer-${i}`} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <select className="input-field" style={{ flex: 2, padding: '6px 10px', fontSize: '13px' }} value={mId} onChange={(e) => {
                      const np = { ...payers }; delete np[mId]; np[e.target.value] = amt; setPayers(np);
                    }}>
                      {members.map(m => <option key={m.id} value={m.id} disabled={m.id !== mId && m.id in payers}>{getMemberName(m.id)}</option>)}
                    </select>
                    <input type="number" className="input-field" placeholder="Amount Paid" value={amt} onChange={(e) => setPayers({ ...payers, [mId]: e.target.value })} style={{ flex: 1, padding: '6px 10px', fontSize: '13px' }} />
                  </div>
                ))}
                <button type="button" onClick={() => {
                  const unselected = members.find(m => !(m.id in payers));
                  if (unselected) setPayers({ ...payers, [unselected.id]: '' });
                }} style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '16px' }}>+ Add payer</button>

                {/* Split Config */}
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>Split between:</p>
                {members.map(m => {
                  const isSel = selectedMembers.has(m.id);
                  return (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', opacity: isSel ? 1 : 0.5 }}>
                      <input type="checkbox" checked={isSel} onChange={() => {
                        const nxt = new Set(selectedMembers);
                        if (nxt.has(m.id)) nxt.delete(m.id); else nxt.add(m.id);
                        setSelectedMembers(nxt);
                      }} style={{ accentColor: 'var(--accent-primary)', cursor: 'pointer' }} />
                      <span style={{ fontSize: '13px', flex: 1, color: 'white' }}>{getMemberName(m.id)}</span>
                      {isSel && splitType === 'exact' && <input type="number" className="input-field" placeholder="0.00" value={exactAmounts[m.id]||''} onChange={e => setExactAmounts({...exactAmounts, [m.id]: e.target.value})} style={{ width: '80px', padding: '4px 8px', fontSize: '12px' }} />}
                      {isSel && splitType === 'percentage' && <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><input type="number" className="input-field" placeholder="0" value={percentages[m.id]||''} onChange={e => setPercentages({...percentages, [m.id]: e.target.value})} style={{ width: '60px', padding: '4px 8px', fontSize: '12px' }} /><span style={{fontSize:'12px', color:'var(--text-muted)'}}>%</span></div>}
                      {isSel && splitType === 'shares' && <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><input type="number" className="input-field" value={shareValues[m.id]||'1'} onChange={e => setShareValues({...shareValues, [m.id]: e.target.value})} style={{ width: '50px', padding: '4px 8px', fontSize: '12px' }} /><span style={{fontSize:'12px', color:'var(--text-muted)'}}>sh</span></div>}
                    </div>
                  );
                })}
              </div>
            </div>

            {error && <div style={{ color: 'var(--accent-danger)', fontSize: '13px', padding: '8px', background: 'rgba(255,0,0,0.1)', borderRadius: '8px' }}>{error}</div>}

            <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '12px', fontWeight: 600 }}>
              {loading ? 'Saving...' : 'Save Scheduled Expense'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
