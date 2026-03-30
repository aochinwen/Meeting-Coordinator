import { createClient } from '@/utils/supabase/server';
import { Calendar, ChevronRight, Info, Plus, Search, Filter, ArrowUpDown, Video, Target, User, Users, CalendarCheck2, Clock, CheckCircle2, CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface MeetingWithRelations {
  id: string;
  title: string;
  description: string | null;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  meeting_participants: { user_id: string }[];
  meeting_checklist_tasks: { id: string; is_completed: boolean }[];
}

interface Profile {
  id: string;
  name: string;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  // Fetch meetings with participants and tasks
  const { data: meetingsData } = await supabase
    .from('meetings')
    .select(`
      *,
      meeting_participants(user_id),
      meeting_checklist_tasks(id, is_completed)
    `)
    .order('date', { ascending: true })
    .limit(10);
  
  // Fetch all users for attendee names
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name')
    .order('name', { ascending: true });
  
  // Create a profile map for quick lookup
  const profileMap = new Map<string, string>();
  profiles?.forEach(p => profileMap.set(p.id, p.name));
  
  // Fetch active team members count
  const { count: usersCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  const activeTeamMembers = usersCount || 18;

  const meetings = (meetingsData as unknown as MeetingWithRelations[]) || [];
  const thisWeekMeetingsCount = meetings.length; // Simplified for now
  
  // Create formatted meetings list with real data
  const formattedMeetings = meetings.map((meeting) => {
    // Determine status (Live vs Upcoming based on Mock logic)
    const isLive = meeting.status === 'scheduled' && meeting.date === new Date().toISOString().split('T')[0];
    
    // Calculate task progress
    const totalTasks = meeting.meeting_checklist_tasks?.length || 0;
    const completedTasks = meeting.meeting_checklist_tasks?.filter(t => t.is_completed).length || 0;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    // Get real attendees with names
    const participantIds = meeting.meeting_participants?.map(p => p.user_id) || [];
    const attendees = participantIds.slice(0, 3).map(id => {
      const name = profileMap.get(id) || '?';
      return {
        name,
        initials: name.charAt(0).toUpperCase()
      };
    });
    const remainingCount = Math.max(0, participantIds.length - 3);
    
    // Fallback icons based on meeting title hash
    const icons = [Video, Target, User];
    const bgs = ['bg-status-green-bg/30', 'bg-amber/30', 'bg-status-grey-bg/50'];
    const colors = ['text-primary', 'text-status-amber', 'text-text-secondary'];
    const randomIdx = Math.abs(meeting.id.charCodeAt(0) % 3);
    
    return {
      id: meeting.id,
      title: meeting.title,
      description: meeting.description || 'No description provided',
      date: new Date(meeting.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
      timeLabel: `${meeting.start_time?.slice(0, 5) || 'TBD'} — ${meeting.end_time?.slice(0, 5) || 'TBD'}`,
      status: isLive ? 'Live' : 'Upcoming',
      icon: icons[randomIdx],
      iconBg: bgs[randomIdx],
      iconColor: colors[randomIdx],
      attendees,
      remainingCount,
      progress,
      totalTasks,
      completedTasks
    };
  });

  return (
    <div className="max-w-[1280px] mx-auto space-y-8 pb-12 h-full flex flex-col pt-8">
      <div className="flex items-end justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold tracking-tight text-text-primary font-literata">
            Control Center
          </h1>
          <p className="text-base font-light text-text-secondary">
            Welcome back. Here is what needs your attention today.
          </p>
        </div>
        
        <Link href="/schedule">
          <button className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full text-base font-light shadow-md transition-all active:scale-95">
            <Plus className="h-4 w-4" />
            New Meeting
          </button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
        <div className="bg-surface border border-border/30 rounded-3xl p-6 flex flex-col justify-between h-[178px]">
          <div className="flex items-start justify-between">
            <div className="h-11 w-11 rounded-full bg-status-green-bg/30 flex items-center justify-center">
              <CalendarCheck2 className="h-5 w-5 text-primary" />
            </div>
            <div className="bg-status-green-bg/30 px-3 py-1 rounded-full">
              <span className="text-xs text-primary font-light">+12% vs last week</span>
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-sm tracking-wide text-text-tertiary uppercase font-light">Meetings This Week</h3>
            <p className="text-4xl font-bold text-text-primary leading-none font-literata">{thisWeekMeetingsCount}</p>
          </div>
        </div>

        <div className="bg-surface border border-border/30 rounded-3xl p-6 flex flex-col justify-between h-[178px]">
          <div className="flex items-start justify-between">
            <div className="h-11 w-11 rounded-full bg-amber/30 flex items-center justify-center">
              <Clock className="h-5 w-5 text-status-amber" />
            </div>
            <div className="bg-amber/30 px-3 py-1 rounded-full">
              <span className="text-xs text-status-amber font-light">Action Required</span>
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-sm tracking-wide text-text-tertiary uppercase font-light">Pending Invitations</h3>
            <p className="text-4xl font-bold text-text-primary leading-none font-literata">07</p>
          </div>
        </div>

        <div className="bg-surface border border-border/30 rounded-3xl p-6 flex flex-col justify-between h-[178px]">
          <div className="flex items-start justify-between">
            <div className="h-11 w-11 rounded-full bg-board flex items-center justify-center border border-border/20">
              <Users className="h-5 w-5 text-text-secondary" />
            </div>
            <div className="flex -space-x-2">
              <div className="h-8 w-8 rounded-full border-2 border-surface bg-status-amber flex items-center justify-center text-[10px] text-white">AM</div>
              <div className="h-8 w-8 rounded-full border-2 border-surface bg-cream flex items-center justify-center text-[10px] text-text-primary">+{activeTeamMembers - 1}</div>
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-sm tracking-wide text-text-tertiary uppercase font-light">Active Team Members</h3>
            <p className="text-4xl font-bold text-text-primary leading-none font-literata">{activeTeamMembers}</p>
          </div>
        </div>
      </div>

      <div className="bg-status-grey-bg rounded-3xl p-4 flex gap-4 items-center shrink-0">
        <div className="flex-1 bg-board rounded-2xl flex items-center px-4 py-3 relative overflow-hidden group focus-within:ring-2 focus-within:ring-primary/20 transition-all">
          <Search className="h-5 w-5 text-gray-500 shrink-0" />
          <input 
            type="text" 
            placeholder="Search meetings, attendees, or topics..." 
            className="w-full bg-transparent border-none outline-none pl-3 text-text-secondary placeholder-gray-500 font-light text-base"
          />
        </div>
        <div className="flex gap-2 shrink-0">
          <button className="bg-board border border-border rounded-2xl px-4 py-3 flex items-center gap-2 hover:bg-white transition-colors">
            <Filter className="h-4 w-4 text-text-secondary" />
            <span className="text-sm font-light text-text-secondary">Filter</span>
          </button>
          <button className="bg-board border border-border rounded-2xl px-4 py-3 flex items-center gap-2 hover:bg-white transition-colors">
            <ArrowUpDown className="h-4 w-4 text-text-secondary" />
            <span className="text-sm font-light text-text-secondary">Sort</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[24px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] border border-[rgba(196,200,188,0.2)] overflow-hidden flex-1 flex flex-col min-h-0">
        {/* Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-[rgba(234,230,222,0.5)] border-b border-[rgba(196,200,188,0.2)] text-xs tracking-[1.2px] uppercase text-text-secondary font-light shrink-0">
          <div className="col-span-4">Meeting Details</div>
          <div className="col-span-2">Date & Time</div>
          <div className="col-span-2">Attendees</div>
          <div className="col-span-2">Progress</div>
          <div className="col-span-2 text-right">Status</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-[rgba(196,200,188,0.1)] overflow-y-auto">
          {formattedMeetings.length > 0 ? formattedMeetings.map((meeting) => (
            <Link 
              key={meeting.id} 
              href={`/meetings/${meeting.id}`}
              className="grid grid-cols-12 gap-4 px-6 py-6 items-center hover:bg-board/50 transition-colors group cursor-pointer"
            >
              <div className="col-span-4 flex items-center gap-4">
                <div className={cn("h-12 w-12 rounded-full flex items-center justify-center shrink-0", meeting.iconBg)}>
                  <meeting.icon className={cn("h-5 w-5", meeting.iconColor)} />
                </div>
                <div className="flex flex-col pr-4">
                  <h4 className="text-lg font-bold text-text-primary leading-tight font-literata">{meeting.title}</h4>
                  <p className="text-sm font-light text-text-tertiary truncate leading-relaxed">{meeting.description}</p>
                </div>
              </div>
              
              <div className="col-span-2 flex flex-col gap-1">
                <span className="text-sm text-text-primary font-light">{meeting.date}</span>
                <span className="text-xs text-text-tertiary font-light">{meeting.timeLabel}</span>
              </div>
              
              <div className="col-span-2 flex items-center -space-x-2">
                {meeting.attendees.length > 0 ? (
                  <>
                    {meeting.attendees.map((attendee, i) => (
                      <div key={i} className="h-8 w-8 rounded-full border-2 border-white bg-sage flex items-center justify-center text-[10px] text-white">
                        {attendee.initials}
                      </div>
                    ))}
                    {meeting.remainingCount > 0 && (
                      <div className="h-8 w-8 rounded-full border-2 border-white bg-cream flex items-center justify-center text-[10px] text-text-primary">
                        +{meeting.remainingCount}
                      </div>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-text-tertiary">No attendees</span>
                )}
              </div>

              <div className="col-span-2 flex flex-col gap-1">
                {meeting.totalTasks > 0 ? (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-status-grey-bg rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all",
                            meeting.progress === 100 ? "bg-primary" : 
                            meeting.progress >= 75 ? "bg-status-green" :
                            meeting.progress >= 50 ? "bg-blue-500" :
                            meeting.progress >= 25 ? "bg-status-amber" : "bg-coral-text"
                          )}
                          style={{ width: `${meeting.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-text-secondary font-medium w-8 text-right">{meeting.progress}%</span>
                    </div>
                    <span className="text-xs text-text-tertiary">
                      {meeting.completedTasks}/{meeting.totalTasks} tasks
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-text-tertiary">No tasks</span>
                )}
              </div>
              
              <div className="col-span-2 flex justify-end">
                {meeting.status === 'Live' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-status-green-bg text-status-green text-xs font-light">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary"></span>
                    Live
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-status-grey-bg border border-border/30 text-text-secondary text-xs font-light">
                    Upcoming
                  </span>
                )}
              </div>
            </Link>
          )) : (
             <div className="p-8 text-center text-text-tertiary">No meetings scheduled for now.</div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 shrink-0">
        <span className="text-sm font-light text-text-tertiary">Showing 1-{Math.min(10, formattedMeetings.length)} of {formattedMeetings.length} meetings</span>
        <div className="flex items-center gap-2">
          <button className="h-10 w-10 flex items-center justify-center rounded-2xl bg-surface hover:bg-border-hover transition-colors">
            <ChevronRight className="h-4 w-4 rotate-180" />
          </button>
          <button className="h-10 w-10 flex items-center justify-center rounded-2xl bg-primary text-white text-sm font-light shadow-sm">
            1
          </button>
          <button className="h-10 w-10 flex items-center justify-center rounded-2xl bg-white border border-border/30 text-text-secondary text-sm font-light hover:bg-board transition-colors">
            2
          </button>
          <button className="h-10 w-10 flex items-center justify-center rounded-2xl bg-white border border-border/30 text-text-secondary text-sm font-light hover:bg-board transition-colors">
            3
          </button>
          <button className="h-10 w-10 flex items-center justify-center rounded-2xl bg-surface hover:bg-border-hover transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
