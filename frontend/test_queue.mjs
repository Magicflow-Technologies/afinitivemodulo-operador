import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mqsupabase.dashbportal.com';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NzI4MzgyOTAsImV4cCI6MjA4ODE5ODI5MH0.8RNTAxEa4hkmAbXD5u01S2AbB0hMM144OW66fQQO8fM';

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'afinitivebd' }
});

async function checkQueue() {
  const res1 = await supabase.from('email_queue').select('*').limit(3);
  console.log('afinitivebd.email_queue:', res1.error ? res1.error : `Filas: ${res1.data.length}`);

  const res2 = await supabase.from('calendar_settings').select('*').limit(3);
  console.log('afinitivebd.calendar_settings:', res2.error ? res2.error : `Filas: ${res2.data.length}`);
}

checkQueue();
