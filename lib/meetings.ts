/**
 * Meeting CRUD Operations
 * 
 * Provides functions for creating, reading, updating, and deleting meetings
 * with full support for recurring series and instance management.
 */

import { createClient } from '@/utils/supabase/client';
import { generateOccurrences, RecurrenceConfig } from './recurrence';
import { format } from 'date-fns';
import type { Database } from '@/types/supabase';

export type MeetingSeries = Database['public']['Tables']['meeting_series']['Row'];
export type Meeting = Database['public']['Tables']['meetings']['Row'];
export type MeetingParticipant = Database['public']['Tables']['meeting_participants']['Row'];

export interface CreateSeriesInput {
  template_id?: string;
  title: string;
  description?: string;
  frequency: 'daily' | 'weekly' | 'bi-weekly' | 'monthly';
  days_of_week?: string[];
  start_date: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  duration_minutes: number;
  buffer_minutes: number;
  timezone?: string;
  participants?: string[]; // user IDs
  chairman_id?: string;
  coordinator_id?: string;
}

export interface CreateMeetingInput {
  template_id?: string;
  series_id?: string;
  title: string;
  description?: string;
  date: string;
  start_time?: string;
  end_time?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  instance_number?: number;
  participants?: string[];
  chairman_id?: string | null;
  coordinator_id?: string | null;
}

/**
 * Create a meeting series and generate initial meeting instances
 */
export async function createMeetingSeries(
  data: CreateSeriesInput,
  createdBy?: string
): Promise<string> {
  const supabase = createClient();
  
  // 1. Create the series record
  const { data: series, error: seriesError } = await supabase
    .from('meeting_series')
    .insert({
      template_id: data.template_id,
      title: data.title,
      description: data.description,
      frequency: data.frequency,
      days_of_week: data.days_of_week || null,
      start_date: data.start_date,
      end_date: data.end_date || null,
      start_time: data.start_time,
      end_time: data.end_time,
      duration_minutes: data.duration_minutes,
      buffer_minutes: data.buffer_minutes,
      timezone: data.timezone || 'UTC',
      created_by: createdBy || null,
      chairman_id: data.chairman_id || null,
      coordinator_id: data.coordinator_id || null,
    })
    .select('id')
    .single();
  
  if (seriesError) {
    console.error('Error creating meeting series:', seriesError);
    throw seriesError;
  }
  
  const seriesId = series.id;
  
  // 2. Generate initial meeting instances (next 8 weeks)
  // Skip auto-copying template tasks here: the caller (UI) inserts
  // tasks from its own state, which may include user edits and
  // already-resolved due_days_before values. Auto-copying here would
  // create duplicates with null due dates.
  await generateSeriesInstances(seriesId, 8, data, { copyTemplateTasks: false });

  // 3. Add participants to all generated meeting instances if provided
  if (data.participants && data.participants.length > 0) {
    const supabase = createClient();
    const { data: meetings } = await supabase
      .from('meetings')
      .select('id')
      .eq('series_id', seriesId);

    if (meetings && meetings.length > 0) {
      for (const meeting of meetings) {
        await addMeetingParticipants(meeting.id, data.participants, true);
      }
    }
  }

  return seriesId;
}

/**
 * Generate meeting instances for a series
 */
