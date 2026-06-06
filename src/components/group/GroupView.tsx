'use client';

import { createClient } from '@/lib/supabase/client';

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
  const [expenseToEdit, setExpenseToEdit] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
      if (error) throw error;
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete expense');
    } finally {
      setIsDeleting(false);
    }
  };

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
    { key: 'members', label: `Members (${members.length})`, icon: '👥' },
    { key: 'audit', label: 'Audit Log', icon: '📜' },
    { key: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  const handleExport = () => {
    exportToCSV(expenses, settlements, members, group.name, currencySymbol, getMemberName);
  };

  return (
    <div className="page-container">
      {/* Hero Banner Header */}
      <div style={{
        padding: '40px 32px',
        background: 'var(--gradient-hero)',
        borderRadius: '24px',
        border: '1px solid var(--border-active)',
        marginBottom: '32px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-md)',
      }}>
        {/* Glow effect */}
        <div style={{ 
          position: 'absolute', 
          top: '-50px', left: '-50px', 
          width: '300px', height: '300px', 
          background: 'var(--accent-primary)', 
          opacity: 0.15, 
          filter: 'blur(100px)', 
          borderRadius: '50%' 
        }} />
        
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '36px', fontWeight: 800, letterSpacing: '-1px', marginBottom: '8px', color: 'white' }}>
              {group.name}
            </h1>
            {group.description && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>{group.description}</p>
            )}
            
            {/* Quick stats bar */}
            <div style={{
              display: 'flex',
              gap: '24px',
              marginTop: '24px',
              fontSize: '14px',
            }}>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Total Spend: </span>
                <span style={{ fontWeight: 700, color: 'white' }}>{currencySymbol}{totalExpenses.toFixed(2)}</span>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Your Balance: </span>
                <span style={{
                  fontWeight: 700,
                  color: myBalance > 0.01 ? 'var(--accent-success)' : myBalance < -0.01 ? 'var(--accent-danger)' : 'white',
                }}>
                  {myBalance > 0.01 ? `+${currencySymbol}${myBalance.toFixed(2)}` :
                   myBalance < -0.01 ? `-${currencySymbol}${Math.abs(myBalance).toFixed(2)}` :
                   'Settled up'}
                </span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button className="btn-secondary" onClick={handleExport} style={{ padding: '10px 16px', fontSize: '14px' }}>
              📤 Export
            </button>
            <button className="btn-secondary" onClick={() => setShowSettleUp(true)} style={{ padding: '10px 16px', fontSize: '14px' }}>
              Settle Up
            </button>
            <button className="btn-primary" onClick={() => { setExpenseToEdit(null); setShowAddExpense(true); }} style={{ padding: '10px 20px', fontSize: '14px', fontWeight: 600 }}>
              + Add Expense
            </button>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Left Column (Main Content) */}
        <div>
          {/* Tabs */}
          <div style={{ 
            display: 'flex', 
            gap: '8px', 
            marginBottom: '24px', 
            borderBottom: '1px solid var(--border-subtle)', 
            paddingBottom: '12px',
            overflowX: 'auto' 
          }}>
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '12px',
                  background: activeTab === tab.key ? 'var(--gradient-card)' : 'transparent',
                  color: activeTab === tab.key ? 'white' : 'var(--text-muted)',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '14px',
                  fontWeight: activeTab === tab.key ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  border: activeTab === tab.key ? '1px solid var(--border-active)' : '1px solid transparent',
                  whiteSpace: 'nowrap'
                }}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{ minHeight: '400px' }}>
            {activeTab === 'expenses' && (
              <div className="animate-fade-in">
                {expenses.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center', padding: '80px 32px' }}>
                    <div style={{ fontSize: '56px', marginBottom: '24px' }}>🧾</div>
                    <h3 style={{ fontWeight: 800, fontSize: '20px', marginBottom: '8px', color: 'white' }}>No expenses yet</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '15px', marginBottom: '32px' }}>
                      Add your first expense to start tracking who owes what.
                    </p>
                    <button className="btn-primary" onClick={() => { setExpenseToEdit(null); setShowAddExpense(true); }} style={{ padding: '12px 24px', fontSize: '15px' }}>
                      + Add First Expense
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {expenses.map((expense: any) => (
                      <ExpenseCard
                        key={expense.id}
                        expense={expense}
                        members={members}
                        currencySymbol={currencySymbol}
                        getMemberName={getMemberName}
                        currentMemberId={currentMemberId}
                        currentRole={currentRole}
                        onEdit={(exp) => { setExpenseToEdit(exp); setShowAddExpense(true); }}
                        onDelete={handleDeleteExpense}
                      />
                    ))}
                  </div>
                )}
              </div>
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
        </div>

        {/* Right Column (Balances Widget) */}
        <div style={{ position: 'sticky', top: 'calc(var(--header-height) + 32px)' }}>
          <div className="card" style={{ padding: '24px', boxShadow: 'var(--shadow-md)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '24px', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⚖️ Balance Summary
            </h3>
            <BalanceSummary
              members={members}
              netBalances={netBalances}
              simplifiedDebts={simplifiedDebts}
              currencySymbol={currencySymbol}
              getMemberName={getMemberName}
              currentMemberId={currentMemberId}
              onSettleUp={() => setShowSettleUp(true)}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAddExpense && (
        <AddExpenseModal
          groupId={group.id}
          members={members}
          currency={group.currency}
          currencySymbol={currencySymbol}
          currentMemberId={currentMemberId}
          initialData={expenseToEdit}
          onClose={() => {
            setShowAddExpense(false);
            setExpenseToEdit(null);
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
