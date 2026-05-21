'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Repeat, Video, Target, User, Square, CheckSquare, ChevronRight, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

const iconMap = {
  video: Video,
  target: Target,
  user: User,
};

export interface FormattedMeeting {
  id: string;
  title: string;
  description: string;
  date: string;
  dateISO: string; // YYYY-MM-DD
  startTime: string; // HH:mm:ss
  endTime: string; // HH:mm:ss
  timeLabel: string;
  roomName: string;
  status: string; // Base status from DB
  iconName: 'video' | 'target' | 'user';
  iconBg: string;
  iconColor: string;
  attendees: { name: string; initials: string }[];
  remainingCount: number;
  progress: number;
  totalTasks: number;
  completedTasks: number;
  isRecurring: boolean;
  taskDetails?: Array<{
    id: string;
    title: string;
    isCompleted: boolean;
    dueDate: string;
  }>;
}

function useLiveStatus(meeting: FormattedMeeting) {
  const [status, setStatus] = useState(meeting.status);

  useEffect(() => {
    const calculateStatus = () => {
      if (meeting.status?.toLowerCase() === 'cancelled') return 'Cancelled';
      if (meeting.status?.toLowerCase() === 'completed') return 'Completed';

      const now = new Date();
      const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const localTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

      if (meeting.dateISO < localToday) {
        return 'Completed';
      } else if (meeting.dateISO === localToday) {
        const start = meeting.startTime || '00:00:00';
        const end = meeting.endTime || '23:59:59';

        if (localTime > end) {
          return 'Completed';
        } else if (localTime >= start && localTime <= end) {
          return 'Live';
        }
      }
      return 'Upcoming';
    };

    setStatus(calculateStatus());
    
    // Check every minute to update status if a meeting starts/ends
    const timer = setInterval(() => {
      setStatus(calculateStatus());
    }, 60000);

    return () => clearInterval(timer);
  }, [meeting.dateISO, meeting.startTime, meeting.endTime, meeting.status]);

  return status;
}

