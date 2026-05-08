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
  const { 
    hoveredMeetingId, setHoveredMeetingId, 
    hoveredItemId, setHoveredItemId, 
    expandedMeetingId, setExpandedMeetingId 
  } = useCalendarHover();
  
  const thisMeetingId = event.kind === 'meeting' ? event.id : event.meetingId;
  const thisItemId = `${event.kind}-${event.id}`;
  
  const isHovered = hoveredItemId === thisItemId;
  const isGroupExpanded = expandedMeetingId === thisMeetingId;
  const isExpanded = isHovered || isGroupExpanded;
  
  const isHighlighted = hoveredMeetingId === thisMeetingId || expandedMeetingId === thisMeetingId;
  const isDarkened = (hoveredMeetingId !== null || expandedMeetingId !== null) && !isHighlighted;

  const handleMouseEnter = () => {
    setHoveredMeetingId(thisMeetingId);
    setHoveredItemId(thisItemId);
  };
  const handleMouseLeave = () => {
    setHoveredMeetingId(null);
    setHoveredItemId(null);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!isGroupExpanded) {
      e.preventDefault();
      setExpandedMeetingId(thisMeetingId);
    }
  };

  const linkClasses = cn(
    'flex items-start gap-1.5 rounded-md transition-all duration-[250ms] ease-in-out relative overflow-hidden',
    compact ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-1 text-xs',
    isExpanded 
      ? 'w-max min-w-[100%] max-w-[200px] sm:max-w-[250px] max-h-[200px] ring-2 ring-white ring-offset-1 shadow-md z-50 scale-[1.02] mb-1' 
      : cn('w-full', compact ? 'max-h-[20px]' : 'max-h-[24px]'),
    isDarkened && 'opacity-30',
  );

  if (event.kind === 'meeting') {
    const time = event.startTime ? event.startTime.slice(0, 5) : '';
    const baseTitle = `${event.title}${time ? ` · ${time}` : ''}`;
    return (
      <Link
        href={`/meetings/${event.id}`}
        title={isGroupExpanded ? baseTitle : `${baseTitle}\n\nClick to expand all`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        data-event-chip="true"
        className={cn(
          linkClasses,
          'text-primary',
          isExpanded ? 'bg-[#ebf5ed] border border-status-green/20' : 'bg-status-green-bg/50 border border-transparent',
          !isExpanded && isHighlighted && 'bg-status-green-bg/80' // highlight effect without expanding
        )}
      >
        <Video className={cn(compact ? 'h-3 w-3 mt-0.5' : 'h-3.5 w-3.5 mt-0.5', 'shrink-0')} />
        {time && (
          <span className="font-medium tabular-nums shrink-0">{time}</span>
        )}
        <span className={cn('font-light text-left', isExpanded ? 'whitespace-normal break-words' : 'truncate')}>
          {event.title}
        </span>
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
      title={isGroupExpanded ? tooltip : `${tooltip}\n\nClick to expand all`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      data-event-chip="true"
      className={cn(
        linkClasses,
        'text-status-amber',
        isExpanded ? 'bg-[#fef3c7] border border-status-amber/20' : 'bg-amber/40 border border-transparent',
        !isExpanded && isHighlighted && 'bg-amber/60' // highlight effect without expanding
      )}
    >
      <Icon className={cn(compact ? 'h-3 w-3 mt-0.5' : 'h-3.5 w-3.5 mt-0.5', 'shrink-0')} />
      <span
        className={cn(
          'font-light text-left',
          isExpanded ? 'whitespace-normal break-words' : 'truncate',
          event.isCompleted && 'line-through opacity-70',
        )}
      >
        {event.title}
      </span>
    </Link>
  );
}
