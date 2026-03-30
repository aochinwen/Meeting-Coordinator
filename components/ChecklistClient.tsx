'use client';

import { useState, useEffect } from 'react';
import { 
  ChevronRight, ArrowUpRight, CheckCircle2, Calendar, Users,
  MessageSquare, MoreHorizontal, FileText, Check, Plus,
  Send, CornerDownRight, AlertTriangle, Eye 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';

interface ChecklistClientProps {
  meetingId: string;
  currentUser?: User;
}

interface Task {
  id: string;
  description: string;
  assigned_user_id: string | null;
  is_completed: boolean;
  created_at: string;
  assignee?: {
    name: string;
    initials: string;
  };
}

interface Activity {
  id: string;
  user_id: string | null;
  activity_type: string;
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
  user?: {
    name: string;
    initials: string;
  };
}

export function ChecklistClient({ meetingId, currentUser }: ChecklistClientProps) {
  const supabase = createClient();
  const [filter, setFilter] = useState<'All' | 'Pending'>('All');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentInput, setCommentInput] = useState('');
  const [newTaskInput, setNewTaskInput] = useState('');

  // Fetch tasks and activities on mount
  useEffect(() => {
    fetchTasks();
    fetchActivities();
    
    // Subscribe to real-time changes
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
  }, [meetingId]);

  async function fetchTasks() {
    const { data, error } = await supabase
      .from('meeting_checklist_tasks')
      .select(`
        *,
        assignee:users(name)
      `)
      .eq('meeting_id', meetingId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching tasks:', error);
      return;
    }

    const tasksWithAssignees = (data || []).map((task: any) => ({
      ...task,
      assignee: task.assignee ? {
        name: task.assignee.name,
        initials: task.assignee.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
      } : null,
    }));

    setTasks(tasksWithAssignees);
    setLoading(false);
  }

  async function fetchActivities() {
    const { data, error } = await supabase
      .from('meeting_activities')
      .select(`
        *,
        user:users(name)
      `)
      .eq('meeting_id', meetingId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching activities:', error);
      return;
    }

    const activitiesWithUsers = (data || []).map((activity: any) => ({
      ...activity,
      user: activity.user ? {
        name: activity.user.name,
        initials: activity.user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
      } : null,
    }));

    setActivities(activitiesWithUsers);
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

    // Log activity
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

    // Log activity
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

  const completedCount = tasks.filter(t => t.is_completed).length;
  const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const filteredTasks = filter === 'All' 
    ? tasks 
    : tasks.filter(t => !t.is_completed);

  if (loading) {
    return (
      <div className="max-w-[1280px] mx-auto pb-24 h-full flex flex-col pt-8 space-y-8 pl-8 pr-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1280px] mx-auto pb-24 h-full flex flex-col pt-8 space-y-8 pl-8 pr-8">
      {/* Header */}
      <div className="flex items-end justify-between shrink-0">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm text-text-secondary font-medium">
            <span>Projects</span>
            <ChevronRight className="h-4 w-4 shrink-0" />
            <span>Corporate Reviews</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-text-primary mt-1 font-literata">
            Coordination Checklist
          </h1>
          <p className="text-lg font-medium text-text-secondary mt-1">
            Meeting ID: {meetingId}
          </p>
        </div>

        <div className="flex gap-4">
          <button className="px-6 py-2.5 border border-border bg-board text-primary rounded-full text-base font-bold hover:bg-surface transition-all active:scale-95">
            Export PDF
          </button>
          <button className="px-6 py-2.5 bg-primary text-white rounded-full text-base font-bold shadow-md transition-all active:scale-95 hover:bg-primary/90">
            Share Checklist
          </button>
        </div>
      </div>

      {/* Top Overview Stats */}
      <div className="grid grid-cols-3 gap-6 shrink-0 pt-4">
        {/* Completion */}
        <div className="bg-status-grey-bg border border-border/30 rounded-3xl p-6 flex justify-between items-center h-[114px]">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-text-secondary tracking-wide uppercase mb-1">Completion</span>
            <span className="text-3xl font-bold text-primary">{progress}%</span>
          </div>
          <div className="h-16 w-16 rounded-full border-4 border-primary flex items-center justify-center bg-transparent">
            <CheckCircle2 className="h-6 w-6 text-primary" strokeWidth={3} />
          </div>
        </div>

        {/* Due Date */}
        <div className="bg-amber border border-amber-border/30 rounded-3xl p-6 flex justify-between items-center h-[114px]">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-text-primary tracking-wide uppercase mb-1">Tasks</span>
            <span className="text-3xl font-bold text-status-amber">{tasks.length}</span>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-white/50 flex items-center justify-center">
            <Calendar className="h-5 w-5 text-status-amber" strokeWidth={2.5} />
          </div>
        </div>

        {/* Collaborators */}
        <div className="bg-mint border border-sage/30 rounded-3xl p-6 flex justify-between items-center h-[114px]">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-status-green tracking-wide uppercase mb-2">Completed</span>
            <div className="flex -space-x-2">
              <div className="h-8 w-8 rounded-full border-2 border-white bg-primary flex items-center justify-center text-white text-[10px] font-bold">
                {completedCount}
              </div>
            </div>
          </div>
          <div className="h-16 w-8 flex items-center justify-center">
             <Users className="h-6 w-6 text-status-green opacity-70" />
          </div>
        </div>
      </div>

      {/* Main Grid: Left Checklist, Right Activity & Map */}
      <div className="grid grid-cols-12 gap-8 shrink-0 pb-16">
        
        {/* Left Column - Checklist */}
        <div className="col-span-8 flex flex-col gap-6">
          
          {/* Progress Bar Detail */}
          <div className="bg-surface rounded-3xl p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-text-primary font-literata">
                Preparation Tasks
              </h3>
              <span className="text-sm font-medium text-text-secondary">
                {completedCount} of {tasks.length} completed
              </span>
            </div>
            <div className="h-3 w-full bg-cream rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          {/* Action Items List */}
          <div className="bg-white border border-border/20 rounded-3xl shadow-sm overflow-hidden flex flex-col">
            
            {/* Header Tabs */}
            <div className="px-6 py-4 border-b border-border/20 flex justify-between items-center bg-white">
              <h3 className="text-lg font-bold text-text-primary font-literata">
                Action Items
              </h3>
              <div className="flex gap-2">
                <button 
                  onClick={() => setFilter('All')}
                  className={cn(
                    "px-3 py-1 text-xs font-bold rounded-full transition-colors",
                    filter === 'All' ? "bg-status-grey-bg text-text-secondary" : "text-text-tertiary hover:bg-status-grey-bg/50"
                  )}
                >
                  All
                </button>
                <button 
                  onClick={() => setFilter('Pending')}
                  className={cn(
                    "px-3 py-1 text-xs font-bold rounded-full transition-colors",
                    filter === 'Pending' ? "bg-status-grey-bg text-text-secondary" : "text-text-tertiary hover:bg-status-grey-bg/50"
                  )}
                >
                  Pending
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex flex-col relative w-full">
              {filteredTasks.length === 0 ? (
                <div className="p-8 text-center text-text-tertiary">
                  No tasks yet. Add your first task below.
                </div>
              ) : (
                filteredTasks.map((task) => (
                  <div 
                    key={task.id} 
                    className={cn(
                      "p-6 flex gap-4 transition-colors border-b last:border-b-0 border-border/10 relative",
                      task.is_completed ? "bg-white/30" : "bg-transparent"
                    )}
                  >
                    {/* Custom Checkbox */}
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

                    {/* Task Content */}
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

                      {task.assignee && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className={cn(
                            "inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shadow-sm",
                            "bg-mint text-status-green"
                          )}>
                            {task.assignee.initials}
                          </span>
                          <span className="text-xs text-text-secondary">{task.assignee.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add Task Input */}
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
        </div>

        {/* Right Column - Streams & Map */}
        <div className="col-span-4 flex flex-col gap-6">
          
          {/* Post and Activity Stream Container */}
          <div className="bg-white border border-border/20 rounded-3xl shadow-sm p-6 flex flex-col gap-6">
            
            {/* Input Block */}
            <div className="flex flex-col gap-2 relative z-10 p-1">
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

            {/* Header */}
            <div className="flex items-center gap-2 mt-2">
              <MessageSquare className="h-4 w-4 text-text-primary uppercase" strokeWidth={2.5}/>
              <h3 className="text-lg font-bold text-text-primary font-literata">
                Activity Stream
              </h3>
            </div>
            
            {/* Thread */}
            <div className="flex flex-col gap-8 relative pb-2 pt-1 pl-1">
              {/* Vertical line connecting threads */}
              <div className="absolute left-[17px] top-6 bottom-4 w-0.5 bg-border/20"></div>

              {activities.length === 0 ? (
                <div className="text-sm text-text-tertiary">No activities yet.</div>
              ) : (
                activities.map((activity) => (
                  <div key={activity.id} className="flex gap-4 relative">
                    {/* Avatar / Icon Badge */}
                    <div className="relative shrink-0 z-10 w-9 -ml-1 h-9 rounded-full bg-white border-2 border-white flex items-center justify-center p-0.5 shadow-sm">
                      {activity.user ? (
                        <div className="w-full h-full bg-mint rounded-full flex items-center justify-center text-xs font-bold text-status-green">
                          {activity.user.initials}
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

          {/* Location Map Card */}
          <div className="bg-white border border-border/20 rounded-3xl overflow-hidden shadow-sm flex flex-col relative h-[220px]">
             {/* Map Image Base */}
             <div className="h-[128px] w-full bg-taupe relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;utf8,<svg width=\'400\' height=\'200\' viewBox=\'0 0 400 200\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'><rect width=\'400\' height=\'200\' fill=\'%23E5E7EB\'/><path d=\'M0 50L400 150M0 100L400 200M0 150L400 250\' stroke=\'%23D1D5DB\' stroke-width=\'4\'/><path d=\'M100 0L200 200M200 0L300 200M300 0L400 200\' stroke=\'%23D1D5DB\' stroke-width=\'4\'/></svg>')] bg-cover bg-center mix-blend-multiply opacity-50"></div>
                
                {/* Pin Placeholder */}
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
                 North Wing, Room 402 - Main Campus
               </p>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
