const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://letssplit-proxy.cronoquillgamers2018.workers.dev',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6ZmJqcG1tZnhobXNkYnlpb3lrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDY2MzE4MywiZXhwIjoyMDk2MjM5MTgzfQ.tgHBzwSWzvRzrERkEHlRgNUdWC-2vNwCNb59yYwiyGQ'
);

async function cleanup() {
  console.log("Deleting auto-generated scheduled expenses...");
  const { error: delErr } = await supabase
    .from('expenses')
    .delete()
    .eq('category', 'Scheduled');
    
  if (delErr) console.error("Error deleting:", delErr);
  else console.log("Deleted old expenses with category=Scheduled (if any).");

  const { error: delErr2 } = await supabase
    .from('expenses')
    .delete()
    .not('recurring_expense_id', 'is', null);
    
  if (delErr2) console.error("Error deleting recurring:", delErr2);
  else console.log("Deleted old recurring expenses.");
  
  // We can't drop the function easily via RPC, but we can just ignore it or delete it if we run raw sql.
  // We'll just remove the call to it from the frontend.
}

cleanup();
