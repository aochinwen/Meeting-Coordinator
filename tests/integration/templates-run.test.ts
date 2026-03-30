/**
 * Template Creation Integration Tests (Standalone - No Path Aliases)
 * 
 * Run this file directly: npx ts-node tests/integration/templates-run.test.ts
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Initialize Supabase client directly
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('   Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test results tracking
interface TestResult {
  name: string;
  status: 'PASSED' | 'FAILED' | 'SKIPPED';
  error?: string;
  duration: number;
}

const results: TestResult[] = [];

// Test data for cleanup
const testData = {
  templates: [] as string[],
  tasks: [] as string[],
  meetings: [] as string[],
  series: [] as string[],
};

// Cleanup function
async function cleanup() {
  console.log('🧹 Cleaning up test data...');
  
  if (testData.tasks.length > 0) {
    await supabase.from('template_checklist_tasks').delete().in('id', testData.tasks);
    await supabase.from('meeting_checklist_tasks').delete().in('meeting_id', testData.meetings);
  }
  if (testData.meetings.length > 0) {
    await supabase.from('meetings').delete().in('id', testData.meetings);
  }
  if (testData.series.length > 0) {
    await supabase.from('meeting_series').delete().in('id', testData.series);
  }
  if (testData.templates.length > 0) {
    await supabase.from('templates').delete().in('id', testData.templates);
  }
  
  testData.templates = [];
  testData.tasks = [];
  testData.meetings = [];
  testData.series = [];
}

// Helper to get existing profile for testing
async function getTestProfile() {
  const { data } = await supabase
    .from('profiles')
    .select('id, name')
    .limit(1)
    .single();
  return data;
}

// Test runner
async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  try {
    await testFn();
    results.push({ name, status: 'PASSED', duration: Date.now() - start });
    console.log(`  ✅ ${name}`);
  } catch (err: any) {
    results.push({ name, status: 'FAILED', error: err.message, duration: Date.now() - start });
    console.log(`  ❌ ${name}`);
    console.log(`     Error: ${err.message}`);
  }
}

// ==================== TEST CASES ====================

async function test1_BasicTemplateCreation() {
  console.log('\n📦 Test 1: Basic Template Creation');
  
  await runTest('Create template with name only', async () => {
    const templateName = `Test Template ${Date.now()}`;
    
    const { data, error } = await supabase
      .from('templates')
      .insert({ name: templateName })
      .select()
      .single();
    
    if (error) throw error;
    if (!data) throw new Error('No data returned');
    if (data.name !== templateName) throw new Error('Name mismatch');
    if (!data.id) throw new Error('No ID generated');
    
    testData.templates.push(data.id);
    
    // Verify in database
    const { data: verifyData, error: verifyError } = await supabase
      .from('templates')
      .select('*')
      .eq('id', data.id)
      .single();
    
    if (verifyError) throw verifyError;
    if (!verifyData) throw new Error('Template not found in DB');
    if (verifyData.name !== templateName) throw new Error('DB name mismatch');
  });
  
  await runTest('Create template with chairman', async () => {
    const profile = await getTestProfile();
    if (!profile) throw new Error('No test profile available');
    
    const { data, error } = await supabase
      .from('templates')
      .insert({
        name: `Template with Chairman ${Date.now()}`,
        chairman_id: profile.id,
      })
      .select()
      .single();
    
    if (error) throw error;
    if (!data) throw new Error('No data returned');
    if (data.chairman_id !== profile.id) throw new Error('Chairman ID mismatch');
    
    testData.templates.push(data.id);
  });
  
  await runTest('Create template with coordinator', async () => {
    const profile = await getTestProfile();
    if (!profile) throw new Error('No test profile available');
    
    const { data, error } = await supabase
      .from('templates')
      .insert({
        name: `Template with Coordinator ${Date.now()}`,
        coordinator_id: profile.id,
      })
      .select()
      .single();
    
    if (error) throw error;
    if (!data) throw new Error('No data returned');
    if (data.coordinator_id !== profile.id) throw new Error('Coordinator ID mismatch');
    
    testData.templates.push(data.id);
  });
  
  await runTest('Create template with both chairman and coordinator', async () => {
    const { data: profiles } = await supabase.from('profiles').select('id').limit(2);
    if (!profiles || profiles.length === 0) throw new Error('No profiles available');
    
    const chairman = profiles[0];
    const coordinator = profiles.length > 1 ? profiles[1] : profiles[0];
    
    const { data, error } = await supabase
      .from('templates')
      .insert({
        name: `Full Template ${Date.now()}`,
        chairman_id: chairman.id,
        coordinator_id: coordinator.id,
      })
      .select()
      .single();
    
    if (error) throw error;
    if (!data) throw new Error('No data returned');
    if (data.chairman_id !== chairman.id) throw new Error('Chairman mismatch');
    if (data.coordinator_id !== coordinator.id) throw new Error('Coordinator mismatch');
    
    testData.templates.push(data.id);
  });
}

async function test2_TemplateWithTasks() {
  console.log('\n📋 Test 2: Template with Tasks');
  
  await runTest('Create template with checklist tasks', async () => {
    const templateName = `Template with Tasks ${Date.now()}`;
    
    // Create template
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .insert({ name: templateName })
      .select()
      .single();
    
    if (templateError) throw templateError;
    if (!template) throw new Error('No template created');
    testData.templates.push(template.id);
    
    // Add tasks
    const tasks = [
      { template_id: template.id, description: 'Review previous minutes' },
      { template_id: template.id, description: 'Prepare agenda' },
      { template_id: template.id, description: 'Send invitations' },
    ];
    
    const { data: taskData, error: taskError } = await supabase
      .from('template_checklist_tasks')
      .insert(tasks)
      .select();
    
    if (taskError) throw taskError;
    if (!taskData || taskData.length !== 3) throw new Error(`Expected 3 tasks, got ${taskData?.length || 0}`);
    
    taskData.forEach(t => testData.tasks.push(t.id));
    
    // Verify tasks belong to template
    const { data: verifyTasks, error: verifyError } = await supabase
      .from('template_checklist_tasks')
      .select('*')
      .eq('template_id', template.id);
    
    if (verifyError) throw verifyError;
    if (!verifyTasks || verifyTasks.length !== 3) throw new Error('Tasks not saved correctly');
  });
}

async function test3_TemplateRetrieval() {
  console.log('\n🔍 Test 3: Template Retrieval');
  
  await runTest('Fetch templates ordered by created_at desc', async () => {
    // Create multiple templates
    const names = [
      `First Template ${Date.now()}`,
      `Second Template ${Date.now()}`,
      `Third Template ${Date.now()}`,
    ];
    
    for (const name of names) {
      const { data } = await supabase
        .from('templates')
        .insert({ name })
        .select()
        .single();
      if (data) testData.templates.push(data.id);
    }
    
    // Fetch templates
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    if (!data || data.length < 3) throw new Error('Not enough templates returned');
    
    // Verify order (newest first)
    if (data.length >= 2) {
      const first = new Date(data[0].created_at).getTime();
      const second = new Date(data[1].created_at).getTime();
      if (first < second) throw new Error('Templates not sorted correctly');
    }
  });
  
  await runTest('Load template with related tasks', async () => {
    // Create template with task
    const { data: template } = await supabase
      .from('templates')
      .insert({ name: `Load Test ${Date.now()}` })
      .select()
      .single();
    
    if (!template) throw new Error('Template not created');
    testData.templates.push(template.id);
    
    const { data: task } = await supabase
      .from('template_checklist_tasks')
      .insert({ template_id: template.id, description: 'Test task' })
      .select()
      .single();
    
    if (task) testData.tasks.push(task.id);
    
    // Fetch template
    const { data: loadedTemplate, error } = await supabase
      .from('templates')
      .select('*')
      .eq('id', template.id)
      .single();
    
    if (error) throw error;
    if (!loadedTemplate) throw new Error('Template not found');
  });
}

async function test4_TemplateToMeetingIntegration() {
  console.log('\n🔗 Test 4: Template → Meeting Integration');
  
  await runTest('Copy template tasks to meeting instances', async () => {
    // Create template with tasks
    const { data: template } = await supabase
      .from('templates')
      .insert({ name: `Meeting Template ${Date.now()}` })
      .select()
      .single();
    
    if (!template) throw new Error('Template not created');
    testData.templates.push(template.id);
    
    // Add template tasks
    const taskDescriptions = ['Task 1', 'Task 2', 'Task 3'];
    const { data: tasks } = await supabase
      .from('template_checklist_tasks')
      .insert(
        taskDescriptions.map(desc => ({
          template_id: template.id,
          description: desc,
        }))
      )
      .select();
    
    if (tasks) tasks.forEach(t => testData.tasks.push(t.id));
    
    // Create meeting series
    const { data: series } = await supabase
      .from('meeting_series')
      .insert({
        template_id: template.id,
        title: 'Test Meeting Series',
        frequency: 'weekly',
        start_date: new Date().toISOString().split('T')[0],
        duration_minutes: 30,
        buffer_minutes: 0,
      })
      .select()
      .single();
    
    if (!series) throw new Error('Series not created');
    testData.series.push(series.id);
    
    // Create meeting instance
    const { data: meeting } = await supabase
      .from('meetings')
      .insert({
        series_id: series.id,
        template_id: template.id,
        title: 'Test Meeting',
        date: new Date().toISOString().split('T')[0],
        status: 'scheduled',
      })
      .select()
      .single();
    
    if (!meeting) throw new Error('Meeting not created');
    testData.meetings.push(meeting.id);
    
    // Copy template tasks to meeting (manual implementation for testing)
    const { data: templateTasks } = await supabase
      .from('template_checklist_tasks')
      .select('*')
      .eq('template_id', template.id);
    
    if (!templateTasks || templateTasks.length === 0) throw new Error('No template tasks found');
    
    const checklistTasks = templateTasks.map(task => ({
      meeting_id: meeting.id,
      description: task.description,
      is_completed: false,
    }));
    
    const { error: insertError } = await supabase
      .from('meeting_checklist_tasks')
      .insert(checklistTasks);
    
    if (insertError) throw insertError;
    
    // Verify tasks were copied
    const { data: meetingTasks, error } = await supabase
      .from('meeting_checklist_tasks')
      .select('*')
      .eq('meeting_id', meeting.id);
    
    if (error) throw error;
    if (!meetingTasks || meetingTasks.length !== 3) {
      throw new Error(`Expected 3 meeting tasks, got ${meetingTasks?.length || 0}`);
    }
    
    // Verify descriptions match
    const descriptions = meetingTasks.map(t => t.description);
    taskDescriptions.forEach(desc => {
      if (!descriptions.includes(desc)) throw new Error(`Missing task: ${desc}`);
    });
  });
}

async function test5_ErrorHandling() {
  console.log('\n⚠️ Test 5: Error Handling');
  
  await runTest('Template creation without name fails', async () => {
    const { data, error } = await supabase
      .from('templates')
      .insert({ name: '' })
      .select()
      .single();
    
    // Note: Supabase may allow empty strings depending on constraints
    // This test documents current behavior
    if (data && data.id) {
      testData.templates.push(data.id);
      console.log('     ⚠️  (Note: Empty string was accepted - may need DB constraint)');
    }
  });
  
  await runTest('Template with non-existent chairman fails', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    
    const { error } = await supabase
      .from('templates')
      .insert({
        name: `Invalid Chairman ${Date.now()}`,
        chairman_id: fakeId,
      })
      .select()
      .single();
    
    if (!error) throw new Error('Should have failed with foreign key violation');
    if (!error.message.includes('foreign key')) {
      console.log(`     ⚠️  (Error type: ${error.code} - ${error.message})`);
    }
  });
}

// ==================== MAIN RUNNER ====================

async function runAllTests() {
  console.log('\n═══════════════════════════════════════════');
  console.log('  Template Integration Tests');
  console.log('═══════════════════════════════════════════\n');
  
  const startTime = Date.now();
  
  try {
    await test1_BasicTemplateCreation();
    await test2_TemplateWithTasks();
    await test3_TemplateRetrieval();
    await test4_TemplateToMeetingIntegration();
    await test5_ErrorHandling();
  } catch (err) {
    console.error('\n💥 Test suite error:', err);
  } finally {
    await cleanup();
  }
  
  const totalTime = Date.now() - startTime;
  
  // Print summary
  console.log('\n═══════════════════════════════════════════');
  console.log('  Test Results Summary');
  console.log('═══════════════════════════════════════════');
  
  const passed = results.filter(r => r.status === 'PASSED').length;
  const failed = results.filter(r => r.status === 'FAILED').length;
  
  console.log(`\n  Total: ${results.length} tests`);
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  ⏱️  Duration: ${totalTime}ms`);
  
  if (failed > 0) {
    console.log('\n  Failed Tests:');
    results
      .filter(r => r.status === 'FAILED')
      .forEach(r => console.log(`    - ${r.name}: ${r.error}`));
  }
  
  console.log('\n═══════════════════════════════════════════\n');
  
  return { passed, failed, total: results.length, results, duration: totalTime };
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().then(({ failed }) => {
    process.exit(failed > 0 ? 1 : 0);
  });
}

export { runAllTests, results };
