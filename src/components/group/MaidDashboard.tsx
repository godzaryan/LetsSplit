'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Calendar as CalendarIcon, Settings, Plus, CheckCircle, XCircle, AlertCircle, Trash2, Edit3, Save } from 'lucide-react';
import AnimatedIcon from '../ui/AnimatedIcon';
import { fetchMaidDataForMonth, calculateMaidPayout } from '@/lib/services/maid';

export default function MaidDashboard({
  groupId, members, currentUserId, currentMemberId, currentRole, currencySymbol
}: any) {
  const [loading, setLoading] = useState(true);
  const [allMaidsData, setAllMaidsData] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showConfig, setShowConfig] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  
  const [configName, setConfigName] = useState('');
  const [configSalary, setConfigSalary] = useState('');
  const [configHolidays, setConfigHolidays] = useState('');
  const [configJoinedDate, setConfigJoinedDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [configPaymentType, setConfigPaymentType] = useState('fixed');
  const [editingMaidId, setEditingMaidId] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => { fetchMaidData(); }, [groupId, currentDate]);

  const fetchMaidData = async () => {
    setLoading(true);
    try {
      const data = await fetchMaidDataForMonth(supabase, groupId, currentDate);
      if (data) {
        setAllMaidsData(data);
      } else {
        setAllMaidsData([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!configName || !configSalary) return;
    try {
      if (editingMaidId) {
        await supabase.from('maids').update({
          name: configName,
          monthly_salary: parseFloat(configSalary),
          allowed_holidays_per_month: parseInt(configHolidays) || 0,
          joined_date: configJoinedDate,
          payment_type: configPaymentType
        }).eq('id', editingMaidId);
      } else {
        await supabase.from('maids').insert({
          group_id: groupId,
          name: configName,
          monthly_salary: parseFloat(configSalary),
          allowed_holidays_per_month: parseInt(configHolidays) || 0,
          joined_date: configJoinedDate,
          payment_type: configPaymentType,
          is_active: true,
          added_by: currentUserId
        });
      }
      setShowConfig(false);
      setIsAddingNew(false);
      setEditingMaidId(null);
      fetchMaidData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMaid = async (maidId: string) => {
    if (!confirm('Are you sure you want to disable this Maid? They will be marked as inactive from today, but past history will be preserved.')) return;
    try {
      const leftDate = new Date().toLocaleDateString('en-CA');
      await supabase.from('maids').update({ is_active: false, left_date: leftDate }).eq('id', maidId);
      setShowConfig(false);
      fetchMaidData();
    } catch (err) {
      console.error(err);
    }
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading Maid Data...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Month Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          Maid Dashboard
        </h2>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {currentRole === 'owner' && !showConfig && (
             <button onClick={() => {
                setIsAddingNew(true);
                setEditingMaidId(null);
                setConfigName('');
                setConfigSalary('');
                setConfigHolidays('0');
                setConfigPaymentType('fixed');
                setConfigJoinedDate(new Date().toLocaleDateString('en-CA'));
                setShowConfig(true);
             }} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
               + Add New Maid
             </button>
          )}
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--bg-secondary)', padding: '4px 8px', borderRadius: '20px', border: '1px solid var(--border-subtle)' }}>
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', padding: '4px' }}>
              &larr;
            </button>
            <span style={{ fontSize: '14px', fontWeight: 600, minWidth: '100px', textAlign: 'center' }}>
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', padding: '4px' }}>
              &rarr;
            </button>
          </div>
        </div>
      </div>

      {showConfig && (
        <div className="card" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-active)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>{isAddingNew ? 'Add New Maid' : 'Edit Maid'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Maid Name</label>
              <input type="text" className="input-field" value={configName} onChange={e => setConfigName(e.target.value)} placeholder="e.g. Sunita" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Payment Type</label>
              <select className="input-field" value={configPaymentType} onChange={e => setConfigPaymentType(e.target.value)}>
                <option value="fixed">Fixed Monthly</option>
                <option value="daily">Per Day Present</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Salary/Rate</label>
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
              <button className="btn-secondary" onClick={() => { setShowConfig(false); setIsAddingNew(false); setEditingMaidId(null); }}>Cancel</button>
              {editingMaidId && (
                <button className="btn-secondary" style={{ color: 'var(--accent-danger)' }} onClick={() => handleDeleteMaid(editingMaidId)}>Disable Maid</button>
              )}
              <button className="btn-primary" onClick={handleSaveConfig}>Save Configuration</button>
          </div>
        </div>
      )}

      {allMaidsData.length === 0 && !showConfig ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
           <p style={{ color: 'var(--text-secondary)' }}>No active maids for this month.</p>
        </div>
      ) : (
        allMaidsData.map((data, idx) => (
          <MaidCard 
            key={data.maid.id || idx} 
            data={data} 
            currentDate={currentDate} 
            currencySymbol={currencySymbol} 
            supabase={supabase} 
            currentUserId={currentUserId}
            currentRole={currentRole}
            onEdit={() => {
              setEditingMaidId(data.maid.id);
              setConfigName(data.maid.name);
              setConfigSalary(data.maid.monthly_salary);
              setConfigHolidays(data.maid.allowed_holidays_per_month);
              setConfigJoinedDate(data.maid.joined_date || new Date().toLocaleDateString('en-CA'));
              setConfigPaymentType(data.maid.payment_type || 'fixed');
              setIsAddingNew(false);
              setShowConfig(true);
            }}
            onRefresh={fetchMaidData}
          />
        ))
      )}
    </div>
  );
}

function MaidCard({ data, currentDate, currencySymbol, supabase, currentUserId, currentRole, onEdit, onRefresh }: any) {
  const { maid, attendance, bonuses } = data;
  const calculations = useMemo(() => calculateMaidPayout(maid, attendance, bonuses, currentDate), [maid, attendance, bonuses, currentDate]);
  
  const [showBonus, setShowBonus] = useState(false);
  const [bonusAmount, setBonusAmount] = useState('');
  const [bonusReason, setBonusReason] = useState('');

  const handleToggleAttendance = async (dateStr: string) => {
    const existing = attendance.find((a: any) => a.date === dateStr);
    try {
      if (existing && existing.status === 'present') {
        await supabase.from('maid_attendance').delete().eq('maid_id', maid.id).eq('date', dateStr);
      } else {
        await supabase.from('maid_attendance').delete().eq('maid_id', maid.id).eq('date', dateStr);
        await supabase.from('maid_attendance').insert({ maid_id: maid.id, date: dateStr, status: 'present', marked_by: currentUserId });
      }
      onRefresh();
    } catch (err) {}
  };

  const handleAddBonus = async () => {
    if (!bonusAmount) return;
    try {
      const cycleStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`;
      await supabase.from('maid_bonuses').insert({
        maid_id: maid.id, month: cycleStr, amount: parseFloat(bonusAmount), reason: bonusReason, added_by: currentUserId
      });
      setShowBonus(false);
      setBonusAmount('');
      setBonusReason('');
      onRefresh();
    } catch (err) {}
  };

  const handleDeleteBonus = async (id: string) => {
    try {
      await supabase.from('maid_bonuses').delete().eq('id', id);
      onRefresh();
    } catch (err) {}
  };

  const calendarDays = useMemo(() => {
    const days = [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); 
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const att = attendance.find((a: any) => a.date === dateStr);
      const isBeforeJoined = maid?.joined_date && dateStr < maid.joined_date;
      const isAfterLeft = maid?.left_date && dateStr > maid.left_date;
      days.push({ day: i, dateStr, status: (isBeforeJoined || isAfterLeft) ? 'disabled' : (att?.status === 'present' ? 'present' : 'absent') });
    }
    return days;
  }, [currentDate, attendance, maid]);

  return (
    <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '20px', background: 'var(--bg-secondary)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700 }}>{maid.name} {maid.payment_type === 'daily' ? '(Daily Wage)' : '(Fixed Salary)'} {!maid.is_active && <span style={{color: 'var(--accent-danger)'}}>[Inactive]</span>}</h3>
        {currentRole === 'owner' && <button onClick={onEdit} className="btn-secondary" style={{ padding: '4px 8px' }}><Edit3 size={14}/></button>}
      </div>

      {calculations && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Calculated Payout</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--accent-success)' }}>{currencySymbol}{calculations.finalPayout.toFixed(2)}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Base: {currencySymbol}{calculations.basePayout.toFixed(2)} {calculations.totalBonuses > 0 && `+ Bonus: ${currencySymbol}${calculations.totalBonuses.toFixed(2)}`}</div>
          </div>
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Attendance</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {maid.payment_type === 'daily' ? `${calculations.presents} Presents` : `${calculations.absences} Absences`}
            </div>
            {maid.payment_type !== 'daily' && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{maid.allowed_holidays_per_month} Holidays Allowed</div>}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '8px' }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{d}</div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '20px' }}>
        {calendarDays.map((day, i) => {
          if (!day) return <div key={i} />;
          const bg = day.status === 'present' ? 'rgba(0, 204, 102, 0.1)' : day.status === 'absent' ? 'rgba(255, 26, 26, 0.1)' : 'transparent';
          const color = day.status === 'present' ? 'var(--accent-success)' : day.status === 'absent' ? 'var(--accent-danger)' : 'rgba(255,255,255,0.2)';
          return (
            <button key={day.dateStr} disabled={day.status === 'disabled'} onClick={() => handleToggleAttendance(day.dateStr)}
              style={{ padding: '8px 0', background: bg, borderRadius: '4px', color, border: 'none', cursor: day.status === 'disabled' ? 'not-allowed' : 'pointer' }}>
              <div style={{ fontSize: '12px', fontWeight: 600 }}>{day.day}</div>
            </button>
          )
        })}
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 600 }}>Bonuses</h4>
          <button onClick={() => setShowBonus(!showBonus)} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '12px' }}>+ Add Bonus</button>
        </div>
        {showBonus && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <input className="input-field" placeholder="Amount" value={bonusAmount} onChange={e=>setBonusAmount(e.target.value)} />
            <input className="input-field" placeholder="Reason" value={bonusReason} onChange={e=>setBonusReason(e.target.value)} />
            <button className="btn-primary" onClick={handleAddBonus}>Save</button>
          </div>
        )}
        {bonuses.map((b: any) => (
          <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px', marginBottom: '4px' }}>
            <div><span style={{fontWeight:600}}>{currencySymbol}{b.amount}</span> <span style={{fontSize:'12px', color:'var(--text-muted)'}}>{b.reason}</span></div>
            <button onClick={() => handleDeleteBonus(b.id)} style={{background:'none', border:'none', color:'var(--accent-danger)'}}><Trash2 size={14}/></button>
          </div>
        ))}
      </div>
    </div>
  );
}
