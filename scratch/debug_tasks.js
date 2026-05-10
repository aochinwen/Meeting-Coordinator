const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugTasks() {
  const now = new Date();
  const startDate = now.toISOString().split('T')[0];
  console.log('StartDate:', startDate);

  const { data, error } = await supabase
    .from('meeting_checklist_tasks')
    .select(`
      id,
      description,
      is_completed,
      due_days_before,
      meeting_id,
      meetings!inner(title, date)
    `)
    .eq('is_completed', false)
    .gte('meetings.date', startDate)
    .order('meetings(date)', { ascending: true })
    .limit(10);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Results count:', data.length);
  data.forEach(t => {
    console.log(`- ${t.meetings.date} | ${t.meetings.title} | ${t.description} (D-${t.due_days_before}) | Completed: ${t.is_completed}`);
  });
}

debugTasks();
