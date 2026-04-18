'use client';

import { useState, useEffect, useRef, useMemo, memo } from 'react';
import { 
  ChevronRight, Calendar, Clock, Users, MapPin, FileText, 
  CheckCircle2, MessageSquare, Plus, Check, Edit, Trash2,
  Mail, Copy, ExternalLink, MoreHorizontal, ArrowLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DeleteMeetingModal } from './DeleteMeetingModal';

interface RoomBooking {
  id: string;
  room_id: string;
  meeting_id: string | null;
  date: string;
  start_time: string;
  end_time: string;
  status: string | null;
  room: {
    id: string;
    name: string;
    capacity: number;
  } | null;
}

interface MeetingDetailClientProps {
  meetingId: string;
  currentUser?: User;
  initialData?: {
    meeting: Meeting | null;
    participants: Participant[];
    tasks: Task[];
    activities: Activity[];
    profileMap: Record<string, { name: string; division?: string | null; rank?: string | null }>;
    roomBooking: RoomBooking | null;
  };
}

interface Meeting {
  id: string;
  title: string;
  description: string | null;
  date: string;
  start_time: string | null;
  end_time: string | null;
  status: string;
  series_id: string | null;
  template_id: string | null;
  created_at: string;
}

interface Participant {
  id: string;
  user_id: string;
  status: string | null;
  is_required: boolean | null;
  user: {
    name: string;
    division?: string | null;
    rank?: string | null;
  } | null;
}

interface Task {
  id: string;
  description: string;
  assigned_user_id: string | null;
  is_completed: boolean;
  due_days_before?: number | null;
  created_at: string;
  assignee: {
    name: string;
  } | null;
}

interface Activity {
  id: string;
  user_id: string | null;
  activity_type: string;
  content: string;
  metadata: unknown;
  created_at: string;
  user: {
    name: string;
  } | null;
}

