'use client';

import { useState } from 'react';

interface ExpenseCardProps {
  expense: any;
  members: any[];
  currencySymbol: string;
  getMemberName: (id: string) => string;
  currentMemberId: string;
}

export default function ExpenseCard({
  expense,
  members,
  currencySymbol,
  getMemberName,
  currentMemberId,
}: ExpenseCardProps) {
  const [expanded, setExpanded] = useState(false);

  const payers = expense.expense_payers || [];
  const splits = expense.expense_splits || [];
  const payerNames = payers.map((p: any) => getMemberName(p.member_id)).join(', ');

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

  return (
    <div
      className="card"
      style={{
        cursor: 'pointer',
        padding: '16px 20px',
        transition: 'all 0.2s ease',
      }}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Main row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
          {/* Icon */}
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'rgba(108, 92, 231, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            flexShrink: 0,
          }}>
            🧾
          </div>

          <div style={{ minWidth: 0 }}>
            <p style={{
              fontWeight: 600,
              fontSize: '14px',
              marginBottom: '3px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {expense.description}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Paid by {payerNames} · {new Date(expense.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              <span style={{
                marginLeft: '8px',
                padding: '2px 6px',
                borderRadius: '4px',
                background: 'rgba(108, 92, 231, 0.1)',
                fontSize: '10px',
                color: 'var(--accent-primary-light)',
                fontWeight: 500,
              }}>
                {splitTypeLabels[expense.split_type] || expense.split_type}
              </span>
            </p>
          </div>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '16px' }}>
          <p style={{ fontWeight: 700, fontSize: '16px' }}>
            {currencySymbol}{Number(expense.total_amount).toFixed(2)}
          </p>
          {myNet !== 0 && (
            <p style={{
              fontSize: '12px',
              fontWeight: 500,
              color: myNet > 0 ? 'var(--accent-success)' : 'var(--accent-danger)',
            }}>
              {myNet > 0 ? `you lent ${currencySymbol}${myNet.toFixed(2)}` : `you owe ${currencySymbol}${Math.abs(myNet).toFixed(2)}`}
            </p>
          )}
        </div>
      </div>

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
                📎 View Receipt
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
