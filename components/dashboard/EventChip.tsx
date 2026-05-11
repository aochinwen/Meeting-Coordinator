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
  const isHoveredOnly = isHovered && !isGroupExpanded;

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

  const getColors = (isExpandedState: boolean) => {
    if (event.kind === 'meeting') {
      return cn(
        'text-primary',
        isExpandedState ? 'bg-status-green-bg border border-status-green/30' : 'bg-status-green-bg/50 border border-transparent',
        !isExpandedState && isHighlighted && 'bg-status-green-bg/80'
      );
    } else {
      return cn(
        'text-status-amber',
        isExpandedState ? 'bg-amber border border-status-amber/30' : 'bg-amber/40 border border-transparent',
        !isExpandedState && isHighlighted && 'bg-amber/60'
      );
    }
  };

  const renderContent = (isExpandedState: boolean) => {
    if (event.kind === 'meeting') {
      const time = event.startTime ? event.startTime.slice(0, 5) : '';
      return (
        <>
          <div className="flex items-center gap-1.5 shrink-0">
            <Video className={cn(compact ? 'h-3 w-3' : 'h-3.5 w-3.5', 'shrink-0')} />
            {time && <span className="font-medium tabular-nums shrink-0">{time}</span>}
          </div>
          <span className={cn('font-light text-left flex-1 min-w-0', isExpandedState ? 'whitespace-normal break-words mt-1 mb-2' : (compact ? 'line-clamp-2' : 'line-clamp-3'))}>
            {event.title}
          </span>
          {isExpandedState && (
            <div className="flex flex-col gap-1.5 mt-2 border-t border-status-green/20 pt-2 text-xs opacity-80">
              {event.description && (
                <div className="font-normal italic break-words line-clamp-3 mb-1">
                  {event.description}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 mt-1">
                {event.date && (
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase tracking-wider font-medium opacity-60">Meeting Date</span>
                    <span className="font-medium">{event.date}</span>
                  </div>
                )}
                {event.createdByName && (
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase tracking-wider font-medium opacity-60">Created By</span>
                    <span className="font-medium truncate">{event.createdByName}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      );
    } else {
      const Icon = event.isCompleted ? CheckSquare : Square;
      return (
        <>
          <div className="flex items-center gap-1.5 shrink-0">
            <Icon className={cn(compact ? 'h-3 w-3' : 'h-3.5 w-3.5', 'shrink-0')} />
          </div>
          <span className={cn('font-light text-left flex-1 min-w-0', isExpandedState ? 'whitespace-normal break-words' : (compact ? 'line-clamp-2' : 'line-clamp-3'), event.isCompleted && 'line-through opacity-70')}>
            {event.title}
          </span>
        </>
      );
    }
  };

  const baseTitle = event.kind === 'meeting'
    ? `${event.title}${event.startTime ? ` · ${event.startTime.slice(0, 5)}` : ''}`
    : `Task: ${event.title}\nMeeting: ${event.meetingTitle}\n${event.isCompleted ? 'Completed' : relativeDaysLabel(event.date)}`;

  const href = event.kind === 'meeting' ? `/meetings/${event.id}` : `/meetings/${event.meetingId}?task=${event.id}`;

  const renderLink = (isExpandedState: boolean, isAbsolute: boolean, isPlaceholder: boolean) => {
    const classes = cn(
      'flex items-start rounded-md transition-all duration-[250ms] ease-in-out overflow-hidden',
      'flex-col gap-0.5',
      'px-2 py-1 text-xs',
      isExpandedState
        ? 'w-full max-h-[200px] ring-1 ring-black/5 shadow-xl z-[100] scale-[1.02] opacity-100'
        : cn('w-full', compact ? 'max-h-[48px]' : 'max-h-[80px]'),
      isGroupExpanded && isExpandedState && 'mb-1',
      isAbsolute ? 'absolute top-0 left-0' : 'relative',
      !isPlaceholder && !isExpandedState && isDarkened && 'opacity-30',
      isPlaceholder && 'opacity-0 pointer-events-none',
      getColors(isExpandedState)
    );

    return (
      <Link
        key={isPlaceholder ? 'placeholder' : 'main'}
        href={href}
        title={isGroupExpanded ? baseTitle : `${baseTitle}\n\nClick to expand all`}
        onClick={handleClick}
        data-event-chip="true"
        className={classes}
        aria-hidden={isPlaceholder ? 'true' : undefined}
      >
        {renderContent(isExpandedState)}
      </Link>
    );
  };

  return (
    <div
      className={cn("relative w-full", isHoveredOnly && "z-[100]")}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {isHoveredOnly ? (
        <>
          {renderLink(false, false, true)}
          {renderLink(true, true, false)}
        </>
      ) : (
        renderLink(isGroupExpanded, false, false)
      )}
    </div>
  );
}
