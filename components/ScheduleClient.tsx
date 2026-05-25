'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, User as UserIcon, PlusCircle, Calendar as CalendarIcon, 
  Clock, Repeat, UserPlus, Lightbulb, AlertTriangle, Eye, Sparkles, AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';
import { createMeetingSeries, checkConflicts, addMeetingParticipants } from '@/lib/meetings';
import { formatRecurrencePattern, calculateEndTime, generateOccurrences, getEndDateForCount, RecurrenceConfig } from '@/lib/recurrence';
import { bookRoom, bookRoomForRecurrentMeetings, Room } from '@/lib/rooms';
import { MeetingTemplateModal } from '@/components/MeetingTemplateModal';
import { MeetingCreatedModal } from '@/components/MeetingCreatedModal';
import { MeetingDetailsForm } from './schedule/MeetingDetailsForm';
import { RecurrenceSettings } from './schedule/RecurrenceSettings';
import { TemplateSelection } from './schedule/TemplateSelection';
import { ChecklistTasks } from './schedule/ChecklistTasks';
import { ScheduleSummary } from './schedule/ScheduleSummary';
import { ParticipantSelection } from './schedule/ParticipantSelection';
import { OrganizerTips } from './schedule/OrganizerTips';
import { Template, UserData, MeetingTask } from './schedule/types';

interface ScheduleClientProps {
  initialTemplates?: Template[];
  currentUser?: User;
}

