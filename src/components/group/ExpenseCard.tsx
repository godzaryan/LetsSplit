'use client';

import { useState } from 'react';
import AnimatedIcon from '../ui/AnimatedIcon';
import { Receipt, Paperclip, Pencil, Trash2 } from 'lucide-react';

interface ExpenseCardProps {
  expense: any;
  group?: any;
  members: any[];
  currencySymbol: string;
  getMemberName: (id: string) => string;
  currentMemberId: string;
  currentRole: string;
  onEdit?: (expense: any) => void;
  onDelete?: (expenseId: string) => void;
  viewMode?: 'comfortable' | 'compact';
}

export default function ExpenseCard({
  expense,
  group,
  members,
  currencySymbol,
  getMemberName,
  currentMemberId,
  currentRole,
  onEdit,
  onDelete,
  viewMode = 'comfortable',
}: ExpenseCardProps) {
  const [expanded, setExpanded] = useState(false);

  const payers = expense.expense_payers || [];
  const splits = expense.expense_splits || [];
  
  let payerDisplay = 'Someone';
  if (payers.length === 1) {
    payerDisplay = getMemberName(payers[0].member_id);
  } else if (payers.length === 2) {
    // Two names usually fit well enough and are nice to see
    payerDisplay = `${getMemberName(payers[0].member_id)} & ${getMemberName(payers[1].member_id)}`;
  } else if (payers.length > 2) {
    // 3 or more gets truncated
    payerDisplay = `${getMemberName(payers[0].member_id)} + ${payers.length - 1} others`;
  }

  // What does the current user owe or is owed?
  const myPaid = payers.find((p: any) => p.member_id === currentMemberId);
  const mySplit = splits.find((s: any) => s.member_id === currentMemberId);
  const myNet = (myPaid ? Number(myPaid.amount_paid) : 0) - (mySplit ? Number(mySplit.amount_owed) : 0);

  const splitTypeLabels: Record<string, string> = {
    equal: 'Equal',
    exact: 'Exact',
    percentage: 'Percentage',
    shares: 'Shares',
    itemized: 'Itemized',
  };

  const isPayer = payers.some((p: any) => p.member_id === currentMemberId);
  const canModify = 
    group?.allow_any_member_to_edit_expenses ||
    currentRole === 'owner' || 
    currentRole === 'admin' || 
    expense.created_by === currentMemberId ||
    isPayer;

  return (
    <div
      className="card"
      style={{
        cursor: 'pointer',
        padding: viewMode === 'compact' ? '12px 16px' : '16px 20px',
        transition: 'all 0.2s ease',
      }}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Main row */}
      {viewMode === 'compact' ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'var(--bg-hover)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', flexShrink: 0 }}>
              <Receipt size={16} color="currentColor" />
            </div>
            <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{expense.description}</span>
              <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                <span>{new Date(expense.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                <span>•</span>
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{payerDisplay} paid</span>
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--text-primary)' }}>{currencySymbol}{Number(expense.total_amount).toFixed(2)}</div>
            {myNet !== 0 && (
              <div style={{ fontSize: '11px', fontWeight: 600, color: myNet > 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                {myNet > 0 ? `+${currencySymbol}${myNet.toFixed(2)}` : `-${currencySymbol}${Math.abs(myNet).toFixed(2)}`}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
          {/* Icon */}
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '16px',
            background: 'var(--bg-hover)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
            flexShrink: 0,
            boxShadow: 'inset 0 0 10px rgba(230,0,0,0.05)',
          }}>
            <AnimatedIcon animationType="rotate"><Receipt size={24} color="currentColor" /></AnimatedIcon>
          </div>

          <div style={{ minWidth: 0 }}>
            <p style={{
              fontWeight: 700,
              fontSize: '15px',
              marginBottom: '4px',
              overflowWrap: 'break-word',
              color: 'var(--text-primary)',
            }}>
              {expense.description}
            </p>
            {expense.labels && expense.labels.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                {expense.labels.map((label: string) => (
                  <span key={label} style={{
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)'
                  }}>
                    #{label}
                  </span>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Paid by <strong style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{payerDisplay}</strong>
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {new Date(expense.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </span>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: 'rgba(230,0,0,0.1)',
                  fontSize: '11px',
                  color: 'var(--accent-primary-light)',
                  fontWeight: 600,
                  border: '1px solid rgba(230,0,0,0.15)',
                }}>
                  {splitTypeLabels[expense.split_type] || expense.split_type}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '16px' }}>
          <p style={{ fontWeight: 800, fontSize: '18px', color: 'var(--text-primary)' }}>
            {currencySymbol}{Number(expense.total_amount).toFixed(2)}
          </p>
          {myNet !== 0 && (
            <p style={{
              fontSize: '13px',
              fontWeight: 600,
              marginTop: '4px',
              color: myNet > 0 ? 'var(--accent-success)' : 'var(--accent-danger)',
            }}>
              {myNet > 0 ? `you lent ${currencySymbol}${myNet.toFixed(2)}` : `you owe ${currencySymbol}${Math.abs(myNet).toFixed(2)}`}
            </p>
          )}
        </div>
        </div>
      )}

      {/* Expanded details */}
      {expanded && (
        <div style={{
          marginTop: '16px',
          paddingTop: '16px',
          borderTop: '1px solid var(--border-subtle)',
        }}>
          {/* Payers */}
          <div style={{ marginBottom: '12px' }}>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', fontWeight: 600 }}>
              Paid by
            </p>
            {payers.map((p: any) => (
              <div key={p.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '4px 0',
                fontSize: '13px',
              }}>
                <span style={{ color: 'var(--text-secondary)' }}>{getMemberName(p.member_id)}</span>
                <span style={{ fontWeight: 600 }}>{currencySymbol}{Number(p.amount_paid).toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Splits */}
          <div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', fontWeight: 600 }}>
              Split between
            </p>
            {splits.map((s: any) => (
              <div key={s.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '4px 0',
                fontSize: '13px',
              }}>
                <span style={{
                  color: s.member_id === currentMemberId ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: s.member_id === currentMemberId ? 600 : 400,
                }}>
                  {getMemberName(s.member_id)}
                  {s.member_id === currentMemberId && ' (you)'}
                </span>
                <span style={{ fontWeight: 500 }}>
                  {currencySymbol}{Number(s.amount_owed).toFixed(2)}
                  {expense.split_type === 'percentage' && s.percentage && (
                    <span style={{ color: 'var(--text-muted)', marginLeft: '4px' }}>({s.percentage}%)</span>
                  )}
                  {expense.split_type === 'shares' && s.shares && (
                    <span style={{ color: 'var(--text-muted)', marginLeft: '4px' }}>({s.shares} shares)</span>
                  )}
                </span>
              </div>
            ))}
          </div>

          {/* Receipt link */}
          {expense.receipt_url && (
            <div style={{ marginTop: '12px' }}>
              <a
                href={expense.receipt_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: '12px',
                  color: 'var(--accent-primary-light)',
                  textDecoration: 'none',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <AnimatedIcon animationType="hover-bounce"><Paperclip size={14} color="currentColor" /></AnimatedIcon> View Receipt
              </a>
            </div>
          )}

          {canModify && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
              <button 
                onClick={(e) => { e.stopPropagation(); onEdit?.(expense); }}
                className="btn-secondary" 
                style={{ flex: 1, padding: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <AnimatedIcon animationType="hover-bounce"><Pencil size={14} color="currentColor" /></AnimatedIcon> Edit Expense
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete?.(expense.id); }}
                className="btn-secondary" 
                style={{ flex: 1, padding: '8px', fontSize: '13px', color: 'var(--accent-danger)', borderColor: 'rgba(230,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <AnimatedIcon animationType="hover-bounce"><Trash2 size={14} color="currentColor" /></AnimatedIcon> Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
