const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://letssplit-proxy.cronoquillgamers2018.workers.dev',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6ZmJqcG1tZnhobXNkYnlpb3lrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDY2MzE4MywiZXhwIjoyMDk2MjM5MTgzfQ.tgHBzwSWzvRzrERkEHlRgNUdWC-2vNwCNb59yYwiyGQ'
);

async function test() {
  const { data: groups } = await supabase.from('groups').select('id');
  if (!groups || groups.length === 0) return console.log("No groups");
  
  const gId = groups[0].id;
  const today = new Date();
  const currentCycleStr = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}-01`;
  
  console.log("Calling sync_scheduled_expenses for", gId, "cycle", currentCycleStr);
  const result = await supabase.rpc('sync_scheduled_expenses', { g_id: gId, target_cycle: currentCycleStr });
  console.log("RPC RESULT:", JSON.stringify(result, null, 2));
}

test();