export function ScheduleClient({ initialTemplates = [], currentUser }: ScheduleClientProps) {
  const router = useRouter();
  const supabase = createClient();
  
  // Loading and error states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Users for participant selection
  const [users, setUsers] = useState<UserData[]>([]);
  
  // Read URL params synchronously at mount so initial state is prefilled when
  // arriving from the Room Calendar drag flow. Using window.location here
  // (instead of `useSearchParams` + a post-mount effect) avoids a flash of
  // default values between first paint and the effect running, and sidesteps
  // any Next 16 prerendering/Suspense quirks around the `useSearchParams` hook.
  const prefill = (() => {
    if (typeof window === 'undefined') return null;
    const sp = new URLSearchParams(window.location.search);
    const room = sp.get('room');
    const date = sp.get('date');
    const time = sp.get('time');
    const endTime = sp.get('endTime');
    if (!room && !date && !time) return null;
    let durationMins: number | null = null;
    if (time && endTime) {
      const [sh, sm] = time.split(':').map(Number);
      const [eh, em] = endTime.split(':').map(Number);
      const m = (eh - sh) * 60 + (em - sm);
      if (Number.isFinite(m) && m > 0) durationMins = m;
    }
    return { room, date, time, endTime, durationMins };
  })();

  // Form state
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState<number>(prefill?.durationMins ?? 30);
  const [isCustomDuration, setIsCustomDuration] = useState(false);
  const [customEndTime, setCustomEndTime] = useState<string>(() => {
    const [hours, minutes] = (prefill?.time ?? '10:00').split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + (prefill?.durationMins ?? 30);
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  });
  const [bufferTime, setBufferTime] = useState(5);
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'bi-weekly' | 'monthly'>('weekly');
  const [selectedDays, setSelectedDays] = useState<string[]>(['M', 'W']);
  // A dragged range represents a one-off booking, not a series.
  const [isRecurring, setIsRecurring] = useState(prefill ? false : true);
  const [endRule, setEndRule] = useState<'never' | 'count' | 'date'>('date');
  const [endCount, setEndCount] = useState(10);
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().split('T')[0];
  });
  const [startDate, setStartDate] = useState(() => {
    if (prefill?.date) return prefill.date;
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [startTime, setStartTime] = useState(prefill?.time ?? '10:00');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  
  // Meeting Roles - Chairman and Coordinator
  const [chairmanId, setChairmanId] = useState<string>('');
  const [coordinatorId, setCoordinatorId] = useState<string>('');
  
  // Room selection
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(prefill?.room ?? null);
  const [roomBookingErrors, setRoomBookingErrors] = useState<string[]>([]);
  
  // Derived state for UI
  const calculatedEndTime = calculateEndTime(startTime, duration);
  const endTime = isCustomDuration ? customEndTime : calculatedEndTime;
  
  // Preview occurrences
  const [previewDates, setPreviewDates] = useState<Date[]>([]);
  const [totalOccurrences, setTotalOccurrences] = useState<number | null>(null);
  
  // Conflict detection
  const [conflicts, setConflicts] = useState<Array<{
    userId: string;
    userName: string;
    meetingTitle: string;
    meetingDate: string;
    startTime: string;
    endTime: string;
  }>>([]);
  
  // Modal states
  // Skip the template picker when the user arrived via a drag-selected
  // timeslot — they've already expressed intent for a specific slot/room.
  const [showTemplateModal, setShowTemplateModal] = useState(!prefill);
  const [showCreatedModal, setShowCreatedModal] = useState(false);
  const [createdMeeting, setCreatedMeeting] = useState<{
    id: string;
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    isRecurring: boolean;
    occurrencesCount?: number;
  } | null>(null);
  
  // Apply URL prefill after mount. The lazy `useState` initializers above
  // cover client-only navigation, but under Next.js SSR the initializers
  // run on the server (where `window` is undefined) and React does NOT
  // re-run them during client hydration — so without this effect the form
  // would hydrate to defaults even when query params are present.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    const room = sp.get('room');
    const date = sp.get('date');
    const time = sp.get('time');
    const endTimeParam = sp.get('endTime');
    if (!room && !date && !time) return;
    if (room) setSelectedRoomId(room);
    if (date) setStartDate(date);
    if (time) setStartTime(time);
    if (time && endTimeParam) {
      const [sh, sm] = time.split(':').map(Number);
      const [eh, em] = endTimeParam.split(':').map(Number);
      const mins = (eh - sh) * 60 + (em - sm);
      if (Number.isFinite(mins) && mins > 0) setDuration(mins);
    }
    setIsRecurring(false);
    setShowTemplateModal(false);
    // Empty deps — run once on mount. We deliberately ignore later URL
    // changes so user edits to form fields aren't overwritten.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load users on mount (exclude rejected users from user_approvals)
  useEffect(() => {
    async function loadUsers() {
      // First, get rejected user IDs from user_approvals
      const { data: rejectedApprovals } = await supabase
        .from('user_approvals')
        .select('user_id')
        .eq('status', 'rejected');

      const rejectedIds = rejectedApprovals?.map(a => a.user_id) || [];

      // Then fetch people, excluding rejected users
      let query = supabase
        .from('people')
        .select('id, name, division')
        .order('name');

      if (rejectedIds.length > 0) {
        query = query.not('id', 'in', `(${rejectedIds.join(',')})`);
      }

      const { data, error } = await query;

      if (!error && data) {
        setUsers(data);
      }
    }
    loadUsers();
  }, []);
  
  // Derive end_date from the end rule
  const resolvedEndDate: string | null = (() => {
    if (!isRecurring) return null;
    if (endRule === 'never') return null;
    if (endRule === 'date') return endDate || null;
    if (endRule === 'count') {
      const config: RecurrenceConfig = {
        frequency,
        daysOfWeek: selectedDays,
        startDate: new Date(startDate),
        endDate: null,
      };
      const d = getEndDateForCount(config, endCount);
      return d ? d.toISOString().split('T')[0] : null;
    }
    return null;
  })();

  // Update preview when recurrence settings change
  useEffect(() => {
    if (isRecurring && frequency && startDate) {
      const parsedEnd = resolvedEndDate ? new Date(resolvedEndDate + 'T00:00:00') : null;
      const config: RecurrenceConfig = {
        frequency,
        daysOfWeek: selectedDays,
        startDate: new Date(startDate),
        endDate: parsedEnd,
      };
      const startDateMinus1 = new Date(startDate + 'T00:00:00');
      startDateMinus1.setDate(startDateMinus1.getDate() - 1);
      const preview = generateOccurrences(config, 5, startDateMinus1);
      setPreviewDates(preview);

      if (parsedEnd) {
        const allForCount = generateOccurrences(config, 10000, startDateMinus1);
        setTotalOccurrences(allForCount.length);
      } else {
        setTotalOccurrences(null);
      }
    } else {
      setPreviewDates([]);
      setTotalOccurrences(null);
    }
  }, [frequency, selectedDays, startDate, isRecurring, endRule, endCount, endDate]);

  // Full list of occurrence dates (YYYY-MM-DD) for the room-availability
  // check. For one-off meetings this is just `[startDate]`. For recurring
  // meetings we enumerate every date — capped at 100 to match the endCount
  // UI max and to keep the pre-submit query bounded when endRule='never'.
  const allOccurrenceDates = useMemo<string[]>(() => {
    if (!startDate) return [];
    if (!isRecurring) return [startDate];

    const parsedEnd = resolvedEndDate ? new Date(resolvedEndDate + 'T00:00:00') : null;
    const config: RecurrenceConfig = {
      frequency,
      daysOfWeek: selectedDays,
      startDate: new Date(startDate),
      endDate: parsedEnd,
    };
    const startDateMinus1 = new Date(startDate + 'T00:00:00');
    startDateMinus1.setDate(startDateMinus1.getDate() - 1);
    const cap = endRule === 'count' ? Math.max(1, Math.min(100, endCount)) : 100;
    const all = generateOccurrences(config, cap, startDateMinus1);
    return all.map((d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    });
  }, [isRecurring, startDate, frequency, selectedDays, resolvedEndDate, endRule, endCount]);

  // Check for conflicts when relevant fields change
  useEffect(() => {
    async function detectConflicts() {
      if (selectedParticipants.length > 0 && startDate && startTime && endTime) {
        const result = await checkConflicts(
          startDate,
          startTime,
          endTime,
          selectedParticipants
        );
        setConflicts(result.conflicts);
      }
    }
    detectConflicts();
  }, [selectedParticipants, startDate, startTime, endTime]);
  
  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };
  
  const toggleParticipant = (userId: string) => {
    if (selectedParticipants.includes(userId)) {
      setSelectedParticipants(selectedParticipants.filter(id => id !== userId));
    } else {
      setSelectedParticipants([...selectedParticipants, userId]);
    }
  };
  
  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Please enter a meeting title');
      return;
    }
    if (!startDate) {
      setError('Please select a start date');
      return;
    }
    if (selectedDays.length === 0 && isRecurring && frequency !== 'monthly') {
      setError('Please select at least one day of the week');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      console.log('Creating meeting with data:', {
        template_id: selectedTemplate || undefined,
        title: title.trim(),
        description: description.trim() || undefined,
        frequency,
        days_of_week: selectedDays,
        start_date: startDate,
        start_time: startTime,
        end_time: endTime,
        duration_minutes: duration,
        buffer_minutes: bufferTime,
        participants: selectedParticipants,
        isRecurring,
      });
      
      let seriesId: string;
      
      if (isRecurring) {
        // Create recurring meeting series
        seriesId = await createMeetingSeries({
          template_id: selectedTemplate || undefined,
          title: title.trim(),
          description: description.trim() || undefined,
          frequency,
          days_of_week: selectedDays,
          start_date: startDate,
          end_date: resolvedEndDate || undefined,
          start_time: startTime,
          end_time: endTime,
          duration_minutes: duration,
          buffer_minutes: bufferTime,
          participants: selectedParticipants,
          chairman_id: chairmanId || undefined,
          coordinator_id: coordinatorId || undefined,
        }, currentUser?.id);
        
        // Book room for recurring meetings if selected
        if (selectedRoomId) {
          const { data: seriesMeetings } = await supabase
            .from('meetings')
            .select('id, date, start_time, end_time')
            .eq('series_id', seriesId)
            .order('date');
          
          if (seriesMeetings && seriesMeetings.length > 0) {
            const bookingResult = await bookRoomForRecurrentMeetings(
              selectedRoomId,
              seriesMeetings.map(m => ({
                meetingId: m.id,
                date: m.date,
                startTime: m.start_time || startTime,
                endTime: m.end_time || endTime,
              }))
            );
            
            if (!bookingResult.success && bookingResult.failedDates.length > 0) {
              setRoomBookingErrors(
                bookingResult.failedDates.map(f => 
                  `${f.date}: ${f.error}${f.suggestions ? ` (Alternatives: ${f.suggestions.slice(0, 3).map(s => `${s.startTime}-${s.endTime}`).join(', ')})` : ''}`
                )
              );
            }
          }
        }
        
        // Add checklist tasks to all meetings in the series if any
        if (meetingTasks.length > 0) {
          const { data: seriesMeetings } = await supabase
            .from('meetings')
            .select('id')
            .eq('series_id', seriesId);
          
          if (seriesMeetings && seriesMeetings.length > 0) {
            const allTasks = seriesMeetings.flatMap(meeting =>
              meetingTasks.map(task => ({
                meeting_id: meeting.id,
                description: task.description,
                is_completed: false,
                due_days_before: task.due_days_before ?? null,
              }))
            );
            
            const { error: taskError } = await supabase
              .from('meeting_checklist_tasks')
              .insert(allTasks);
            
            if (taskError) console.error('Error adding tasks to series:', taskError);
          }
        }
      } else {
        // Create single one-time meeting directly
        const { data: meeting, error } = await supabase
          .from('meetings')
          .insert({
            title: title.trim(),
            description: description.trim() || null,
            date: startDate,
            start_time: startTime,
            end_time: endTime,
            status: 'scheduled',
            chairman_id: chairmanId || null,
            coordinator_id: coordinatorId || null,
          })
          .select('id')
          .single();
        
        if (error) throw error;
        seriesId = meeting.id;
        
        // Add participants if any
        if (selectedParticipants.length > 0) {
          await addMeetingParticipants(seriesId, selectedParticipants, true);
        }
        
        // Add checklist tasks if any
        if (meetingTasks.length > 0) {
          const { error: taskError } = await supabase
            .from('meeting_checklist_tasks')
            .insert(
              meetingTasks.map(task => ({
                meeting_id: seriesId,
                description: task.description,
                is_completed: false,
                due_days_before: task.due_days_before ?? null,
              }))
            );
          if (taskError) console.error('Error adding tasks:', taskError);
        }
        
        // Book room for single meeting if selected
        if (selectedRoomId) {
          const bookingResult = await bookRoom({
            roomId: selectedRoomId,
            meetingId: seriesId,
            date: startDate,
            startTime: startTime,
            endTime: endTime,
          });
          
          if (!bookingResult.success) {
            setRoomBookingErrors([
              `Room booking failed: ${bookingResult.error}${bookingResult.suggestions ? ` (Alternatives: ${bookingResult.suggestions.slice(0, 3).map(s => `${s.startTime}-${s.endTime}`).join(', ')})` : ''}`
            ]);
          }
        }
      }
      
      console.log('Meeting created with ID:', seriesId);
      
      setCreatedMeeting({
        id: seriesId,
        title: title.trim(),
        date: startDate,
        startTime,
        endTime,
        isRecurring,
        occurrencesCount: isRecurring ? previewDates.length : 1,
      });
      setShowCreatedModal(true);
    } catch (err: unknown) {
      console.error('Error creating meeting:', err);
      const errorMsg = err instanceof Error ? err.message : 'Please try again.';
      setError('Failed to create meeting: ' + errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Meeting checklist tasks
  const [meetingTasks, setMeetingTasks] = useState<MeetingTask[]>([]);
  const [newMeetingTask, setNewMeetingTask] = useState('');

  const handleAddMeetingTask = () => {
    if (!newMeetingTask.trim()) return;
    setMeetingTasks([...meetingTasks, { id: crypto.randomUUID(), description: newMeetingTask.trim(), due_days_before: null, dueDateMode: 'days' }]);
    setNewMeetingTask('');
  };

  const removeMeetingTask = (taskId: string) => {
    setMeetingTasks(meetingTasks.filter(t => t.id !== taskId));
  };

  const updateTaskDueDays = (taskId: string, value: number | null) => {
    setMeetingTasks(meetingTasks.map(t => t.id === taskId ? { ...t, due_days_before: value } : t));
  };

  const toggleTaskDueDateMode = (taskId: string) => {
    setMeetingTasks(meetingTasks.map(t => {
      if (t.id !== taskId) return t;
      return { ...t, dueDateMode: t.dueDateMode === 'days' ? 'date' : 'days' };
    }));
  };

  const handleTaskDatePickerChange = (taskId: string, dateStr: string) => {
    if (!dateStr || !startDate) {
      updateTaskDueDays(taskId, null);
      return;
    }
    const meetingDate = new Date(startDate + 'T00:00:00');
    const pickedDate = new Date(dateStr + 'T00:00:00');
    const diffMs = meetingDate.getTime() - pickedDate.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    updateTaskDueDays(taskId, diffDays);
  };

  const computeTaskAbsoluteDate = (due_days_before: number | null, meetingDateStr: string): string => {
    if (due_days_before === null || !meetingDateStr) return '';
    const d = new Date(meetingDateStr + 'T00:00:00');
    d.setDate(d.getDate() - due_days_before);
    return d.toISOString().split('T')[0];
  };

  const handleTemplateSelect = async (templateId: string | null) => {
    setSelectedTemplate(templateId);
    
    if (templateId) {
      // Fetch full template data including chairman and tasks
      try {
        const { data: templateData } = await supabase
          .from('templates')
          .select('chairman_id, coordinator_id')
          .eq('id', templateId)
          .single();
        
        if (templateData) {
          setChairmanId(templateData.chairman_id || '');
          setCoordinatorId(templateData.coordinator_id || '');
        }
        
        // Fetch checklist tasks
        const { data: tasksData } = await supabase
          .from('template_checklist_tasks')
          .select('description, due_days_before')
          .eq('template_id', templateId);
        
        if (tasksData) {
          setMeetingTasks(tasksData.map((task: { description: string; due_days_before: number | null }) => ({
            id: crypto.randomUUID(),
            description: task.description,
            due_days_before: task.due_days_before ?? null,
            dueDateMode: 'days' as const,
          })));
        }
      } catch (error) {
        console.error('Error fetching template data:', error);
      }
    } else {
      // Custom type selected - clear template-related data
      setTitle('');
      setChairmanId('');
      setCoordinatorId('');
      setMeetingTasks([]);
    }
  };
  
  // Format recurrence for display
  const recurrenceDisplay = isRecurring ? formatRecurrencePattern(frequency, selectedDays) : 'One-time meeting';

  return (
    <div className="max-w-[1280px] mx-auto pb-24 pt-8 space-y-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 sm:gap-6 sm:flex-row sm:items-end sm:justify-between shrink-0">
              <div className="flex flex-col gap-2">
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-text-primary font-literata">
                  Schedule New Meeting
                </h1>
                <p className="text-base font-light text-text-secondary">
                  Configure your session parameters and invite participants.
                </p>
              </div>
            </div>

            {error && (
              <div className="bg-coral-bg border border-coral-text/20 rounded-2xl p-4 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-coral-text" />
                <p className="text-sm font-medium text-coral-text">{error}</p>
              </div>
            )}

            {roomBookingErrors.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-800 mb-2">
                      Some room bookings could not be completed:
                    </p>
                    <ul className="space-y-1">
                      {roomBookingErrors.map((err, idx) => (
                        <li key={idx} className="text-sm text-amber-700 font-light">
                          {err}
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-amber-600 mt-2">
                      The meetings were created successfully. You can modify room bookings individually from the meeting details.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-5 sm:px-6 py-3 bg-primary text-white rounded-2xl text-sm sm:text-base font-bold shadow-md transition-all active:scale-95 hover:bg-primary/90 disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Publish Schedule'}
              </button>
            </div>
          </div>

      {/* Grid Layout */}
      <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 shrink-0 w-full">

        {/* Left Column - Configuration */}
        <div className="w-full sm:flex-[2] flex flex-col gap-6 sm:gap-8 min-w-0">

          <MeetingDetailsForm
            title={title}
            setTitle={setTitle}
            description={description}
            setDescription={setDescription}
            startDate={startDate}
            setStartDate={setStartDate}
            startTime={startTime}
            setStartTime={setStartTime}
            endTime={endTime}
            isCustomDuration={isCustomDuration}
            setIsCustomDuration={setIsCustomDuration}
            duration={duration}
            setDuration={setDuration}
            setCustomEndTime={setCustomEndTime}
            selectedRoomId={selectedRoomId}
            setSelectedRoomId={setSelectedRoomId}
            participantCount={selectedParticipants.length}
            allOccurrenceDates={allOccurrenceDates}
          />

          <RecurrenceSettings
            isRecurring={isRecurring}
            setIsRecurring={setIsRecurring}
            frequency={frequency}
            setFrequency={setFrequency}
            selectedDays={selectedDays}
            toggleDay={toggleDay}
            endRule={endRule}
            setEndRule={setEndRule}
            endCount={endCount}
            setEndCount={setEndCount}
            endDate={endDate}
            setEndDate={setEndDate}
            startDate={startDate}
          />

          {/* Template Selection */}
          <TemplateSelection
            initialTemplates={initialTemplates}
            selectedTemplate={selectedTemplate}
            handleTemplateSelect={handleTemplateSelect}
          />

          {/* Meeting Roles - Chairman, Coordinator & Invitees */}
          <div className="bg-white border border-border/20 rounded-[24px] p-6 flex flex-col gap-6 shadow-sm">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-text-primary" />
              <h2 className="text-xl font-bold text-text-primary font-literata">
                Meeting Roles
              </h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-2">Chairman</label>
                <select 
                  value={chairmanId}
                  onChange={(e) => setChairmanId(e.target.value)}
                  className="w-full px-4 py-3 bg-surface border border-border rounded-2xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm font-light"
                >
                  <option value="">Select chairman...</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-2">Coordinator</label>
                <select 
                  value={coordinatorId}
                  onChange={(e) => setCoordinatorId(e.target.value)}
                  className="w-full px-4 py-3 bg-surface border border-border rounded-2xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm font-light"
                >
                  <option value="">Select coordinator...</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-text-primary mb-2">Invitees</label>
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto border border-border rounded-2xl p-2">
                {users.length === 0 ? (
                  <div className="p-4 text-center text-sm text-text-tertiary">
                    No users available. Add people in the Directory first.
                  </div>
                ) : (
                  users.map((user) => (
                    <div
                      key={user.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors",
                        selectedParticipants.includes(user.id)
                          ? "bg-mint/50 border border-sage/30"
                          : "hover:bg-surface border border-transparent"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selectedParticipants.includes(user.id)}
                        onChange={() => toggleParticipant(user.id)}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
                        {user.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-text-primary">{user.name}</p>
                        <p className="text-xs text-text-tertiary">{user.division}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Checklist Tasks */}
          <ChecklistTasks
            meetingTasks={meetingTasks}
            newMeetingTask={newMeetingTask}
            setNewMeetingTask={setNewMeetingTask}
            handleAddMeetingTask={handleAddMeetingTask}
            removeMeetingTask={removeMeetingTask}
            toggleTaskDueDateMode={toggleTaskDueDateMode}
            updateTaskDueDays={updateTaskDueDays}
            handleTaskDatePickerChange={handleTaskDatePickerChange}
            computeTaskAbsoluteDate={computeTaskAbsoluteDate}
            startDate={startDate}
          />
        </div>

        {/* Right Column - Summary & Tips */}
        <div className="w-full sm:flex-1 flex flex-col gap-6 min-w-0">
          
          <ScheduleSummary
            title={title}
            startTime={startTime}
            endTime={endTime}
            duration={duration}
            recurrenceDisplay={recurrenceDisplay}
            selectedParticipants={selectedParticipants}
            users={users}
          />

          <ParticipantSelection
            users={users}
            selectedParticipants={selectedParticipants}
            toggleParticipant={toggleParticipant}
          />

          <OrganizerTips
            conflicts={conflicts}
            previewDates={previewDates}
            totalOccurrences={totalOccurrences}
          />

          {/* Live Preview */}
          <div className="bg-white border border-border/30 rounded-[24px] p-6 flex items-center justify-between cursor-pointer hover:bg-surface transition-colors shadow-sm">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Eye className="h-5 w-5 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-text-primary text-base">Live Preview</span>
                <span className="font-light text-text-secondary text-xs">View as participant</span>
              </div>
            </div>
            <div className="h-8 w-8 rounded-full border border-border/50 flex items-center justify-center bg-white shadow-sm">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary"><path d="m9 18 6-6-6-6"/></svg>
            </div>
          </div>

        </div>
      </div>

      {/* Meeting Template Modal */}
      <MeetingTemplateModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        templates={initialTemplates}
        onSelectTemplate={(template) => {
          setShowTemplateModal(false);
          if (template) {
            handleTemplateSelect(template.id);
          } else {
            handleTemplateSelect(null);
          }
        }}
      />

      {/* Meeting Created Success Modal */}
      <MeetingCreatedModal
        isOpen={showCreatedModal}
        onClose={() => {
          setShowCreatedModal(false);
          setCreatedMeeting(null);
        }}
        meeting={createdMeeting}
        onCreateAnother={() => {
          setShowCreatedModal(false);
          setCreatedMeeting(null);
          // Reset form for creating another
          setTitle('');
          setDescription('');
          setSelectedParticipants([]);
          setShowTemplateModal(true);
        }}
      />
    </div>
  );
}
