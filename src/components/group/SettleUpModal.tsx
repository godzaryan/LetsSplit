'use client';

import { createClient } from '@/lib/supabase/client';
import { useState, useEffect } from 'react';
import { generateUPILink } from '@/lib/payments';
import PaymentQR from './PaymentQR';
import AnimatedIcon from '../ui/AnimatedIcon';
import { Sparkles, Pencil, CheckCircle2, Rocket, QrCode } from 'lucide-react';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';

interface SettleUpModalProps {
  groupId: string;
  members: any[];
  simplifiedDebts: { from: string; to: string; amount: number }[];
  currencySymbol: string;
  getMemberName: (id: string) => string;
  currentMemberId: string;
  groupName?: string;
  onClose: () => void;
}

export default function SettleUpModal({
  groupId,
  members,
  simplifiedDebts,
  currencySymbol,
  getMemberName,
  currentMemberId,
  groupName = 'Group',
  onClose,
}: SettleUpModalProps) {
  useLockBodyScroll();
  const getMemberUpiId = (id: string) => {
    const member = members.find(m => m.id === id);
    return member?.users?.upi_id || '';
  };
  const [mode, setMode] = useState<'suggested' | 'custom'>('suggested');
  const [fromMember, setFromMember] = useState(currentMemberId);
  const [toMember, setToMember] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [settled, setSettled] = useState<Set<number>>(new Set());
  const [showQRIndex, setShowQRIndex] = useState<number | null>(null);
  const [isAndroid, setIsAndroid] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    setIsAndroid(/Android/i.test(navigator.userAgent));
  }, []);

  const handleSettleSuggested = async (debt: { from: string; to: string; amount: number }, index: number) => {
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase
        .from('settlements')
        .insert({
          group_id: groupId,
          from_member: debt.from,
          to_member: debt.to,
          amount: debt.amount,
          note: `Settlement: ${getMemberName(debt.from)} → ${getMemberName(debt.to)}`,
          created_by: currentMemberId,
        });

      if (error) throw error;
      setSettled(new Set([...settled, index]));
    } catch (err: any) {
      setError(err.message || 'Failed to record settlement');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromMember || !toMember || !amount) return;
    if (fromMember === toMember) {
      setError('Cannot settle with yourself');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error } = await supabase
        .from('settlements')
        .insert({
          group_id: groupId,
          from_member: fromMember,
          to_member: toMember,
          amount: parseFloat(amount),
          note: note.trim() || null,
          created_by: currentMemberId,
        });

      if (error) throw error;
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record settlement');
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
        maxWidth: '480px',
        maxHeight: '85vh',
        overflowY: 'auto',
        borderRadius: '20px',
        padding: '20px',
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>Settle Up</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
          Record payments to clear outstanding debts.
        </p>

        {/* Mode tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
          {(['suggested', 'custom'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '10px',
                border: `1px solid ${mode === m ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                background: mode === m ? 'rgba(108, 92, 231, 0.1)' : 'transparent',
                color: mode === m ? 'var(--accent-primary-light)' : 'var(--text-muted)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
                textTransform: 'capitalize',
              }}
            >
              {m === 'suggested' ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><AnimatedIcon animationType="hover-bounce"><Sparkles size={14} color="currentColor" /></AnimatedIcon> Suggested</span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><AnimatedIcon animationType="hover-bounce"><Pencil size={14} color="currentColor" /></AnimatedIcon> Custom</span>
              )}
            </button>
          ))}
        </div>

        {mode === 'suggested' ? (
          <>
            {simplifiedDebts.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                background: 'rgba(0, 184, 148, 0.05)',
                borderRadius: '12px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px', color: 'var(--accent-success)' }}>
                  <AnimatedIcon animationType="hover-bounce"><CheckCircle2 size={36} color="currentColor" /></AnimatedIcon>
                </div>
                <p style={{ fontWeight: 600, color: 'var(--accent-success)' }}>All settled!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {simplifiedDebts.map((debt, i) => (
                  <div key={i} style={{
                    padding: '14px 16px',
                    borderRadius: '12px',
                    background: settled.has(i) ? 'rgba(0, 184, 148, 0.05)' : 'var(--bg-secondary)',
                    border: `1px solid ${settled.has(i) ? 'rgba(0, 184, 148, 0.2)' : 'var(--border-subtle)'}`,
                    opacity: settled.has(i) ? 0.6 : 1,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: '150px' }}>
                        <p style={{ fontSize: '14px', fontWeight: 500 }}>
                          <span style={{ color: 'var(--accent-danger)' }}>{getMemberName(debt.from)}</span>
                          {' → '}
                          <span style={{ color: 'var(--accent-success)' }}>{getMemberName(debt.to)}</span>
                        </p>
                        <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent-primary-light)', marginTop: '4px' }}>
                          {currencySymbol}{debt.amount.toFixed(2)}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                        {isAndroid && debt.from === currentMemberId && getMemberUpiId(debt.to) && (
                          <a
                            href={generateUPILink(
                              getMemberName(debt.to),
                              getMemberUpiId(debt.to),
                              debt.amount,
                              `LetsSplit: Settlement to ${getMemberName(debt.to)}`
                            )}
                            className="btn-primary"
                            style={{
                              fontSize: '11px',
                              padding: '6px 10px',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              background: 'var(--accent-success)',
                              color: '#fff',
                              gap: '4px',
                            }}
                          >
                            <AnimatedIcon animationType="hover-bounce"><Rocket size={12} color="currentColor" /></AnimatedIcon> Pay Now
                          </a>
                        )}
                        <button
                          className="btn-secondary"
                          onClick={() => setShowQRIndex(showQRIndex === i ? null : i)}
                          style={{ fontSize: '11px', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                          title="Payment QR"
                        >
                          <AnimatedIcon animationType="hover-bounce"><QrCode size={12} color="currentColor" /></AnimatedIcon> QR
                        </button>
                        <button
                          className={settled.has(i) ? 'btn-secondary' : 'btn-primary'}
                          onClick={() => handleSettleSuggested(debt, i)}
                          disabled={loading || settled.has(i)}
                          style={{
                            fontSize: '12px',
                            padding: '8px 16px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {settled.has(i) ? '✓ Done' : 'Mark Paid'}
                        </button>
                      </div>
                    </div>
                    {showQRIndex === i && (
                      <div style={{ marginTop: '12px' }}>
                        <PaymentQR
                          fromName={getMemberName(debt.from)}
                          toName={getMemberName(debt.to)}
                          toUpiId={getMemberUpiId(debt.to)}
                          amount={debt.amount}
                          currencySymbol={currencySymbol}
                          groupName={groupName}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <form onSubmit={handleCustomSettle} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                Who is paying?
              </label>
              <select
                className="input-field"
                value={fromMember}
                onChange={(e) => setFromMember(e.target.value)}
              >
                {members.map((m: any) => (
                  <option key={m.id} value={m.id}>{getMemberName(m.id)}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                Who are they paying?
              </label>
              <select
                className="input-field"
                value={toMember}
                onChange={(e) => setToMember(e.target.value)}
              >
                <option value="">Select member</option>
                {members.filter((m: any) => m.id !== fromMember).map((m: any) => (
                  <option key={m.id} value={m.id}>{getMemberName(m.id)}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                Amount ({currencySymbol})
              </label>
              <input
                type="number"
                className="input-field"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0.01"
                step="0.01"
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                Note (optional)
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g., UPI transfer"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !toMember || !amount}
              style={{ opacity: loading || !toMember || !amount ? 0.6 : 1 }}
            >
              {loading ? 'Recording...' : 'Record Settlement'}
            </button>
          </form>
        )}

        {error && (
          <div style={{
            marginTop: '12px',
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

        <button
          onClick={onClose}
          className="btn-secondary"
          style={{ width: '100%', marginTop: '16px' }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
