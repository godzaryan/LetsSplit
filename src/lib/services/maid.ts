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
  
  let relevantMaids: any[] = [];
  if (maidsData && maidsData.length > 0) {
    relevantMaids = maidsData.filter(m => {
      const joined = m.joined_date || startOfMonth; 
      const left = m.left_date;
      return joined <= endOfMonth && (!left || left >= startOfMonth);
    });
  }

  if (relevantMaids.length === 0) return null;

  const cycleStr = startOfMonth;

  // Fetch all attendance for this month for all relevant maids
  const maidIds = relevantMaids.map(m => m.id);
  const { data: attData } = await supabase
    .from('maid_attendance')
    .select('*')
    .in('maid_id', maidIds)
    .gte('date', startOfMonth)
    .lte('date', endOfMonth);

  const { data: bonusData } = await supabase
    .from('maid_bonuses')
    .select('*')
    .in('maid_id', maidIds)
    .eq('month', cycleStr);

  return relevantMaids.map(maid => ({
    maid,
    attendance: attData?.filter(a => a.maid_id === maid.id) || [],
    bonuses: bonusData?.filter(b => b.maid_id === maid.id) || []
  }));
}

export function calculateMaidPayout(maid: any, attendance: any[], bonuses: any[], currentDate: Date) {
  if (!maid) return null;
  
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  
  let joinedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1); 
  if (maid.joined_date) {
    const parts = maid.joined_date.split('-');
    if (parts.length === 3) {
      const [jYear, jMonth, jDay] = parts.map(Number);
      joinedDate = new Date(jYear, jMonth - 1, jDay);
    }
  }
  
  if (joinedDate.getFullYear() > currentDate.getFullYear() || 
      (joinedDate.getFullYear() === currentDate.getFullYear() && joinedDate.getMonth() > currentDate.getMonth())) {
    return { dailyRate: 0, absences: 0, billableAbsences: 0, basePayout: 0, totalBonuses: 0, finalPayout: 0 };
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
      return { dailyRate: 0, absences: 0, billableAbsences: 0, basePayout: 0, totalBonuses: 0, finalPayout: 0 };
    }
    if (leftDateObj.getFullYear() === currentDate.getFullYear() && leftDateObj.getMonth() === currentDate.getMonth()) {
      const leftDay = leftDateObj.getDate();
      const joinedDay = isJoinedThisMonth ? joinedDate.getDate() : 1;
      activeDaysInMonth = Math.max(0, leftDay - joinedDay + 1);
    }
  }
  
  const billableDaysInMonth = activeDaysInMonth;
  const presents = attendance.filter(a => a.status === 'present').length;
  
  let basePayout = 0;
  let dailyRate = 0;
  let absences = 0;
  let billableAbsences = 0;

  if (maid.payment_type === 'daily') {
    dailyRate = maid.monthly_salary; // For daily, 'monthly_salary' represents daily wage
    basePayout = presents * dailyRate;
  } else {
    // Fixed monthly
    const requiredDays = Math.max(1, daysInMonth - maid.allowed_holidays_per_month);
    dailyRate = maid.monthly_salary / requiredDays;
    absences = Math.max(0, billableDaysInMonth - presents);
    billableAbsences = Math.max(0, absences - maid.allowed_holidays_per_month);
    
    // Pro-rata based on active days
    const maxPayoutForActiveDays = (maid.monthly_salary / daysInMonth) * activeDaysInMonth;
    basePayout = Math.max(0, maxPayoutForActiveDays - (billableAbsences * dailyRate));
  }
  
  const totalBonuses = bonuses.reduce((sum, b) => sum + parseFloat(b.amount), 0);
  const finalPayout = basePayout + totalBonuses;
  
  return {
    dailyRate,
    absences,
    billableAbsences,
    basePayout,
    totalBonuses,
    finalPayout,
    presents
  };
}
