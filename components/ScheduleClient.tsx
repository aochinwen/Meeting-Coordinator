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
import { createMeetingSeries, checkConflicts } from '@/lib/meetings';
import { formatRecurrencePattern, calculateEndTime } from '@/lib/recurrence';
import { generateOccurrences, RecurrenceConfig } from '@/lib/recurrence';
import { MeetingTemplateModal } from '@/components/MeetingTemplateModal';
import { MeetingCreatedModal } from '@/components/MeetingCreatedModal';

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
  
  // Form state
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [schedulingMode, setSchedulingMode] = useState<'smart' | 'manual'>('smart');
  const [duration, setDuration] = useState(30);
  const [bufferTime, setBufferTime] = useState(5);
  const [frequency, setFrequency] = useState<'weekly' | 'bi-weekly' | 'monthly'>('weekly');
  const [selectedDays, setSelectedDays] = useState<string[]>(['M', 'W']);
  const [isRecurring, setIsRecurring] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [startTime, setStartTime] = useState('10:00');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  
  // Meeting Roles - Chairman and Coordinator
  const [chairmanId, setChairmanId] = useState<string>('');
  const [coordinatorId, setCoordinatorId] = useState<string>('');
  
  // Derived state for UI
  const endTime = calculateEndTime(startTime, duration);
  
  // Preview occurrences
  const [previewDates, setPreviewDates] = useState<Date[]>([]);
  
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
  const [showTemplateModal, setShowTemplateModal] = useState(true);
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
  
  // Load users on mount
  useEffect(() => {
    async function loadUsers() {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, division')
        .order('name');
      
      if (!error && data) {
        setUsers(data);
      }
    }
    loadUsers();
  }, []);
  
  // Update preview when recurrence settings change
  useEffect(() => {
    if (isRecurring && frequency && startDate) {
      const config: RecurrenceConfig = {
        frequency,
        daysOfWeek: selectedDays,
        startDate: new Date(startDate),
        endDate: null,
      };
      const occurrences = generateOccurrences(config, 5);
      setPreviewDates(occurrences);
    } else {
      setPreviewDates([]);
    }
  }, [frequency, selectedDays, startDate, isRecurring]);
  
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
          start_time: startTime,
          end_time: endTime,
          duration_minutes: duration,
          buffer_minutes: bufferTime,
          participants: selectedParticipants,
        }, currentUser?.id);
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
          })
          .select('id')
          .single();
        
        if (error) throw error;
        seriesId = meeting.id;
        
        // Add participants if any
        if (selectedParticipants.length > 0) {
          const { error: participantError } = await supabase
            .from('meeting_participants')
            .insert(
              selectedParticipants.map(userId => ({
                meeting_id: seriesId,
                user_id: userId,
                status: 'invited',
                is_required: true,
              }))
            );
          if (participantError) console.error('Error adding participants:', participantError);
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
              }))
            );
          if (taskError) console.error('Error adding tasks:', taskError);
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
  const [meetingTasks, setMeetingTasks] = useState<Array<{ id: string; description: string }>>([]);
  const [newMeetingTask, setNewMeetingTask] = useState('');

  const handleAddMeetingTask = () => {
    if (!newMeetingTask.trim()) return;
    setMeetingTasks([...meetingTasks, { id: crypto.randomUUID(), description: newMeetingTask.trim() }]);
    setNewMeetingTask('');
  };

  const removeMeetingTask = (taskId: string) => {
    setMeetingTasks(meetingTasks.filter(t => t.id !== taskId));
  };
  const handleTemplateSelect = async (templateId: string | null) => {
    setSelectedTemplate(templateId);
    
    if (templateId) {
      // Find template info from initial templates
      const template = initialTemplates.find(t => t.id === templateId);
      if (template) {
        setTitle(template.name);
      }
      
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
          .select('description')
          .eq('template_id', templateId);
        
        if (tasksData) {
          setMeetingTasks(tasksData.map((task, index) => ({
            id: crypto.randomUUID(),
            description: task.description
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
              <div className="grid grid-cols-2 gap-8">
                <div className="flex flex-col gap-3">
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Frequency</label>
                  <div className="flex bg-status-grey-bg rounded-[16px] p-1">
                    {(['weekly', 'bi-weekly', 'monthly'] as const).map((freq) => (
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
                        {freq === 'weekly' ? 'Weekly' : freq === 'bi-weekly' ? 'Bi-Weekly' : 'Monthly'}
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
            
            <div className="grid grid-cols-2 gap-8">
              {/* Left Side - Mode */}
              <div className="flex flex-col gap-4">
                <label className="text-sm font-bold text-text-primary">Scheduling Mode</label>
                
                <div 
                  className={cn(
                    "flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all",
                    schedulingMode === 'smart' ? "border-primary bg-surface/50" : "border-border/50 hover:border-primary/30"
                  )}
                  onClick={() => setSchedulingMode('smart')}
                >
                  <div className={cn("mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0", schedulingMode === 'smart' ? "border-primary bg-primary" : "border-border/50")}>
                    {schedulingMode === 'smart' && <div className="h-2 w-2 rounded-full bg-white" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-text-primary text-sm mb-1">Smart Availability</h4>
                    <p className="text-xs font-light text-text-secondary">System finds best slots for everyone</p>
                  </div>
                </div>

                <div 
                  className={cn(
                    "flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all",
                    schedulingMode === 'manual' ? "border-primary bg-surface/50" : "border-border/50 hover:border-primary/30"
                  )}
                  onClick={() => setSchedulingMode('manual')}
                >
                  <div className={cn("mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0", schedulingMode === 'manual' ? "border-primary bg-primary" : "border-border/50")}>
                    {schedulingMode === 'manual' && <div className="h-2 w-2 rounded-full bg-white" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-text-primary text-sm mb-1">Manual Slotting</h4>
                    <p className="text-xs font-light text-text-secondary">Pick exact time and date manually</p>
                  </div>
                </div>
              </div>

              {/* Right Side - Timing */}
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-bold text-text-primary">Duration</label>
                  <div className="flex items-center gap-2">
                    {[15, 30, 60, 'custom'].map((dur) => (
                      <button
                        key={dur}
                        onClick={() => setDuration(typeof dur === 'number' ? dur : 30)}
                        className={cn(
                          "px-4 py-2 rounded-full text-sm font-bold transition-all",
                          duration === dur || (dur === 'custom' && ![15, 30, 60].includes(duration))
                          ? "bg-primary text-white shadow-sm" 
                          : "bg-status-grey-bg text-text-primary hover:bg-cream"
                      )}
                      >
                        {dur === 60 ? '1h' : typeof dur === 'number' ? `${dur}m` : 'Custom'}
                      </button>
                    ))}
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
                {users.map((user) => (
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
                ))}
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
                  className="flex items-center gap-4 p-4 bg-board border border-border/50 rounded-2xl hover:border-border transition-colors group"
                >
                  <div className="w-6 h-6 rounded border border-border flex items-center justify-center text-transparent bg-white">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="flex-1 text-base text-text-primary font-light">{task.description}</span>
                  <button 
                    onClick={() => removeMeetingTask(task.id)}
                    className="text-text-tertiary hover:text-coral-text transition-colors p-2 rounded-xl hover:bg-coral-text/10 opacity-0 group-hover:opacity-100"
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
                  <div className="text-sm font-light text-text-primary leading-snug">
                    <p className="font-bold mb-1">Upcoming occurrences:</p>
                    <ul className="space-y-1">
                      {previewDates.slice(0, 3).map((date, i) => (
                        <li key={i} className="text-xs text-text-secondary">
                          {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </li>
                      ))}
                      {previewDates.length > 3 && (
                        <li className="text-xs text-text-tertiary">
                          ...and {previewDates.length - 3} more
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
            setSelectedTemplate(template.id);
            setTitle(template.name);
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