export async function generateSeriesInstances(
  seriesId: string,
  weeksToGenerate: number = 8,
  seriesData?: CreateSeriesInput,
  options: { copyTemplateTasks?: boolean } = {}
): Promise<void> {
  const { copyTemplateTasks = true } = options;
  const supabase = createClient();
  
  console.log('Generating series instances for series:', seriesId, 'weeks:', weeksToGenerate);
  
  // Get series data if not provided
  let data = seriesData;
  if (!data) {
    const { data: series, error } = await supabase
      .from('meeting_series')
      .select('*')
      .eq('id', seriesId)
      .single();
    
    if (error || !series) {
      console.error('Error fetching series:', error);
      throw error;
    }
    
    data = {
      template_id: series.template_id || undefined,
      title: series.title,
      description: series.description || undefined,
      frequency: series.frequency as "daily" | "weekly" | "bi-weekly" | "monthly",
      days_of_week: series.days_of_week || undefined,
      start_date: series.start_date,
      end_date: series.end_date || undefined,
      start_time: series.start_time || undefined,
      end_time: series.end_time || undefined,
      duration_minutes: series.duration_minutes ?? 30,
      buffer_minutes: series.buffer_minutes ?? 0,
      timezone: series.timezone ?? undefined,
      chairman_id: series.chairman_id || undefined,
      coordinator_id: series.coordinator_id || undefined,
    };
  }
  
  console.log('Series data for generation:', data);
  
  // Get existing instances to avoid duplicates
  const { data: existingMeetings } = await supabase
    .from('meetings')
    .select('date')
    .eq('series_id', seriesId)
    .order('date', { ascending: false })
    .limit(1);
  
  const lastDate = (() => {
    if (existingMeetings && existingMeetings.length > 0) {
      return new Date(existingMeetings[0].date);
    }
    // Start one day before start_date so generateOccurrences includes start_date itself
    // Parse as local date to avoid timezone offset issues
    const [year, month, day] = data.start_date.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() - 1);
    return d;
  })();
  
  console.log('Generating from date:', lastDate);
  
  // Generate occurrence dates
  const config: RecurrenceConfig = {
    frequency: data.frequency,
    daysOfWeek: data.days_of_week || null,
    startDate: new Date(data.start_date),
    endDate: data.end_date ? new Date(data.end_date) : null,
  };
  
  console.log('Recurrence config:', config);
  
  // Generate enough occurrences for the requested weeks
  const occurrences = generateOccurrences(config, weeksToGenerate * 7, lastDate);
  
  console.log('Generated occurrences:', occurrences.length, occurrences);
  
  if (occurrences.length === 0) {
    console.log('No occurrences generated, returning early');
    return;
  }
  
  // Create meeting records
  const meetings: CreateMeetingInput[] = occurrences.map((date, index) => ({
    series_id: seriesId,
    template_id: data?.template_id,
    title: data?.title || 'Meeting',
    description: data?.description,
    date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
    start_time: data?.start_time,
    end_time: data?.end_time,
    status: 'scheduled' as const,
    instance_number: existingMeetings?.length ? existingMeetings.length + index + 1 : index + 1,
    chairman_id: data?.chairman_id || null,
    coordinator_id: data?.coordinator_id || null,
  }));
  
  console.log('Meetings to insert:', meetings);
  
  // Insert meetings
  const { error: insertError } = await supabase
    .from('meetings')
    .insert(meetings);
  
  if (insertError) {
    console.error('Error inserting meetings:', insertError);
    throw insertError;
  }
  
  console.log('Successfully inserted meetings');
  
  // Copy template checklist tasks to each meeting instance
  if (copyTemplateTasks && data.template_id) {
    await copyTemplateTasksToMeetings(data.template_id, meetings);
  }
}

/**
 * Copy template checklist tasks to meeting instances
 */
export async function copyTemplateTasksToMeetings(
  templateId: string,
  meetings: CreateMeetingInput[]
): Promise<void> {
  const supabase = createClient();
  
  // Get template tasks
  const { data: templateTasks, error: tasksError } = await supabase
    .from('template_checklist_tasks')
    .select('*')
    .eq('template_id', templateId);
  
  if (tasksError || !templateTasks || templateTasks.length === 0) {
    return;
  }
  
  // Get the created meeting IDs
  const { data: createdMeetings } = await supabase
    .from('meetings')
    .select('id')
    .in('date', meetings.map(m => m.date))
    .eq('series_id', meetings[0].series_id || '');
  
  if (!createdMeetings || createdMeetings.length === 0) {
    return;
  }
  
  // Create checklist tasks for each meeting
  const checklistTasks = createdMeetings.flatMap(meeting =>
    templateTasks.map(task => ({
      meeting_id: meeting.id,
      description: task.description,
      is_completed: false,
      due_days_before: task.due_days_before ?? null,
    }))
  );
  
  const { error: insertError } = await supabase
    .from('meeting_checklist_tasks')
    .insert(checklistTasks);
  
  if (insertError) {
    console.error('Error copying template tasks:', insertError);
  }
}

/**
 * Update a single meeting occurrence
 */
