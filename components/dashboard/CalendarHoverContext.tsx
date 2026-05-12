'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface CalendarHoverContextType {
  hoveredMeetingId: string | null;
  setHoveredMeetingId: (id: string | null) => void;
  hoveredItemId: string | null;
  setHoveredItemId: (id: string | null) => void;
  expandedMeetingId: string | null;
  setExpandedMeetingId: (id: string | null) => void;
}

const CalendarHoverContext = createContext<CalendarHoverContextType | undefined>(undefined);

export function CalendarHoverProvider({ children }: { children: ReactNode }) {
  const [hoveredMeetingId, setHoveredMeetingId] = useState<string | null>(null);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [expandedMeetingId, setExpandedMeetingId] = useState<string | null>(null);
  
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const itemTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const setHoveredMeetingIdDebounced = React.useCallback((id: string | null) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setHoveredMeetingId(id);
    }, 150);
  }, []);

  const setHoveredItemIdDebounced = React.useCallback((id: string | null) => {
    if (itemTimeoutRef.current) clearTimeout(itemTimeoutRef.current);
    itemTimeoutRef.current = setTimeout(() => {
      setHoveredItemId(id);
    }, 150);
  }, []);

  useEffect(() => {
    function handleDocumentClick(e: PointerEvent) {
      if (!expandedMeetingId) return;
      const target = e.target as HTMLElement;
      if (!target.closest('[data-event-chip="true"]')) {
        setExpandedMeetingId(null);
      }
    }
    document.addEventListener('pointerdown', handleDocumentClick);
    return () => document.removeEventListener('pointerdown', handleDocumentClick);
  }, [expandedMeetingId]);

  return (
    <CalendarHoverContext.Provider value={{ 
      hoveredMeetingId, setHoveredMeetingId: setHoveredMeetingIdDebounced,
      hoveredItemId, setHoveredItemId: setHoveredItemIdDebounced,
      expandedMeetingId, setExpandedMeetingId 
    }}>
      {children}
    </CalendarHoverContext.Provider>
  );
}

export function useCalendarHover() {
  const context = useContext(CalendarHoverContext);
  if (context === undefined) {
    throw new Error('useCalendarHover must be used within a CalendarHoverProvider');
  }
  return context;
}
