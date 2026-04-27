'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface CalendarHoverContextType {
  hoveredMeetingId: string | null;
  setHoveredMeetingId: (id: string | null) => void;
}

const CalendarHoverContext = createContext<CalendarHoverContextType | undefined>(undefined);

export function CalendarHoverProvider({ children }: { children: ReactNode }) {
  const [hoveredMeetingId, setHoveredMeetingId] = useState<string | null>(null);

  return (
    <CalendarHoverContext.Provider value={{ hoveredMeetingId, setHoveredMeetingId }}>
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
