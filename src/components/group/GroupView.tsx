'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import AddExpenseModal from './AddExpenseModal';
import SettleUpModal from './SettleUpModal';
import MembersPanel from './MembersPanel';
import ExpenseCard from './ExpenseCard';
import BalanceSummary from './BalanceSummary';
import AuditLogViewer from './AuditLogViewer';
import { exportToCSV } from '@/lib/export';

interface GroupViewProps {
  group: any;
  members: any[];
  expenses: any[];
  settlements: any[];
  currentUserId: string;
  currentMemberId: string;
  currentRole: string;
}

export default function GroupView({
  group,
  members,
  expenses,
  settlements,
  currentUserId,
  currentMemberId,
  currentRole,
}: GroupViewProps) {
  const [activeTab, setActiveTab] = useState<'expenses' | 'balances' | 'members' | 'audit' | 'settings'>('expenses');
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showSettleUp, setShowSettleUp] = useState(false);
  const router = useRouter();

  const currencySymbol = group.currency === 'INR' ? '₹' : group.currency === 'USD' ? '$' : group.currency === 'EUR' ? '€' : '£';

  // Get member name helper
  const getMemberName = (memberId: string) => {
    const member = members.find((m: any) => m.id === memberId);
    if (!member) return 'Unknown';
    if (member.is_ghost) return member.ghost_name;
    return member.users?.display_name || member.users?.email?.split('@')[0] || 'Unknown';
  };

  // Calculate net balances
  const netBalances = useMemo(() => {
    const balances: Record<string, number> = {};

    // Initialize all members with 0
    members.forEach((m: any) => {
      balances[m.id] = 0;
    });

    // Process expenses
    expenses.forEach((expense: any) => {
      // Add what payers paid
      expense.expense_payers?.forEach((p: any) => {
        if (balances[p.member_id] !== undefined) {
          balances[p.member_id] += Number(p.amount_paid);
        }
      });

      // Subtract what each person owes
      expense.expense_splits?.forEach((s: any) => {
        if (balances[s.member_id] !== undefined) {
          balances[s.member_id] -= Number(s.amount_owed);
        }
      });
    });

    // Process settlements
    settlements.forEach((s: any) => {
      const amount = Number(s.amount);
      if (balances[s.from_member] !== undefined) {
        balances[s.from_member] += amount;
      }
      if (balances[s.to_member] !== undefined) {
        balances[s.to_member] -= amount;
      }
    });

    return balances;
  }, [expenses, settlements, members]);

  // Simplified debts (greedy algorithm)
  const simplifiedDebts = useMemo(() => {
    const debtors: { id: string; amount: number }[] = [];
    const creditors: { id: string; amount: number }[] = [];

    Object.entries(netBalances).forEach(([memberId, balance]) => {
      if (balance < -0.01) {
        debtors.push({ id: memberId, amount: Math.abs(balance) });
      } else if (balance > 0.01) {
        creditors.push({ id: memberId, amount: balance });
      }
    });

    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const transactions: { from: string; to: string; amount: number }[] = [];
    let i = 0, j = 0;

    while (i < debtors.length && j < creditors.length) {
      const amount = Math.min(debtors[i].amount, creditors[j].amount);
      if (amount > 0.01) {
        transactions.push({
          from: debtors[i].id,
          to: creditors[j].id,
          amount: Math.round(amount * 100) / 100,
        });
      }
      debtors[i].amount -= amount;
      creditors[j].amount -= amount;
      if (debtors[i].amount < 0.01) i++;
      if (creditors[j].amount < 0.01) j++;
    }

    return transactions;
  }, [netBalances]);

  // Stats
  const totalExpenses = expenses.reduce((sum: number, e: any) => sum + Number(e.total_amount), 0);
  const myBalance = netBalances[currentMemberId] || 0;

  const tabs = [
    { key: 'expenses', label: 'Expenses', icon: '📋' },
    { key: 'balances', label: 'Balances', icon: '⚖️' },
    { key: 'members', label: `Members (${members.length})`, icon: '👥' },
    { key: 'audit', label: 'Audit Log', icon: '📜' },
    { key: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  const handleExport = () => {
    exportToCSV(expenses, settlements, members, group.name, currencySymbol, getMemberName);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Group Header */}
      <div style={{
        padding: '24px 32px 0',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '4px' }}>
              {group.name}
            </h1>
            {group.description && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{group.description}</p>
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="btn-secondary"
              onClick={handleExport}
              style={{ fontSize: '13px', padding: '8px 16px' }}
              title="Export ledger to CSV"
            >
              📤 Export
            </button>
            <button
              className="btn-secondary"
              onClick={() => setShowSettleUp(true)}
              style={{ fontSize: '13px', padding: '8px 16px' }}
            >
              Settle Up
            </button>
            <button
              className="btn-primary"
              onClick={() => setShowAddExpense(true)}
              style={{ fontSize: '13px', padding: '8px 16px' }}
              id="add-expense-btn"
            >
              + Add Expense
            </button>
          </div>
        </div>

        {/* Quick stats bar */}
        <div style={{
          display: 'flex',
          gap: '24px',
          marginBottom: '16px',
          fontSize: '13px',
        }}>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Total: </span>
            <span style={{ fontWeight: 600 }}>{currencySymbol}{totalExpenses.toFixed(2)}</span>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Your balance: </span>
            <span style={{
              fontWeight: 600,
              color: myBalance > 0.01 ? 'var(--accent-success)' : myBalance < -0.01 ? 'var(--accent-danger)' : 'var(--text-primary)',
            }}>
              {myBalance > 0.01 ? `+${currencySymbol}${myBalance.toFixed(2)}` :
               myBalance < -0.01 ? `-${currencySymbol}${Math.abs(myBalance).toFixed(2)}` :
               'Settled up'}
            </span>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Members: </span>
            <span style={{ fontWeight: 600 }}>{members.length}</span>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                padding: '10px 18px',
                borderRadius: '10px 10px 0 0',
                border: 'none',
                background: activeTab === tab.key ? 'var(--bg-primary)' : 'transparent',
                color: activeTab === tab.key ? 'var(--text-primary)' : 'var(--text-muted)',
                fontFamily: 'Inter, sans-serif',
                fontSize: '13px',
                fontWeight: activeTab === tab.key ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.2s',
                borderBottom: activeTab === tab.key ? '2px solid var(--accent-primary)' : '2px solid transparent',
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
        {activeTab === 'expenses' && (
          <div className="animate-fade-in">
            {expenses.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '60px 32px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🧾</div>
                <h3 style={{ fontWeight: 700, fontSize: '18px', marginBottom: '8px' }}>No expenses yet</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
                  Add your first expense to start tracking who owes what.
                </p>
                <button className="btn-primary" onClick={() => setShowAddExpense(true)}>
                  + Add First Expense
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {expenses.map((expense: any) => (
                  <ExpenseCard
                    key={expense.id}
                    expense={expense}
                    members={members}
                    currencySymbol={currencySymbol}
                    getMemberName={getMemberName}
                    currentMemberId={currentMemberId}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'balances' && (
          <BalanceSummary
            members={members}
            netBalances={netBalances}
            simplifiedDebts={simplifiedDebts}
            currencySymbol={currencySymbol}
            getMemberName={getMemberName}
            currentMemberId={currentMemberId}
            onSettleUp={() => setShowSettleUp(true)}
          />
        )}

        {activeTab === 'members' && (
          <MembersPanel
            group={group}
            members={members}
            currentUserId={currentUserId}
            currentRole={currentRole}
          />
        )}

        {activeTab === 'audit' && (
          <AuditLogViewer
            groupId={group.id}
            getMemberName={getMemberName}
            currencySymbol={currencySymbol}
          />
        )}

        {activeTab === 'settings' && (
          <GroupSettings
            group={group}
            currentRole={currentRole}
          />
        )}
      </div>

      {/* Modals */}
      {showAddExpense && (
        <AddExpenseModal
          groupId={group.id}
          members={members}
          currency={group.currency}
          currencySymbol={currencySymbol}
          currentMemberId={currentMemberId}
          onClose={() => {
            setShowAddExpense(false);
            router.refresh();
          }}
        />
      )}
      {showSettleUp && (
        <SettleUpModal
          groupId={group.id}
          members={members}
          simplifiedDebts={simplifiedDebts}
          currencySymbol={currencySymbol}
          getMemberName={getMemberName}
          currentMemberId={currentMemberId}
          groupName={group.name}
          onClose={() => {
            setShowSettleUp(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

// Group settings inline component
function GroupSettings({ group, currentRole }: { group: any; currentRole: string }) {
  const [copied, setCopied] = useState(false);

  const copyInviteCode = () => {
    navigator.clipboard.writeText(group.invite_code || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '600px' }}>
      <div className="card" style={{ marginBottom: '16px' }}>
        <h3 style={{ fontWeight: 700, fontSize: '16px', marginBottom: '16px' }}>Invite Code</h3>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <div style={{
            flex: 1,
            padding: '14px 18px',
            background: 'var(--bg-secondary)',
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)',
            fontFamily: 'monospace',
            fontSize: '20px',
            fontWeight: 700,
            letterSpacing: '4px',
            textAlign: 'center',
            color: 'var(--accent-primary-light)',
          }}>
            {group.invite_code || 'No invite code'}
          </div>
          <button
            className="btn-secondary"
            onClick={copyInviteCode}
            style={{ whiteSpace: 'nowrap', padding: '14px 20px' }}
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        {group.invite_expires_at && (
          <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '8px' }}>
            Expires: {new Date(group.invite_expires_at).toLocaleDateString()}
          </p>
        )}
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '12px' }}>
          Share this code with friends so they can join your group.
        </p>
      </div>

      <div className="card" style={{ marginBottom: '16px' }}>
        <h3 style={{ fontWeight: 700, fontSize: '16px', marginBottom: '12px' }}>Group Details</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Name</span>
            <p style={{ fontWeight: 500, marginTop: '2px' }}>{group.name}</p>
          </div>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Currency</span>
            <p style={{ fontWeight: 500, marginTop: '2px' }}>{group.currency}</p>
          </div>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Created</span>
            <p style={{ fontWeight: 500, marginTop: '2px' }}>{new Date(group.created_at).toLocaleDateString()}</p>
          </div>
          {group.description && (
            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description</span>
              <p style={{ fontWeight: 500, marginTop: '2px' }}>{group.description}</p>
            </div>
          )}
        </div>
      </div>

      {currentRole !== 'owner' && (
        <div className="card" style={{ borderColor: 'rgba(255,107,107,0.2)' }}>
          <h3 style={{ fontWeight: 700, fontSize: '16px', marginBottom: '8px', color: 'var(--accent-danger)' }}>
            Your Role: {currentRole.charAt(0).toUpperCase() + currentRole.slice(1)}
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            {currentRole === 'admin'
              ? 'You can manage members and expenses.'
              : 'You can add expenses and view group activity.'}
          </p>
        </div>
      )}
    </div>
  );
}