function MeetingDetailClientComponent({ meetingId, currentUser, initialData }: MeetingDetailClientProps) {
  const supabase = createClient();
  const router = useRouter();
  const [meeting, setMeeting] = useState<Meeting | null>(initialData?.meeting || null);
  const [roomBooking, setRoomBooking] = useState<RoomBooking | null>(initialData?.roomBooking || null);
  const [participants, setParticipants] = useState<Participant[]>(initialData?.participants || []);
  const [tasks, setTasks] = useState<Task[]>(initialData?.tasks || []);
  const [activities, setActivities] = useState<Activity[]>(initialData?.activities || []);
  const [loading, setLoading] = useState(!initialData);
  const [newTaskInput, setNewTaskInput] = useState('');
  const [commentInput, setCommentInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  type ProfileInfo = { name: string; division?: string | null; rank?: string | null };
  const profileMapRef = useRef<Map<string, ProfileInfo>>(
    initialData?.profileMap
      ? new Map(Object.entries(initialData.profileMap))
      : new Map()
  );

  // No-arg wrappers for real-time callbacks and event handlers
  function fetchTasks() { fetchTasksWithMap(profileMapRef.current); }
  function fetchActivities() { fetchActivitiesWithMap(profileMapRef.current); }

  useEffect(() => {
    // Only fetch if we don't have initial data (fallback for client-side navigation)
    if (!initialData) {
      fetchMeetingData();
    }

    // Real-time subscriptions for live updates
    const tasksSubscription = supabase
      .channel('meeting_checklist_tasks')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meeting_checklist_tasks',
          filter: `meeting_id=eq.${meetingId}`,
        },
        () => {
          fetchTasks();
        }
      )
      .subscribe();

    const activitiesSubscription = supabase
      .channel('meeting_activities')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'meeting_activities',
          filter: `meeting_id=eq.${meetingId}`,
        },
        () => {
          fetchActivities();
        }
      )
      .subscribe();

    return () => {
      tasksSubscription.unsubscribe();
      activitiesSubscription.unsubscribe();
    };
  }, [meetingId, initialData]);

  async function fetchMeetingData() {
    // Fetch profiles once for all lookups (no FK constraints exist in the DB)
    const { data: allProfiles } = await supabase
      .from('people')
      .select('id, name, division, rank');
    
    const profileMap = new Map<string, ProfileInfo>();
    (allProfiles || []).forEach((p: any) => profileMap.set(p.id, { name: p.name, division: p.division, rank: p.rank }));
    profileMapRef.current = profileMap;

    await Promise.all([
      fetchMeeting(),
      fetchParticipantsWithMap(profileMap),
      fetchTasksWithMap(profileMap),
      fetchActivitiesWithMap(profileMap)
    ]);
    setLoading(false);
  }

  async function fetchMeeting() {
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', meetingId)
      .single();

    if (error) {
      console.error('Error fetching meeting:', error);
      return;
    }

    setMeeting(data as any);
  }

  async function fetchParticipantsWithMap(profileMap: Map<string, ProfileInfo>) {
    const { data, error } = await supabase
      .from('meeting_participants')
      .select('*')
      .eq('meeting_id', meetingId);

    if (error) {
      console.error('Error fetching participants:', error);
      return;
    }

    const mappedParticipants = (data || []).map((p: any) => ({
      ...p,
      user: profileMap.get(p.user_id) || null
    }));
    setParticipants(mappedParticipants as any);
  }

  async function fetchTasksWithMap(profileMap: Map<string, ProfileInfo>) {
    const { data, error } = await supabase
      .from('meeting_checklist_tasks')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching tasks:', error);
      return;
    }

    const mappedTasks = (data || []).map((t: any) => ({
      ...t,
      assignee: t.assigned_user_id ? profileMap.get(t.assigned_user_id) || null : null
    }));
    setTasks(mappedTasks as any);
  }

  async function fetchActivitiesWithMap(profileMap: Map<string, ProfileInfo>) {
    const { data, error } = await supabase
      .from('meeting_activities')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching activities:', error);
      return;
    }

    const mappedActivities = (data || []).map((a: any) => ({
      ...a,
      user: a.user_id ? profileMap.get(a.user_id) || null : null
    }));
    setActivities(mappedActivities as any);
  }

  async function toggleTask(taskId: string, currentStatus: boolean) {
    const { error } = await supabase
      .from('meeting_checklist_tasks')
      .update({ is_completed: !currentStatus })
      .eq('id', taskId);

    if (error) {
      console.error('Error updating task:', error);
      return;
    }

    await supabase.from('meeting_activities').insert({
      meeting_id: meetingId,
      user_id: currentUser?.id || null,
      activity_type: currentStatus ? 'task_created' : 'task_completed',
      content: currentStatus ? 'marked task as pending' : 'completed a task',
      metadata: { task_id: taskId },
    });

    fetchTasks();
    fetchActivities();
  }

  async function addTask() {
    if (!newTaskInput.trim()) return;

    const { error } = await supabase
      .from('meeting_checklist_tasks')
      .insert({
        meeting_id: meetingId,
        description: newTaskInput.trim(),
        is_completed: false,
      });

    if (error) {
      console.error('Error adding task:', error);
      return;
    }

    await supabase.from('meeting_activities').insert({
      meeting_id: meetingId,
      user_id: currentUser?.id || null,
      activity_type: 'task_created',
      content: 'added a new task',
      metadata: {},
    });

    setNewTaskInput('');
    fetchTasks();
    fetchActivities();
  }

  async function postActivity() {
    if (!commentInput.trim()) return;

    const { error } = await supabase
      .from('meeting_activities')
      .insert({
        meeting_id: meetingId,
        user_id: currentUser?.id || null,
        activity_type: 'comment_added',
        content: commentInput.trim(),
        metadata: {},
      });

    if (error) {
      console.error('Error posting activity:', error);
      return;
    }

    setCommentInput('');
    fetchActivities();
  }

  const handleCopyLink = async () => {
    try {
      const meetingUrl = `${window.location.origin}/meetings/${meetingId}`;
      await navigator.clipboard.writeText(meetingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (loading) {
    return (
      <div className="max-w-[1280px] mx-auto pb-24 flex flex-col pt-8 space-y-8 px-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="max-w-[1280px] mx-auto pb-24 flex flex-col pt-8 space-y-8 px-8">
        <div className="text-center text-text-tertiary">Meeting not found</div>
      </div>
    );
  }

  // Memoize expensive computations
  const completedTasks = useMemo(() => tasks.filter(t => t.is_completed).length, [tasks]);
  const progress = useMemo(() => tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0, [tasks.length, completedTasks]);
  const formattedDate = useMemo(() => new Date(meeting.date).toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }), [meeting.date]);

  const getInitials = useMemo(() => (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  }, []);

  const getTaskDueDateLabel = (due_days_before: number | null, meetingDate: string): { label: string; isOverdue: boolean; isToday: boolean } | null => {
    if (due_days_before === null) return null;
    const d = new Date(meetingDate + 'T00:00:00');
    d.setDate(d.getDate() - due_days_before);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueMs = d.getTime();
    const todayMs = today.getTime();
    const isOverdue = dueMs < todayMs;
    const isToday = dueMs === todayMs;
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return { label, isOverdue, isToday };
  };

  const getStatusColor = useMemo(() => (status: string | null) => {
    switch (status) {
      case 'accepted':
        return 'bg-mint text-status-green';
      case 'declined':
        return 'bg-coral-bg text-coral-text';
      case 'tentative':
        return 'bg-amber text-status-amber';
      default:
        return 'bg-status-grey-bg text-text-secondary';
    }
  }, []);

  return (
    <div className="max-w-[1280px] mx-auto pb-24 flex flex-col pt-8 space-y-8 px-8">
      {/* Header */}
      <div className="flex items-start justify-between shrink-0">
        <div className="flex flex-col gap-3">
          <Link href="/" className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          
          <h1 className="text-4xl font-bold tracking-tight text-text-primary font-literata">
            {meeting.title}
          </h1>
          
          {meeting.description && (
            <p className="text-base text-text-secondary max-w-2xl">
              {meeting.description}
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleCopyLink}
            className={cn(
              "px-5 py-2.5 border rounded-full text-sm font-medium transition-all flex items-center gap-2",
              copied
                ? "bg-mint border-status-green text-status-green"
                : "bg-board border-border text-text-primary hover:bg-surface"
            )}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
          
          <button className="px-5 py-2.5 bg-primary text-white rounded-full text-sm font-medium shadow-md transition-all active:scale-95 hover:bg-primary/90 flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Send Invites
          </button>
          
          <button 
            onClick={() => setIsDeleteModalOpen(true)}
            className="px-5 py-2.5 bg-coral-bg text-coral-text border border-coral-text/30 rounded-full text-sm font-medium transition-all active:scale-95 hover:bg-coral-text/10 flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Meeting Info Cards */}
      <div className="grid grid-cols-4 gap-6 shrink-0">
        <div className="bg-white border border-border/30 rounded-3xl p-6 flex flex-col gap-3">
          <div className="h-11 w-11 rounded-full bg-status-green-bg/30 flex items-center justify-center">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-xs tracking-wide text-text-tertiary uppercase font-light mb-1">Date</h3>
            <p className="text-base font-bold text-text-primary">{formattedDate}</p>
          </div>
        </div>

        <div className="bg-white border border-border/30 rounded-3xl p-6 flex flex-col gap-3">
          <div className="h-11 w-11 rounded-full bg-amber/30 flex items-center justify-center">
            <Clock className="h-5 w-5 text-status-amber" />
          </div>
          <div>
            <h3 className="text-xs tracking-wide text-text-tertiary uppercase font-light mb-1">Time</h3>
            <p className="text-base font-bold text-text-primary">
              {meeting.start_time?.slice(0, 5) || 'TBD'} — {meeting.end_time?.slice(0, 5) || 'TBD'}
            </p>
          </div>
        </div>

        <div className="bg-white border border-border/30 rounded-3xl p-6 flex flex-col gap-3">
          <div className="h-11 w-11 rounded-full bg-board flex items-center justify-center border border-border/20">
            <Users className="h-5 w-5 text-text-secondary" />
          </div>
          <div>
            <h3 className="text-xs tracking-wide text-text-tertiary uppercase font-light mb-1">Attendees</h3>
            <p className="text-base font-bold text-text-primary">{participants.length}</p>
          </div>
        </div>

        <div className="bg-white border border-border/30 rounded-3xl p-6 flex flex-col gap-3">
          <div className="h-11 w-11 rounded-full bg-mint/50 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5 text-status-green" />
          </div>
          <div>
            <h3 className="text-xs tracking-wide text-text-tertiary uppercase font-light mb-1">Progress</h3>
            <p className="text-base font-bold text-text-primary">{progress}%</p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-12 gap-8">
        {/* Left Column - Tasks & Participants */}
        <div className="col-span-8 flex flex-col gap-6">
          
          {/* Progress Bar */}
          <div className="bg-surface rounded-3xl p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-text-primary font-literata">
                Preparation Tasks
              </h3>
              <span className="text-sm font-medium text-text-secondary">
                {completedTasks} of {tasks.length} completed
              </span>
            </div>
            <div className="h-3 w-full bg-cream rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          {/* Tasks List */}
          <div className="bg-white border border-border/20 rounded-3xl shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-border/20 flex justify-between items-center bg-white">
              <h3 className="text-lg font-bold text-text-primary font-literata">
                Action Items
              </h3>
              <span className="text-xs text-text-tertiary">{tasks.length} tasks</span>
            </div>

            <div className="flex flex-col">
              {tasks.length === 0 ? (
                <div className="p-8 text-center text-text-tertiary">
                  No tasks yet. Add your first task below.
                </div>
              ) : (
                tasks.map((task) => (
                  <div 
                    key={task.id} 
                    className={cn(
                      "p-6 flex gap-4 transition-colors border-b last:border-b-0 border-border/10",
                      task.is_completed ? "bg-white/30" : "bg-transparent"
                    )}
                  >
                    <div 
                      className="pt-0.5 shrink-0 cursor-pointer"
                      onClick={() => toggleTask(task.id, task.is_completed)}
                    >
                      <div className={cn(
                        "w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all",
                        task.is_completed ? "bg-primary border-primary" : "border-text-tertiary hover:border-primary"
                      )}>
                        {task.is_completed && <Check className="h-4 w-4 text-white" strokeWidth={3} />}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 w-full">
                      <div className="flex justify-between items-start w-full">
                        <h4 className={cn(
                          "text-base font-bold text-text-primary font-literata",
                          task.is_completed && "line-through text-text-primary/60"
                        )}>
                          {task.description}
                        </h4>
                        <span className={cn(
                          "px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wide",
                          task.is_completed ? "bg-warm text-text-primary" : "bg-coral-bg text-coral-text"
                        )}>
                          {task.is_completed ? 'Done' : 'Pending'}
                        </span>
                      </div>

                      {(() => {
                        const due = getTaskDueDateLabel(task.due_days_before ?? null, meeting.date);
                        if (!due) return null;
                        return (
                          <div className={cn(
                            "flex items-center gap-1 mt-1",
                            task.is_completed ? "opacity-40" : ""
                          )}>
                            <Calendar className={cn(
                              "h-3 w-3 shrink-0",
                              due.isOverdue && !task.is_completed ? "text-coral-text" : due.isToday && !task.is_completed ? "text-status-amber" : "text-text-tertiary"
                            )} />
                            <span className={cn(
                              "text-[11px] font-medium",
                              due.isOverdue && !task.is_completed ? "text-coral-text" : due.isToday && !task.is_completed ? "text-status-amber" : "text-text-tertiary"
                            )}>
                              Due {due.label}{due.isOverdue && !task.is_completed ? ' · Overdue' : due.isToday && !task.is_completed ? ' · Today' : ''}
                            </span>
                          </div>
                        );
                      })()}

                      {task.assignee && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shadow-sm bg-mint text-status-green">
                            {getInitials(task.assignee.name)}
                          </span>
                          <span className="text-xs text-text-secondary">{task.assignee.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-status-grey-bg/20 border-t border-border/20">
              <div className="bg-white border border-border/50 rounded-full flex items-center gap-3 px-4 py-2 w-full">
                <Plus className="h-4 w-4 text-text-tertiary shrink-0" />
                <input 
                  type="text" 
                  placeholder="Add a new action item..."
                  className="flex-1 bg-transparent border-none focus:outline-none text-sm font-normal text-text-secondary placeholder:text-text-tertiary"
                  value={newTaskInput}
                  onChange={(e) => setNewTaskInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTask()}
                />
                <button 
                  onClick={addTask}
                  disabled={!newTaskInput.trim()}
                  className="px-3 py-1 font-bold text-xs text-primary transition-all hover:bg-primary/10 rounded-full disabled:opacity-50"
                >
                  SAVE
                </button>
              </div>
            </div>
          </div>

          {/* Participants */}
          <div className="bg-white border border-border/20 rounded-3xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border/20 bg-white">
              <h3 className="text-lg font-bold text-text-primary font-literata">
                Participants ({participants.length})
              </h3>
            </div>

            <div className="p-6">
              {participants.length === 0 ? (
                <div className="text-center text-text-tertiary py-4">
                  No participants added yet.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {participants.map((participant) => (
                    <div 
                      key={participant.id}
                      className="flex items-center gap-3 p-3 bg-surface rounded-2xl"
                    >
                      <div className="h-10 w-10 rounded-full bg-sage flex items-center justify-center text-white text-sm font-bold">
                        {participant.user ? getInitials(participant.user.name) : '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-text-primary truncate">
                          {participant.user?.name || 'Unknown'}
                        </p>
                        <p className="text-xs text-text-tertiary">
                          {participant.user?.division || 'No division'}
                        </p>
                      </div>
                      <span className={cn(
                        "px-2 py-1 rounded-lg text-[10px] font-bold uppercase",
                        getStatusColor(participant.status)
                      )}>
                        {participant.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Activity Feed */}
        <div className="col-span-4 flex flex-col gap-6">
          <div className="bg-white border border-border/20 rounded-3xl shadow-sm p-6 flex flex-col gap-6">
            
            <div className="flex flex-col gap-2">
              <div className="bg-status-grey-bg border border-border/20 rounded-2xl p-[5px]">
                <textarea 
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="Post to the activity stream"
                  className="w-full bg-transparent border-none p-3 resize-none outline-none text-sm text-text-secondary min-h-[50px]"
                />
              </div>
              <div className="flex justify-between items-center px-1 mt-1 gap-2">
                <button 
                  onClick={() => setCommentInput('')}
                  className="flex-1 py-2 text-sm font-bold text-coral-text border border-primary/20 rounded-2xl hover:bg-coral-text/5 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={postActivity}
                  disabled={!commentInput.trim()}
                  className="flex-1 py-2 text-sm font-bold text-primary border border-primary/20 rounded-2xl hover:bg-primary/5 transition-colors disabled:opacity-50"
                >
                  Post
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <MessageSquare className="h-4 w-4 text-text-primary" strokeWidth={2.5}/>
              <h3 className="text-lg font-bold text-text-primary font-literata">
                Activity Stream
              </h3>
            </div>
            
            <div className="flex flex-col gap-8 relative pb-2 pt-1 pl-1">
              <div className="absolute left-[17px] top-6 bottom-4 w-0.5 bg-border/20"></div>

              {activities.length === 0 ? (
                <div className="text-sm text-text-tertiary">No activities yet.</div>
              ) : (
                activities.map((activity) => (
                  <div key={activity.id} className="flex gap-4 relative">
                    <div className="relative shrink-0 z-10 w-9 -ml-1 h-9 rounded-full bg-white border-2 border-white flex items-center justify-center p-0.5 shadow-sm">
                      {activity.user ? (
                        <div className="w-full h-full bg-mint rounded-full flex items-center justify-center text-xs font-bold text-status-green">
                          {getInitials(activity.user.name)}
                        </div>
                      ) : (
                        <div className="w-full h-full bg-sage rounded-full flex items-center justify-center text-white">
                          <FileText className="h-3 w-3" strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col w-full -mt-0.5 text-sm">
                      <p className="text-text-primary leading-snug">
                        {activity.user ? (
                          <span className="font-bold">{activity.user.name}</span>
                        ) : (
                          <span className="font-bold">System</span>
                        )}{' '}
                        <span className="font-normal">{activity.content}</span>
                      </p>
                      <span className="text-[10px] font-bold uppercase text-text-tertiary mt-1">
                        {new Date(activity.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button className="w-full py-2.5 text-sm font-bold text-primary border border-primary/20 rounded-2xl hover:bg-surface transition-colors mt-2">
              View Full History
            </button>
          </div>

          <div className="bg-white border border-border/20 rounded-3xl overflow-hidden shadow-sm flex flex-col relative h-[220px]">
            <div className="h-[128px] w-full bg-taupe relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;utf8,<svg width=\'400\' height=\'200\' viewBox=\'0 0 400 200\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'><rect width=\'400\' height=\'200\' fill=\'%23E5E7EB\'/><path d=\'M0 50L400 150M0 100L400 200M0 150L400 250\' stroke=\'%23D1D5DB\' stroke-width=\'4\'/><path d=\'M100 0L200 200M200 0L300 200M300 0L400 200\' stroke=\'%23D1D5DB\' stroke-width=\'4\'/></svg>')] bg-cover bg-center mix-blend-multiply opacity-50"></div>
              
              <div className="absolute inset-x-0 bottom-4 flex justify-center">
                <div className="w-10 h-14 bg-white/30 backdrop-blur-sm shadow flex items-center justify-center rounded-t-full rounded-b-[4px] relative -bottom-2 z-10 border border-white/50">
                  <div className="w-6 h-6 rounded-full bg-white/80 shadow-inner flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-primary/40"></div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 flex flex-col gap-1 z-20 bg-white relative">
              <h4 className="text-sm font-bold text-text-primary font-literata">
                Meeting Venue
              </h4>
              <p className="text-xs font-normal text-text-secondary">
                {roomBooking?.room?.name || 'No venue assigned'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Meeting Modal */}
      {meeting && (
        <DeleteMeetingModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          meetingId={meeting.id}
          seriesId={meeting.series_id}
          meetingDate={meeting.date}
          meetingTitle={meeting.title}
          onSuccess={() => {
            router.push('/');
          }}
        />
      )}
    </div>
  );
}

// Export memoized version to prevent unnecessary re-renders
export const MeetingDetailClient = memo(MeetingDetailClientComponent);
