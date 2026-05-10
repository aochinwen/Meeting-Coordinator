import { createClient } from '@/utils/supabase/client';
import { format, addDays, startOfDay, endOfDay } from 'date-fns';
import { Database } from '@/types/supabase';

export interface ReportSummary {
  totalMeetings: number;
  pendingTasks: number;
  completedTasks: number;
  mostActiveRoom: string | null;
}

export interface EmergencyMeeting {
  id: string;
  title: string;
  date: string;
  startTime: string | null;
  undoneTasksCount: number;
  totalTasksCount: number;
  roomName: string | null;
  tasks?: Array<{
    id: string;
    description: string;
    is_completed: boolean;
    due_days_before: number | null;
  }>;
}

export interface UserMetric {
  id: string;
  name: string;
  pastCount: number;
  nextCount: number;
  delta: number;
}

export interface RoomMetric {
  id: string;
  name: string;
  pastValue: number;
  nextValue: number;
  delta: number;
}

export async function getReportData(days: number = 7) {
  const supabase = createClient();
  const now = new Date();
  
  // Timeframes
  const startDate = format(startOfDay(now), 'yyyy-MM-dd');
  const endDate = format(endOfDay(addDays(now, days)), 'yyyy-MM-dd');
  
  const past30Start = format(startOfDay(addDays(now, -30)), 'yyyy-MM-dd');
  const next30End = format(endOfDay(addDays(now, 30)), 'yyyy-MM-dd');

  // 0. Fetch all people for mapping names
  const { data: allPeople, error: peopleErr } = await supabase
    .from('people')
    .select('id, name');
  
  if (peopleErr) throw peopleErr;
  const personMap = new Map<string, string>();
  allPeople?.forEach(p => personMap.set(p.id, p.name));

  // 1. Fetch upcoming meetings for urgency ranking
  const { data: upcomingMeetings, error: meetingsError } = await supabase
    .from('meetings')
    .select(`
      id,
      title,
      date,
      start_time,
      end_time,
      room_id,
      rooms(name),
      meeting_checklist_tasks(id, description, is_completed, due_days_before)
    `)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

  if (meetingsError) throw meetingsError;

  // 2. Process Emergency Meetings
  const emergencyMeetings: EmergencyMeeting[] = (upcomingMeetings || []).map(m => {
    const tasks = (m.meeting_checklist_tasks || []).map((t: any) => ({
      id: t.id,
      description: t.description,
      is_completed: t.is_completed,
      due_days_before: t.due_days_before
    }));
    const undone = tasks.filter(t => !t.is_completed).length;
    return {
      id: m.id,
      title: m.title,
      date: m.date,
      startTime: m.start_time,
      undoneTasksCount: undone,
      totalTasksCount: tasks.length,
      roomName: (m.rooms as any)?.name || null,
      tasks: tasks as any
    };
  }).sort((a, b) => b.undoneTasksCount - a.undoneTasksCount);

  // 3. Analytics Comparison: Past 30 vs Next 30
  const getMetricsForRange = async (start: string, end: string) => {
    const { data: mData } = await supabase
      .from('meetings')
      .select('chairman_id, room_id, rooms(name), start_time, end_time')
      .gte('date', start)
      .lte('date', end);

    const { data: pData } = await supabase
      .from('meeting_participants')
      .select('user_id, meetings!inner(date)')
      .gte('meetings.date', start)
      .lte('meetings.date', end);

    const hosts: Record<string, number> = {};
    mData?.forEach(m => {
      if (m.chairman_id) hosts[m.chairman_id] = (hosts[m.chairman_id] || 0) + 1;
    });

    const participants: Record<string, number> = {};
    pData?.forEach(p => {
      if (p.user_id) participants[p.user_id] = (participants[p.user_id] || 0) + 1;
    });

    const rooms: Record<string, { count: number, totalMinutes: number, name: string }> = {};
    mData?.forEach(m => {
      if (m.room_id) {
        const duration = calculateMinutes(m.start_time || '00:00', m.end_time || '00:00');
        if (!rooms[m.room_id]) rooms[m.room_id] = { count: 0, totalMinutes: 0, name: (m.rooms as any)?.name || 'Unknown' };
        rooms[m.room_id].count++;
        rooms[m.room_id].totalMinutes += duration;
      }
    });

    return { hosts, participants, rooms };
  };

  const [pastMetrics, nextMetrics] = await Promise.all([
    getMetricsForRange(past30Start, startDate),
    getMetricsForRange(startDate, next30End)
  ]);

  // Combined User Metrics (Hosts/Participants)
  const formatUserMetrics = (past: Record<string, number>, next: Record<string, number>) => {
    const allIds = new Set([...Object.keys(past), ...Object.keys(next)]);
    return Array.from(allIds).map(id => {
      const pCount = past[id] || 0;
      const nCount = next[id] || 0;
      const delta = pCount === 0 ? (nCount > 0 ? 100 : 0) : Math.round(((nCount - pCount) / pCount) * 100);
      return { id, name: personMap.get(id) || 'Unknown', pastCount: pCount, nextCount: nCount, delta };
    }).sort((a, b) => b.nextCount - a.nextCount || b.pastCount - a.pastCount).slice(0, 5);
  };

  const topHosts = formatUserMetrics(pastMetrics.hosts, nextMetrics.hosts);
  const topParticipants = formatUserMetrics(pastMetrics.participants, nextMetrics.participants);

  // Combined Room Metrics (Popularity/Intensity)
  const roomMetrics = Array.from(new Set([...Object.keys(pastMetrics.rooms), ...Object.keys(nextMetrics.rooms)])).map(id => {
    const p = pastMetrics.rooms[id] || { count: 0, totalMinutes: 0, name: 'Unknown' };
    const n = nextMetrics.rooms[id] || { count: 0, totalMinutes: 0, name: 'Unknown' };
    
    // Count metric
    const cDelta = p.count === 0 ? (n.count > 0 ? 100 : 0) : Math.round(((n.count - p.count) / p.count) * 100);
    
    // Intensity metric (avg minutes)
    const pAvg = p.count > 0 ? p.totalMinutes / p.count : 0;
    const nAvg = n.count > 0 ? n.totalMinutes / n.count : 0;
    const iDelta = pAvg === 0 ? (nAvg > 0 ? 100 : 0) : Math.round(((nAvg - pAvg) / pAvg) * 100);

    return {
      id,
      name: n.name === 'Unknown' ? p.name : n.name,
      popularity: { past: p.count, next: n.count, delta: cDelta },
      intensity: { past: Math.round(pAvg), next: Math.round(nAvg), delta: iDelta }
    };
  });

  const mostUsedRooms = [...roomMetrics].sort((a, b) => b.popularity.next - a.popularity.next).slice(0, 5);
  const longestMeetingRooms = [...roomMetrics].sort((a, b) => b.intensity.next - a.intensity.next).slice(0, 5);

  // 4. Trend Data: Past 1 month to Projected next 1 month DAILY
  const velocityStart = past30Start;
  const velocityEnd = next30End;
  const { data: trendData } = await supabase
    .from('meetings')
    .select('date, series_id')
    .gte('date', velocityStart)
    .lte('date', velocityEnd)
    .order('date', { ascending: true });

  const dailyCounts: Record<string, { oneTime: number, recurring: number }> = {};
  // Initialize with 0s for all dates in range
  let curr = new Date(velocityStart);
  const endLimit = new Date(velocityEnd);
  while (curr <= endLimit) {
    dailyCounts[format(curr, 'yyyy-MM-dd')] = { oneTime: 0, recurring: 0 };
    curr.setDate(curr.getDate() + 1);
  }
  
  trendData?.forEach(m => {
    const dateStr = m.date;
    if (dailyCounts[dateStr]) {
      if (m.series_id) {
        dailyCounts[dateStr].recurring++;
      } else {
        dailyCounts[dateStr].oneTime++;
      }
    }
  });

  const chartData = Object.entries(dailyCounts).map(([date, counts]) => ({ 
    date, 
    oneTime: counts.oneTime, 
    recurring: counts.recurring 
  })).sort((a, b) => a.date.localeCompare(b.date));

  // 5. Tasks due soon
  const { data: allTasks } = await supabase
    .from('meeting_checklist_tasks')
    .select(`
      id,
      description,
      is_completed,
      meeting_id,
      meetings(title, date)
    `)
    .eq('is_completed', false)
    .limit(10);

  const tasksDueSoon = (allTasks || []).map((t: any) => ({
    id: t.id,
    description: t.description,
    meetingId: t.meeting_id,
    meetingTitle: t.meetings?.title,
    date: t.meetings?.date
  })).sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  return {
    emergencyMeetings,
    topHosts,
    topParticipants,
    mostUsedRooms,
    longestMeetingRooms,
    tasksDueSoon,
    chartData,
    summary: {
      totalMeetings: upcomingMeetings?.length || 0,
      pendingTasks: emergencyMeetings.reduce((acc, m) => acc + m.undoneTasksCount, 0),
      completedTasks: upcomingMeetings?.reduce((acc, m) => acc + (m.meeting_checklist_tasks?.filter((t: any) => t.is_completed).length || 0), 0) || 0,
      mostActiveRoom: mostUsedRooms[0]?.name || null
    }
  };
}

function calculateMinutes(start: string, end: string): number {
  try {
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    return (h2 * 60 + m2) - (h1 * 60 + m1);
  } catch (e) {
    return 0;
  }
}
