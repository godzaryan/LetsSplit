'use client';

import { useMemo } from 'react';
import AnimatedIcon from '../ui/AnimatedIcon';
import { Flame, Plus, Clock, History, Settings, CheckCircle2, AlertTriangle } from 'lucide-react';

interface CylinderDashboardProps {
  groupId: string;
  recurringExpenses: any[];
  expenses: any[];
  currencySymbol: string;
  currentRole: string;
  onManage: () => void;
  onSettleCylinder: (cylinderTemplate: any) => void;
}

export default function CylinderDashboard({
  groupId,
  recurringExpenses,
  expenses,
  currencySymbol,
  currentRole,
  onManage,
  onSettleCylinder
}: CylinderDashboardProps) {
  
  const cylinderTemplate = useMemo(() => {
    return recurringExpenses.find(re => re.name.toLowerCase() === 'cylinder');
  }, [recurringExpenses]);

  const cylinderExpenses = useMemo(() => {
    if (!cylinderTemplate) return [];
    return expenses
      .filter(e => e.recurring_expense_id === cylinderTemplate.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, cylinderTemplate]);

  const analytics = useMemo(() => {
    if (cylinderExpenses.length === 0) return null;

    const totalSpent = cylinderExpenses.reduce((sum, e) => sum + Number(e.total_amount), 0);
    const lastPurchase = cylinderExpenses[0];
    const lastPurchaseDate = new Date(lastPurchase.date);
    
    // Calculate days since last purchase
    const today = new Date();
    // Normalize to midnight to get whole days
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const lastMidnight = new Date(lastPurchaseDate.getFullYear(), lastPurchaseDate.getMonth(), lastPurchaseDate.getDate());
    
    const diffTime = Math.abs(todayMidnight.getTime() - lastMidnight.getTime());
    const daysSince = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Calculate average duration
    let avgDuration = 0;
    if (cylinderExpenses.length > 1) {
      // Since it's sorted descending, oldest is at the end
      const oldestPurchaseDate = new Date(cylinderExpenses[cylinderExpenses.length - 1].date);
      const oldestMidnight = new Date(oldestPurchaseDate.getFullYear(), oldestPurchaseDate.getMonth(), oldestPurchaseDate.getDate());
      
      const totalTime = Math.abs(lastMidnight.getTime() - oldestMidnight.getTime());
      const totalDays = Math.floor(totalTime / (1000 * 60 * 60 * 24));
      
      // If there are N expenses, there are N-1 intervals
      avgDuration = Math.round(totalDays / (cylinderExpenses.length - 1));
    }

    return {
      totalSpent,
      daysSince,
      avgDuration,
      count: cylinderExpenses.length,
      lastPurchaseDate: lastPurchaseDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      lastAmount: Number(lastPurchase.total_amount)
    };
  }, [cylinderExpenses]);

  if (!cylinderTemplate) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ 
          width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(230, 0, 0, 0.1)', 
          color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' 
        }}>
          <Flame size={32} />
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>Cylinder Management</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto 24px', lineHeight: '1.5' }}>
          Track your gas cylinder replacements, calculate average consumption duration, and predict when you'll need a new one.
        </p>
        {currentRole === 'owner' ? (
          <button className="btn-primary" onClick={onManage}>
            Configure Cylinder Setup
          </button>
        ) : (
          <p style={{ color: 'var(--text-muted)' }}>Ask a group manager to configure the Cylinder template.</p>
        )}
      </div>
    );
  }

  const isLow = analytics && analytics.avgDuration > 0 && analytics.daysSince >= analytics.avgDuration - 3;
  const isOverdue = analytics && analytics.avgDuration > 0 && analytics.daysSince > analytics.avgDuration;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AnimatedIcon animationType="hover-bounce"><Flame size={24} color="var(--accent-warning)" /></AnimatedIcon>
          Cylinder Analytics
          {currentRole === 'owner' && (
            <button onClick={onManage} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', marginLeft: '4px' }}>
              <Settings size={16} />
            </button>
          )}
        </h2>
        
        <button 
          onClick={() => onSettleCylinder(cylinderTemplate)}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}
        >
          <Plus size={16} /> Log Replacement
        </button>
      </div>

      {!analytics ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
            <History size={48} style={{ opacity: 0.5, margin: '0 auto' }} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>No Cylinders Logged Yet</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Click 'Log Replacement' above when you buy your first cylinder to start tracking consumption.
          </p>
        </div>
      ) : (
        <>
          {/* Main Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            
            {/* Status Card */}
            <div className="card" style={{ 
              padding: '24px', 
              background: isOverdue ? 'rgba(230, 0, 0, 0.05)' : isLow ? 'rgba(255, 171, 0, 0.05)' : 'var(--bg-secondary)',
              border: `1px solid ${isOverdue ? 'rgba(230, 0, 0, 0.3)' : isLow ? 'rgba(255, 171, 0, 0.3)' : 'var(--border-subtle)'}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Current Cylinder
                </div>
                {isOverdue ? <AlertTriangle size={20} color="var(--accent-danger)" /> :
                 isLow ? <AlertTriangle size={20} color="var(--accent-warning)" /> :
                 <CheckCircle2 size={20} color="var(--accent-success)" />}
              </div>
              <div style={{ fontSize: '32px', fontWeight: 800, color: isOverdue ? 'var(--accent-danger)' : isLow ? 'var(--accent-warning)' : 'var(--text-primary)', marginBottom: '4px' }}>
                {analytics.daysSince} <span style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-muted)' }}>Days Active</span>
              </div>
              
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px' }}>
                <Clock size={14} /> 
                {analytics.avgDuration > 0 
                  ? `Avg life: ${analytics.avgDuration} days`
                  : 'Gathering data...'}
              </div>
              
              {(isLow || isOverdue) && (
                <div style={{ 
                  marginTop: '12px', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                  background: isOverdue ? 'rgba(230, 0, 0, 0.1)' : 'rgba(255, 171, 0, 0.1)',
                  color: isOverdue ? 'var(--accent-danger)' : 'var(--accent-warning)'
                }}>
                  {isOverdue ? 'Replacement is overdue!' : 'Running low, order soon.'}
                </div>
              )}
            </div>

            {/* Average Stats */}
            <div className="card" style={{ padding: '24px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                Consumption Speed
              </div>
              <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--accent-info)', marginBottom: '4px' }}>
                {analytics.avgDuration > 0 ? analytics.avgDuration : '--'} <span style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-muted)' }}>Days / Unit</span>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '12px' }}>
                Based on {analytics.count - 1 > 0 ? `${analytics.count - 1} tracked intervals` : 'insufficient data'}
              </div>
            </div>

            {/* Total Spent */}
            <div className="card" style={{ padding: '24px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                Total Invested
              </div>
              <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--accent-success)', marginBottom: '4px' }}>
                {currencySymbol}{analytics.totalSpent.toFixed(2)}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '12px' }}>
                Across {analytics.count} cylinders purchased
              </div>
            </div>
            
          </div>

          {/* History List */}
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <History size={18} color="var(--text-secondary)" />
              Replacement History
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {cylinderExpenses.map((exp, index) => {
                const isLatest = index === 0;
                
                // Calculate duration of this specific cylinder (days between this and the next one chronologically)
                // Since array is sorted descending (newest first), the next chronological is index - 1.
                let durationStr = 'Current';
                if (index > 0) {
                  const thisDate = new Date(exp.date);
                  const nextChronologicalDate = new Date(cylinderExpenses[index - 1].date);
                  const diffTime = Math.abs(nextChronologicalDate.getTime() - thisDate.getTime());
                  const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                  durationStr = `Lasted ${days} Days`;
                }

                return (
                  <div key={exp.id} style={{ 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                    padding: '16px', borderRadius: '12px',
                    background: isLatest ? 'rgba(108, 92, 231, 0.05)' : 'var(--bg-secondary)',
                    border: `1px solid ${isLatest ? 'var(--border-active)' : 'transparent'}`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ 
                        width: '40px', height: '40px', borderRadius: '10px', 
                        background: isLatest ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.05)',
                        color: isLatest ? '#fff' : 'var(--text-muted)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <Flame size={20} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>
                          {new Date(exp.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                          {durationStr}
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)' }}>
                        {currencySymbol}{Number(exp.total_amount).toFixed(2)}
                      </div>
                      {isLatest && (
                        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)', textTransform: 'uppercase', marginTop: '4px' }}>
                          Active Now
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
