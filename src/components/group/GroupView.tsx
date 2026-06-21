'use client';

import { createClient } from '@/lib/supabase/client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AddExpenseModal from './AddExpenseModal';
import ConfirmDialog from '../ui/ConfirmDialog';
import SettleUpModal from './SettleUpModal';
import MembersPanel from './MembersPanel';
import ExpenseCard from './ExpenseCard';
import BalanceSummary from './BalanceSummary';
import AuditLogViewer from './AuditLogViewer';
import MonthlyFixedExpenses from './MonthlyFixedExpenses';
import ManageRecurringExpensesModal from './ManageRecurringExpensesModal';
import { exportToCSV } from '@/lib/export';
import AnimatedIcon from '../ui/AnimatedIcon';
import { ClipboardList, Users, ScrollText, Settings, Upload, Receipt, Scale, Search, Filter, LayoutGrid, List } from 'lucide-react';

interface GroupViewProps {
  group: any;
  members: any[];
  expenses: any[];
  settlements: any[];
  currentUserId: string;
  currentMemberId: string;
  currentRole: string;
  recurringExpenses?: any[];
}

export default function GroupView({
  group,
  members,
  expenses,
  settlements,
  currentUserId,
  currentMemberId,
  currentRole,
  recurringExpenses = [],
}: GroupViewProps) {
  const [activeTab, setActiveTab] = useState<'expenses' | 'balances' | 'members' | 'audit' | 'settings'>('expenses');
  const [showManageRecurring, setShowManageRecurring] = useState(false);
  const [recurringToPay, setRecurringToPay] = useState<{template: any, cycleDateStr: string} | null>(null);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showSettleUp, setShowSettleUp] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);
  
  // Advanced Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [labelFilter, setLabelFilter] = useState('All');
  const [memberFilter, setMemberFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [sortBy, setSortBy] = useState('date-desc');
  const [viewMode, setViewMode] = useState<'comfortable' | 'compact'>('comfortable');

  const PREFS_KEY = `letssplit_prefs_${group.id}`;

  // Load prefs on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PREFS_KEY);
      if (saved) {
        const p = JSON.parse(saved);
        if (p.labelFilter) setLabelFilter(p.labelFilter);
        if (p.memberFilter) setMemberFilter(p.memberFilter);
        if (p.typeFilter) setTypeFilter(p.typeFilter);
        if (p.sortBy) setSortBy(p.sortBy);
        if (p.viewMode) setViewMode(p.viewMode);
      }
    } catch (e) {}
  }, [PREFS_KEY]);

  // Save prefs when they change
  useEffect(() => {
    const prefs = { labelFilter, memberFilter, typeFilter, sortBy, viewMode };
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  }, [labelFilter, memberFilter, typeFilter, sortBy, viewMode, PREFS_KEY]);

  const router = useRouter();
  const supabase = createClient();

  const handleDeleteExpense = (expenseId: string) => {
    setExpenseToDelete(expenseId);
  };

  const executeDeleteExpense = async () => {
    if (!expenseToDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', expenseToDelete);
      if (error) throw error;
      setExpenseToDelete(null);
      router.refresh();
    } catch (err: any) {
      setExpenseToDelete(null);
      setErrorAlert(err.message || 'Failed to delete expense');
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
    { key: 'expenses', label: 'Expenses', icon: <AnimatedIcon animationType="hover-bounce"><ClipboardList size={16} color="currentColor" /></AnimatedIcon> },
    { key: 'members', label: `Members (${members.length})`, icon: <AnimatedIcon animationType="hover-bounce"><Users size={16} color="currentColor" /></AnimatedIcon> },
    { key: 'audit', label: 'Audit Log', icon: <AnimatedIcon animationType="hover-bounce"><ScrollText size={16} color="currentColor" /></AnimatedIcon> },
    { key: 'settings', label: 'Settings', icon: <AnimatedIcon animationType="rotate"><Settings size={16} color="currentColor" /></AnimatedIcon> },
  ];

  let processedExpenses = [...expenses];
  
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    processedExpenses = processedExpenses.filter(e => 
      e.description?.toLowerCase().includes(q) || 
      e.category?.toLowerCase().includes(q)
    );
  }
  
  if (labelFilter !== 'All') {
    processedExpenses = processedExpenses.filter(e => e.labels && e.labels.includes(labelFilter));
  }
  
  if (memberFilter !== 'All') {
    processedExpenses = processedExpenses.filter(e => {
      const paidBy = e.expense_payers?.some((p: any) => p.member_id === memberFilter);
      const owes = e.expense_splits?.some((s: any) => s.member_id === memberFilter && s.amount_owed > 0);
      return paidBy || owes;
    });
  }

  if (typeFilter !== 'All') {
    if (typeFilter === 'You Paid') {
      processedExpenses = processedExpenses.filter(e => e.expense_payers?.some((p: any) => p.member_id === currentMemberId));
    } else if (typeFilter === 'You Owe') {
      processedExpenses = processedExpenses.filter(e => e.expense_splits?.some((s: any) => s.member_id === currentMemberId && s.amount_owed > 0));
    } else if (typeFilter === 'Involved') {
      processedExpenses = processedExpenses.filter(e => {
        const paidBy = e.expense_payers?.some((p: any) => p.member_id === currentMemberId);
        const owes = e.expense_splits?.some((s: any) => s.member_id === currentMemberId && s.amount_owed > 0);
        return paidBy || owes;
      });
    }
  }

  processedExpenses.sort((a, b) => {
    if (sortBy === 'date-desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
    if (sortBy === 'date-asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
    if (sortBy === 'created-desc') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sortBy === 'created-asc') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (sortBy === 'amount-desc') return b.total_amount - a.total_amount;
    if (sortBy === 'amount-asc') return a.total_amount - b.total_amount;
    return 0;
  });

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
            <h1 style={{ fontSize: '36px', fontWeight: 800, letterSpacing: '-1px', marginBottom: '8px', color: 'white', wordBreak: 'break-word' }}>
              {group.name}
            </h1>
            {group.description && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>{group.description}</p>
            )}
            
            {/* Quick stats bar */}
            <div style={{
              display: 'flex',
              gap: '12px',
              marginTop: '24px',
              fontSize: '14px',
              flexWrap: 'wrap',
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
            <button className="btn-secondary" onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', fontSize: '14px' }}>
              <AnimatedIcon animationType="hover-bounce"><Upload size={16} color="currentColor" /></AnimatedIcon> Export
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
        <div style={{ minWidth: 0, width: '100%' }}>
          {/* Tabs */}
          <div className="hide-scrollbar" style={{ 
            display: 'flex', 
            gap: '8px', 
            marginBottom: '24px', 
            borderBottom: '1px solid var(--border-subtle)', 
            paddingBottom: '12px',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            maxWidth: '100%',
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
                
                {/* Recurring Expenses Monthly View */}
                <MonthlyFixedExpenses
                  groupId={group.id}
                  recurringExpenses={recurringExpenses}
                  members={members}
                  currencySymbol={currencySymbol}
                  currentRole={currentRole}
                  currentMemberId={currentMemberId}
                  onManage={() => setShowManageRecurring(true)}
                />

                {/* Advanced Filter Bar */}
                {expenses.length > 0 && (
                  <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '16px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    
                    {/* Search & View Mode */}
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ flex: 1, position: 'relative' }}>
                        <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                          <Search size={16} />
                        </div>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="Search expenses..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          style={{ paddingLeft: '36px', width: '100%' }}
                        />
                      </div>
                      <div style={{ display: 'flex', background: 'var(--bg-card)', borderRadius: '12px', padding: '4px', border: '1px solid var(--border-subtle)' }}>
                        <button onClick={() => setViewMode('comfortable')} style={{ padding: '6px 10px', borderRadius: '8px', background: viewMode === 'comfortable' ? 'rgba(108, 92, 231, 0.1)' : 'transparent', color: viewMode === 'comfortable' ? 'var(--accent-primary)' : 'var(--text-muted)', border: 'none', cursor: 'pointer' }}>
                          <LayoutGrid size={18} />
                        </button>
                        <button onClick={() => setViewMode('compact')} style={{ padding: '6px 10px', borderRadius: '8px', background: viewMode === 'compact' ? 'rgba(108, 92, 231, 0.1)' : 'transparent', color: viewMode === 'compact' ? 'var(--accent-primary)' : 'var(--text-muted)', border: 'none', cursor: 'pointer' }}>
                          <List size={18} />
                        </button>
                      </div>
                    </div>

                    {/* Filters & Sorting */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <div style={{ flex: '1 1 140px', minWidth: '140px' }}>
                        <select className="input-field" style={{ width: '100%', fontSize: '13px' }} value={labelFilter} onChange={(e) => setLabelFilter(e.target.value)}>
                          <option value="All">All Labels</option>
                          {(group.labels || []).map((l: string) => (
                            <option key={l} value={l}>{l}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ flex: '1 1 140px', minWidth: '140px' }}>
                        <select className="input-field" style={{ width: '100%', fontSize: '13px' }} value={memberFilter} onChange={(e) => setMemberFilter(e.target.value)}>
                          <option value="All">Any Member</option>
                          {members.map((m: any) => (
                            <option key={m.id} value={m.id}>{getMemberName(m.id)}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ flex: '1 1 140px', minWidth: '140px' }}>
                        <select className="input-field" style={{ width: '100%', fontSize: '13px' }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                          <option value="All">All Types</option>
                          <option value="Involved">I am involved</option>
                          <option value="You Paid">I paid</option>
                          <option value="You Owe">I owe</option>
                        </select>
                      </div>
                      <div style={{ flex: '1 1 140px', minWidth: '140px' }}>
                        <select className="input-field" style={{ width: '100%', fontSize: '13px' }} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                          <option value="date-desc">Expense Date (Newest)</option>
                          <option value="date-asc">Expense Date (Oldest)</option>
                          <option value="created-desc">Date Added (Newest)</option>
                          <option value="created-asc">Date Added (Oldest)</option>
                          <option value="amount-desc">Highest Amount</option>
                          <option value="amount-asc">Lowest Amount</option>
                        </select>
                      </div>
                    </div>

                  </div>
                )}
                {processedExpenses.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center', padding: '80px 32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px', color: 'var(--text-secondary)' }}>
                      <AnimatedIcon animationType="hover-bounce"><Receipt size={56} color="currentColor" /></AnimatedIcon>
                    </div>
                    <h3 style={{ fontWeight: 800, fontSize: '20px', marginBottom: '8px', color: 'white' }}>
                      {expenses.length === 0 ? 'No expenses yet' : 'No expenses match filter'}
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '15px', marginBottom: '32px' }}>
                      {expenses.length === 0 ? 'Add your first expense to start tracking who owes what.' : 'Try changing or removing the label filter.'}
                    </p>
                    {expenses.length === 0 && (
                      <button className="btn-primary" onClick={() => { setExpenseToEdit(null); setShowAddExpense(true); }} style={{ padding: '12px 24px', fontSize: '15px' }}>
                        + Add First Expense
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {processedExpenses.map((expense: any) => (
                      <ExpenseCard
                        key={expense.id}
                        expense={expense}
                        members={members}
                        currencySymbol={currencySymbol}
                        getMemberName={getMemberName}
                        currentMemberId={currentMemberId}
                        currentRole={currentRole}
                        viewMode={viewMode}
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
              <AnimatedIcon animationType="hover-bounce"><Scale size={20} color="currentColor" /></AnimatedIcon> Balance Summary
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
          recurringTemplate={recurringToPay?.template}
          cycleDateStr={recurringToPay?.cycleDateStr}
          groupLabels={group.labels || []}
          onClose={() => {
            setShowAddExpense(false);
            setExpenseToEdit(null);
            setRecurringToPay(null);
            router.refresh();
          }}
        />
      )}
      {showManageRecurring && (
        <ManageRecurringExpensesModal
          group={group}
          members={members}
          currencySymbol={currencySymbol}
          currentMemberId={currentMemberId}
          recurringExpenses={recurringExpenses}
          onClose={() => {
            setShowManageRecurring(false);
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

      {/* Dialogs */}
      <ConfirmDialog
        isOpen={!!expenseToDelete}
        title="Delete Expense"
        message="Are you sure you want to delete this expense? This action cannot be undone."
        confirmText={isDeleting ? 'Deleting...' : 'Delete'}
        type="danger"
        onConfirm={executeDeleteExpense}
        onCancel={() => setExpenseToDelete(null)}
      />

      <ConfirmDialog
        isOpen={!!errorAlert}
        title="Error"
        message={errorAlert || ''}
        confirmText="OK"
        isAlert={true}
        onConfirm={() => setErrorAlert(null)}
        onCancel={() => setErrorAlert(null)}
      />
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
          flexWrap: 'wrap',
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

      {currentRole === 'owner' && (
        <GroupLabelsEditor group={group} />
      )}

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

function GroupLabelsEditor({ group }: { group: any }) {
  const [labelsText, setLabelsText] = useState(group.labels ? group.labels.join(', ') : '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const supabase = createClient();
  const router = useRouter();

  const handleSaveLabels = async () => {
    setIsSaving(true);
    setSaveMessage('');
    
    const labelArray = labelsText
      .split(',')
      .map((l: string) => l.trim())
      .filter((l: string) => l.length > 0);

    const { error } = await supabase
      .from('groups')
      .update({ labels: labelArray })
      .eq('id', group.id);

    setIsSaving(false);
    if (error) {
      setSaveMessage('Error saving labels');
    } else {
      setSaveMessage('Labels updated!');
      router.refresh();
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  return (
    <div className="card" style={{ marginBottom: '16px' }}>
      <h3 style={{ fontWeight: 700, fontSize: '16px', marginBottom: '12px' }}>Group Expense Labels</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>
        Customize the labels available for tagging expenses in this group (comma separated).
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <input
          type="text"
          className="input-field"
          value={labelsText}
          onChange={(e) => setLabelsText(e.target.value)}
          placeholder="e.g. Rent, Groceries, Trip"
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px' }}>
          {saveMessage && (
            <span style={{ fontSize: '13px', color: saveMessage.includes('Error') ? 'var(--accent-danger)' : 'var(--accent-success)' }}>
              {saveMessage}
            </span>
          )}
          <button
            className="btn-primary"
            onClick={handleSaveLabels}
            disabled={isSaving}
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            {isSaving ? 'Saving...' : 'Save Labels'}
          </button>
        </div>
      </div>
    </div>
  );
}
