'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Calendar as CalendarIcon, Settings, Plus, CheckCircle, XCircle, AlertCircle, Trash2, Edit3, Save } from 'lucide-react';
import AnimatedIcon from '../ui/AnimatedIcon';

interface MaidDashboardProps {
  groupId: string;
  members: any[];
  currentUserId: string;
  currentMemberId: string;
  currentRole: string;
  currencySymbol: string;
}

export default function MaidDashboard({
  groupId,
  members,
  currentUserId,
  currentMemberId,
  currentRole,
  currencySymbol
}: MaidDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [maid, setMaid] = useState<any>(null);
  const [allMaids, setAllMaids] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [bonuses, setBonuses] = useState<any[]>([]);
  
  // UI State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showConfig, setShowConfig] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [showBonus, setShowBonus] = useState(false);
  const [error, setError] = useState('');
  
  // Config Form
  const [configName, setConfigName] = useState('');
  const [configSalary, setConfigSalary] = useState('');
  const [configHolidays, setConfigHolidays] = useState('');
  const [configJoinedDate, setConfigJoinedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Bonus Form
  const [bonusAmount, setBonusAmount] = useState('');
  const [bonusReason, setBonusReason] = useState('');

  const supabase = createClient();

  useEffect(() => {
    fetchMaidData();
  }, [groupId, currentDate]);

  const fetchMaidData = async () => {
    setLoading(true);
    try {
      // 1. Fetch All Maids config
      const { data: maidsData, error: maidErr } = await supabase
        .from('maids')
        .select('*')
        .eq('group_id', groupId);
        
      if (maidErr && maidErr.code !== 'PGRST116') throw maidErr;
      
      setAllMaids(maidsData || []);
      
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0];
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0];
      
      let relevantMaid = null;
      if (maidsData && maidsData.length > 0) {
        const sortedMaids = [...maidsData].sort((a, b) => new Date(b.joined_date).getTime() - new Date(a.joined_date).getTime());
        relevantMaid = sortedMaids.find(m => {
          const joined = m.joined_date;
          const left = m.left_date;
          return joined <= endOfMonth && (!left || left >= startOfMonth);
        });
        if (!relevantMaid) {
          relevantMaid = sortedMaids.find(m => m.is_active) || sortedMaids[0];
        }
      }
      
      setMaid(relevantMaid || null);
      if (relevantMaid && !isAddingNew) {
        setConfigName(relevantMaid.name);
        setConfigSalary(relevantMaid.monthly_salary);
        setConfigHolidays(relevantMaid.allowed_holidays_per_month);
        setConfigJoinedDate(relevantMaid.joined_date || new Date().toISOString().split('T')[0]);
      }

      if (relevantMaid) {
        // 2. Fetch Attendance for current month
        
        const { data: attData } = await supabase
          .from('maid_attendance')
          .select('*')
          .eq('maid_id', relevantMaid.id)
          .gte('date', startOfMonth)
          .lte('date', endOfMonth);
          
        setAttendance(attData || []);

        // 3. Fetch Bonuses for current month
        const cycleStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`;
        const { data: bonusData } = await supabase
          .from('maid_bonuses')
          .select('*')
          .eq('maid_id', relevantMaid.id)
          .eq('month', cycleStr);
          
        setBonuses(bonusData || []);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const syncMaidRecurringExpense = async (salary: number, joinedDate: string) => {
    try {
      const { data: existingRE, error: fetchErr } = await supabase.from('recurring_expenses')
        .select('*')
        .eq('group_id', groupId)
        .ilike('name', 'Maid')
        .limit(1)
        .maybeSingle();

      if (fetchErr) {
        console.warn('Error fetching Maid expense:', fetchErr);
      }

      if (existingRE) {
        await supabase.from('recurring_expenses').update({
          amount: salary,
          is_active: true,
          start_date: joinedDate
        }).eq('id', existingRE.id);
      } else {
        const { data: newRE, error: insErr } = await supabase.from('recurring_expenses').insert({
          group_id: groupId,
          name: 'Maid',
          amount: salary,
          cycle: 'monthly',
          start_date: joinedDate,
          split_type: 'equal',
          created_by: currentMemberId
        }).select().single();
        
        if (insErr) {
          console.error('Failed to create Maid recurring expense:', insErr);
          return;
        }
        
        if (newRE) {
          const splitRows = members.map(m => ({
            recurring_expense_id: newRE.id,
            member_id: m.id,
            amount_owed: salary / members.length
          }));
          await supabase.from('recurring_expense_splits').insert(splitRows);
        }
      }
    } catch (err) {
      console.error('Failed to sync scheduled expense:', err);
    }
  };

  const handleSaveConfig = async () => {
    if (!configName || !configSalary) return;
    try {
      if (maid && !isAddingNew) {
        await supabase.from('maids').update({
          name: configName,
          monthly_salary: parseFloat(configSalary),
          allowed_holidays_per_month: parseInt(configHolidays) || 0,
          joined_date: configJoinedDate
        }).eq('id', maid.id);
      } else {
        await supabase.from('maids').insert({
          group_id: groupId,
          name: configName,
          monthly_salary: parseFloat(configSalary),
          allowed_holidays_per_month: parseInt(configHolidays) || 0,
          joined_date: configJoinedDate,
          is_active: true,
          added_by: currentUserId
        });
      }
      
      await syncMaidRecurringExpense(parseFloat(configSalary), configJoinedDate);
      
      setShowConfig(false);
      setIsAddingNew(false);
      fetchMaidData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMaid = async () => {
    if (!maid) return;
    if (!confirm('Are you sure you want to disable this Maid? They will be marked as inactive from today, but past history will be preserved.')) return;
    try {
      const leftDate = new Date().toISOString().split('T')[0];
      await supabase.from('maids').update({ is_active: false, left_date: leftDate }).eq('id', maid.id);
      
      // Auto-deactivate the scheduled expense but keep history
      await supabase.from('recurring_expenses')
        .update({ is_active: false })
        .eq('group_id', groupId)
        .ilike('name', 'Maid');
        
      setShowConfig(false);
      fetchMaidData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleAttendance = async (dateStr: string) => {
    if (!maid) return;
    
    const existing = attendance.find(a => a.date === dateStr);
    try {
      if (existing && existing.status === 'present') {
        // Toggle to remove (absent)
        await supabase.from('maid_attendance').delete().eq('maid_id', maid.id).eq('date', dateStr);
        setAttendance(attendance.filter(a => a.date !== dateStr));
      } else {
        // Ensure no leftover records exist to avoid 409 Conflict
        await supabase.from('maid_attendance').delete().eq('maid_id', maid.id).eq('date', dateStr);
        
        // Toggle to present
        const { data, error } = await supabase.from('maid_attendance').insert({
          maid_id: maid.id,
          date: dateStr,
          status: 'present',
          marked_by: currentUserId
        }).select().single();
        
        if (error) throw error;
        if (data) setAttendance([...attendance.filter(a => a.date !== dateStr), data]);
      }
    } catch (err) {
      console.error('Error toggling attendance:', err);
    }
  };

  const handleAddBonus = async () => {
    if (!maid || !bonusAmount) return;
    try {
      const cycleStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`;
      const { data } = await supabase.from('maid_bonuses').insert({
        maid_id: maid.id,
        month: cycleStr,
        amount: parseFloat(bonusAmount),
        reason: bonusReason,
        added_by: currentUserId
      }).select().single();
      
      if (data) setBonuses([...bonuses, data]);
      setShowBonus(false);
      setBonusAmount('');
      setBonusReason('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteBonus = async (id: string) => {
    try {
      await supabase.from('maid_bonuses').delete().eq('id', id);
      setBonuses(bonuses.filter(b => b.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  // Calculations
  const calculations = useMemo(() => {
    if (!maid) return null;
    
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    
    // The core fix: Daily rate is based on required working days (excluding holidays)
    const requiredDays = Math.max(1, daysInMonth - maid.allowed_holidays_per_month);
    const dailyRate = maid.monthly_salary / requiredDays;
    
    // Calculate days they were actually employed this month
    let billableDaysInMonth = daysInMonth;
    const joinedDate = new Date(maid.joined_date);
    
    if (joinedDate.getFullYear() > currentDate.getFullYear() || 
        (joinedDate.getFullYear() === currentDate.getFullYear() && joinedDate.getMonth() > currentDate.getMonth())) {
      return { dailyRate, absences: 0, billableAbsences: 0, basePayout: 0, totalBonuses: 0, finalPayout: 0 };
    }
    
    let activeDaysInMonth = daysInMonth;
    const isJoinedThisMonth = joinedDate.getFullYear() === currentDate.getFullYear() && joinedDate.getMonth() === currentDate.getMonth();
    if (isJoinedThisMonth) {
      const joinedDay = joinedDate.getDate();
      activeDaysInMonth = daysInMonth - joinedDay + 1;
    }
    
    if (maid.left_date) {
      const leftDateObj = new Date(maid.left_date);
      if (leftDateObj.getFullYear() < currentDate.getFullYear() || 
          (leftDateObj.getFullYear() === currentDate.getFullYear() && leftDateObj.getMonth() < currentDate.getMonth())) {
        return { dailyRate, absences: 0, billableAbsences: 0, basePayout: 0, totalBonuses: 0, finalPayout: 0 };
      }
      if (leftDateObj.getFullYear() === currentDate.getFullYear() && leftDateObj.getMonth() === currentDate.getMonth()) {
        const leftDay = leftDateObj.getDate();
        const joinedDay = isJoinedThisMonth ? joinedDate.getDate() : 1;
        activeDaysInMonth = Math.max(0, leftDay - joinedDay + 1);
      }
    }
    
    billableDaysInMonth = activeDaysInMonth;
    
    const presents = attendance.filter(a => a.status === 'present').length;
    const absences = Math.max(0, billableDaysInMonth - presents);
    
    // Earned logic: Pay is built up by days present, capped at monthly salary
    const basePayout = Math.min(maid.monthly_salary, presents * dailyRate);
    
    const billableAbsences = Math.max(0, absences - maid.allowed_holidays_per_month);
    
    const totalBonuses = bonuses.reduce((sum, b) => sum + parseFloat(b.amount), 0);
    const finalPayout = basePayout + totalBonuses;
    
    return {
      dailyRate,
      absences,
      billableAbsences,
      basePayout,
      totalBonuses,
      finalPayout
    };
  }, [maid, attendance, bonuses, currentDate]);

  // Calendar Grid Generation
  const calendarDays = useMemo(() => {
    const days = [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Pad start
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const att = attendance.find(a => a.date === dateStr);
      
      const isBeforeJoined = maid?.joined_date && dateStr < maid.joined_date;
      
      days.push({
        day: i,
        dateStr,
        status: isBeforeJoined ? 'disabled' : (att?.status === 'present' ? 'present' : 'absent')
      });
    }
    
    return days;
  }, [currentDate, attendance]);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading Maid Data...</div>;
  }

  // Onboarding UI
  if (!maid && !showConfig) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ 
          width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(230, 0, 0, 0.1)', 
          color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' 
        }}>
          <CalendarIcon size={32} />
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>Maid Management</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto 24px', lineHeight: '1.5' }}>
          Track daily attendance, auto-calculate monthly payouts based on allowed holidays, and handle bonuses effortlessly.
        </p>
        {currentRole === 'owner' ? (
          <button className="btn-primary" onClick={() => setShowConfig(true)}>
            Enable Maid Management
          </button>
        ) : (
          <p style={{ color: 'var(--text-muted)' }}>Ask a group manager to configure the maid.</p>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Month Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          {maid?.name || 'Maid Dashboard'}
          {maid && !maid.is_active && (
            <span style={{ fontSize: '10px', padding: '2px 6px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '4px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Inactive</span>
          )}
          {currentRole === 'owner' && (
            <button onClick={() => { setIsAddingNew(false); setShowConfig(true); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
              <Settings size={16} />
            </button>
          )}
        </h2>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {maid && !maid.is_active && currentRole === 'owner' && !showConfig && (
             <button onClick={() => {
                setIsAddingNew(true);
                setConfigName('');
                setConfigSalary('');
                setConfigHolidays('0');
                setConfigJoinedDate(new Date().toISOString().split('T')[0]);
                setShowConfig(true);
             }} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
               + Add New Maid
             </button>
          )}
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--bg-secondary)', padding: '4px 8px', borderRadius: '20px', border: '1px solid var(--border-subtle)' }}>
          <button 
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', padding: '4px' }}
          >
            <ChevronLeftIcon />
          </button>
          <span style={{ fontSize: '14px', fontWeight: 600, minWidth: '100px', textAlign: 'center' }}>
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </span>
          <button 
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', padding: '4px' }}
          >
            <ChevronRightIcon />
          </button>
          </div>
        </div>
      </div>

      {/* Config Form (if active) */}
      {showConfig && (
        <div className="card" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-active)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>{isAddingNew ? 'Add New Maid' : (maid ? 'Edit Configuration' : 'Configure Maid')}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Maid Name</label>
              <input type="text" className="input-field" value={configName} onChange={e => setConfigName(e.target.value)} placeholder="e.g. Sunita" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Monthly Salary</label>
              <input type="number" className="input-field" value={configSalary} onChange={e => setConfigSalary(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Holidays / Month</label>
              <input type="number" className="input-field" value={configHolidays} onChange={e => setConfigHolidays(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Joined Date</label>
              <input type="date" className="input-field" value={configJoinedDate} onChange={e => setConfigJoinedDate(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn-secondary" onClick={() => { setShowConfig(false); setIsAddingNew(false); }}>Cancel</button>
              {!isAddingNew && maid && (
                <button className="btn-secondary" style={{ color: 'var(--accent-danger)' }} onClick={handleDeleteMaid}>
                  Disable Maid
                </button>
              )}
              <button className="btn-primary" onClick={handleSaveConfig}>Save Configuration</button>
          </div>
        </div>
      )}

      {maid && calculations && (
        <>
          {/* Stats Header */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Calculated Payout</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--accent-success)' }}>
                {currencySymbol}{calculations.finalPayout.toFixed(2)}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                Max Base: {currencySymbol}{maid.monthly_salary}
                {calculations.totalBonuses > 0 && ` • Bonus: +${currencySymbol}${calculations.totalBonuses.toFixed(2)}`}
              </div>
            </div>

            <div className="card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Attendance</div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)' }}>
                {calculations.absences} <span style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: 500 }}>Absences</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                {maid.allowed_holidays_per_month} Holidays Allowed • {calculations.billableAbsences} Billable
              </div>
            </div>
          </div>

          <div className="dashboard-grid">
            {/* Calendar */}
            <div className="card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Attendance Calendar</h3>
                <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-success)' }} /> Present</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-danger)' }} /> Absent</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', textAlign: 'center', marginBottom: '8px' }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>{d}</div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                {calendarDays.map((day, i) => {
                  if (!day) return <div key={`empty-${i}`} style={{ padding: '20px 0' }} />;
                  
                  let bg = 'rgba(255,255,255,0.02)';
                  let color = 'var(--text-secondary)';
                  let border = '1px solid transparent';
                  
                  if (day.status === 'present') {
                    bg = 'rgba(0, 204, 102, 0.1)';
                    color = 'var(--accent-success)';
                    border = '1px solid rgba(0, 204, 102, 0.3)';
                  } else if (day.status === 'absent') {
                    bg = 'rgba(255, 26, 26, 0.1)';
                    color = 'var(--accent-danger)';
                    border = '1px solid rgba(255, 26, 26, 0.3)';
                  } else if (day.status === 'disabled') {
                    bg = 'transparent';
                    color = 'rgba(255, 255, 255, 0.1)';
                  }
                  
                  const isToday = day.dateStr === new Date().toISOString().split('T')[0];

                  return (
                    <button
                      key={day.dateStr}
                      onClick={() => day.status !== 'disabled' && handleToggleAttendance(day.dateStr)}
                      disabled={day.status === 'disabled'}
                      style={{
                        padding: '12px 0',
                        background: bg,
                        border: isToday ? '1px solid var(--accent-primary)' : border,
                        borderRadius: '8px',
                        color,
                        fontWeight: day.status !== 'none' || isToday ? 700 : 500,
                        cursor: day.status === 'disabled' ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                      }}
                      className="hover:bg-opacity-80"
                      title="Click to toggle: Present <-> Absent"
                    >
                      <span style={{ fontSize: '14px' }}>{day.day}</span>
                      {day.status === 'present' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                    </button>
                  );
                })}
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '16px', textAlign: 'center' }}>
                Tip: Click a day to toggle between Present and Absent. All unmarked days default to Absent.
              </p>
            </div>

            {/* Bonuses Sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Bonuses</h3>
                  <button onClick={() => setShowBonus(!showBonus)} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600 }}>
                    <Plus size={14} /> Add
                  </button>
                </div>

                {showBonus && (
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', marginBottom: '16px', border: '1px solid var(--border-subtle)' }}>
                    <input type="number" className="input-field" value={bonusAmount} onChange={e => setBonusAmount(e.target.value)} placeholder="Amount (₹)" style={{ marginBottom: '8px' }} />
                    <input type="text" className="input-field" value={bonusReason} onChange={e => setBonusReason(e.target.value)} placeholder="Reason (e.g. Festival)" style={{ marginBottom: '12px' }} />
                    <button className="btn-primary" onClick={handleAddBonus} style={{ width: '100%', padding: '8px', fontSize: '13px' }}>Save Bonus</button>
                  </div>
                )}

                {bonuses.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>No bonuses added this month.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {bonuses.map(b => (
                      <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{currencySymbol}{b.amount}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{b.reason || 'Bonus'}</div>
                        </div>
                        <button onClick={() => handleDeleteBonus(b.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Helper icons
function ChevronLeftIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>;
}
function ChevronRightIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>;
}