export async function updateMeetingOccurrence(
  meetingId: string,
  changes: Partial<Meeting>,
  isOverride: boolean = true
): Promise<void> {
  const supabase = createClient();

  const updateData: Partial<Meeting> = {
    ...changes,
    updated_at: new Date().toISOString(),
  };

  if (isOverride) {
    updateData.is_override = true;
    updateData.override_fields = Object.keys(changes) as unknown as typeof updateData.override_fields;
  }

  console.log('Updating meeting:', meetingId, 'with data:', updateData);

  const { error, data } = await supabase
    .from('meetings')
    .update(updateData)
    .eq('id', meetingId)
    .select();

  if (error) {
    console.error('Error updating meeting:', JSON.stringify(error, null, 2));
    throw new Error(`Failed to update meeting: ${error.message || JSON.stringify(error)}`);
  }

  console.log('Update successful, returned data:', data);
}

/**
 * Update a meeting series pattern and regenerate future instances
 * Returns the meeting ID for the specified target date after regeneration
 */
export async function updateSeriesPattern(
  seriesId: string,
  changes: Partial<MeetingSeries> & { start_date?: string },
  fromDate?: Date,
  targetDate?: string // The specific date we want to find after regeneration
): Promise<string | null> {
  const supabase = createClient();

  // Update the series
  const { error: updateError } = await supabase
    .from('meeting_series')
    .update({
      ...changes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', seriesId);

  if (updateError) {
    console.error('Error updating series:', updateError);
    throw updateError;
  }

  // Delete future instances
  const deleteFromDate = fromDate || new Date();
  const { error: deleteError } = await supabase
    .from('meetings')
    .delete()
    .eq('series_id', seriesId)
    .gte('date', format(deleteFromDate, 'yyyy-MM-dd'))
    .eq('is_override', false); // Don't delete overridden instances

  if (deleteError) {
    console.error('Error deleting future instances:', deleteError);
    throw deleteError;
  }

  // Regenerate instances
  await generateSeriesInstances(seriesId, 8);

  // Find and return the meeting ID for the target date
  // Use the new start_date if provided, otherwise use targetDate
  const dateToFind = changes.start_date || targetDate;
  if (dateToFind) {
    const { data: meeting } = await supabase
      .from('meetings')
      .select('id')
      .eq('series_id', seriesId)
      .eq('date', dateToFind)
      .maybeSingle();
    return meeting?.id || null;
  }

  return null;
}

/**
 * Delete a single meeting occurrence
 */
export async function deleteMeetingOccurrence(meetingId: string): Promise<void> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('meetings')
    .delete()
    .eq('id', meetingId);
  
  if (error) {
    console.error('Error deleting meeting:', error);
    throw error;
  }
}

/**
 * Delete a meeting series and all its instances
 */
export async function deleteMeetingSeries(seriesId: string): Promise<void> {
  const supabase = createClient();
  
  // Delete all meetings in the series
  const { error: meetingsError } = await supabase
    .from('meetings')
    .delete()
    .eq('series_id', seriesId);
  
  if (meetingsError) {
    console.error('Error deleting meetings:', meetingsError);
    throw meetingsError;
  }
  
  // Delete the series
  const { error: seriesError } = await supabase
    .from('meeting_series')
    .delete()
    .eq('id', seriesId);
  
  if (seriesError) {
    console.error('Error deleting series:', seriesError);
    throw seriesError;
  }
}

/**
 * Delete a meeting series from a specific date forward
 */
export async function deleteSeriesFromDate(
  seriesId: string,
  fromDate: Date
): Promise<void> {
  const supabase = createClient();

  // Format date as YYYY-MM-DD using local timezone
  const dateStr = format(fromDate, 'yyyy-MM-dd');

  // Calculate previous day for series end date
  const prevDate = new Date(fromDate);
  prevDate.setDate(prevDate.getDate() - 1);
  const endDateStr = format(prevDate, 'yyyy-MM-dd');

  // Update series end date
  const { error: updateError } = await supabase
    .from('meeting_series')
    .update({
      end_date: endDateStr,
      updated_at: new Date().toISOString(),
    })
    .eq('id', seriesId);

  if (updateError) {
    console.error('Error updating series end date:', updateError);
    throw updateError;
  }

  // Delete future instances
  const { error: deleteError } = await supabase
    .from('meetings')
    .delete()
    .eq('series_id', seriesId)
    .gte('date', dateStr);

  if (deleteError) {
    console.error('Error deleting future instances:', deleteError);
    throw deleteError;
  }
}

/**
 * Add participants to a meeting
 */
export async function addMeetingParticipants(
  meetingId: string,
  userIds: string[],
  isRequired: boolean = true
): Promise<void> {
  const supabase = createClient();

  if (userIds.length === 0) return;

  console.log('addMeetingParticipants called with IDs:', userIds);

  // Validate that user IDs exist in the people table
  const { data: validPeople, error: peopleError } = await supabase
    .from('people')
    .select('id')
    .in('id', userIds);

  console.log('Validation query returned:', validPeople, 'error:', peopleError);

  if (peopleError) {
    console.error('Error validating people:', peopleError);
    throw peopleError;
  }

  const validPeopleIds = new Set(validPeople?.map(p => p.id) || []);
  console.log('Valid people IDs found:', Array.from(validPeopleIds));

  const validUserIds = userIds.filter(id => validPeopleIds.has(id));

  console.log('Filtered valid IDs:', validUserIds, 'from original:', userIds);

  if (validUserIds.length === 0) {
    console.warn('No valid participants to add - all provided IDs are invalid:', userIds);
    throw new Error(`No valid participants found. IDs checked: ${userIds.join(', ')}`);
  }

  if (validUserIds.length < userIds.length) {
    const invalidIds = userIds.filter(id => !validPeopleIds.has(id));
    console.warn('Filtered out invalid participant IDs:', invalidIds);
  }

  const participants = validUserIds.map(userId => ({
    meeting_id: meetingId,
    user_id: userId,
    status: 'invited' as const,
    is_required: isRequired,
  }));

  const { error } = await supabase
    .from('meeting_participants')
    .insert(participants);

  if (error) {
    console.error('Error adding participants:', error);
    throw error;
  }
}

/**
 * Get meeting with full details including series info and participants
 */
export async function getMeetingWithDetails(meetingId: string): Promise<{
  meeting: Meeting;
  series: MeetingSeries | null;
  participants: MeetingParticipant[];
}> {
  const supabase = createClient();
  
  const { data: meeting, error: meetingError } = await supabase
    .from('meetings')
    .select('*')
    .eq('id', meetingId)
    .single();
  
  if (meetingError || !meeting) {
    throw meetingError || new Error('Meeting not found');
  }
  
  let series: MeetingSeries | null = null;
  if (meeting.series_id) {
    const { data: seriesData } = await supabase
      .from('meeting_series')
      .select('*')
      .eq('id', meeting.series_id)
      .single();
    series = seriesData;
  }
  
  const { data: participants } = await supabase
    .from('meeting_participants')
    .select('*')
    .eq('meeting_id', meetingId);
  
  return {
    meeting,
    series,
    participants: participants || [],
  };
}

/**
 * Remove a participant from a meeting
 */
export async function removeMeetingParticipant(
  meetingId: string,
  userId: string
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('meeting_participants')
    .delete()
    .eq('meeting_id', meetingId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error removing participant:', error);
    throw error;
  }
}

/* -------------------------------------------------------------------------- */
/*                          Task editor helpers                               */
/* -------------------------------------------------------------------------- */

export interface TaskDraft {
  // Existing task id, undefined for newly added drafts.
  id?: string;
  description: string;
  due_days_before: number | null;
  // List of person ids assigned to this task.
  assignee_ids: string[];
  // Position within the meeting (1-based). Lower = earlier.
  sort_order: number;
  // Carried over so completion state is preserved across edits.
  is_completed?: boolean;
}

/**
 * Replace the full task list of a single meeting with the supplied drafts.
 * - Updates rows that match by id (description, due_days_before, sort_order).
 * - Inserts rows for drafts without an id.
 * - Deletes rows whose id is not present in the drafts array.
 * - Rewrites the assignee junction rows for every task in the new list.
 *
 * The legacy meeting_checklist_tasks.assigned_user_id is mirrored to the first
 * assignee in the list (or null) to keep older read-paths functional.
 */
export async function setMeetingTasks(
  meetingId: string,
  drafts: TaskDraft[]
): Promise<void> {
  const supabase = createClient();

  // 1. Fetch existing task ids to compute deletes.
  const { data: existing, error: fetchErr } = await supabase
    .from('meeting_checklist_tasks')
    .select('id')
    .eq('meeting_id', meetingId);
  if (fetchErr) throw fetchErr;

  const existingIds = new Set((existing || []).map((r) => r.id));
  const keptIds = new Set(drafts.filter((d) => d.id).map((d) => d.id as string));
  const toDelete = Array.from(existingIds).filter((id) => !keptIds.has(id));

  if (toDelete.length > 0) {
    const { error } = await supabase
      .from('meeting_checklist_tasks')
      .delete()
      .in('id', toDelete);
    if (error) throw error;
  }

  // 2. Update existing tasks.
  for (const d of drafts) {
    if (!d.id) continue;
    const firstAssignee = d.assignee_ids[0] ?? null;
    const { error } = await supabase
      .from('meeting_checklist_tasks')
      .update({
        description: d.description,
        due_days_before: d.due_days_before,
        sort_order: d.sort_order,
        assigned_user_id: firstAssignee,
        updated_at: new Date().toISOString(),
      })
      .eq('id', d.id);
    if (error) throw error;
  }

  // 3. Insert new tasks and capture their ids.
  const newDrafts = drafts.filter((d) => !d.id);
  const insertedIds: Array<{ draft: TaskDraft; id: string }> = [];
  if (newDrafts.length > 0) {
    const { data: inserted, error } = await supabase
      .from('meeting_checklist_tasks')
      .insert(
        newDrafts.map((d) => ({
          meeting_id: meetingId,
          description: d.description,
          due_days_before: d.due_days_before,
          sort_order: d.sort_order,
          is_completed: d.is_completed ?? false,
          assigned_user_id: d.assignee_ids[0] ?? null,
        }))
      )
      .select('id');
    if (error) throw error;
    (inserted || []).forEach((row, i) => insertedIds.push({ draft: newDrafts[i], id: row.id }));
  }

  // 4. Rewrite assignee junction for every task in the new list.
  const allTasks: Array<{ id: string; assignee_ids: string[] }> = [
    ...drafts.filter((d) => d.id).map((d) => ({ id: d.id as string, assignee_ids: d.assignee_ids })),
    ...insertedIds.map(({ draft, id }) => ({ id, assignee_ids: draft.assignee_ids })),
  ];

  if (allTasks.length > 0) {
    const ids = allTasks.map((t) => t.id);
    const { error: delErr } = await supabase
      .from('meeting_task_assignees')
      .delete()
      .in('task_id', ids);
    if (delErr) throw delErr;

    const rows = allTasks.flatMap((t) =>
      t.assignee_ids.map((person_id) => ({ task_id: t.id, person_id }))
    );
    if (rows.length > 0) {
      const { error: insErr } = await supabase
        .from('meeting_task_assignees')
        .insert(rows);
      if (insErr) throw insErr;
    }
  }
}

/**
 * Apply the same task template to many meetings (used when a "this + following"
 * edit propagates the new task list to every newly-generated future occurrence).
 *
 * Implementation: deletes all existing tasks for the listed meetings, then
 * inserts the supplied template fresh for each meeting. New task ids are
 * generated per meeting; assignees are mirrored from the template.
 */
export async function applyTaskTemplateToMeetings(
  meetingIds: string[],
  template: Array<Pick<TaskDraft, 'description' | 'due_days_before' | 'sort_order' | 'assignee_ids'>>
): Promise<void> {
  if (meetingIds.length === 0) return;
  const supabase = createClient();

  // Wipe existing tasks for these meetings (cascade removes assignees).
  const { error: delErr } = await supabase
    .from('meeting_checklist_tasks')
    .delete()
    .in('meeting_id', meetingIds);
  if (delErr) throw delErr;

  if (template.length === 0) return;

  // Bulk insert tasks across all meetings.
  const inserts = meetingIds.flatMap((meetingId) =>
    template.map((t) => ({
      meeting_id: meetingId,
      description: t.description,
      due_days_before: t.due_days_before,
      sort_order: t.sort_order,
      is_completed: false,
      assigned_user_id: t.assignee_ids[0] ?? null,
    }))
  );
  const { data: inserted, error: insErr } = await supabase
    .from('meeting_checklist_tasks')
    .insert(inserts)
    .select('id, meeting_id, sort_order');
  if (insErr) throw insErr;

  // Build assignee rows by matching back via (meeting_id, sort_order).
  const byKey = new Map<string, string>();
  (inserted || []).forEach((row) => byKey.set(`${row.meeting_id}|${row.sort_order}`, row.id));

  const assigneeRows: Array<{ task_id: string; person_id: string }> = [];
  for (const meetingId of meetingIds) {
    for (const t of template) {
      const taskId = byKey.get(`${meetingId}|${t.sort_order}`);
      if (!taskId) continue;
      for (const personId of t.assignee_ids) {
        assigneeRows.push({ task_id: taskId, person_id: personId });
      }
    }
  }
  if (assigneeRows.length > 0) {
    const { error } = await supabase.from('meeting_task_assignees').insert(assigneeRows);
    if (error) throw error;
  }
}

/* -------------------------------------------------------------------------- */
/*                Split a recurring series at a given date                    */
/* -------------------------------------------------------------------------- */

export interface SplitSeriesInput {
  // Pattern + meeting fields for the new (forward) series.
  title: string;
  description?: string | null;
  frequency: 'daily' | 'weekly' | 'bi-weekly' | 'monthly';
  days_of_week?: string[] | null;
  start_date: string; // YYYY-MM-DD - the first occurrence on the new series
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  duration_minutes?: number;
  buffer_minutes?: number;
  timezone?: string;
  chairman_id?: string | null;
  coordinator_id?: string | null;
  participants: string[]; // person ids to put on every new occurrence
  template_id?: string | null;
}

/**
 * Split a series at `splitDate`. Past occurrences (< splitDate) remain on the
 * original series, which has its end_date set to the day before splitDate.
 * From splitDate forward, a new series is created with the supplied pattern
 * and instances are generated. Returns the meeting id on the new series that
 * matches the new start_date (if any).
 */
export async function splitSeriesAtDate(
  originalSeriesId: string,
  splitDate: Date,
  newPattern: SplitSeriesInput,
  createdBy?: string
): Promise<{ newSeriesId: string; newMeetingId: string | null }> {
  const supabase = createClient();

  // 1. Truncate the original series at the day before splitDate, and delete
  //    any non-overridden future instances on or after splitDate. Overridden
  //    instances are reparented onto the new series so the user keeps them
  //    visible from the forward date.
  const splitDateStr = format(splitDate, 'yyyy-MM-dd');
  const prev = new Date(splitDate);
  prev.setDate(prev.getDate() - 1);
  const prevStr = format(prev, 'yyyy-MM-dd');

  const { error: endErr } = await supabase
    .from('meeting_series')
    .update({ end_date: prevStr, updated_at: new Date().toISOString() })
    .eq('id', originalSeriesId);
  if (endErr) throw endErr;

  const { error: delErr } = await supabase
    .from('meetings')
    .delete()
    .eq('series_id', originalSeriesId)
    .gte('date', splitDateStr)
    .eq('is_override', false);
  if (delErr) throw delErr;

  // 2. Create the new series record.
  const { data: newSeries, error: insSeriesErr } = await supabase
    .from('meeting_series')
    .insert({
      template_id: newPattern.template_id ?? null,
      title: newPattern.title,
      description: newPattern.description ?? null,
      frequency: newPattern.frequency,
      days_of_week: newPattern.days_of_week ?? null,
      start_date: newPattern.start_date,
      end_date: newPattern.end_date ?? null,
      start_time: newPattern.start_time ?? null,
      end_time: newPattern.end_time ?? null,
      duration_minutes: newPattern.duration_minutes ?? 30,
      buffer_minutes: newPattern.buffer_minutes ?? 0,
      timezone: newPattern.timezone ?? 'UTC',
      created_by: createdBy ?? null,
      chairman_id: newPattern.chairman_id ?? null,
      coordinator_id: newPattern.coordinator_id ?? null,
    })
    .select('id')
    .single();
  if (insSeriesErr || !newSeries) throw insSeriesErr || new Error('Failed to create new series');
  const newSeriesId = newSeries.id;

  // 3. Reparent any overridden future instances onto the new series.
  const { error: reErr } = await supabase
    .from('meetings')
    .update({ series_id: newSeriesId })
    .eq('series_id', originalSeriesId)
    .gte('date', splitDateStr);
  if (reErr) throw reErr;

  // 4. Generate fresh instances on the new series. Skip auto-copy of template
  //    tasks — caller will explicitly apply the (possibly edited) task list.
  await generateSeriesInstances(
    newSeriesId,
    8,
    {
      template_id: newPattern.template_id ?? undefined,
      title: newPattern.title,
      description: newPattern.description ?? undefined,
      frequency: newPattern.frequency,
      days_of_week: newPattern.days_of_week ?? undefined,
      start_date: newPattern.start_date,
      end_date: newPattern.end_date ?? undefined,
      start_time: newPattern.start_time ?? undefined,
      end_time: newPattern.end_time ?? undefined,
      duration_minutes: newPattern.duration_minutes ?? 30,
      buffer_minutes: newPattern.buffer_minutes ?? 0,
      timezone: newPattern.timezone,
      chairman_id: newPattern.chairman_id ?? undefined,
      coordinator_id: newPattern.coordinator_id ?? undefined,
    },
    { copyTemplateTasks: false }
  );

  // 5. Add participants to every meeting on the new series.
  if (newPattern.participants.length > 0) {
    const { data: forwardMeetings } = await supabase
      .from('meetings')
      .select('id')
      .eq('series_id', newSeriesId);
    for (const m of forwardMeetings || []) {
      // Skip meetings that already have these participants (overridden ones).
      const { data: existing } = await supabase
        .from('meeting_participants')
        .select('user_id')
        .eq('meeting_id', m.id);
      const existingIds = new Set((existing || []).map((p) => p.user_id));
      const missing = newPattern.participants.filter((id) => !existingIds.has(id));
      if (missing.length > 0) {
        await addMeetingParticipants(m.id, missing, true);
      }
    }
  }

  // 6. Find the new meeting id matching start_date.
  const { data: anchorMeeting } = await supabase
    .from('meetings')
    .select('id')
    .eq('series_id', newSeriesId)
    .eq('date', newPattern.start_date)
    .maybeSingle();

  return { newSeriesId, newMeetingId: anchorMeeting?.id ?? null };
}

/**
 * Check for scheduling conflicts
 */
export async function checkConflicts(
  date: string,
  startTime: string,
  endTime: string,
  participantIds: string[]
): Promise<{
  hasConflicts: boolean;
  conflicts: Array<{
    userId: string;
    userName: string;
    meetingTitle: string;
    meetingDate: string;
    startTime: string;
    endTime: string;
  }>;
}> {
  const supabase = createClient();
  
  // Fetch people for name lookup
  const { data: peopleData } = await supabase
    .from('people')
    .select('id, name')
    .in('id', participantIds);
  
  const peopleMap = new Map<string, string>();
  (peopleData || []).forEach((p: any) => peopleMap.set(p.id, p.name));

  // Get participants' existing meetings on the same date
  const { data: existingMeetings, error } = await supabase
    .from('meeting_participants')
    .select(`
      user_id,
      meetings!inner(
        title,
        date,
        start_time,
        end_time
      )
    `)
    .in('user_id', participantIds)
    .eq('meetings.date', date);
  
  if (error || !existingMeetings) {
    return { hasConflicts: false, conflicts: [] };
  }
  
  // Check for time overlaps
  const conflicts = existingMeetings.filter((participant: any) => {
    const meetingStart = participant.meetings.start_time;
    const meetingEnd = participant.meetings.end_time;
    
    // Overlap check: (StartA < EndB) and (EndA > StartB)
    return startTime < meetingEnd && endTime > meetingStart;
  });
  
  return {
    hasConflicts: conflicts.length > 0,
    conflicts: conflicts.map((c: any) => ({
      userId: c.user_id,
      userName: peopleMap.get(c.user_id) || 'Unknown',
      meetingTitle: c.meetings.title,
      meetingDate: c.meetings.date,
      startTime: c.meetings.start_time,
      endTime: c.meetings.end_time,
    })),
  };
}
