/**
 * Export group ledger to CSV format
 */
export function exportToCSV(
  expenses: any[],
  settlements: any[],
  members: any[],
  groupName: string,
  currencySymbol: string,
  getMemberName: (id: string) => string
): void {
  const rows: string[][] = [];

  // Header
  rows.push(['LetsSplit Ledger Export', '', '', '', '', '']);
  rows.push(['Group', groupName, '', '', '', '']);
  rows.push(['Exported', new Date().toLocaleString(), '', '', '', '']);
  rows.push([]);

  // Expenses section
  rows.push(['--- EXPENSES ---', '', '', '', '', '']);
  rows.push(['Date', 'Description', 'Amount', 'Paid By', 'Split Type', 'Split Details']);

  expenses.forEach((expense: any) => {
    const payers = expense.expense_payers
      ?.map((p: any) => `${getMemberName(p.member_id)} (${currencySymbol}${Number(p.amount_paid).toFixed(2)})`)
      .join('; ') || 'Unknown';

    const splits = expense.expense_splits
      ?.map((s: any) => `${getMemberName(s.member_id)}: ${currencySymbol}${Number(s.amount_owed).toFixed(2)}`)
      .join('; ') || '';

    rows.push([
      expense.date,
      expense.description,
      `${currencySymbol}${Number(expense.total_amount).toFixed(2)}`,
      payers,
      expense.split_type,
      splits,
    ]);
  });

  rows.push([]);

  // Settlements section
  rows.push(['--- SETTLEMENTS ---', '', '', '', '', '']);
  rows.push(['Date', 'From', 'To', 'Amount', 'Note', '']);

  settlements.forEach((s: any) => {
    rows.push([
      new Date(s.settled_at).toLocaleDateString(),
      getMemberName(s.from_member),
      getMemberName(s.to_member),
      `${currencySymbol}${Number(s.amount).toFixed(2)}`,
      s.note || '',
      '',
    ]);
  });

  rows.push([]);

  // Net balances
  rows.push(['--- NET BALANCES ---', '', '', '', '', '']);
  rows.push(['Member', 'Net Balance', '', '', '', '']);

  const balances: Record<string, number> = {};
  members.forEach((m: any) => { balances[m.id] = 0; });

  expenses.forEach((expense: any) => {
    expense.expense_payers?.forEach((p: any) => {
      if (balances[p.member_id] !== undefined) balances[p.member_id] += Number(p.amount_paid);
    });
    expense.expense_splits?.forEach((s: any) => {
      if (balances[s.member_id] !== undefined) balances[s.member_id] -= Number(s.amount_owed);
    });
  });

  settlements.forEach((s: any) => {
    if (balances[s.from_member] !== undefined) balances[s.from_member] += Number(s.amount);
    if (balances[s.to_member] !== undefined) balances[s.to_member] -= Number(s.amount);
  });

  members.forEach((m: any) => {
    const bal = balances[m.id] || 0;
    const name = m.is_ghost ? m.ghost_name : (m.users?.display_name || 'Unknown');
    rows.push([
      name,
      `${bal >= 0 ? '+' : ''}${currencySymbol}${Math.abs(bal).toFixed(2)}`,
      '', '', '', '',
    ]);
  });

  // Convert to CSV string
  const csvContent = rows
    .map((row) =>
      row.map((cell) => {
        const str = String(cell);
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(',')
    )
    .join('\n');

  // Download
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${groupName.replace(/[^a-z0-9]/gi, '_')}_ledger_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
