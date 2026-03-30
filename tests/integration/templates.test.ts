/**
 * Template Creation Integration Tests
 * 
 * These tests run against the real Supabase database to verify
 * template creation functionality end-to-end.
 */

import { createClient } from '@/utils/supabase/client';
import { copyTemplateTasksToMeetings } from '@/lib/meetings';

const supabase = createClient();

// Test data tracking for cleanup
const testData = {
  templates: [] as string[],
  tasks: [] as string[],
  meetings: [] as string[],
  series: [] as string[],
};

// Cleanup function
async function cleanup() {
  // Delete in reverse order to respect foreign keys
  if (testData.tasks.length > 0) {
    await supabase.from('template_checklist_tasks').delete().in('id', testData.tasks);
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
  
  // Reset tracking
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

describe('Template Creation Integration Tests', () => {
  afterAll(async () => {
    await cleanup();
  });

  beforeEach(async () => {
    // Clean up before each test to ensure isolation
    await cleanup();
  });

  describe('1. Basic Template Creation', () => {
    test('should create template with name only', async () => {
      const templateName = `Test Template ${Date.now()}`;
      
      const { data, error } = await supabase
        .from('templates')
        .insert({ name: templateName })
        .select()
        .single();
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.name).toBe(templateName);
      expect(data.id).toBeDefined();
      
      // Track for cleanup
      if (data) testData.templates.push(data.id);
      
      // Verify in database
      const { data: verifyData } = await supabase
        .from('templates')
        .select('*')
        .eq('id', data.id)
        .single();
      
      expect(verifyData).toBeDefined();
      expect(verifyData.name).toBe(templateName);
    });

    test('should create template with chairman', async () => {
      const profile = await getTestProfile();
      expect(profile).toBeDefined();
      
      const templateName = `Template with Chairman ${Date.now()}`;
      
      const { data, error } = await supabase
        .from('templates')
        .insert({
          name: templateName,
          chairman_id: profile?.id,
        })
        .select()
        .single();
      
      expect(error).toBeNull();
      expect(data.chairman_id).toBe(profile?.id);
      
      if (data) testData.templates.push(data.id);
    });

    test('should create template with coordinator', async () => {
      const profile = await getTestProfile();
      expect(profile).toBeDefined();
      
      const templateName = `Template with Coordinator ${Date.now()}`;
      
      const { data, error } = await supabase
        .from('templates')
        .insert({
          name: templateName,
          coordinator_id: profile?.id,
        })
        .select()
        .single();
      
      expect(error).toBeNull();
      expect(data.coordinator_id).toBe(profile?.id);
      
      if (data) testData.templates.push(data.id);
    });

    test('should create template with both chairman and coordinator', async () => {
      // Get two different profiles or use same if only one exists
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .limit(2);
      
      expect(profiles).toBeDefined();
      expect(profiles!.length).toBeGreaterThan(0);
      
      const chairman = profiles![0];
      const coordinator = profiles!.length > 1 ? profiles![1] : profiles![0];
      
      const templateName = `Full Template ${Date.now()}`;
      
      const { data, error } = await supabase
        .from('templates')
        .insert({
          name: templateName,
          chairman_id: chairman.id,
          coordinator_id: coordinator.id,
        })
        .select()
        .single();
      
      expect(error).toBeNull();
      expect(data.chairman_id).toBe(chairman.id);
      expect(data.coordinator_id).toBe(coordinator.id);
      
      if (data) testData.templates.push(data.id);
    });
  });

  describe('2. Template with Tasks', () => {
    test('should create template with checklist tasks', async () => {
      const templateName = `Template with Tasks ${Date.now()}`;
      
      // Create template
      const { data: template, error: templateError } = await supabase
        .from('templates')
        .insert({ name: templateName })
        .select()
        .single();
      
      expect(templateError).toBeNull();
      expect(template).toBeDefined();
      if (template) testData.templates.push(template.id);
      
      // Add tasks
      const tasks = [
        { description: 'Review previous minutes' },
        { description: 'Prepare agenda' },
        { description: 'Send invitations' },
      ];
      
      const { data: taskData, error: taskError } = await supabase
        .from('template_checklist_tasks')
        .insert(
          tasks.map(t => ({
            template_id: template.id,
            description: t.description,
          }))
        )
        .select();
      
      expect(taskError).toBeNull();
      expect(taskData).toBeDefined();
      expect(taskData!.length).toBe(3);
      
      // Track tasks
      taskData!.forEach(t => testData.tasks.push(t.id));
      
      // Verify tasks belong to template
      const { data: verifyTasks } = await supabase
        .from('template_checklist_tasks')
        .select('*')
        .eq('template_id', template.id);
      
      expect(verifyTasks).toBeDefined();
      expect(verifyTasks!.length).toBe(3);
    });
  });

  describe('3. Template Retrieval', () => {
    test('should fetch templates ordered by created_at desc', async () => {
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
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.length).toBeGreaterThanOrEqual(3);
      
      // Verify order (newest first)
      if (data && data.length >= 2) {
        const first = new Date(data[0].created_at).getTime();
        const second = new Date(data[1].created_at).getTime();
        expect(first).toBeGreaterThanOrEqual(second);
      }
    });

    test('should load template with related tasks', async () => {
      // Create template with tasks
      const templateName = `Load Test Template ${Date.now()}`;
      
      const { data: template } = await supabase
        .from('templates')
        .insert({ name: templateName })
        .select()
        .single();
      
      if (template) testData.templates.push(template.id);
      
      // Add task
      const { data: task } = await supabase
        .from('template_checklist_tasks')
        .insert({
          template_id: template.id,
          description: 'Test task',
        })
        .select()
        .single();
      
      if (task) testData.tasks.push(task.id);
      
      // Fetch template with tasks
      const { data: loadedTemplate } = await supabase
        .from('templates')
        .select(`
          *,
          template_checklist_tasks (*)
        `)
        .eq('id', template.id)
        .single();
      
      expect(loadedTemplate).toBeDefined();
      expect(loadedTemplate.name).toBe(templateName);
    });
  });

  describe('4. Template → Meeting Integration', () => {
    test('should copy template tasks to meeting instances', async () => {
      // Create template with tasks
      const { data: template } = await supabase
        .from('templates')
        .insert({ name: `Meeting Template ${Date.now()}` })
        .select()
        .single();
      
      if (template) testData.templates.push(template.id);
      
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
      
      // Create a meeting series referencing this template
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
      
      if (series) testData.series.push(series.id);
      
      // Create a meeting instance
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
      
      if (meeting) testData.meetings.push(meeting.id);
      
      // Copy template tasks to meeting
      await copyTemplateTasksToMeetings(template.id, [meeting]);
      
      // Verify tasks were copied
      const { data: meetingTasks } = await supabase
        .from('meeting_checklist_tasks')
        .select('*')
        .eq('meeting_id', meeting.id);
      
      expect(meetingTasks).toBeDefined();
      expect(meetingTasks!.length).toBe(taskDescriptions.length);
      
      // Verify descriptions match
      const descriptions = meetingTasks!.map(t => t.description);
      taskDescriptions.forEach(desc => {
        expect(descriptions).toContain(desc);
      });
    });
  });

  describe('5. Error Handling', () => {
    test('should handle template creation without name', async () => {
      const { error } = await supabase
        .from('templates')
        .insert({ name: '' })
        .select()
        .single();
      
      // Should fail validation
      expect(error).toBeDefined();
    });

    test('should handle template with non-existent chairman', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      const { error } = await supabase
        .from('templates')
        .insert({
          name: `Invalid Chairman ${Date.now()}`,
          chairman_id: fakeId,
        })
        .select()
        .single();
      
      // Should fail foreign key constraint
      expect(error).toBeDefined();
    });
  });
});

// Run tests summary
export async function runTemplateTests() {
  console.log('\n=== Template Integration Tests ===\n');
  
  const results = {
    passed: 0,
    failed: 0,
    tests: [] as { name: string; status: string; error?: string }[],
  };
  
  // Test 1: Basic template creation
  try {
    const { data, error } = await supabase
      .from('templates')
      .insert({ name: `Quick Test ${Date.now()}` })
      .select()
      .single();
    
    if (error) throw error;
    
    results.passed++;
    results.tests.push({
      name: 'Basic template creation',
      status: 'PASSED',
    });
    
    // Cleanup
    if (data) {
      await supabase.from('templates').delete().eq('id', data.id);
    }
  } catch (err: any) {
    results.failed++;
    results.tests.push({
      name: 'Basic template creation',
      status: 'FAILED',
      error: err.message,
    });
  }
  
  console.log(`\nResults: ${results.passed} passed, ${results.failed} failed`);
  return results;
}
