'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, User as UserIcon, PlusCircle, Settings, Calendar as CalendarIcon, 
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
import { RoomSelector } from '@/components/RoomSelector';

interface ScheduleClientProps {
  initialTemplates?: Template[];
  currentUser?: User;
}

interface Template {
  id: string;
  name: string;
  description?: string | null;
}

interface UserData {
  id: string;
  name: string;
  division: string | null;
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

  // Load users on mount
  useEffect(() => {
    async function loadUsers() {
      const { data, error } = await supabase
        .from('people')
        .select('id, name, division')
        .order('name');
      
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
        
        // Copy checklist tasks from template if selected
        if (selectedTemplate && meetingTasks.length > 0) {
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
    } catch (err: any) {
      console.error('Error creating meeting:', err);
      console.error('Error details:', err.message, err.stack);
      setError('Failed to create meeting: ' + (err.message || 'Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Meeting checklist tasks
  const [meetingTasks, setMeetingTasks] = useState<Array<{ id: string; description: string; due_days_before: number | null; dueDateMode: 'days' | 'date' }>>([]);
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
          setMeetingTasks((tasksData as any[]).map((task) => ({
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
    <div className="max-w-[1280px] mx-auto pb-24 pt-8 space-y-8">
      {/* Header */}
          <div className="flex flex-col gap-6">
            <div className="flex items-end justify-between shrink-0">
              <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-bold tracking-tight text-text-primary font-literata">
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
                className="px-6 py-3 bg-primary text-white rounded-2xl text-base font-bold shadow-md transition-all active:scale-95 hover:bg-primary/90 disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Publish Schedule'}
              </button>
            </div>
          </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-12 gap-8 shrink-0">

        {/* Left Column - Configuration */}
        <div className="col-span-8 flex flex-col gap-8">

          {/* Meeting Details */}
          <div className="bg-white border border-border/20 rounded-[24px] p-6 flex flex-col gap-6 shadow-sm">
            <div className="flex items-center gap-3">
              <CalendarIcon className="h-5 w-5 text-text-primary" />
              <h2 className="text-xl font-bold text-text-primary font-literata">
                Meeting Details
              </h2>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-text-primary">Meeting Name <span className="text-coral-text">*</span></label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter meeting name..."
                  className="w-full px-4 py-3 bg-surface border-none rounded-2xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm font-light"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-text-primary">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add meeting description or agenda..."
                  rows={3}
                  className="w-full px-4 py-3 bg-surface border-none rounded-2xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm font-light resize-none"
                />
              </div>
            </div>
          </div>

          {/* Recurrence Settings */}
          <div className="bg-white border border-border/20 rounded-[24px] p-6 flex flex-col gap-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Repeat className="h-5 w-5 text-text-primary" />
                <h2 className="text-xl font-bold text-text-primary font-literata">
                  Recurrence Settings
                </h2>
              </div>
              {/* Recurrence Toggle */}
              <button
                onClick={() => setIsRecurring(!isRecurring)}
                className={cn(
                  "relative inline-flex h-7 w-12 items-center rounded-full transition-colors",
                  isRecurring ? "bg-primary" : "bg-status-grey-bg"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-5 w-5 transform rounded-full bg-white transition-transform",
                    isRecurring ? "translate-x-6" : "translate-x-1"
                  )}
                />
              </button>
            </div>
            
            {isRecurring && (
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-2 gap-8">
                  <div className="flex flex-col gap-3">
                    <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Frequency</label>
                    <div className="flex bg-status-grey-bg rounded-[16px] p-1">
                      {(['daily', 'weekly', 'bi-weekly', 'monthly'] as const).map((freq) => (
                        <button
                          key={freq}
                          onClick={() => setFrequency(freq)}
                          className={cn(
                            "flex-1 py-1.5 rounded-[12px] text-sm font-bold transition-all capitalize",
                            frequency === freq 
                              ? "bg-white text-text-primary shadow-sm" 
                              : "text-text-primary hover:bg-white/50"
                          )}
                        >
                          {freq === 'daily' ? 'Daily' : freq === 'weekly' ? 'Weekly' : freq === 'bi-weekly' ? 'Bi-Weekly' : 'Monthly'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Repeat Days</label>
                    <div className="flex items-center gap-2 mt-1">
                      {['M', 'T', 'W', 'Th', 'F'].map((day) => {
                        const mappedDay = day === 'Th' ? 'T' : day;
                        return (
                          <button
                            key={day}
                            onClick={() => toggleDay(day)}
                            className={cn(
                              "h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold transition-all border",
                              selectedDays.includes(day)
                                ? "bg-primary text-white border-primary"
                                : "bg-status-grey-bg text-text-primary border-transparent hover:bg-cream"
                            )}
                          >
                            {mappedDay}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* End Rule */}
                <div className="flex flex-col gap-3 border-t border-border/20 pt-5">
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Ends</label>
                  <div className="flex flex-col gap-3">
                    {/* Never */}
                    <div
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all",
                        endRule === 'never' ? "border-primary bg-surface/50" : "border-border/50 hover:border-primary/30"
                      )}
                      onClick={() => setEndRule('never')}
                    >
                      <div className={cn("h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0", endRule === 'never' ? "border-primary bg-primary" : "border-border/50")}>
                        {endRule === 'never' && <div className="h-2 w-2 rounded-full bg-white" />}
                      </div>
                      <div>
                        <h4 className="font-bold text-text-primary text-sm">No end</h4>
                        <p className="text-xs font-light text-text-secondary">Series continues indefinitely</p>
                      </div>
                    </div>

                    {/* After N occurrences */}
                    <div
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all",
                        endRule === 'count' ? "border-primary bg-surface/50" : "border-border/50 hover:border-primary/30"
                      )}
                      onClick={() => setEndRule('count')}
                    >
                      <div className={cn("h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0", endRule === 'count' ? "border-primary bg-primary" : "border-border/50")}>
                        {endRule === 'count' && <div className="h-2 w-2 rounded-full bg-white" />}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-text-primary text-sm mb-1">After occurrences</h4>
                        {endRule === 'count' ? (
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={endCount}
                              onChange={(e) => setEndCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                              className="w-20 px-3 py-1.5 bg-white border border-border rounded-xl text-sm font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-center"
                            />
                            <span className="text-xs font-light text-text-secondary">occurrences (max 100)</span>
                          </div>
                        ) : (
                          <p className="text-xs font-light text-text-secondary">Stop after a set number of meetings</p>
                        )}
                      </div>
                    </div>

                    {/* Until date */}
                    <div
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all",
                        endRule === 'date' ? "border-primary bg-surface/50" : "border-border/50 hover:border-primary/30"
                      )}
                      onClick={() => setEndRule('date')}
                    >
                      <div className={cn("h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0", endRule === 'date' ? "border-primary bg-primary" : "border-border/50")}>
                        {endRule === 'date' && <div className="h-2 w-2 rounded-full bg-white" />}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-text-primary text-sm mb-1">Until date</h4>
                        {endRule === 'date' ? (
                          <div onClick={(e) => e.stopPropagation()}>
                            <input
                              type="date"
                              value={endDate}
                              min={startDate}
                              onChange={(e) => setEndDate(e.target.value)}
                              className="w-full px-3 py-1.5 bg-white border border-border rounded-xl text-sm font-light text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                          </div>
                        ) : (
                          <p className="text-xs font-light text-text-secondary">Stop on a specific calendar date</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {!isRecurring && (
              <p className="text-sm text-text-tertiary font-light">
                This meeting will occur once on the selected date.
              </p>
            )}
          </div>

          {/* Scheduling Mode & Session Timing */}
          <div className="bg-white border border-border/20 rounded-[24px] p-6 flex flex-col gap-8 shadow-sm">
            <div className="flex items-center gap-3">
              <Settings className="h-5 w-5 text-text-primary" />
              <h2 className="text-xl font-bold text-text-primary font-literata">
                Scheduling Mode & Session Timing
              </h2>
            </div>
            
            <div className="grid grid-cols-1 gap-8">
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-bold text-text-primary">Duration</label>
                  <div className="flex items-center gap-2">
                    {[15, 30, 60].map((dur) => (
                      <button
                        key={dur}
                        onClick={() => {
                          setDuration(dur);
                          setIsCustomDuration(false);
                        }}
                        className={cn(
                          "px-4 py-2 rounded-full text-sm font-bold transition-all",
                          !isCustomDuration && duration === dur
                          ? "bg-primary text-white shadow-sm" 
                          : "bg-status-grey-bg text-text-primary hover:bg-cream"
                      )}
                      >
                        {dur === 60 ? '1h' : `${dur}m`}
                      </button>
                    ))}
                    <button
                      onClick={() => setIsCustomDuration(true)}
                      className={cn(
                        "px-4 py-2 rounded-full text-sm font-bold transition-all",
                        isCustomDuration
                        ? "bg-primary text-white shadow-sm" 
                        : "bg-status-grey-bg text-text-primary hover:bg-cream"
                    )}
                    >
                      Custom
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <label className="text-sm font-bold text-text-primary">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-3 bg-surface border-none rounded-2xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm font-light"
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <label className="text-sm font-bold text-text-primary">Start Time</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-4 py-3 bg-surface border-none rounded-2xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm font-light"
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <label className="text-sm font-bold text-text-primary">End Time</label>
                  <input
                    type="time"
                    value={endTime}
                    disabled={!isCustomDuration}
                    onChange={(e) => {
                      if (isCustomDuration) {
                        const newEndTime = e.target.value;
                        setCustomEndTime(newEndTime);
                        // Calculate duration from start and end times
                        const [startH, startM] = startTime.split(':').map(Number);
                        const [endH, endM] = newEndTime.split(':').map(Number);
                        let diffMinutes = (endH * 60 + endM) - (startH * 60 + startM);
                        if (diffMinutes < 0) diffMinutes += 24 * 60; // Handle next day
                        setDuration(diffMinutes);
                      }
                    }}
                    className={cn(
                      "w-full px-4 py-3 bg-surface border-none rounded-2xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm font-light",
                      !isCustomDuration && "opacity-60 cursor-not-allowed"
                    )}
                  />
                  {!isCustomDuration && (
                    <p className="text-xs font-light text-text-secondary">
                      End time is calculated from duration
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  <label className="text-sm font-bold text-text-primary">Buffer Time</label>
                  <select 
                    value={bufferTime}
                    onChange={(e) => setBufferTime(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-surface border-none rounded-2xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none text-sm font-light"
                  >
                    <option value={0}>None</option>
                    <option value={5}>5 minutes</option>
                    <option value={10}>10 minutes</option>
                    <option value={15}>15 minutes</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Room Selection */}
          <div className="bg-white border border-border/20 rounded-[24px] p-6 flex flex-col gap-6 shadow-sm">
            <RoomSelector
              date={startDate}
              startTime={startTime}
              endTime={endTime}
              selectedRoomId={selectedRoomId}
              onRoomSelect={setSelectedRoomId}
              minCapacity={selectedParticipants.length + 1}
            />
          </div>

          {/* Template Selection */}
          <div className="bg-surface border border-border/30 rounded-[24px] p-6 flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-text-primary" />
              <h2 className="text-xl font-bold text-text-primary font-literata">
                Template Selection
              </h2>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              {/* Template Cards */}
              {initialTemplates.map((template) => (
                <div 
                  key={template.id}
                  onClick={() => handleTemplateSelect(template.id)}
                  className={cn(
                    "relative rounded-[24px] p-5 cursor-pointer transition-all border-2",
                    selectedTemplate === template.id
                      ? "bg-cream border-primary shadow-sm" 
                      : "bg-white border-border/50 hover:border-primary/50"
                  )}
                >
                  {selectedTemplate === template.id && (
                    <div className="absolute top-3 right-3 h-5 w-5 bg-primary rounded-full flex items-center justify-center">
                     <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}
                  <Users className="h-5 w-5 text-text-primary mb-3" />
                  <h3 className="font-bold text-text-primary text-base mb-1">{template.name}</h3>
                  {template.description && (
                    <p className="text-xs font-light text-text-secondary">{template.description}</p>
                  )}
                </div>
              ))}

              {/* Custom Template Card */}
              <div 
                onClick={() => handleTemplateSelect(null)}
                className={cn(
                  "relative rounded-[24px] p-5 cursor-pointer transition-all border-2 border-dashed flex flex-col items-center justify-center text-center",
                  selectedTemplate === null
                    ? "bg-cream border-primary shadow-sm" 
                    : "bg-transparent border-border/50 hover:border-primary/50"
                )}
              >
                <PlusCircle className="h-6 w-6 text-text-secondary mb-2" />
                <h3 className="font-bold text-text-tertiary text-sm">Custom Type</h3>
              </div>
            </div>
          </div>

          {/* Meeting Roles - Chairman, Coordinator & Invitees */}
          <div className="bg-white border border-border/20 rounded-[24px] p-6 flex flex-col gap-6 shadow-sm">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-text-primary" />
              <h2 className="text-xl font-bold text-text-primary font-literata">
                Meeting Roles
              </h2>
            </div>
            
            <div className="grid grid-cols-2 gap-5">
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
          <div className="bg-white border border-border/20 rounded-[24px] p-6 flex flex-col gap-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg className="h-5 w-5 text-text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <h2 className="text-xl font-bold text-text-primary font-literata">
                  Checklist Tasks
                </h2>
              </div>
            </div>
            <p className="text-sm text-text-tertiary font-light -mt-4">
              Add default tasks for this meeting. These will be created for each occurrence.
            </p>

            <div className="space-y-3">
              {meetingTasks.map((task) => (
                <div 
                  key={task.id} 
                  className="flex items-start gap-4 p-4 bg-board border border-border/50 rounded-2xl hover:border-border transition-colors group"
                >
                  <div className="w-6 h-6 rounded border border-border flex items-center justify-center text-transparent bg-white mt-1 shrink-0">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="flex-1 flex flex-col gap-2">
                    <span className="text-base text-text-primary font-light">{task.description}</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => toggleTaskDueDateMode(task.id)}
                        className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border border-border bg-white text-text-tertiary hover:border-primary/50 hover:text-primary transition-colors shrink-0"
                      >
                        {task.dueDateMode === 'days' ? '# days' : 'pick date'}
                      </button>
                      {task.dueDateMode === 'days' ? (
                        <>
                          <input
                            type="number"
                            placeholder="days before meeting"
                            value={task.due_days_before ?? ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? null : parseInt(e.target.value, 10);
                              updateTaskDueDays(task.id, isNaN(val as number) ? null : val);
                            }}
                            className="w-36 px-2 py-1 text-xs border border-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-primary/30 text-text-primary placeholder:text-text-tertiary"
                          />
                          <span className="text-xs text-text-tertiary">
                            {task.due_days_before === null
                              ? 'no due date'
                              : task.due_days_before >= 0
                              ? `${task.due_days_before} day${task.due_days_before !== 1 ? 's' : ''} before`
                              : `${Math.abs(task.due_days_before)} day${Math.abs(task.due_days_before) !== 1 ? 's' : ''} after`}
                          </span>
                        </>
                      ) : (
                        <>
                          <input
                            type="date"
                            value={computeTaskAbsoluteDate(task.due_days_before, startDate)}
                            onChange={(e) => handleTaskDatePickerChange(task.id, e.target.value)}
                            className="px-2 py-1 text-xs border border-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-primary/30 text-text-primary"
                          />
                          {task.due_days_before !== null && startDate && (
                            <span className="text-xs text-text-tertiary">
                              {task.due_days_before >= 0
                                ? `${task.due_days_before} day${task.due_days_before !== 1 ? 's' : ''} before`
                                : `${Math.abs(task.due_days_before)} day${Math.abs(task.due_days_before) !== 1 ? 's' : ''} after`}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={() => removeMeetingTask(task.id)}
                    className="text-text-tertiary hover:text-coral-text transition-colors p-2 rounded-xl hover:bg-coral-text/10 opacity-0 group-hover:opacity-100 mt-0.5"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <input
                type="text"
                value={newMeetingTask}
                onChange={(e) => setNewMeetingTask(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddMeetingTask()}
                placeholder="Add a checklist task..."
                className="flex-1 px-4 py-3 bg-surface border border-border rounded-2xl text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm font-light"
              />
              <button 
                onClick={handleAddMeetingTask}
                disabled={!newMeetingTask.trim()}
                className="px-6 py-3 bg-board text-text-primary border border-border rounded-2xl text-base font-light hover:bg-surface transition-colors disabled:opacity-50 flex items-center gap-2 shrink-0"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Task
              </button>
            </div>
          </div>

        </div>

        {/* Right Column - Summary & Tips */}
        <div className="col-span-4 flex flex-col gap-6">
          
          {/* Schedule Summary Card */}
          <div className="bg-primary rounded-[24px] p-8 flex flex-col gap-6 text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-[-20px] right-[-20px] h-32 w-32 bg-white/10 blur-[30px] rounded-full point-events-none"></div>
            
            <h3 className="text-2xl font-bold tracking-tight font-literata">
              Schedule Summary
            </h3>
            
            <div className="flex flex-col gap-6 mt-2 relative z-10">
              <div className="flex items-start gap-4">
                <CalendarIcon className="h-5 w-5 mt-0.5 text-status-green-bg/80" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-medium text-status-green-bg/80 uppercase tracking-wider mb-1">Event Name</span>
                  <span className="text-base font-bold leading-tight">{title || 'Untitled Meeting'}</span>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Clock className="h-5 w-5 mt-0.5 text-status-green-bg/80" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-medium text-status-green-bg/80 uppercase tracking-wider mb-1">Time & Duration</span>
                  <span className="text-base font-bold leading-tight">{startTime} — {endTime}<br/>({duration}m)</span>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Repeat className="h-5 w-5 mt-0.5 text-status-green-bg/80" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-medium text-status-green-bg/80 uppercase tracking-wider mb-1">Recurrence</span>
                  <span className="text-base font-bold leading-tight">{recurrenceDisplay}</span>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <UserPlus className="h-5 w-5 mt-0.5 text-status-green-bg/80" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-medium text-status-green-bg/80 uppercase tracking-wider mb-2">Participants</span>
                  <div className="flex -space-x-2">
                    {selectedParticipants.slice(0, 3).map((userId, i) => {
                      const user = users.find(u => u.id === userId);
                      return (
                        <div key={userId} className="h-8 w-8 rounded-full border-2 border-primary bg-primary overflow-hidden flex items-center justify-center">
                          <span className="text-white text-xs font-bold">
                            {user?.name?.charAt(0) || '?'}
                          </span>
                        </div>
                      );
                    })}
                    {selectedParticipants.length > 3 && (
                      <div className="h-8 w-8 rounded-full border-2 border-primary bg-warm flex items-center justify-center text-text-primary text-[10px] font-bold">
                        +{selectedParticipants.length - 3}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Participant Selection */}
          <div className="bg-white border border-border/20 rounded-[24px] p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-text-primary" />
              <h3 className="text-base font-bold text-text-primary font-literata">
                Participants
              </h3>
            </div>
            
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
              {users.map((user) => (
                <div
                  key={user.id}
                  onClick={() => toggleParticipant(user.id)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-colors",
                    selectedParticipants.includes(user.id)
                      ? "bg-mint/50 border border-sage/30"
                      : "hover:bg-surface border border-transparent"
                  )}
                >
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold",
                    selectedParticipants.includes(user.id) ? "bg-primary" : "bg-sage"
                  )}>
                    {user.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-text-primary">{user.name}</p>
                    <p className="text-xs text-text-tertiary">{user.division}</p>
                  </div>
                  {selectedParticipants.includes(user.id) && (
                    <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                      <div className="h-2 w-2 bg-white rounded-full" />
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <p className="text-xs text-text-tertiary">
              {selectedParticipants.length} participant{selectedParticipants.length !== 1 ? 's' : ''} selected
            </p>
          </div>

          {/* Organizer Tips */}
          <div className="bg-amber border border-amber-border/30 rounded-[24px] p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-text-primary" />
              <h3 className="text-base font-bold text-text-primary font-literata">
                Organizer Tips
              </h3>
            </div>
            
            <div className="flex flex-col gap-4">
              {conflicts.length > 0 ? (
                conflicts.slice(0, 2).map((conflict, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <AlertCircle className="h-4 w-4 text-coral-text shrink-0 mt-0.5" />
                    <p className="text-sm font-light text-text-primary leading-snug">
                      <strong className="font-bold">{conflict.userName}</strong> has a conflict: {conflict.meetingTitle} at {conflict.startTime}
                    </p>
                  </div>
                ))
              ) : (
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <p className="text-sm font-light text-text-primary leading-snug">
                    <strong className="font-bold">No conflicts detected!</strong> All selected participants are available at this time.
                  </p>
                </div>
              )}
              
              {previewDates.length > 0 && (
                <div className="flex items-start gap-3">
                  <CalendarIcon className="h-4 w-4 text-text-tertiary shrink-0 mt-0.5" />
                  <div className="text-sm font-light text-text-primary leading-snug w-full">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-bold">Upcoming occurrences:</p>
                      {totalOccurrences !== null && (
                        <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          {totalOccurrences} total
                        </span>
                      )}
                    </div>
                    <ul className="space-y-1">
                      {previewDates.slice(0, 5).map((date, i) => (
                        <li key={i} className="text-xs text-text-secondary">
                          {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </li>
                      ))}
                      {totalOccurrences !== null && totalOccurrences > 5 && (
                        <li className="text-xs text-text-tertiary">
                          +{totalOccurrences - 5} more
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>

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
