import { SupabaseClient } from '@supabase/supabase-js';

export async function fetchMaidDataForMonth(supabase: SupabaseClient, groupId: string, currentDate: Date) {
  const { data: maidsData, error: maidErr } = await supabase
    .from('maids')
    .select('*')
    .eq('group_id', groupId);
    
  if (maidErr && maidErr.code !== 'PGRST116') throw maidErr;
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  
  const startOfMonth = `${year}-${String(month).padStart(2, '0')}-01`;
  const endOfMonth = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
  
  let relevantMaid = null;
  if (maidsData && maidsData.length > 0) {
    const sortedMaids = [...maidsData].sort((a, b) => {
      const aTime = a.joined_date ? new Date(a.joined_date).getTime() : 0;
      const bTime = b.joined_date ? new Date(b.joined_date).getTime() : 0;
      return bTime - aTime;
    });
    relevantMaid = sortedMaids.find(m => {
      const joined = m.joined_date || startOfMonth; // default to start of month if missing
      const left = m.left_date;
      return joined <= endOfMonth && (!left || left >= startOfMonth);
    });
    if (!relevantMaid) {
      relevantMaid = sortedMaids.find(m => m.is_active) || sortedMaids[0];
    }
  }

  if (!relevantMaid) return null;

  const { data: attData } = await supabase
    .from('maid_attendance')
    .select('*')
    .eq('maid_id', relevantMaid.id)
    .gte('date', startOfMonth)
    .lte('date', endOfMonth);

  const cycleStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`;
  const { data: bonusData } = await supabase
    .from('maid_bonuses')
    .select('*')
    .eq('maid_id', relevantMaid.id)
    .eq('month', cycleStr);

  return {
    maid: relevantMaid,
    attendance: attData || [],
    bonuses: bonusData || []
  };
}

export function calculateMaidPayout(maid: any, attendance: any[], bonuses: any[], currentDate: Date) {
  if (!maid) return null;
  
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const requiredDays = Math.max(1, daysInMonth - maid.allowed_holidays_per_month);
  const dailyRate = maid.monthly_salary / requiredDays;
  
  let joinedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1); // default to start of month
  if (maid.joined_date) {
    const parts = maid.joined_date.split('-');
    if (parts.length === 3) {
      const [jYear, jMonth, jDay] = parts.map(Number);
      joinedDate = new Date(jYear, jMonth - 1, jDay);
    }
  }
  
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
    const [lYear, lMonth, lDay] = maid.left_date.split('-').map(Number);
    const leftDateObj = new Date(lYear, lMonth - 1, lDay);
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
  
  const billableDaysInMonth = activeDaysInMonth;
  const presents = attendance.filter(a => a.status === 'present').length;
  const absences = Math.max(0, billableDaysInMonth - presents);
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
}
