/**
 * Meeting CRUD Operations
 * 
 * Provides functions for creating, reading, updating, and deleting meetings
 * with full support for recurring series and instance management.
 */

import { createClient } from '@/utils/supabase/client';
import { generateOccurrences, RecurrenceConfig } from './recurrence';
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
}

export interface CreateMeetingInput {
  template_id?: string;
  series_id?: string;
  title: string;
  description?: string;
  date: string;
  start_time?: string;
  end_time?: string;
  status?: 'scheduled' | 'completed' | 'cancelled';
  instance_number?: number;
  participants?: string[];
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
    })
    .select('id')
    .single();
  
  if (seriesError) {
    console.error('Error creating meeting series:', seriesError);
    throw seriesError;
  }
  
  const seriesId = series.id;
  
  // 2. Generate initial meeting instances (next 8 weeks)
  await generateSeriesInstances(seriesId, 8, data);
  
  return seriesId;
}

/**
 * Generate meeting instances for a series
 */
export async function generateSeriesInstances(
  seriesId: string,
  weeksToGenerate: number = 8,
  seriesData?: CreateSeriesInput
): Promise<void> {
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
      frequency: series.frequency,
      days_of_week: series.days_of_week || undefined,
      start_date: series.start_date,
      end_date: series.end_date || undefined,
      start_time: series.start_time || undefined,
      end_time: series.end_time || undefined,
      duration_minutes: series.duration_minutes,
      buffer_minutes: series.buffer_minutes,
      timezone: series.timezone,
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
  
  const lastDate = existingMeetings && existingMeetings.length > 0
    ? new Date(existingMeetings[0].date)
    : new Date(data.start_date);
  
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
    date: date.toISOString().split('T')[0],
    start_time: data?.start_time,
    end_time: data?.end_time,
    status: 'scheduled',
    instance_number: existingMeetings?.length ? existingMeetings.length + index + 1 : index + 1,
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
  if (data.template_id) {
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
    .eq('series_id', meetings[0].series_id);
  
  if (!createdMeetings || createdMeetings.length === 0) {
    return;
  }
  
  // Create checklist tasks for each meeting
  const checklistTasks = createdMeetings.flatMap(meeting =>
    templateTasks.map(task => ({
      meeting_id: meeting.id,
      description: task.description,
      is_completed: false,
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
    updateData.override_fields = Object.keys(changes);
  }
  
  const { error } = await supabase
    .from('meetings')
    .update(updateData)
    .eq('id', meetingId);
  
  if (error) {
    console.error('Error updating meeting:', error);
    throw error;
  }
}

/**
 * Update a meeting series pattern and regenerate future instances
 */
export async function updateSeriesPattern(
  seriesId: string,
  changes: Partial<MeetingSeries>,
  fromDate?: Date
): Promise<void> {
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
    .gte('date', deleteFromDate.toISOString().split('T')[0])
    .eq('is_override', false); // Don't delete overridden instances
  
  if (deleteError) {
    console.error('Error deleting future instances:', deleteError);
    throw deleteError;
  }
  
  // Regenerate instances
  await generateSeriesInstances(seriesId, 8);
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
  
  // Update series end date
  const { error: updateError } = await supabase
    .from('meeting_series')
    .update({
      end_date: new Date(fromDate.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
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
    .gte('date', fromDate.toISOString().split('T')[0]);
  
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
  
  const participants = userIds.map(userId => ({
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
      ),
      users(name)
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
      userName: c.users?.name || 'Unknown',
      meetingTitle: c.meetings.title,
      meetingDate: c.meetings.date,
      startTime: c.meetings.start_time,
      endTime: c.meetings.end_time,
    })),
  };
}
