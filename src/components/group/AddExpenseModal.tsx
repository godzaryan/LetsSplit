'use client';

import { createClient } from '@/lib/supabase/client';
import { useState, useMemo, useRef } from 'react';
import { uploadReceipt } from '@/lib/receipts';
import AnimatedIcon from '../ui/AnimatedIcon';
import { Paperclip, X } from 'lucide-react';

interface AddExpenseModalProps {
  groupId: string;
  members: any[];
  currency: string;
  currencySymbol: string;
  currentMemberId: string;
  initialData?: any;
  groupLabels: string[];
  recurringTemplate?: any;
  cycleDateStr?: string;
  onClose: () => void;
}

type SplitType = 'equal' | 'exact' | 'percentage' | 'shares';

export default function AddExpenseModal({
  groupId,
  members,
  currency,
  currencySymbol,
  currentMemberId,
  initialData,
  groupLabels,
  recurringTemplate,
  cycleDateStr,
  onClose,
}: AddExpenseModalProps) {
  const [description, setDescription] = useState(recurringTemplate?.name || initialData?.description || '');
  const [date, setDate] = useState(initialData?.date ? new Date(initialData.date).toISOString().split('T')[0] : (cycleDateStr || new Date().toISOString().split('T')[0]));
  const [selectedLabels, setSelectedLabels] = useState<string[]>(initialData?.labels || (recurringTemplate ? ['Fixed Expense'] : []));
  const [splitType, setSplitType] = useState<SplitType>(recurringTemplate?.split_type || initialData?.split_type || 'equal');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Payer state — who paid and how much
  const [payers, setPayers] = useState<Record<string, string>>(() => {
    if (initialData?.expense_payers?.length) {
      const p: Record<string, string> = {};
      initialData.expense_payers.forEach((payer: any) => p[payer.member_id] = String(payer.amount_paid));
      return p;
    }
    if (recurringTemplate?.recurring_expense_payers?.length) {
      const p: Record<string, string> = {};
      recurringTemplate.recurring_expense_payers.forEach((payer: any) => p[payer.member_id] = String(payer.amount_paid));
      return p;
    }
    return { [currentMemberId]: recurringTemplate?.amount ? String(recurringTemplate.amount) : '' };
  });

  // Split state
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(() => {
    if (initialData?.expense_splits?.length) {
      const s = new Set<string>();
      initialData.expense_splits.forEach((split: any) => s.add(split.member_id));
      return s;
    }
    if (recurringTemplate?.recurring_expense_splits?.length) {
      const s = new Set<string>();
      recurringTemplate.recurring_expense_splits.forEach((split: any) => s.add(split.member_id));
      return s;
    }
    return new Set(members.map((m: any) => m.id));
  });

  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>(() => {
    if (initialData?.split_type === 'exact' && initialData?.expense_splits?.length) {
      const ex: Record<string, string> = {};
      initialData.expense_splits.forEach((split: any) => ex[split.member_id] = String(split.amount_owed));
      return ex;
    }
    if (recurringTemplate?.split_type === 'exact' && recurringTemplate?.recurring_expense_splits?.length) {
      const ex: Record<string, string> = {};
      recurringTemplate.recurring_expense_splits.forEach((split: any) => ex[split.member_id] = String(split.amount_owed));
      return ex;
    }
    return {};
  });

  const [percentages, setPercentages] = useState<Record<string, string>>(() => {
    if (initialData?.split_type === 'percentage' && initialData?.expense_splits?.length) {
      const pc: Record<string, string> = {};
      initialData.expense_splits.forEach((split: any) => pc[split.member_id] = String(split.percentage));
      return pc;
    }
    if (recurringTemplate?.split_type === 'percentage' && recurringTemplate?.recurring_expense_splits?.length) {
      const pc: Record<string, string> = {};
      recurringTemplate.recurring_expense_splits.forEach((split: any) => pc[split.member_id] = String(split.percentage));
      return pc;
    }
    return {};
  });

  const [shareValues, setShareValues] = useState<Record<string, string>>(() => {
    if (initialData?.split_type === 'shares' && initialData?.expense_splits?.length) {
      const sh: Record<string, string> = {};
      initialData.expense_splits.forEach((split: any) => sh[split.member_id] = String(split.shares));
      return sh;
    }
    if (recurringTemplate?.split_type === 'shares' && recurringTemplate?.recurring_expense_splits?.length) {
      const sh: Record<string, string> = {};
      recurringTemplate.recurring_expense_splits.forEach((split: any) => sh[split.member_id] = String(split.shares));
      return sh;
    }
    return {};
  });

  // Receipt state
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const receiptRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  const total = Object.values(payers).reduce((s, v) => s + (parseFloat(v) || 0), 0);

  // Calculate split preview
  const splitPreview = useMemo(() => {
    const activeMembers = members.filter((m: any) => selectedMembers.has(m.id));
    if (activeMembers.length === 0 || total <= 0) return {};

    const result: Record<string, number> = {};

    switch (splitType) {
      case 'equal': {
        const perPerson = Math.floor((total * 100) / activeMembers.length) / 100;
        const remainder = Math.round((total - perPerson * activeMembers.length) * 100) / 100;
        activeMembers.forEach((m: any, i: number) => {
          result[m.id] = perPerson + (i === 0 ? remainder : 0);
        });
        break;
      }
      case 'exact': {
        activeMembers.forEach((m: any) => {
          result[m.id] = parseFloat(exactAmounts[m.id] || '0') || 0;
        });
        break;
      }
      case 'percentage': {
        activeMembers.forEach((m: any) => {
          const pct = parseFloat(percentages[m.id] || '0') || 0;
          result[m.id] = Math.round((total * pct) / 100 * 100) / 100;
        });
        break;
      }
      case 'shares': {
        const totalShares = activeMembers.reduce(
          (sum: number, m: any) => sum + (parseInt(shareValues[m.id] || '1') || 1),
          0
        );
        activeMembers.forEach((m: any) => {
          const shares = parseInt(shareValues[m.id] || '1') || 1;
          result[m.id] = Math.round((total * shares) / totalShares * 100) / 100;
        });
        break;
      }
    }

    return result;
  }, [splitType, total, selectedMembers, members, exactAmounts, percentages, shareValues]);

  // Validation
  const totalSplit = Object.values(splitPreview).reduce((s, v) => s + v, 0);

  let splitMatchesTotal = true;
  if (splitType === 'exact') {
    splitMatchesTotal = Math.abs(totalSplit - total) < 0.01;
  } else if (splitType === 'percentage') {
    const totalPct = Object.keys(splitPreview).reduce(
      (s, k) => s + (parseFloat(percentages[k] || '0') || 0), 0
    );
    splitMatchesTotal = Math.abs(totalPct - 100) < 0.01;
  }

  const getMemberName = (memberId: string) => {
    const member = members.find((m: any) => m.id === memberId);
    if (!member) return 'Unknown';
    if (member.is_ghost) return member.ghost_name;
    return member.users?.display_name || 'Unknown';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || total <= 0) return;

    if (groupLabels && groupLabels.length > 0 && selectedLabels.length === 0) {
      setError('Please select at least one label for this expense');
      return;
    }

    if (splitType === 'exact' && !splitMatchesTotal) {
      setError('Split amounts must add up to the total');
      return;
    }

    if (splitType === 'percentage') {
      const totalPct = [...selectedMembers].reduce(
        (s, k) => s + (parseFloat(percentages[k] || '0') || 0), 0
      );
      if (Math.abs(totalPct - 100) > 0.01) {
        setError('Percentages must add up to 100%');
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      let expenseId = initialData?.id;

      if (initialData) {
        // Update existing expense
        const { error: expError } = await supabase
          .from('expenses')
          .update({
            description: description.trim(),
            labels: selectedLabels,
            total_amount: total,
            currency,
            split_type: splitType,
            date,
          })
          .eq('id', expenseId);

        if (expError) throw expError;

        // Delete old payers and splits
        await supabase.from('expense_payers').delete().eq('expense_id', expenseId);
        await supabase.from('expense_splits').delete().eq('expense_id', expenseId);
      } else {
        // Create new expense
        const { data: expense, error: expError } = await supabase
          .from('expenses')
          .insert({
            group_id: groupId,
            description: description.trim(),
            labels: selectedLabels,
            total_amount: total,
            currency,
            split_type: splitType,
            date,
            created_by: currentMemberId,
            recurring_expense_id: recurringTemplate?.id || null,
            cycle_date: recurringTemplate ? cycleDateStr : null,
          })
          .select()
          .single();

        if (expError) throw expError;
        expenseId = expense.id;
      }

      // 2. Insert payers
      const payerRows = Object.entries(payers)
        .filter(([, v]) => parseFloat(v) > 0)
        .map(([memberId, amount]) => ({
          expense_id: expenseId,
          member_id: memberId,
          amount_paid: parseFloat(amount),
        }));

      if (payerRows.length > 0) {
        const { error: payerError } = await supabase
          .from('expense_payers')
          .insert(payerRows);
        if (payerError) throw payerError;
      }

      // 3. Insert splits
      const splitRows = Object.entries(splitPreview)
        .filter(([, amount]) => amount > 0)
        .map(([memberId, amount]) => ({
          expense_id: expenseId,
          member_id: memberId,
          amount_owed: amount,
          percentage: splitType === 'percentage' ? parseFloat(percentages[memberId] || '0') : null,
          shares: splitType === 'shares' ? parseInt(shareValues[memberId] || '1') : null,
        }));

      if (splitRows.length > 0) {
        const { error: splitError } = await supabase
          .from('expense_splits')
          .insert(splitRows);
        if (splitError) throw splitError;
      }

      // 4. Upload receipt if attached
      if (receiptFile) {
        try {
          const receiptUrl = await uploadReceipt(receiptFile, groupId, expenseId);
          await supabase
            .from('expenses')
            .update({ receipt_url: receiptUrl })
            .eq('id', expenseId);
        } catch {
          // Non-fatal — expense is still created
          console.error('Receipt upload failed');
        }
      }

      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add expense');
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 200,
      padding: '20px',
      backdropFilter: 'blur(4px)',
    }}
    onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="glass animate-fade-in" style={{
        width: '100%',
        maxWidth: '520px',
        maxHeight: '90vh',
        overflowY: 'auto',
        borderRadius: '20px',
        padding: '28px',
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px' }}>
          {initialData ? 'Edit Expense' : 'Add Expense'}
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Description */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              What was it for?
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g., Dinner at Taj"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              autoFocus
              id="expense-description"
            />
          </div>

          {/* Amount & Date row */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                Total Amount ({currencySymbol})
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="0.00"
                value={total > 0 ? total.toFixed(2) : ''}
                readOnly
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  color: 'var(--accent-primary-light)',
                  fontWeight: 700,
                  cursor: 'not-allowed'
                }}
                id="expense-amount"
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                Date
              </label>
              <input
                type="date"
                className="input-field"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                id="expense-date"
              />
            </div>
          </div>

          {/* Labels */}
          {groupLabels && groupLabels.length > 0 && (
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                Labels (Required)
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {groupLabels.map((label) => {
                  const isSelected = selectedLabels.includes(label);
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setSelectedLabels(selectedLabels.filter((l) => l !== label));
                        } else {
                          setSelectedLabels([...selectedLabels, label]);
                        }
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 500,
                        border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                        background: isSelected ? 'rgba(108, 92, 231, 0.1)' : 'transparent',
                        color: isSelected ? 'var(--accent-primary-light)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Payer(s) */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              Who paid?
            </label>
            {Object.entries(payers).map(([memberId, amount], index) => (
              <div key={memberId} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <select
                  className="input-field"
                  value={memberId}
                  onChange={(e) => {
                    const newPayers = { ...payers };
                    const oldVal = newPayers[memberId];
                    delete newPayers[memberId];
                    newPayers[e.target.value] = oldVal;
                    setPayers(newPayers);
                  }}
                  style={{ flex: 2 }}
                >
                  {members.map((m: any) => (
                    <option key={m.id} value={m.id} disabled={m.id !== memberId && m.id in payers}>
                      {getMemberName(m.id)}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  className="input-field"
                  placeholder="Amount"
                  value={amount}
                  onChange={(e) => setPayers({ ...payers, [memberId]: e.target.value })}
                  min="0.01"
                  step="0.01"
                  style={{ flex: 1 }}
                />
                {Object.keys(payers).length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const newPayers = { ...payers };
                      delete newPayers[memberId];
                      setPayers(newPayers);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--accent-danger)',
                      cursor: 'pointer',
                      fontSize: '18px',
                      padding: '0 8px',
                    }}
                  >
                    <AnimatedIcon animationType="hover-bounce"><X size={16} color="currentColor" /></AnimatedIcon>
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                const unselected = members.find((m: any) => !(m.id in payers));
                if (unselected) {
                  setPayers({ ...payers, [unselected.id]: '' });
                }
              }}
              style={{
                fontSize: '12px',
                color: 'var(--accent-primary-light)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
                padding: '4px 0',
              }}
            >
              + Add another payer
            </button>
          </div>

          {/* Split Type */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '8px', color: 'var(--text-secondary)' }}>
              Split type
            </label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {(['equal', 'exact', 'percentage', 'shares'] as SplitType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSplitType(type)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '8px',
                    border: `1px solid ${splitType === type ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                    background: splitType === type ? 'rgba(108, 92, 231, 0.1)' : 'transparent',
                    color: splitType === type ? 'var(--accent-primary-light)' : 'var(--text-muted)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'Inter, sans-serif',
                    transition: 'all 0.2s',
                    textTransform: 'capitalize',
                  }}
                >
                  {type === 'percentage' ? '%' : type}
                </button>
              ))}
            </div>
          </div>

          {/* Split Details */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '8px', color: 'var(--text-secondary)' }}>
              Split between
            </label>
            <div style={{
              maxHeight: '200px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}>
              {members.map((m: any) => {
                const isSelected = selectedMembers.has(m.id);
                const name = getMemberName(m.id);

                return (
                  <div key={m.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: isSelected ? 'var(--bg-secondary)' : 'transparent',
                    border: `1px solid ${isSelected ? 'var(--border-subtle)' : 'transparent'}`,
                    opacity: isSelected ? 1 : 0.5,
                  }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        const next = new Set(selectedMembers);
                        if (next.has(m.id)) next.delete(m.id);
                        else next.add(m.id);
                        setSelectedMembers(next);
                      }}
                      style={{ accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                    />
                    <span style={{ flex: 1, fontSize: '13px', fontWeight: 500 }}>
                      {name}
                      {m.id === currentMemberId && <span style={{ color: 'var(--text-muted)' }}> (you)</span>}
                    </span>

                    {isSelected && splitType === 'exact' && (
                      <input
                        type="number"
                        className="input-field"
                        placeholder="0.00"
                        value={exactAmounts[m.id] || ''}
                        onChange={(e) => setExactAmounts({ ...exactAmounts, [m.id]: e.target.value })}
                        step="0.01"
                        min="0"
                        style={{ width: '100px', padding: '6px 10px', fontSize: '13px' }}
                      />
                    )}
                    {isSelected && splitType === 'percentage' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input
                          type="number"
                          className="input-field"
                          placeholder="0"
                          value={percentages[m.id] || ''}
                          onChange={(e) => setPercentages({ ...percentages, [m.id]: e.target.value })}
                          step="0.01"
                          min="0"
                          max="100"
                          style={{ width: '70px', padding: '6px 10px', fontSize: '13px' }}
                        />
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>%</span>
                      </div>
                    )}
                    {isSelected && splitType === 'shares' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input
                          type="number"
                          className="input-field"
                          value={shareValues[m.id] || '1'}
                          onChange={(e) => setShareValues({ ...shareValues, [m.id]: e.target.value })}
                          min="1"
                          style={{ width: '60px', padding: '6px 10px', fontSize: '13px' }}
                        />
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>shares</span>
                      </div>
                    )}

                    {/* Preview amount */}
                    {isSelected && total > 0 && (
                      <span style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'var(--accent-primary-light)',
                        minWidth: '60px',
                        textAlign: 'right',
                      }}>
                        {currencySymbol}{(splitPreview[m.id] || 0).toFixed(2)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Split validation */}
            {total > 0 && splitType === 'exact' && (
              <div style={{
                marginTop: '8px',
                fontSize: '12px',
                color: splitMatchesTotal ? 'var(--accent-success)' : 'var(--accent-danger)',
                fontWeight: 500,
              }}>
                Total: {currencySymbol}{totalSplit.toFixed(2)} / {currencySymbol}{total.toFixed(2)}
                {splitMatchesTotal ? ' ✓' : ` (${currencySymbol}${Math.abs(total - totalSplit).toFixed(2)} remaining)`}
              </div>
            )}
            {total > 0 && splitType === 'percentage' && (
              <div style={{
                marginTop: '8px',
                fontSize: '12px',
                color: splitMatchesTotal ? 'var(--accent-success)' : 'var(--accent-danger)',
                fontWeight: 500,
              }}>
                {(() => {
                  const totalPct = [...selectedMembers].reduce(
                    (s, k) => s + (parseFloat(percentages[k] || '0') || 0), 0
                  );
                  return `${totalPct.toFixed(1)}% / 100%${Math.abs(totalPct - 100) < 0.01 ? ' ✓' : ''}`;
                })()}
              </div>
            )}
          </div>

          {/* Receipt Upload */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              Receipt (optional)
            </label>
            <input
              ref={receiptRef}
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  if (file.size > 5 * 1024 * 1024) {
                    setError('Receipt file too large (max 5MB)');
                    return;
                  }
                  setReceiptFile(file);
                  if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = (ev) => setReceiptPreview(ev.target?.result as string);
                    reader.readAsDataURL(file);
                  } else {
                    setReceiptPreview(null);
                  }
                }
              }}
              style={{ display: 'none' }}
            />
            {receiptFile ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: '10px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
              }}>
                {receiptPreview && (
                  <img src={receiptPreview} alt="" style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '13px', fontWeight: 500, wordBreak: 'break-word' }}>
                    {receiptFile.name}
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {(receiptFile.size / 1024).toFixed(0)} KB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setReceiptFile(null); setReceiptPreview(null); }}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <AnimatedIcon animationType="hover-bounce"><X size={16} color="currentColor" /></AnimatedIcon>
                </button>
              </div>
            ) : (
              <div
                onClick={() => receiptRef.current?.click()}
                style={{
                  padding: '16px',
                  borderRadius: '10px',
                  border: '2px dashed var(--border-subtle)',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontSize: '13px',
                  color: 'var(--text-muted)',
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <AnimatedIcon animationType="hover-bounce"><Paperclip size={16} color="currentColor" /></AnimatedIcon> Click to attach a receipt image or PDF
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '10px',
              background: 'rgba(255, 107, 107, 0.1)',
              border: '1px solid rgba(255, 107, 107, 0.2)',
              color: 'var(--accent-danger)',
              fontSize: '13px',
            }}>
              {error}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
            <button type="button" onClick={onClose} className="btn-secondary" style={{ flex: 1 }}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !description.trim() || total <= 0}
              style={{
                flex: 1,
                opacity: loading || !description.trim() || total <= 0 ? 0.6 : 1,
              }}
              id="expense-submit"
            >
              {loading ? 'Saving...' : initialData ? 'Save Changes' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