export function MeetingRowDesktop({ meeting }: { meeting: FormattedMeeting }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const status = useLiveStatus(meeting);

  const handleClick = (e: React.MouseEvent) => {
    // If the click is inside a real link or button, don't toggle
    if ((e.target as HTMLElement).closest('a, button')) {
      return;
    }
    e.preventDefault();
    setIsExpanded(!isExpanded);
  };

  const Icon = iconMap[meeting.iconName] || Video;
  if (!iconMap[meeting.iconName]) {
    console.error("Missing iconName for desktop row:", meeting);
  }

  return (
    <div
      className={cn(
        "border-b border-[rgba(196,200,188,0.15)] transition-all",
        isExpanded ? "bg-[rgba(234,230,222,0.15)]" : "hover:bg-board/30"
      )}
    >
      {/* Clickable Summary Row */}
      <div
        onClick={handleClick}
        title={isExpanded ? 'Click to collapse details' : 'Click to expand details'}
        className="grid grid-cols-12 gap-4 px-6 py-5 items-center cursor-pointer group select-none"
      >
        <div className="col-span-3 flex flex-col justify-center min-w-0">
          <div className="flex items-center gap-4">
            <div className={cn('h-11 w-11 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-105', meeting.iconBg)}>
              <Icon className={cn('h-4.5 w-4.5', meeting.iconColor)} />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex gap-2 items-center min-w-0">
                <h4 className="text-base font-bold text-text-primary leading-tight font-literata truncate">
                  {meeting.title}
                </h4>
                {meeting.isRecurring && (
                  <span className="inline-flex items-center text-text-secondary shrink-0" title="Recurring meeting">
                    <Repeat className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>
              <p className="text-xs font-light text-text-tertiary mt-0.5 truncate">
                {meeting.description}
              </p>
            </div>
          </div>
        </div>
        <div className="col-span-2 flex flex-col gap-0.5">
          <span className="text-sm text-text-primary font-medium">{meeting.date}</span>
          <span className="text-xs text-text-tertiary font-light">{meeting.timeLabel}</span>
        </div>
        <div className="hidden lg:block lg:col-span-2 flex flex-col justify-center">
          <span className="text-sm text-text-primary font-light truncate">
            {meeting.roomName !== 'TBD' ? (
              meeting.roomName
            ) : (
              <span className="text-text-tertiary italic font-light">No room</span>
            )}
          </span>
        </div>
        <div className="col-span-2 flex items-center -space-x-1.5">
          {meeting.attendees.length > 0 ? (
            <>
              {meeting.attendees.map((attendee, i) => (
                <div key={i} className="h-7 w-7 rounded-full border border-white bg-sage flex items-center justify-center text-[9px] text-white font-medium shadow-sm" title={attendee.name}>
                  {attendee.initials}
                </div>
              ))}
              {meeting.remainingCount > 0 && (
                <div className="h-7 w-7 rounded-full border border-white bg-cream flex items-center justify-center text-[9px] text-text-primary font-medium shadow-sm">
                  +{meeting.remainingCount}
                </div>
              )}
            </>
          ) : (
            <span className="text-xs text-text-tertiary font-light">No attendees</span>
          )}
        </div>
        <div className="col-span-3 lg:col-span-2 flex flex-col justify-center pr-4 min-w-0">
          {meeting.totalTasks > 0 ? (
            <div className="w-full flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px] text-text-tertiary">
                <span className="font-light">
                  {meeting.completedTasks}/{meeting.totalTasks} tasks
                </span>
                <span className="text-text-secondary font-medium">{meeting.progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-[rgba(196,200,188,0.18)] rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-300',
                    meeting.progress === 100 ? 'bg-primary' :
                    meeting.progress >= 75 ? 'bg-status-green' :
                    meeting.progress >= 50 ? 'bg-blue-500' :
                    meeting.progress >= 25 ? 'bg-status-amber' : 'bg-coral-text'
                  )}
                  style={{ width: `${meeting.progress}%` }}
                />
              </div>
            </div>
          ) : (
            <span className="text-xs text-text-tertiary font-light">No tasks</span>
          )}
        </div>
        <div className="col-span-2 lg:col-span-1 flex items-center justify-end gap-2.5">
          {status === 'Live' ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-status-green-bg text-status-green text-[11px] font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"></span>
              Live
            </span>
          ) : status === 'Completed' ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-status-grey-bg/40 border border-border/10 text-text-tertiary text-[11px] font-light">
              Completed
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-status-grey-bg border border-border/20 text-text-secondary text-[11px] font-light">
              {status}
            </span>
          )}
          <ChevronRight className={cn("h-4 w-4 text-text-tertiary transition-transform duration-200 shrink-0", isExpanded ? "rotate-90 text-text-primary" : "group-hover:translate-x-0.5")} />
        </div>
      </div>

      {/* Expanded Rich Details View */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-out w-full",
          isExpanded
            ? "max-h-[2000px] border-t border-[rgba(196,200,188,0.12)] pb-6 pt-3 bg-[rgba(255,255,255,0.45)]"
            : "max-h-0"
        )}
      >
        <div className="px-6 w-full">
          <div 
            className={cn(
              "transition-all duration-300 ease-out transform flex flex-col lg:flex-row gap-8 mt-1 w-full",
              isExpanded ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
            )}
          >
            {/* Left Column: Extensive Details & CTAs (Fills the remaining width) */}
            <div className="flex-1 min-w-0 flex flex-col gap-5">
              <div>
                <h5 className="text-[10px] uppercase tracking-wider text-text-tertiary font-bold mb-1">Meeting Title</h5>
                <h3 className="text-xl font-bold text-text-primary font-literata leading-snug break-words">
                  {meeting.title}
                </h3>
              </div>
              
              <div>
                <h5 className="text-[10px] uppercase tracking-wider text-text-tertiary font-bold mb-1.5">Overview & Objectives</h5>
                <div className="bg-[rgba(234,230,222,0.2)] border border-[rgba(196,200,188,0.15)] rounded-2xl p-4.5 max-h-[250px] overflow-y-auto w-full">
                  <p className="text-sm font-light text-text-secondary leading-relaxed whitespace-pre-wrap break-words">
                    {meeting.description || <span className="italic text-text-tertiary font-light">No description has been provided for this meeting.</span>}
                  </p>
                </div>
              </div>

              <div className="pt-1">
                <Link
                  href={`/meetings/${meeting.id}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/95 transition-all shadow-sm hover:shadow active:scale-95 shrink-0"
                >
                  <span>Open Meeting Workspace</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* Right Column: Detailed Tasks Checklist (Fixed Sidebar) */}
            <div className="w-full lg:w-[340px] xl:w-[400px] shrink-0 lg:border-l border-[rgba(196,200,188,0.15)] lg:pl-8 flex flex-col gap-4">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h5 className="text-[10px] uppercase tracking-wider text-text-tertiary font-bold">Preparation Checklist</h5>
                  {meeting.totalTasks > 0 && (
                    <span className="text-xs font-semibold text-primary bg-status-green-bg px-2 py-0.5 rounded-full">
                      {meeting.completedTasks} / {meeting.totalTasks} Done
                    </span>
                  )}
                </div>

                {meeting.taskDetails && meeting.taskDetails.length > 0 ? (
                  <div className="flex flex-col gap-2.5 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
                    {meeting.taskDetails.map((task) => (
                      <div
                        key={task.id}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-xl border transition-colors w-full",
                          task.isCompleted 
                            ? "bg-[rgba(234,230,222,0.1)] border-[rgba(196,200,188,0.1)] text-text-tertiary" 
                            : "bg-white border-[rgba(196,200,188,0.2)] shadow-sm hover:border-[rgba(196,200,188,0.3)] text-text-secondary"
                        )}
                      >
                        {task.isCompleted ? (
                          <CheckSquare className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                        ) : (
                          <Square className="h-4 w-4 mt-0.5 shrink-0 text-status-amber" />
                        )}
                        <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                          <span className={cn('break-words text-xs font-medium leading-normal text-text-primary', task.isCompleted && 'line-through opacity-55 text-text-tertiary')}>
                            {task.title}
                          </span>
                          <span className="text-[10px] text-text-tertiary mt-0.5 flex items-center gap-1 font-light">
                            <span>Due:</span>
                            <span className={cn(task.isCompleted ? "" : "font-medium text-text-secondary")}>{task.dueDate}</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 px-4 rounded-2xl bg-board/10 border border-dashed border-[rgba(196,200,188,0.3)] text-center flex flex-col items-center justify-center">
                    <p className="text-xs text-text-tertiary italic">No checklist tasks assigned to this meeting.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MeetingRowMobile({ meeting }: { meeting: FormattedMeeting }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const status = useLiveStatus(meeting);

  const handleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('a, button')) {
      return;
    }
    e.preventDefault();
    setIsExpanded(!isExpanded);
  };

  const Icon = iconMap[meeting.iconName] || Video;
  if (!iconMap[meeting.iconName]) {
    console.error("Missing iconName for mobile row:", meeting);
  }

  return (
    <div
      onClick={handleClick}
      className={cn(
        "bg-white border border-[rgba(196,200,188,0.25)] rounded-2xl p-4 space-y-3.5 transition-all select-none cursor-pointer",
        isExpanded ? "shadow-md bg-[rgba(234,230,222,0.08)] ring-1 ring-[rgba(196,200,188,0.15)]" : "hover:bg-board/30 active:scale-[0.99]"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('h-10 w-10 rounded-full flex items-center justify-center shrink-0 shadow-sm', meeting.iconBg)}>
          <Icon className={cn('h-4 w-4', meeting.iconColor)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex gap-2 items-start justify-between">
            <div className="flex gap-1.5 items-center min-w-0">
              <h4 className={cn("text-base font-bold text-text-primary leading-tight font-literata", isExpanded ? "whitespace-normal break-words" : "truncate")}>
                {meeting.title}
              </h4>
              {meeting.isRecurring && (
                <span className="inline-flex items-center text-text-secondary shrink-0" title="Recurring meeting">
                  <Repeat className="h-3 w-3" />
                </span>
              )}
            </div>
            <ChevronRight className={cn("h-4 w-4 text-text-tertiary transition-transform duration-200 shrink-0 mt-0.5", isExpanded && "rotate-90 text-text-primary")} />
          </div>

          <p className={cn("text-xs text-text-tertiary mt-1.5 leading-relaxed", isExpanded ? "whitespace-normal break-words" : "line-clamp-2")}>
            {meeting.description}
          </p>

          {isExpanded && (
            <div className="mt-4 pt-4 border-t border-[rgba(196,200,188,0.15)] space-y-4">
              {/* Detailed Overview Block for Mobile */}
              <div className="bg-[rgba(234,230,222,0.2)] border border-[rgba(196,200,188,0.15)] rounded-xl p-3">
                <span className="text-[9px] uppercase tracking-wider text-text-tertiary font-bold block mb-1">Full Description</span>
                <p className="text-xs font-light text-text-secondary leading-relaxed whitespace-pre-wrap">
                  {meeting.description || <span className="italic text-text-tertiary font-light">No description has been provided for this meeting.</span>}
                </p>
              </div>

              {/* Related Checklist Tasks for Mobile */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] uppercase tracking-wider text-text-tertiary font-bold">Preparation Tasks</span>
                  {meeting.totalTasks > 0 && (
                    <span className="text-[10px] font-semibold text-primary bg-status-green-bg px-2 py-0.5 rounded-full">
                      {meeting.completedTasks} / {meeting.totalTasks} Done
                    </span>
                  )}
                </div>
                
                {meeting.taskDetails && meeting.taskDetails.length > 0 ? (
                  <div className="flex flex-col gap-2 max-h-[180px] overflow-y-auto pr-1">
                    {meeting.taskDetails.map((task) => (
                      <div key={task.id} className="flex items-start gap-2.5 p-2 rounded-lg bg-board/20 border border-[rgba(196,200,188,0.1)] text-xs text-text-secondary">
                        {task.isCompleted ? (
                          <CheckSquare className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                        ) : (
                          <Square className="h-3.5 w-3.5 mt-0.5 shrink-0 text-status-amber" />
                        )}
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className={cn('break-words text-[11px] leading-normal font-medium text-text-primary', task.isCompleted && 'line-through opacity-55 text-text-tertiary')}>
                            {task.title}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-text-tertiary italic">No tasks assigned to this meeting.</p>
                )}
              </div>

              {/* Workspace Action Button */}
              <div className="pt-1">
                <Link
                  href={`/meetings/${meeting.id}`}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/95 transition-all shadow-sm active:scale-95"
                >
                  <span>Open Workspace</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs mt-3 pt-1">
        <div className="text-text-secondary font-light space-y-0.5">
          <div className="font-medium text-text-primary">{meeting.date}</div>
          <div>{meeting.timeLabel}</div>
          {meeting.roomName !== 'TBD' ? (
            <div className="text-text-tertiary italic">{meeting.roomName}</div>
          ) : (
            <div className="text-text-tertiary italic">No room</div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          {status === 'Live' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-status-green-bg text-status-green text-[11px] font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"></span>
              Live
            </span>
          ) : status === 'Completed' ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-status-grey-bg/40 border border-border/10 text-text-tertiary text-[11px] font-light">
              Completed
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-status-grey-bg border border-border/20 text-text-secondary text-[11px] font-light">
              {status}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[rgba(196,200,188,0.15)]">
        <div className="flex items-center -space-x-1.5">
          {meeting.attendees.length > 0 ? (
            <>
              {meeting.attendees.map((attendee, i) => (
                <div key={i} className="h-6.5 w-6.5 rounded-full border border-white bg-sage flex items-center justify-center text-[9px] text-white font-medium shadow-sm" title={attendee.name}>
                  {attendee.initials}
                </div>
              ))}
              {meeting.remainingCount > 0 && (
                <div className="h-6.5 w-6.5 rounded-full border border-white bg-cream flex items-center justify-center text-[9px] text-text-primary font-medium shadow-sm">
                  +{meeting.remainingCount}
                </div>
              )}
            </>
          ) : (
            <span className="text-xs text-text-tertiary font-light">No attendees</span>
          )}
        </div>
        {meeting.totalTasks > 0 && !isExpanded ? (
          <div className="text-right min-w-[92px]">
            <div className="flex items-center justify-end gap-2 mb-0.5">
              <div className="w-12 h-1 bg-[rgba(196,200,188,0.2)] rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-300',
                    meeting.progress === 100 ? 'bg-primary' :
                    meeting.progress >= 75 ? 'bg-status-green' :
                    meeting.progress >= 50 ? 'bg-blue-500' :
                    meeting.progress >= 25 ? 'bg-status-amber' : 'bg-coral-text'
                  )}
                  style={{ width: `${meeting.progress}%` }}
                />
              </div>
              <span className="text-[11px] text-text-secondary font-medium">{meeting.progress}%</span>
            </div>
            <div className="text-[10px] text-text-tertiary">{meeting.completedTasks}/{meeting.totalTasks} tasks</div>
          </div>
        ) : meeting.totalTasks > 0 ? null : (
          <span className="text-xs text-text-tertiary font-light">No tasks</span>
        )}
      </div>
    </div>
  );
}
