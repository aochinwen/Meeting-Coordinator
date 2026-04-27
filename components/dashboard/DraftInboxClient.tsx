'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { format, parseISO } from 'date-fns';
import { Calendar, Clock, Mail, CheckCircle2, XCircle, AlertCircle, RefreshCw, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';

type DraftInboxClientProps = {
  initialMeetings: Record<string, any>[];
  people: Record<string, any>[];
};

export default function DraftInboxClient({ initialMeetings, people }: DraftInboxClientProps) {
  const [meetings, setMeetings] = useState(initialMeetings);
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

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

                {tasks.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-text-primary mb-2">Generated Tasks ({tasks.length})</h4>
                    <ul className="space-y-2">
                      {tasks.map((task: Record<string, any>) => (
                        <li key={task.id} className="flex items-start gap-2 text-sm text-text-secondary bg-surface p-3 rounded-lg">
                          <CheckCircle2 className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                          <span>{task.description}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
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
