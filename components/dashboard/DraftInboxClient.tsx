'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { format, parseISO } from 'date-fns';
import { Calendar, Clock, Mail, CheckCircle2, XCircle, AlertCircle, RefreshCw, UserPlus, Pencil, Trash2, Check, X, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PeoplePicker } from '@/components/ui/PeoplePicker';

type DraftInboxClientProps = {
  initialMeetings: Record<string, any>[];
  people: Record<string, any>[];
};

export default function DraftInboxClient({ initialMeetings, people }: DraftInboxClientProps) {
  const [meetings, setMeetings] = useState(initialMeetings);
  const [loading, setLoading] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState('');
  const [editingDueDate, setEditingDueDate] = useState<string>('');
  const [editingAssignees, setEditingAssignees] = useState<string[]>([]);
  const [newTaskMeetingId, setNewTaskMeetingId] = useState<string | null>(null);
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState<string>('');
  const [newTaskAssignees, setNewTaskAssignees] = useState<string[]>([]);

  const router = useRouter();
  const supabase = createClient();

  const calculateDueDaysBefore = (absoluteDateStr: string, meetingDateStr: string): number | null => {
    if (!absoluteDateStr || !meetingDateStr) return null;
    const meetingDate = new Date(meetingDateStr + 'T00:00:00');
    const dueDate = new Date(absoluteDateStr + 'T00:00:00');
    const diffMs = meetingDate.getTime() - dueDate.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    return diffDays >= 0 ? diffDays : null;
  };

  const getAbsoluteDueDate = (due_days_before: number | null, meetingDateStr: string): string => {
    if (due_days_before === null || !meetingDateStr) return '';
    const d = new Date(meetingDateStr + 'T00:00:00');
    d.setDate(d.getDate() - due_days_before);
    return d.toISOString().split('T')[0];
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const handleApprove = async (meeting: Record<string, any>) => {
    setLoading(meeting.id as string);
    const draftData = meeting.draft_data as Record<string, any> || {};
    
    try {
      if (draftData.is_cancellation) {
        // Handle Cancellation
        await supabase.from('meetings').update({
          status: 'cancelled',
          draft_data: {}
        }).eq('id', meeting.id);
      } else if (draftData.is_update) {
        // Handle Update
        const updates = draftData.proposed_changes || {};
        await supabase.from('meetings').update({
          title: updates.title || meeting.title,
          date: updates.date || meeting.date,
          start_time: updates.start_time || meeting.start_time,
          end_time: updates.end_time || meeting.end_time,
          description: updates.description || meeting.description,
          status: 'scheduled',
          draft_data: {}
        }).eq('id', meeting.id);
      } else {
        // Handle New Draft
        await supabase.from('meetings').update({
          status: 'scheduled',
          draft_data: {}
        }).eq('id', meeting.id);
        
        // Match emails to directory to insert participants
        const toEmails = draftData.to_emails || [];
        const fromEmail = draftData.from_email;
        const allEmails = [...new Set([...toEmails, fromEmail].filter(Boolean))];
        
        const matchedPeople = people.filter(p => p.email && allEmails.includes(p.email));
        if (matchedPeople.length > 0) {
          const participantsToInsert = matchedPeople.map(p => ({
            meeting_id: meeting.id as string,
            user_id: p.id as string,
            status: 'accepted'
          }));
          await supabase.from('meeting_participants').insert(participantsToInsert);
        }
      }
      
      setMeetings(prev => prev.filter(m => m.id !== meeting.id));
      router.refresh();
    } catch (err) {
      console.error("Failed to approve", err);
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async (meeting: Record<string, any>) => {
    setLoading(meeting.id as string);
    try {
      if (meeting.status === 'draft') {
        // If it's a pure draft, delete it entirely (cascades tasks)
        await supabase.from('meetings').delete().eq('id', meeting.id);
      } else {
        // If it's just an update/cancel request for an existing meeting, just clear draft_data
        await supabase.from('meetings').update({ draft_data: {} }).eq('id', meeting.id);
      }
      setMeetings(prev => prev.filter(m => m.id !== meeting.id));
      router.refresh();
    } catch (err) {
      console.error("Failed to reject", err);
    } finally {
      setLoading(null);
    }
  };

  const handleQuickAdd = async (email: string) => {
    // A quick way to add a person to the directory if missing
    try {
      const namePart = email.split('@')[0];
      const name = namePart.charAt(0).toUpperCase() + namePart.slice(1).replace(/\./g, ' ');
      
      const { data, error } = await supabase.from('people').insert({
        name: name,
        email: email
      }).select().single();
      
      if (!error && data) {
        // Refresh the page data so they show up as mapped
        router.refresh();
        alert(`${email} added to directory!`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveTask = async (taskId: string, meetingDate: string) => {
    if (!editingDescription.trim()) return;
    const due_days_before = calculateDueDaysBefore(editingDueDate, meetingDate);
    
    try {
      const { error } = await supabase
        .from('meeting_checklist_tasks')
        .update({ description: editingDescription.trim(), due_days_before })
        .eq('id', taskId);
        
      if (error) throw error;

      await supabase.from('meeting_task_assignees').delete().eq('task_id', taskId);
      if (editingAssignees.length > 0) {
        await supabase.from('meeting_task_assignees').insert(
          editingAssignees.map(person_id => ({ task_id: taskId, person_id }))
        );
      }
      
      setMeetings(prev => prev.map(m => ({
        ...m,
        meeting_checklist_tasks: (m.meeting_checklist_tasks || []).map((t: any) => 
          t.id === taskId ? { 
            ...t, 
            description: editingDescription.trim(),
            due_days_before,
            meeting_task_assignees: editingAssignees.map(id => ({ person_id: id }))
          } : t
        )
      })));
      setEditingTaskId(null);
    } catch (err) {
      console.error("Failed to save task", err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
      const { error } = await supabase
        .from('meeting_checklist_tasks')
        .delete()
        .eq('id', taskId);
        
      if (error) throw error;
      
      setMeetings(prev => prev.map(m => ({
        ...m,
        meeting_checklist_tasks: (m.meeting_checklist_tasks || []).map((t: any) => 
          t.id === taskId ? null : t
        ).filter(Boolean)
      })));
    } catch (err) {
      console.error("Failed to delete task", err);
    }
  };

  const handleAddTask = async (meetingId: string, meetingDate: string) => {
    if (!newTaskDescription.trim()) return;
    const due_days_before = calculateDueDaysBefore(newTaskDueDate, meetingDate);
    
    try {
      const { data, error } = await supabase
        .from('meeting_checklist_tasks')
        .insert({
          meeting_id: meetingId,
          description: newTaskDescription.trim(),
          due_days_before,
          is_completed: false
        })
        .select()
        .single();
        
      if (error) throw error;

      if (newTaskAssignees.length > 0) {
        await supabase.from('meeting_task_assignees').insert(
          newTaskAssignees.map(person_id => ({ task_id: data.id, person_id }))
        );
      }
      
      const newTaskWithAssignees = {
        ...data,
        meeting_task_assignees: newTaskAssignees.map(id => ({ person_id: id }))
      };
      
      setMeetings(prev => prev.map(m => {
        if (m.id === meetingId) {
          return {
            ...m,
            meeting_checklist_tasks: [...(m.meeting_checklist_tasks || []), newTaskWithAssignees]
          };
        }
        return m;
      }));
      setNewTaskDescription('');
      setNewTaskDueDate('');
      setNewTaskAssignees([]);
      setNewTaskMeetingId(null);
    } catch (err) {
      console.error("Failed to add task", err);
    }
  };

  if (meetings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-text-tertiary">
        <Mail className="w-16 h-16 mb-4 opacity-20" />
        <p className="text-lg">No pending inbox items</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {meetings.map(meeting => {
        const draftData = meeting.draft_data || {};
        const isUpdate = draftData.is_update;
        const isCancel = draftData.is_cancellation;
        const proposedChanges = draftData.proposed_changes || {};
        const tasks = meeting.meeting_checklist_tasks || [];
        
        let typeLabel = "New Draft";
        let TypeIcon = AlertCircle;
        let iconColor = "text-blue-500";
        let bgColor = "bg-blue-50";
        let borderColor = "border-blue-100";

        if (isCancel) {
          typeLabel = "Cancellation Request";
          TypeIcon = XCircle;
          iconColor = "text-red-500";
          bgColor = "bg-red-50";
          borderColor = "border-red-100";
        } else if (isUpdate) {
          typeLabel = "Reschedule / Update Request";
          TypeIcon = RefreshCw;
          iconColor = "text-orange-500";
          bgColor = "bg-orange-50";
          borderColor = "border-orange-100";
        }

        const displayTitle = isUpdate ? proposedChanges.title || meeting.title : meeting.title;
        const displayDate = isUpdate ? proposedChanges.date || meeting.date : meeting.date;
        const displayStart = isUpdate ? proposedChanges.start_time || meeting.start_time : meeting.start_time;
        const displayEnd = isUpdate ? proposedChanges.end_time || meeting.end_time : meeting.end_time;
        
        // Find unmapped emails
        const toEmails = draftData.to_emails || [];
        const fromEmail = draftData.from_email;
        const allEmails = [...new Set([...toEmails, fromEmail].filter(Boolean))] as string[];
        const unmappedEmails = allEmails.filter(e => !people.some(p => p.email === e));

        return (
          <div key={meeting.id} className={`rounded-2xl border ${borderColor} bg-white shadow-sm overflow-hidden`}>
            <div className={`px-6 py-3 flex items-center justify-between border-b ${borderColor} ${bgColor}`}>
              <div className="flex items-center gap-2">
                <TypeIcon className={`w-5 h-5 ${iconColor}`} />
                <span className={`font-medium ${iconColor}`}>{typeLabel}</span>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleReject(meeting)}
                  disabled={loading === meeting.id}
                  className="px-4 py-1.5 text-sm font-medium text-text-secondary hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  Reject
                </button>
                <button 
                  onClick={() => handleApprove(meeting)}
                  disabled={loading === meeting.id}
                  className="px-4 py-1.5 text-sm font-medium bg-primary text-white hover:bg-primary/90 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  Approve
                </button>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-text-primary mb-1">{displayTitle}</h3>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-text-secondary">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      {displayDate ? format(parseISO(displayDate), 'MMM d, yyyy') : 'No Date'}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      {displayStart?.substring(0,5)} - {displayEnd?.substring(0,5)}
                    </div>
                  </div>
                </div>

                {isUpdate && (
                  <div className="p-4 bg-orange-50/50 rounded-xl border border-orange-100 text-sm">
                    <p className="font-medium text-orange-800 mb-1">Changes detected:</p>
                    <ul className="list-disc pl-4 text-orange-700 space-y-1">
                      {proposedChanges.title && proposedChanges.title !== meeting.title && <li>Title changed</li>}
                      {proposedChanges.date && proposedChanges.date !== meeting.date && <li>Date changed from {meeting.date} to {proposedChanges.date}</li>}
                      {proposedChanges.start_time && proposedChanges.start_time !== meeting.start_time && <li>Time changed</li>}
                    </ul>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-medium text-text-primary mb-2">Description</h4>
                  <p className="text-sm text-text-secondary bg-surface p-4 rounded-xl whitespace-pre-wrap">
                    {isUpdate ? proposedChanges.description || meeting.description : meeting.description}
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-text-primary">Action Items {tasks.length > 0 && `(${tasks.length})`}</h4>
                    <button 
                      onClick={() => {
                        setNewTaskMeetingId(meeting.id as string);
                        setEditingTaskId(null);
                      }}
                      className="text-xs font-bold text-primary hover:text-primary/80 transition-colors flex items-center gap-1 bg-primary/5 px-2 py-1 rounded-lg"
                    >
                      <Plus className="w-3.5 h-3.5" /> ADD TASK
                    </button>
                  </div>
                  
                  {tasks.length > 0 || newTaskMeetingId === meeting.id ? (
                    <ul className="space-y-4">
                      {tasks.map((task: Record<string, any>) => (
                        <li key={task.id} className="group flex items-start gap-3 text-sm text-text-secondary bg-surface p-3.5 rounded-2xl border border-transparent hover:border-border hover:bg-white hover:shadow-sm transition-all">
                          <CheckCircle2 className="w-4 h-4 mt-1 text-primary shrink-0" />
                          {editingTaskId === task.id ? (
                            <div className="flex-1 space-y-3">
                              <textarea
                                autoFocus
                                value={editingDescription}
                                onChange={(e) => setEditingDescription(e.target.value)}
                                className="w-full bg-white border border-primary/30 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[100px] leading-relaxed"
                                placeholder="Describe the task..."
                              />
                              
                              <div className="flex flex-col sm:flex-row gap-3 py-2 border-y border-border/30">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-text-tertiary" />
                                  <input
                                    type="date"
                                    value={editingDueDate}
                                    onChange={(e) => setEditingDueDate(e.target.value)}
                                    className="text-xs bg-transparent border-none focus:outline-none text-text-secondary cursor-pointer"
                                  />
                                </div>
                                <div className="flex-1">
                                  <PeoplePicker
                                    people={people}
                                    value={editingAssignees}
                                    onChange={setEditingAssignees}
                                    multiple
                                    placeholder="Add assignees..."
                                    compact
                                  />
                                </div>
                              </div>

                              <div className="flex justify-end gap-2">
                                <button 
                                  onClick={() => setEditingTaskId(null)}
                                  className="px-3 py-1.5 text-xs font-bold text-text-tertiary hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1"
                                >
                                  <X className="w-3.5 h-3.5" /> CANCEL
                                </button>
                                <button 
                                  onClick={() => handleSaveTask(task.id, meeting.date)}
                                  className="px-3 py-1.5 text-xs font-bold bg-primary text-white hover:bg-primary/90 rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                                >
                                  <Check className="w-3.5 h-3.5" /> SAVE TASK
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex-1 flex items-start justify-between gap-3">
                              <div className="flex flex-col gap-1.5">
                                <span className="leading-relaxed pt-0.5">{task.description}</span>
                                {(() => {
                                  const absoluteDueDate = getAbsoluteDueDate(task.due_days_before ?? null, meeting.date);
                                  const assignees = (task.meeting_task_assignees || []).map((a: any) => 
                                    people.find(p => p.id === a.person_id)
                                  ).filter(Boolean);
                                  
                                  if (!absoluteDueDate && assignees.length === 0) return null;
                                  
                                  return (
                                    <div className="flex flex-wrap items-center gap-3">
                                      {absoluteDueDate && (
                                        <div className="flex items-center gap-1.5 text-[11px] text-text-tertiary">
                                          <Calendar className="w-3 h-3" />
                                          <span>Due {format(parseISO(absoluteDueDate), 'MMM d, yyyy')}</span>
                                        </div>
                                      )}
                                      
                                      {assignees.length > 0 && (
                                        <div className="flex -space-x-1">
                                          {assignees.slice(0, 4).map((a: any) => (
                                            <span
                                              key={a.id}
                                              className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shadow-sm bg-mint text-status-green border border-white"
                                              title={a.name}
                                            >
                                              {getInitials(a.name)}
                                            </span>
                                          ))}
                                          {assignees.length > 4 && (
                                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold bg-cream text-text-primary border border-white">
                                              +{assignees.length - 4}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-1 group-hover:translate-x-0 mt-0.5">
                                <button 
                                  onClick={() => { 
                                    setEditingTaskId(task.id); 
                                    setEditingDescription(task.description); 
                                    setEditingDueDate(getAbsoluteDueDate(task.due_days_before ?? null, meeting.date));
                                    setEditingAssignees((task.meeting_task_assignees || []).map((a: any) => a.person_id));
                                    setNewTaskMeetingId(null); 
                                  }}
                                  className="p-1.5 text-text-tertiary hover:bg-gray-100 rounded-lg transition-colors"
                                  title="Edit task"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="p-1.5 text-text-tertiary hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors"
                                  title="Delete task"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          )}
                        </li>
                      ))}
                      
                      {newTaskMeetingId === meeting.id && (
                        <li className="flex items-start gap-3 text-sm text-text-secondary bg-white p-3.5 rounded-2xl border-2 border-primary/20 shadow-md animate-in fade-in slide-in-from-top-1 duration-200">
                          <Plus className="w-4 h-4 mt-1 text-primary shrink-0" />
                          <div className="flex-1 space-y-3">
                            <textarea
                              autoFocus
                              value={newTaskDescription}
                              onChange={(e) => setNewTaskDescription(e.target.value)}
                              className="w-full bg-transparent border-none p-0 text-sm focus:outline-none min-h-[80px] leading-relaxed"
                              placeholder="Type new task description..."
                            />
                            
                            <div className="flex flex-col sm:flex-row gap-3 py-2 border-y border-border/30">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-text-tertiary" />
                                <input
                                  type="date"
                                  value={newTaskDueDate}
                                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                                  className="text-xs bg-transparent border-none focus:outline-none text-text-secondary cursor-pointer"
                                />
                              </div>
                              <div className="flex-1">
                                <PeoplePicker
                                  people={people}
                                  value={newTaskAssignees}
                                  onChange={setNewTaskAssignees}
                                  multiple
                                  placeholder="Add assignees..."
                                  compact
                                />
                              </div>
                            </div>

                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => { 
                                  setNewTaskMeetingId(null); 
                                  setNewTaskDescription(''); 
                                  setNewTaskDueDate('');
                                  setNewTaskAssignees([]);
                                }}
                                className="px-3 py-1.5 text-xs font-bold text-text-tertiary hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1"
                              >
                                <X className="w-3.5 h-3.5" /> CANCEL
                              </button>
                              <button 
                                onClick={() => handleAddTask(meeting.id as string, meeting.date)}
                                disabled={!newTaskDescription.trim()}
                                className="px-3 py-1.5 text-xs font-bold bg-primary text-white hover:bg-primary/90 rounded-lg transition-colors flex items-center gap-1 shadow-sm disabled:opacity-50"
                              >
                                <Check className="w-3.5 h-3.5" /> ADD TASK
                              </button>
                            </div>
                          </div>
                        </li>
                      )}
                    </ul>
                  ) : (
                    <div className="text-sm text-text-tertiary italic p-6 bg-surface rounded-2xl border border-dashed border-border/60 flex flex-col items-center justify-center gap-3">
                      <CheckCircle2 className="w-8 h-8 text-text-tertiary opacity-20" />
                      <p>No action items generated yet.</p>
                      <button 
                        onClick={() => setNewTaskMeetingId(meeting.id as string)}
                        className="mt-1 px-4 py-1.5 text-xs font-bold bg-white border border-border rounded-full hover:bg-board transition-colors text-text-secondary"
                      >
                        Create first task
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-text-primary mb-2">Participants</h4>
                  <div className="bg-surface rounded-xl p-4 space-y-3">
                    <div className="text-sm">
                      <span className="font-medium text-text-primary">From:</span> <span className="text-text-secondary">{draftData.from_email}</span>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium text-text-primary">To:</span> <span className="text-text-secondary">{toEmails.join(', ')}</span>
                    </div>
                    
                    {unmappedEmails.length > 0 && (
                      <div className="pt-3 mt-3 border-t border-border">
                        <p className="text-xs font-medium text-orange-500 mb-2 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Unmapped Directory Contacts
                        </p>
                        <div className="space-y-2">
                          {unmappedEmails.map((email: string) => (
                            <div key={email} className="flex items-center justify-between text-xs bg-white border border-border p-2 rounded-lg shadow-sm">
                              <span className="text-text-secondary truncate mr-2" title={email}>{email}</span>
                              <button 
                                onClick={() => handleQuickAdd(email)}
                                className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary hover:bg-primary/20 rounded font-medium transition-colors"
                              >
                                <UserPlus className="w-3 h-3" /> Add
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-text-primary mb-2">Raw Email Source</h4>
                  <div className="text-xs font-mono text-text-tertiary bg-gray-50 border border-border p-4 rounded-xl overflow-auto max-h-64 whitespace-pre-wrap">
                    {draftData.raw_subject && <div className="font-bold mb-2">Subject: {draftData.raw_subject}</div>}
                    {draftData.raw_body}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
