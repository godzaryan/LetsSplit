'use client';

interface BalanceSummaryProps {
  members: any[];
  netBalances: Record<string, number>;
  simplifiedDebts: { from: string; to: string; amount: number }[];
  currencySymbol: string;
  getMemberName: (id: string) => string;
  currentMemberId: string;
  onSettleUp: () => void;
}

export default function BalanceSummary({
  members,
  netBalances,
  simplifiedDebts,
  currencySymbol,
  getMemberName,
  currentMemberId,
  onSettleUp,
}: BalanceSummaryProps) {
  // Sort members by balance
  const sortedMembers = [...members].sort((a, b) => {
    return (netBalances[b.id] || 0) - (netBalances[a.id] || 0);
  });

  const maxAbsBalance = Math.max(
    ...Object.values(netBalances).map(Math.abs),
    1
  );

  return (
    <div className="animate-fade-in" style={{ maxWidth: '700px' }}>
      {/* Simplified Debts */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: '16px', marginBottom: '2px' }}>
              Simplified Debts
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Minimum transactions to settle all balances
            </p>
          </div>
          {simplifiedDebts.length > 0 && (
            <button className="btn-primary" onClick={onSettleUp} style={{ fontSize: '12px', padding: '8px 14px' }}>
              Settle Up
            </button>
          )}
        </div>

        {simplifiedDebts.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '32px',
            background: 'rgba(0, 184, 148, 0.05)',
            borderRadius: '12px',
            border: '1px solid rgba(0, 184, 148, 0.1)',
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
            <p style={{ fontWeight: 600, color: 'var(--accent-success)' }}>All settled up!</p>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              No outstanding debts in this group.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {simplifiedDebts.map((debt, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                background: 'var(--bg-secondary)',
                borderRadius: '12px',
                border: '1px solid var(--border-subtle)',
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'rgba(255, 107, 107, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: 'var(--accent-danger)',
                  flexShrink: 0,
                }}>
                  {getMemberName(debt.from).charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{
                    fontWeight: debt.from === currentMemberId ? 700 : 500,
                    fontSize: '14px',
                  }}>
                    {getMemberName(debt.from)}
                    {debt.from === currentMemberId && ' (you)'}
                  </span>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>→</div>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'rgba(0, 184, 148, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: 'var(--accent-success)',
                  flexShrink: 0,
                }}>
                  {getMemberName(debt.to).charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{
                    fontWeight: debt.to === currentMemberId ? 700 : 500,
                    fontSize: '14px',
                  }}>
                    {getMemberName(debt.to)}
                    {debt.to === currentMemberId && ' (you)'}
                  </span>
                </div>
                <div style={{
                  fontWeight: 700,
                  fontSize: '15px',
                  color: 'var(--accent-primary-light)',
                  flexShrink: 0,
                }}>
                  {currencySymbol}{debt.amount.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Individual Balances */}
      <div className="card">
        <h3 style={{ fontWeight: 700, fontSize: '16px', marginBottom: '16px' }}>
          Individual Balances
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {sortedMembers.map((member: any) => {
            const balance = netBalances[member.id] || 0;
            const barWidth = (Math.abs(balance) / maxAbsBalance) * 100;
            const isPositive = balance > 0.01;
            const isNegative = balance < -0.01;

            return (
              <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '120px',
                  flexShrink: 0,
                  fontSize: '13px',
                  fontWeight: member.id === currentMemberId ? 700 : 400,
                  color: member.id === currentMemberId ? 'var(--text-primary)' : 'var(--text-secondary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {member.is_ghost ? member.ghost_name : member.users?.display_name || 'Unknown'}
                  {member.id === currentMemberId && ' (you)'}
                </div>
                <div style={{ flex: 1, height: '24px', position: 'relative', display: 'flex', alignItems: 'center' }}>
                  {/* Center line */}
                  <div style={{
                    position: 'absolute',
                    left: '50%',
                    width: '1px',
                    height: '100%',
                    background: 'var(--border-subtle)',
                  }} />
                  {/* Bar */}
                  {(isPositive || isNegative) && (
                    <div style={{
                      position: 'absolute',
                      left: isNegative ? `${50 - barWidth / 2}%` : '50%',
                      width: `${barWidth / 2}%`,
                      height: '16px',
                      borderRadius: '4px',
                      background: isPositive ? 'rgba(0, 184, 148, 0.3)' : 'rgba(255, 107, 107, 0.3)',
                      transition: 'all 0.3s ease',
                    }} />
                  )}
                </div>
                <div style={{
                  width: '100px',
                  textAlign: 'right',
                  fontSize: '13px',
                  fontWeight: 600,
                  flexShrink: 0,
                  color: isPositive ? 'var(--accent-success)' :
                         isNegative ? 'var(--accent-danger)' :
                         'var(--text-muted)',
                }}>
                  {isPositive && '+'}{currencySymbol}{Math.abs(balance).toFixed(2)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
