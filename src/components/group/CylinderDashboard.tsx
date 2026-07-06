'use client';

import { useState, useMemo, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import AnimatedIcon from '../ui/AnimatedIcon';
import { Flame, Plus, Clock, History, Settings, CheckCircle2, AlertTriangle, ChevronLeft, ChevronRight, Sunrise, Sun, Moon, X } from 'lucide-react';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';

interface CylinderDashboardProps {
  groupId: string;
  recurringExpenses: any[];
  expenses: any[];
  currencySymbol: string;
  currentRole: string;
  currentUserId: string;
  onManage: () => void;
  onSettleCylinder: (cylinderTemplate: any) => void;
}

export default function CylinderDashboard({
  groupId,
  recurringExpenses,
  expenses,
  currencySymbol,
  currentRole,
  currentUserId,
  onManage,
  onSettleCylinder
}: CylinderDashboardProps) {
  const [currentDate, setCurrentDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [usageData, setUsageData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [selectedDay, setSelectedDay] = useState<{ dateStr: string, morning: boolean, afternoon: boolean, night: boolean } | null>(null);
  useLockBodyScroll(!!selectedDay);

  const supabase = createClient();

  useEffect(() => {
    fetchUsageData();
  }, [groupId]);

  const fetchUsageData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cylinder_usage')
        .select('*')
        .eq('group_id', groupId);
      
      if (error) throw error;
      setUsageData(data || []);
    } catch (err) {
      console.error('Error fetching cylinder usage:', err);
    } finally {
      setLoading(false);
    }
  };

  const cylinderTemplate = useMemo(() => {
    return recurringExpenses.find(re => re.name.toLowerCase() === 'cylinder');
  }, [recurringExpenses]);

  const cylinderExpenses = useMemo(() => {
    if (!cylinderTemplate) return [];
    return expenses
      .filter(e => e.recurring_expense_id === cylinderTemplate.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, cylinderTemplate]);

  // Enhanced Analytics based on Meals instead of just Days
  const analytics = useMemo(() => {
    if (cylinderExpenses.length === 0) return null;

    const totalSpent = cylinderExpenses.reduce((sum, e) => sum + Number(e.total_amount), 0);
    const lastPurchase = cylinderExpenses[0];
    const lastPurchaseDate = new Date(lastPurchase.date);
    const [lYear, lMonth, lDay] = lastPurchase.date.split('-').map(Number);
    const lastMidnight = new Date(lYear, lMonth - 1, lDay);

    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const diffTime = Math.abs(todayMidnight.getTime() - lastMidnight.getTime());
    const daysSince = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Calculate meals!
    let totalHistoricalMeals = 0;
    let currentCylinderMeals = 0;

    usageData.forEach(u => {
      const mealsCount = (u.morning ? 1 : 0) + (u.afternoon ? 1 : 0) + (u.night ? 1 : 0);
      totalHistoricalMeals += mealsCount;
      
      const [uYear, uMonth, uDay] = u.date.split('-').map(Number);
      const uDate = new Date(uYear, uMonth - 1, uDay);
      if (uDate >= lastMidnight) {
        currentCylinderMeals += mealsCount;
      }
    });

    let avgMealsPerCylinder = 90; // Default fallback if no history
    let avgMealsPerDay = 2.0;     // Default fallback (e.g. 2 meals a day)
    
    if (cylinderExpenses.length > 1) {
      const oldestPurchaseStr = cylinderExpenses[cylinderExpenses.length - 1].date;
      const [oYear, oMonth, oDay] = oldestPurchaseStr.split('-').map(Number);
      const oldestMidnight = new Date(oYear, oMonth - 1, oDay);
      
      const historyDiffTime = lastMidnight.getTime() - oldestMidnight.getTime();
      let historicalDays = Math.floor(historyDiffTime / (1000 * 60 * 60 * 24));
      if (historicalDays < 1) historicalDays = 1;

      let historicalMealsBeforeCurrent = 0;
      usageData.forEach(u => {
        const [uYear, uMonth, uDay] = u.date.split('-').map(Number);
        const uDate = new Date(uYear, uMonth - 1, uDay);
        if (uDate < lastMidnight && uDate >= oldestMidnight) {
          historicalMealsBeforeCurrent += (u.morning ? 1 : 0) + (u.afternoon ? 1 : 0) + (u.night ? 1 : 0);
        }
      });
      
      if (historicalMealsBeforeCurrent > 0) {
        avgMealsPerCylinder = Math.round(historicalMealsBeforeCurrent / (cylinderExpenses.length - 1));
        avgMealsPerDay = historicalMealsBeforeCurrent / historicalDays;
      }
    }

    const mealsRemaining = Math.max(0, avgMealsPerCylinder - currentCylinderMeals);
    const daysRemaining = Math.ceil(mealsRemaining / avgMealsPerDay);
    
    const predictedDateObj = new Date(todayMidnight);
    predictedDateObj.setDate(predictedDateObj.getDate() + daysRemaining);
    
    const progressPercentage = Math.min(100, Math.max(0, (currentCylinderMeals / avgMealsPerCylinder) * 100));

    return {
      totalSpent,
      daysSince,
      avgMealsPerCylinder,
      currentCylinderMeals,
      avgMealsPerDay,
      mealsRemaining,
      daysRemaining,
      progressPercentage,
      predictedDateStr: predictedDateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      count: cylinderExpenses.length,
      lastPurchaseDate: lastPurchaseDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };
  }, [cylinderExpenses, usageData]);

  const handleToggleUsage = async (dateStr: string, mealType: 'morning' | 'afternoon' | 'night', currentValue: boolean) => {
    // Optimistic update
    const updatedValue = !currentValue;
    let newUsageData = [...usageData];
    const existingIndex = newUsageData.findIndex(u => u.date === dateStr);
    
    if (existingIndex >= 0) {
      newUsageData[existingIndex] = { ...newUsageData[existingIndex], [mealType]: updatedValue };
    } else {
      newUsageData.push({
        date: dateStr,
        morning: mealType === 'morning' ? true : false,
        afternoon: mealType === 'afternoon' ? true : false,
        night: mealType === 'night' ? true : false,
      });
    }
    setUsageData(newUsageData);

    if (selectedDay) {
      setSelectedDay(prev => prev ? { ...prev, [mealType]: updatedValue } : null);
    }

    try {
      const record = newUsageData.find(u => u.date === dateStr);
      if (!record) return;

      const { error } = await supabase.from('cylinder_usage').upsert({
        group_id: groupId,
        date: dateStr,
        morning: record.morning || false,
        afternoon: record.afternoon || false,
        night: record.night || false,
        marked_by: currentUserId,
        updated_at: new Date().toISOString()
      }, { onConflict: 'group_id, date' });

      if (error) throw error;
    } catch (err) {
      console.error('Failed to toggle usage:', err);
      // Revert optimism if failed
      fetchUsageData();
    }
  };

  // Calendar Grid Generation
  const calendarDays = useMemo(() => {
    const days = [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    for (let i = 0; i < firstDay; i++) days.push(null);
    
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const usage = usageData.find(u => u.date === dateStr) || { morning: false, afternoon: false, night: false };
      
      days.push({ day: i, dateStr, ...usage });
    }
    
    return days;
  }, [currentDate, usageData]);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  if (!cylinderTemplate) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(230, 0, 0, 0.1)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <Flame size={32} />
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>Cylinder Management</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto 24px', lineHeight: '1.5' }}>
          Track your gas cylinder replacements, log daily cooking sessions, and calculate highly accurate predictive analytics based on meals cooked.
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

  const isLow = analytics && analytics.progressPercentage >= 80 && analytics.progressPercentage < 95;
  const isOverdue = analytics && analytics.progressPercentage >= 95;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 min-content' }}>
          <AnimatedIcon animationType="hover-bounce">
            <div style={{ padding: '8px', background: 'rgba(255, 171, 0, 0.1)', borderRadius: '12px', display: 'flex' }}>
              <Flame size={24} color="var(--accent-warning)" />
            </div>
          </AnimatedIcon>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', margin: 0, lineHeight: 1.2 }}>
              Cylinder
              {currentRole === 'owner' && (
                <button onClick={onManage} className="icon-btn" style={{ padding: '4px', background: 'var(--bg-secondary)', borderRadius: '50%' }}>
                  <Settings size={14} color="var(--text-muted)" />
                </button>
              )}
            </h2>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Usage & Analytics</span>
          </div>
        </div>
        
        <button 
          onClick={() => onSettleCylinder(cylinderTemplate)}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', whiteSpace: 'nowrap', flexShrink: 0 }}
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
          {/* Analytics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            {/* Status Card */}
            <div className="card" style={{ 
              padding: '24px', 
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              gridColumn: '1 / -1'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                    Current Cylinder Life
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                    <div style={{ fontSize: '36px', fontWeight: 800, color: isOverdue ? 'var(--accent-danger)' : isLow ? 'var(--accent-warning)' : 'var(--text-primary)', lineHeight: 1 }}>
                      {analytics.currentCylinderMeals}
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-muted)', paddingBottom: '4px' }}>
                      / {analytics.avgMealsPerCylinder} meals
                    </div>
                  </div>
                </div>
                
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                    Est. Empty Date
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: isOverdue ? 'var(--accent-danger)' : 'var(--accent-primary)' }}>
                    {analytics.predictedDateStr}
                  </div>
                </div>
              </div>

              {/* Progress Bar Container */}
              <div style={{ position: 'relative', width: '100%', height: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', overflow: 'hidden', marginBottom: '12px' }}>
                <div style={{
                  position: 'absolute',
                  top: 0, left: 0, bottom: 0,
                  width: `${analytics.progressPercentage}%`,
                  background: isOverdue ? 'var(--accent-danger)' : isLow ? 'var(--accent-warning)' : 'var(--accent-success)',
                  transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.5s ease',
                  borderRadius: '6px'
                }} />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>
                  <Clock size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                  {analytics.daysSince} days active
                </span>
                <span style={{ color: isOverdue ? 'var(--accent-danger)' : isLow ? 'var(--accent-warning)' : 'var(--text-secondary)', fontWeight: 600 }}>
                  {analytics.mealsRemaining} meals remaining ({Math.max(0, analytics.daysRemaining)} days)
                </span>
              </div>
            </div>

            {/* General Stats */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="card" style={{ padding: '20px', flex: 1 }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                  Days Active
                </div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {analytics.daysSince} <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)' }}>Days</span>
                </div>
              </div>
              <div className="card" style={{ padding: '20px', flex: 1 }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                  Total Invested
                </div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--accent-success)' }}>
                  {currencySymbol}{analytics.totalSpent.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Cooking Calendar */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Cooking Calendar</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-secondary)', padding: '4px 8px', borderRadius: '20px', border: '1px solid var(--border-subtle)' }}>
                <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
                  <ChevronLeft size={16} />
                </button>
                <span style={{ fontSize: '13px', fontWeight: 600, minWidth: '90px', textAlign: 'center' }}>
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </span>
                {(() => {
                  const now = new Date();
                  const isFuture = currentDate.getFullYear() > now.getFullYear() || (currentDate.getFullYear() === now.getFullYear() && currentDate.getMonth() >= now.getMonth());
                  return (
                    <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} disabled={isFuture} style={{ background: 'none', border: 'none', color: isFuture ? 'var(--border-subtle)' : 'var(--text-secondary)', cursor: isFuture ? 'not-allowed' : 'pointer', padding: '4px' }}>
                      <ChevronRight size={16} />
                    </button>
                  );
                })()}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} style={{ textAlign: 'center', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', paddingBottom: '8px' }}>{day}</div>
              ))}
              
              {loading ? (
                <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading calendar...</div>
              ) : (
                calendarDays.map((day, i) => {
                  if (!day) return <div key={`empty-${i}`} style={{ aspectRatio: '1', padding: '4px' }} />;
                  
                  const isToday = day.dateStr === new Date().toLocaleDateString('en-CA');
                  const hasUsage = day.morning || day.afternoon || day.night;
                  
                  // Determine if clickable
                  let isClickable = true;
                  if (cylinderExpenses.length === 0) {
                    isClickable = false;
                  } else {
                    const targetDate = new Date(day.dateStr);
                    targetDate.setHours(0,0,0,0);
                    const todayDate = new Date();
                    todayDate.setHours(0,0,0,0);
                    
                    const oldestPurchaseStr = cylinderExpenses[cylinderExpenses.length - 1].date;
                    const oldestPurchaseDate = new Date(oldestPurchaseStr);
                    oldestPurchaseDate.setHours(0,0,0,0);

                    if (targetDate > todayDate) isClickable = false; // no future
                    if (targetDate < oldestPurchaseDate) isClickable = false; // no past before first cylinder
                  }

                  return (
                    <button
                      key={day.dateStr}
                      onClick={() => isClickable && setSelectedDay(day)}
                      disabled={!isClickable}
                      style={{
                        aspectRatio: '1',
                        borderRadius: '12px',
                        border: `1px solid ${isToday ? 'var(--accent-primary)' : hasUsage ? 'var(--border-active)' : 'transparent'}`,
                        background: hasUsage ? 'rgba(255, 171, 0, 0.05)' : 'var(--bg-secondary)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        cursor: isClickable ? 'pointer' : 'not-allowed',
                        opacity: isClickable ? 1 : 0.3,
                        transition: 'all 0.2s ease',
                        position: 'relative'
                      }}
                      className="calendar-btn"
                    >
                      <span style={{ fontSize: '14px', fontWeight: isToday ? 700 : 500, color: isToday ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                        {day.day}
                      </span>
                      
                      {hasUsage && (
                        <div style={{ display: 'flex', gap: '2px' }}>
                          {day.morning && <Sunrise size={10} color="#00cec9" />}
                          {day.afternoon && <Sun size={10} color="#fdcb6e" />}
                          {day.night && <Moon size={10} color="#6c5ce7" />}
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '20px', fontSize: '11px', color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Sunrise size={12} color="#00cec9" /> Morning</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Sun size={12} color="#fdcb6e" /> Afternoon</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Moon size={12} color="#6c5ce7" /> Night</div>
            </div>
          </div>
        </>
      )}

      {/* Usage Modal */}
      {selectedDay && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.6)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          zIndex: 300, padding: '20px', backdropFilter: 'blur(4px)'
        }} onClick={(e) => e.target === e.currentTarget && setSelectedDay(null)}>
          <div className="glass animate-slide-up" style={{
            width: '100%', maxWidth: '400px', borderRadius: '24px', padding: '28px',
            background: 'var(--bg-card)', border: '1px solid var(--border-active)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Log Cooking Session</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  {new Date(selectedDay.dateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <button onClick={() => setSelectedDay(null)} style={{ background: 'var(--bg-secondary)', border: 'none', color: 'var(--text-muted)', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { key: 'morning', label: 'Morning', icon: <Sunrise size={20} />, color: '#00cec9' },
                { key: 'afternoon', label: 'Afternoon', icon: <Sun size={20} />, color: '#fdcb6e' },
                { key: 'night', label: 'Night', icon: <Moon size={20} />, color: '#6c5ce7' }
              ].map(meal => {
                const isActive = selectedDay[meal.key as keyof typeof selectedDay] as boolean;
                return (
                  <button
                    key={meal.key}
                    onClick={() => handleToggleUsage(selectedDay.dateStr, meal.key as any, isActive)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '16px 20px', borderRadius: '16px',
                      background: isActive ? `${meal.color}20` : 'var(--bg-secondary)',
                      border: `1px solid ${isActive ? meal.color : 'transparent'}`,
                      color: isActive ? meal.color : 'var(--text-primary)',
                      cursor: 'pointer', transition: 'all 0.2s ease',
                      fontWeight: 600, fontSize: '15px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {meal.icon} {meal.label}
                    </div>
                    {isActive && <CheckCircle2 size={18} />}
                  </button>
                );
              })}
            </div>
            
            <button className="btn-primary" onClick={() => setSelectedDay(null)} style={{ width: '100%', marginTop: '24px', padding: '14px' }}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
