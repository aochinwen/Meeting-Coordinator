'use client';

import Link from 'next/link';
import { Video, Square, CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fromDateStr, todayStr, type CalendarEvent } from '@/lib/calendar';
import { useCalendarHover } from './CalendarHoverContext';

function relativeDaysLabel(dateStr: string): string {
  const MS_PER_DAY = 86_400_000;
  const today = fromDateStr(todayStr()).getTime();
  const target = fromDateStr(dateStr).getTime();
  const diff = Math.round((target - today) / MS_PER_DAY);
  if (diff === 0) return 'Due today';
  if (diff === 1) return 'Due tomorrow';
  if (diff === -1) return 'Overdue by 1 day';
  if (diff > 0) return `Due in ${diff} days`;
  return `Overdue by ${Math.abs(diff)} days`;
}

export function EventChip({
  event,
  compact = false,
}: {
  event: CalendarEvent;
  compact?: boolean;
}) {
  const { hoveredMeetingId, setHoveredMeetingId } = useCalendarHover();
  
  const thisMeetingId = event.kind === 'meeting' ? event.id : event.meetingId;
  const isHovered = hoveredMeetingId === thisMeetingId;
  const isDarkened = hoveredMeetingId !== null && !isHovered;

  const baseClasses = cn(
    'group flex items-center gap-1.5 rounded-md transition-all duration-200 min-w-0 relative overflow-hidden',
    compact ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-1 text-xs',
    isHovered && 'ring-2 ring-white ring-offset-1 shadow-[0_0_8px_rgba(255,255,255,0.8)] z-10 scale-[1.02]',
    isDarkened && 'opacity-30',
  );

  const handleMouseEnter = () => setHoveredMeetingId(thisMeetingId);
  const handleMouseLeave = () => setHoveredMeetingId(null);

  if (event.kind === 'meeting') {
    const time = event.startTime ? event.startTime.slice(0, 5) : '';
    return (
      <Link
        href={`/meetings/${event.id}`}
        title={`${event.title}${time ? ` · ${time}` : ''}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn(
          baseClasses,
          'bg-status-green-bg/50 hover:bg-status-green-bg text-primary',
        )}
      >
        <Video className={cn(compact ? 'h-3 w-3' : 'h-3.5 w-3.5', 'shrink-0')} />
        {time && (
          <span className="font-medium tabular-nums shrink-0">{time}</span>
        )}
        <span className="truncate font-light">{event.title}</span>
      </Link>
    );
  }
  // task
  const Icon = event.isCompleted ? CheckSquare : Square;
  const relative = event.isCompleted ? 'Completed' : relativeDaysLabel(event.date);
  const tooltip = `Task: ${event.title}\nMeeting: ${event.meetingTitle}\n${relative}`;
  return (
    <Link
      href={`/meetings/${event.meetingId}?task=${event.id}`}
      title={tooltip}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        baseClasses,
        'bg-amber/40 hover:bg-amber/60 text-status-amber',
      )}
    >
      <Icon className={cn(compact ? 'h-3 w-3' : 'h-3.5 w-3.5', 'shrink-0')} />
      <span
        className={cn(
          'truncate font-light',
          event.isCompleted && 'line-through opacity-70',
        )}
      >
        {event.title}
      </span>
    </Link>
  );
}
