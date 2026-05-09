'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Repeat, Video, Target, User, Square, CheckSquare } from 'lucide-react';
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
  timeLabel: string;
  roomName: string;
  status: string;
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

export function MeetingRowDesktop({ meeting }: { meeting: FormattedMeeting }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    if (!isExpanded) {
      e.preventDefault();
      setIsExpanded(true);
    }
  };

  const Icon = iconMap[meeting.iconName] || Video;
  if (!iconMap[meeting.iconName]) {
    console.error("Missing iconName for desktop row:", meeting);
  }

  if (!Link || !Icon || !Repeat) {
    console.error("UNDEFINED DETECTED:", { Link, Icon, Repeat });
  }

  return (
    <Link
      href={`/meetings/${meeting.id}`}
      onClick={handleClick}
      title={isExpanded ? '' : 'Click to expand details'}
      className={cn(
        "grid grid-cols-12 gap-4 px-6 py-6 items-center transition-colors group cursor-pointer",
        isExpanded ? "bg-white" : "hover:bg-board/50"
      )}
    >
      <div className="col-span-3 flex flex-col justify-center">
        <div className="flex items-start gap-4">
          <div className={cn('h-12 w-12 rounded-full flex items-center justify-center shrink-0', meeting.iconBg)}>
            <Icon className={cn('h-5 w-5', meeting.iconColor)} />
          </div>
          <div className="flex flex-col pr-4 min-w-0 flex-1">
            <div className={cn("flex gap-2 min-w-0", isExpanded ? "items-start" : "items-center")}>
              <h4 className={cn("text-lg font-bold text-text-primary leading-tight font-literata", isExpanded ? "whitespace-normal break-words" : "truncate")}>
                {meeting.title}
              </h4>
              {meeting.isRecurring && (
                <span className={cn("inline-flex items-center text-text-secondary shrink-0", isExpanded ? "mt-1" : "")} title="Recurring meeting">
                  <Repeat className="h-3.5 w-3.5" />
                </span>
              )}
            </div>
            <p className={cn("text-sm font-light text-text-tertiary leading-relaxed mt-0.5", isExpanded ? "whitespace-normal break-words" : "truncate")}>
              {meeting.description}
            </p>
            {isExpanded && (
              <div className="mt-4 flex flex-col gap-2 border-t border-border/10 pt-3">
                <span className="text-[10px] uppercase tracking-wider text-text-tertiary font-medium">Related Tasks</span>
                {meeting.taskDetails && meeting.taskDetails.length > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    {meeting.taskDetails.map((task) => (
                      <div key={task.id} className="flex items-start gap-2 text-xs text-text-secondary">
                        {task.isCompleted ? (
                          <CheckSquare className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                        ) : (
                          <Square className="h-3.5 w-3.5 mt-0.5 shrink-0 text-status-amber" />
                        )}
                        <div className="flex flex-col">
                          <span className={cn('break-words', task.isCompleted && 'line-through opacity-60')}>
                            {task.title}
                          </span>
                          <span className="text-[10px] text-text-tertiary">
                            Due: {task.dueDate}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-text-tertiary italic">There's currently no task for this meeting</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="col-span-2 flex flex-col gap-1">
        <span className="text-sm text-text-primary font-light">{meeting.date}</span>
        <span className="text-xs text-text-tertiary font-light">{meeting.timeLabel}</span>
      </div>
      <div className="col-span-2 flex flex-col gap-1 justify-center">
        <span className="text-sm text-text-primary font-light">
          {meeting.roomName !== 'TBD' ? meeting.roomName : <span className="text-text-tertiary italic">No room</span>}
        </span>
      </div>
      <div className="col-span-2 flex items-center -space-x-2">
        {meeting.attendees.length > 0 ? (
          <>
            {meeting.attendees.map((attendee, i) => (
              <div key={i} className="h-8 w-8 rounded-full border-2 border-white bg-sage flex items-center justify-center text-[10px] text-white" title={attendee.name}>
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
                    'h-full rounded-full transition-all',
                    meeting.progress === 100 ? 'bg-primary' :
                    meeting.progress >= 75 ? 'bg-status-green' :
                    meeting.progress >= 50 ? 'bg-blue-500' :
                    meeting.progress >= 25 ? 'bg-status-amber' : 'bg-coral-text'
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
      <div className="col-span-1 flex justify-end">
        {meeting.status === 'Live' ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-status-green-bg text-status-green text-xs font-light">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"></span>
            Live
          </span>
        ) : meeting.status === 'Completed' ? (
          <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-status-grey-bg/40 border border-border/20 text-text-tertiary text-xs font-light">
            Completed
          </span>
        ) : (
          <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-status-grey-bg border border-border/30 text-text-secondary text-xs font-light">
            {meeting.status}
          </span>
        )}
      </div>
    </Link>
  );
}

export function MeetingRowMobile({ meeting }: { meeting: FormattedMeeting }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    if (!isExpanded) {
      e.preventDefault();
      setIsExpanded(true);
    }
  };

  const Icon = iconMap[meeting.iconName] || Video;
  if (!iconMap[meeting.iconName]) {
    console.error("Missing iconName for mobile row:", meeting);
  }

  return (
    <Link
      href={`/meetings/${meeting.id}`}
      onClick={handleClick}
      title={isExpanded ? '' : 'Click to expand details'}
      className={cn(
        "bg-white border border-border/30 rounded-2xl p-4 space-y-3 transition-colors",
        isExpanded ? "" : "hover:bg-board/30"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('h-10 w-10 rounded-full flex items-center justify-center shrink-0', meeting.iconBg)}>
          <Icon className={cn('h-4 w-4', meeting.iconColor)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className={cn("flex gap-2", isExpanded ? "items-start" : "items-center")}>
            <h4 className={cn("text-base font-bold text-text-primary leading-tight font-literata", isExpanded ? "whitespace-normal break-words" : "truncate")}>
              {meeting.title}
            </h4>
            {meeting.isRecurring && (
              <span className={cn("inline-flex items-center text-text-secondary shrink-0", isExpanded ? "mt-0.5" : "")} title="Recurring meeting">
                <Repeat className="h-3.5 w-3.5" />
              </span>
            )}
          </div>
          <p className={cn("text-xs text-text-tertiary mt-1", isExpanded ? "whitespace-normal break-words" : "line-clamp-2")}>
            {meeting.description}
          </p>
          {isExpanded && (
            <div className="mt-3 flex flex-col gap-2 border-t border-border/10 pt-2">
              <span className="text-[9px] uppercase tracking-wider text-text-tertiary font-medium">Related Tasks</span>
              {meeting.taskDetails && meeting.taskDetails.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  {meeting.taskDetails.map((task) => (
                    <div key={task.id} className="flex items-start gap-2 text-xs text-text-secondary">
                      {task.isCompleted ? (
                        <CheckSquare className="h-3 w-3 mt-0.5 shrink-0 text-primary" />
                      ) : (
                        <Square className="h-3 w-3 mt-0.5 shrink-0 text-status-amber" />
                      )}
                      <div className="flex flex-col">
                        <span className={cn('break-words text-[11px]', task.isCompleted && 'line-through opacity-60')}>
                          {task.title}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-text-tertiary italic">There's currently no task for this meeting</p>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between text-xs mt-3">
        <div className="text-text-secondary">
          <div>{meeting.date}</div>
          <div className="text-text-tertiary mt-0.5">{meeting.timeLabel}</div>
          {meeting.roomName !== 'TBD' && <div className="text-text-tertiary mt-0.5">{meeting.roomName}</div>}
        </div>
        <div className="flex flex-col items-end gap-2">
          {meeting.status === 'Live' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-status-green-bg text-status-green text-xs font-light">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"></span>
              Live
            </span>
          ) : meeting.status === 'Completed' ? (
            <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-status-grey-bg/40 border border-border/20 text-text-tertiary text-xs font-light">
              Completed
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-status-grey-bg border border-border/30 text-text-secondary text-xs font-light">
              {meeting.status}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/20">
        <div className="flex items-center -space-x-2">
          {meeting.attendees.length > 0 ? (
            <>
              {meeting.attendees.map((attendee, i) => (
                <div key={i} className="h-7 w-7 rounded-full border-2 border-white bg-sage flex items-center justify-center text-[10px] text-white" title={attendee.name}>
                  {attendee.initials}
                </div>
              ))}
              {meeting.remainingCount > 0 && (
                <div className="h-7 w-7 rounded-full border-2 border-white bg-cream flex items-center justify-center text-[10px] text-text-primary">
                  +{meeting.remainingCount}
                </div>
              )}
            </>
          ) : (
            <span className="text-xs text-text-tertiary">No attendees</span>
          )}
        </div>
        {meeting.totalTasks > 0 ? (
          <div className="text-right min-w-[92px]">
            <div className="flex items-center justify-end gap-2 mb-1">
              <div className="w-12 h-1.5 bg-status-grey-bg rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    meeting.progress === 100 ? 'bg-primary' :
                    meeting.progress >= 75 ? 'bg-status-green' :
                    meeting.progress >= 50 ? 'bg-blue-500' :
                    meeting.progress >= 25 ? 'bg-status-amber' : 'bg-coral-text'
                  )}
                  style={{ width: `${meeting.progress}%` }}
                />
              </div>
              <span className="text-xs text-text-secondary font-medium">{meeting.progress}%</span>
            </div>
            <div className="text-[11px] text-text-tertiary">{meeting.completedTasks}/{meeting.totalTasks} tasks</div>
          </div>
        ) : (
          <span className="text-xs text-text-tertiary">No tasks</span>
        )}
      </div>
    </Link>
  );
}
