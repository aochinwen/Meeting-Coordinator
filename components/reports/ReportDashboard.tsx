'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Check,
  Users, 
  MapPin, 
  Clock, 
  Calendar,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  User,
  ArrowUpRight,
} from 'lucide-react';
// No date-fns import needed

import { cn } from '@/lib/utils';
import { EmergencyMeeting, UserMetric, ReportSummary } from '@/lib/reports';

interface ReportDashboardProps {
  initialData: {
    emergencyMeetings: EmergencyMeeting[];
    topHosts: UserMetric[];
    topParticipants: UserMetric[];
    mostUsedRooms: Array<{
      id: string;
      name: string;
      popularity: { past: number, next: number, delta: number };
      intensity: { past: number, next: number, delta: number };
    }>;
    longestMeetingRooms: Array<{
      id: string;
      name: string;
      popularity: { past: number, next: number, delta: number };
      intensity: { past: number, next: number, delta: number };
    }>;
    tasksDueSoon: any[];
    chartData: { date: string, oneTime: number, recurring: number }[];
    summary: ReportSummary;
  };
}

export function ReportDashboard({ initialData }: ReportDashboardProps) {
  const { summary, emergencyMeetings, topHosts, topParticipants, mostUsedRooms = [], longestMeetingRooms = [], tasksDueSoon = [], chartData = [] } = initialData;

  return (
    <div className="relative flex flex-col gap-10 pb-12">
      {/* Background Decorative Elements */}
      <BackgroundBlobs />

      {/* Header & Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
        <MetricCard 
          title="Upcoming Meetings" 
          value={summary?.totalMeetings || 0} 
          icon={<Calendar className="w-5 h-5 text-primary" />} 
          trend="Next 7 days"
          color="bg-primary/10"
        />
        <MetricCard 
          title="Pending Tasks" 
          value={summary?.pendingTasks || 0} 
          icon={<Clock className="w-5 h-5 text-amber-600" />} 
          trend="Total incomplete"
          color="bg-amber-100"
        />
        <MetricCard 
          title="Task Completion" 
          value={summary?.completedTasks || 0} 
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />} 
          trend="Successfully closed"
          color="bg-emerald-100"
        />
        <MetricCard 
          title="Busiest Hub" 
          value={summary?.mostActiveRoom || 'N/A'} 
          icon={<MapPin className="w-5 h-5 text-indigo-600" />} 
          trend="Most used room"
          color="bg-indigo-100"
        />
      </div>

      {/* Trend Chart */}
      <div className="bg-white/30 backdrop-blur-2xl rounded-[40px] border border-white/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] p-8 lg:p-10 relative z-10 transition-all hover:bg-white/40">
        <div className="flex items-center justify-between mb-10">
          <SectionHeader 
            title="Meeting Velocity" 
            subtitle="Past 1 month to Projected next 1 month" 
            icon={<TrendingUp className="w-5 h-5 text-primary" />}
          />
          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-text-tertiary">
            <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-sm" />
            <span>Daily Activity</span>
          </div>
        </div>
        <div className="w-full">
          <TrendChart data={chartData} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative z-10">
        {/* Emergency Meetings */}
        <div className="flex flex-col gap-6 md:col-span-2">
          <SectionHeader 
            title="Action Required" 
            subtitle="Meetings ranked by uncompleted items" 
            icon={<AlertTriangle className="w-5 h-5 text-rose-500" />}
          />
          <div className="grid grid-cols-1 gap-4">
            {(emergencyMeetings || []).slice(0, 5).map((meeting) => (
              <EmergencyMeetingCard key={meeting.id} meeting={meeting} />
            ))}
          </div>
        </div>

        {/* Tasks Due Soon */}
        <div className="flex flex-col gap-6 md:col-span-1">
          <SectionHeader 
            title="Upcoming Deadlines" 
            subtitle="Tasks needing immediate attention" 
            icon={<Clock className="w-5 h-5 text-primary" />}
          />
          <div className="bg-white/30 backdrop-blur-2xl rounded-[40px] border border-white/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] p-8 flex flex-col gap-5 transition-all hover:bg-white/40">
            {tasksDueSoon.length > 0 ? tasksDueSoon.slice(0, 8).map((task) => (
              <Link 
                href={`/meetings/${task.meetingId}`}
                key={task.id} 
                className="flex items-start gap-4 group cursor-pointer hover:bg-white/50 p-3 -m-3 rounded-2xl transition-all duration-300"
              >
                <div className="mt-2 w-2 h-2 rounded-full bg-primary/20 group-hover:bg-primary group-hover:scale-125 transition-all shrink-0" />
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-sm font-semibold text-text-primary truncate group-hover:text-primary transition-colors">{task.description}</span>
                  <span className="text-[10px] text-text-tertiary truncate uppercase tracking-wider font-bold">{task.meetingTitle} • {task.date}</span>
                </div>
                <div className="ml-auto flex items-center justify-center w-8 h-8 rounded-full bg-white/0 group-hover:bg-white/80 transition-all">
                  <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all text-primary" />
                </div>
              </Link>
            )) : (
              <div className="py-12 text-center text-text-tertiary text-sm italic font-medium">No urgent tasks found</div>
            )}
          </div>
        </div>
      </div>

      {/* Analytics Tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 relative z-10">
        <AnalyticsTable 
          title="Top Meeting Hosts" 
          icon={<User className="w-5 h-5 text-primary" />}
          headers={['Host Name', 'Past 30d', 'Next 30d', 'Change']}
          data={(topHosts || []).map(h => ({
            id: h.id,
            name: h.name,
            past: h.pastCount,
            next: h.nextCount,
            delta: h.delta
          }))}
        />
        
        <AnalyticsTable 
          title="Active Participants" 
          icon={<Users className="w-5 h-5 text-indigo-600" />}
          headers={['Participant', 'Past 30d', 'Next 30d', 'Change']}
          data={(topParticipants || []).map(p => ({
            id: p.id,
            name: p.name,
            past: p.pastCount,
            next: p.nextCount,
            delta: p.delta
          }))}
        />

        <AnalyticsTable 
          title="Room Popularity" 
          icon={<MapPin className="w-5 h-5 text-emerald-600" />}
          headers={['Meeting Room', 'Past 30d', 'Next 30d', 'Change']}
          data={(mostUsedRooms || []).map(r => ({
            id: r.id,
            name: r.name,
            past: r.popularity?.past || 0,
            next: r.popularity?.next || 0,
            delta: r.popularity?.delta || 0
          }))}
        />

        <AnalyticsTable 
          title="Meeting Intensity" 
          icon={<Clock className="w-5 h-5 text-amber-600" />}
          headers={['Room Name', 'Past Avg', 'Next Avg', 'Change']}
          data={(longestMeetingRooms || []).map(r => ({
            id: r.id,
            name: r.name,
            past: `${r.intensity?.past || 0}m`,
            next: `${r.intensity?.next || 0}m`,
            delta: r.intensity?.delta || 0
          }))}
        />
      </div>
    </div>
  );
}

function BackgroundBlobs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -m-10">
      <div className="absolute top-0 -left-20 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] animate-pulse-slow" />
      <div className="absolute top-1/3 -right-20 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[100px] animate-pulse-slow [animation-delay:2s]" />
      <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[120px] animate-pulse-slow [animation-delay:4s]" />
    </div>
  );
}

function MetricCard({ title, value, icon, trend, color }: { title: string, value: string | number, icon: React.ReactNode, trend: string, color: string }) {
  return (
    <div className="bg-white/40 backdrop-blur-2xl border border-white/60 p-7 rounded-[40px] shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] flex flex-col gap-4 hover:shadow-xl hover:bg-white/60 hover:-translate-y-1 transition-all duration-300 group">
      <div className="flex items-center justify-between">
        <div className={cn("p-3.5 rounded-[20px] shadow-sm", color)}>
          {icon}
        </div>
        <div className="p-2 rounded-full bg-emerald-50 text-emerald-600 scale-90 opacity-0 group-hover:opacity-100 transition-all">
          <TrendingUp className="w-4 h-4" />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-4xl font-bold text-text-primary tracking-tight font-literata">{value}</span>
        <span className="text-sm font-semibold text-text-secondary">{title}</span>
      </div>
      <div className="text-[10px] uppercase tracking-[2px] text-text-tertiary font-black opacity-80">{trend}</div>
    </div>
  );
}

function SectionHeader({ title, subtitle, icon }: { title: string, subtitle: string, icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-5">
      <div className="w-12 h-12 flex items-center justify-center rounded-[18px] bg-white/60 backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.03)] border border-white/80">
        {icon}
      </div>
      <div className="flex flex-col">
        <h2 className="text-2xl font-bold text-text-primary leading-none tracking-tight font-literata">{title}</h2>
        <p className="mt-1 text-[11px] font-bold text-text-tertiary uppercase tracking-[1.5px] opacity-70">{subtitle}</p>
      </div>
    </div>
  );
}

function EmergencyMeetingCard({ meeting }: { meeting: EmergencyMeeting }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const percentage = meeting.totalTasksCount > 0 
    ? Math.round(( (meeting.totalTasksCount - meeting.undoneTasksCount) / meeting.totalTasksCount) * 100) 
    : 100;

  const urgencyColor = meeting.undoneTasksCount > 5 ? 'bg-rose-500' : meeting.undoneTasksCount > 2 ? 'bg-amber-500' : 'bg-emerald-500';
  const urgencyText = meeting.undoneTasksCount > 5 ? 'text-rose-600' : meeting.undoneTasksCount > 2 ? 'text-amber-600' : 'text-emerald-600';
  const urgencyLight = meeting.undoneTasksCount > 5 ? 'bg-rose-50/80' : meeting.undoneTasksCount > 2 ? 'bg-amber-50/80' : 'bg-emerald-50/80';
  const urgencyBlur = meeting.undoneTasksCount > 5 ? 'shadow-rose-100' : meeting.undoneTasksCount > 2 ? 'shadow-amber-100' : 'shadow-emerald-100';

  return (
    <div className={cn(
      "bg-white/30 backdrop-blur-2xl rounded-[36px] border border-white/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.03)] transition-all duration-500 overflow-hidden group", 
      isExpanded ? "bg-white/80 shadow-2xl ring-1 ring-primary/10" : "hover:bg-white/50 hover:shadow-lg hover:-translate-y-0.5"
    )}>
      <div className="p-6 flex items-center gap-7 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className={cn(
          "w-16 h-16 rounded-[24px] flex items-center justify-center shrink-0 shadow-xl transition-all duration-500", 
          urgencyLight, urgencyBlur, isExpanded && "scale-110 rotate-3"
        )}>
          <span className={cn("text-2xl font-bold font-literata", urgencyText)}>{meeting.undoneTasksCount}</span>
        </div>
        <div className="flex flex-col gap-2 flex-1 min-w-0 py-1">
          <h3 className="font-bold text-text-primary text-lg sm:text-xl leading-tight tracking-tight group-hover:text-primary transition-colors font-literata">{meeting.title}</h3>
          <div className="flex items-center mt-1">
            <span className="text-[9px] px-2.5 py-1 rounded-full bg-white/60 backdrop-blur-sm border border-white/80 text-text-tertiary font-black shrink-0 uppercase tracking-widest">{meeting.roomName || 'No Room'}</span>
          </div>
        </div>
        <div className="hidden md:flex flex-col gap-3.5 w-48 shrink-0">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-widest font-black text-text-tertiary opacity-60">
              <span>Ready State</span>
              <span className={urgencyText}>{percentage}%</span>
            </div>
            <div className="h-2 w-full bg-white/40 rounded-full overflow-hidden shadow-inner border border-white/20">
              <div className={cn("h-full transition-all duration-1000 ease-out", urgencyColor)} style={{ width: `${percentage}%` }} />
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] font-bold text-text-tertiary opacity-80 pt-1">
            <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-primary/60" />{meeting.date}</div>
            <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-primary/60" />{meeting.startTime || 'TBD'}</div>
          </div>
        </div>
        <div className={cn(
          "w-10 h-10 flex items-center justify-center rounded-full bg-white/60 border border-white text-text-tertiary transition-all duration-500", 
          isExpanded && "bg-primary text-white border-primary rotate-180 shadow-lg shadow-primary/20"
        )}>
          <ChevronDown className="w-5 h-5" />
        </div>
      </div>
      {isExpanded && (
        <div className="px-8 pb-8 pt-2 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="border-t border-white/40 pt-6 flex flex-col gap-4">
            <div className="text-[10px] font-black uppercase tracking-[3px] text-text-tertiary mb-2 opacity-50">Detailed Tasks</div>
            <div className="grid grid-cols-1 gap-3">
              {meeting.tasks && meeting.tasks.length > 0 ? meeting.tasks.map((task: any) => (
                <div key={task.id} className="flex items-center justify-between py-3.5 px-5 rounded-[22px] bg-white/40 border border-white/60 hover:bg-white/60 transition-all duration-300">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-5 h-5 rounded border-[1.5px] flex items-center justify-center shrink-0 transition-all duration-300 shadow-sm", 
                      task.is_completed ? "bg-emerald-500 border-emerald-500 scale-110" : "border-slate-300 bg-white/60"
                    )}>
                      {task.is_completed && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                    </div>
                    <span className={cn("text-sm font-semibold transition-all", task.is_completed ? "text-text-tertiary line-through opacity-60" : "text-text-primary")}>{task.description}</span>
                  </div>
                  {task.due_days_before !== null && (
                    <span className="text-[10px] font-black px-3 py-1 rounded-xl bg-white shadow-sm border border-white/80 text-text-tertiary uppercase tracking-wider">
                      D-{task.due_days_before}
                    </span>
                  )}
                </div>
              )) : (
                <div className="text-sm text-text-tertiary italic text-center py-6">No tasks found for this meeting</div>
              )}
            </div>
            <Link 
              href={`/meetings/${meeting.id}`} 
              className="mt-6 py-4 bg-primary text-white text-center rounded-[24px] text-sm font-bold shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:scale-[1.02] transition-all active:scale-[0.98] uppercase tracking-widest"
            >
              View Full Meeting Details
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function AnalyticsTable({ title, icon, headers, data }: { title: string, icon: React.ReactNode, headers: string[], data: any[] }) {
  return (
    <div className="bg-white/30 backdrop-blur-2xl rounded-[40px] border border-white/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)] p-8 flex flex-col gap-8 transition-all hover:bg-white/40">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/60 border border-white shadow-sm">{icon}</div>
        <h3 className="text-sm font-black text-text-primary uppercase tracking-[2px] opacity-80">{title}</h3>
      </div>
      <div className="overflow-x-auto -mx-2 px-2">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/40">
              {headers.map((h, i) => (
                <th key={i} className={cn("pb-5 text-[10px] font-black uppercase tracking-[2px] text-text-tertiary opacity-50", i > 0 && "text-right")}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/20">
            {data.map((row) => (
              <tr key={row.id} className="group hover:bg-white/40 transition-all duration-300">
                <td className="py-5 text-sm font-bold text-text-secondary group-hover:text-primary transition-colors tracking-tight font-literata">{row.name}</td>
                <td className="py-5 text-sm font-semibold text-text-tertiary text-right">{row.past}</td>
                <td className="py-5 text-sm font-bold text-text-primary text-right">{row.next}</td>
                <td className="py-5 text-right"><DeltaBadge value={row.delta} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DeltaBadge({ value }: { value: number }) {
  if (value === 0) return <span className="text-[10px] font-black text-slate-300 tracking-widest">0%</span>;
  const isPositive = value > 0;
  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black ml-auto shadow-sm transition-transform group-hover:scale-110", 
      isPositive ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-600 border border-rose-100"
    )}>
      {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {Math.abs(value)}%
    </div>
  );
}

function TrendChart({ data }: { data: { date: string, oneTime: number, recurring: number }[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  if (data.length === 0) return null;

  const maxCount = Math.max(...data.map(d => Math.max(d.oneTime, d.recurring)), 1);
  const width = 1000;
  const height = 280;
  const padding = 30;

  const today = new Date().toISOString().split('T')[0];
  const todayIndex = data.findIndex(d => d.date >= today);
  const splitIndex = todayIndex === -1 ? data.length - 1 : todayIndex;

  const getPoints = (key: 'oneTime' | 'recurring') => data.map((d, i) => {
    const x = (i / (data.length - 1)) * (width - padding * 2) + padding;
    const y = height - ((d[key] / maxCount) * (height - padding * 2) + padding);
    return { x, y };
  });

  const oneTimePoints = getPoints('oneTime');
  const recurringPoints = getPoints('recurring');

  const generatePath = (points: { x: number, y: number }[]) => {
    if (points.length === 0) return "";
    return points.reduce((acc, p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = points[i - 1];
      const cp1x = prev.x + (p.x - prev.x) / 3;
      const cp2x = prev.x + 2 * (p.x - prev.x) / 3;
      return `${acc} C ${cp1x} ${prev.y}, ${cp2x} ${p.y}, ${p.x} ${p.y}`;
    }, "");
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const index = Math.round((x / rect.width) * (data.length - 1));
    setHoveredIndex(Math.max(0, Math.min(data.length - 1, index)));
  };

  return (
    <div className="relative group flex flex-col gap-8" onMouseMove={handleMouseMove} onMouseLeave={() => setHoveredIndex(null)} ref={containerRef}>
      <div className="flex items-center gap-8 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-primary shadow-sm shadow-primary/40" />
          <span className="text-[9px] font-black text-text-tertiary uppercase tracking-[2px]">One-time</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/40" />
          <span className="text-[9px] font-black text-text-tertiary uppercase tracking-[2px]">Recurring</span>
        </div>
        <div className="ml-auto flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 bg-slate-300 rounded-full" />
            <span className="text-[9px] font-bold text-text-tertiary opacity-60 uppercase tracking-widest">History</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 border-t-2 border-dashed border-slate-400" />
            <span className="text-[9px] font-bold text-text-tertiary opacity-60 uppercase tracking-widest">Forecast</span>
          </div>
        </div>
      </div>

      <div className="relative h-[280px] w-full shrink-0">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          {/* Gradients for fills */}
          <defs>
            <linearGradient id="fill-primary" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.1" />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="fill-indigo" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Paths */}
          <path d={generatePath(oneTimePoints.slice(0, splitIndex + 1))} fill="none" stroke="var(--color-primary)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-sm" />
          <path d={generatePath(oneTimePoints.slice(splitIndex))} fill="none" stroke="var(--color-primary)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="8 8" opacity="0.4" />
          
          <path d={generatePath(recurringPoints.slice(0, splitIndex + 1))} fill="none" stroke="#6366f1" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-sm" />
          <path d={generatePath(recurringPoints.slice(splitIndex))} fill="none" stroke="#6366f1" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="8 8" opacity="0.4" />
          
          {hoveredIndex !== null && (
            <>
              <line x1={oneTimePoints[hoveredIndex].x} y1={0} x2={oneTimePoints[hoveredIndex].x} y2={height} stroke="white" strokeWidth="2" opacity="0.5" />
              <circle cx={oneTimePoints[hoveredIndex].x} cy={oneTimePoints[hoveredIndex].y} r="7" fill="var(--color-primary)" stroke="white" strokeWidth="3" className="shadow-xl" />
              <circle cx={recurringPoints[hoveredIndex].x} cy={recurringPoints[hoveredIndex].y} r="7" fill="#6366f1" stroke="white" strokeWidth="3" className="shadow-xl" />
            </>
          )}
        </svg>

        {hoveredIndex !== null && (
          <div 
            className="absolute z-20 pointer-events-none bg-text-primary/90 backdrop-blur-xl text-white p-5 rounded-[24px] shadow-2xl animate-in fade-in zoom-in-95 duration-300 border border-white/20"
            style={{ 
              left: `${(hoveredIndex / (data.length - 1)) * 100}%`,
              top: `${Math.min(oneTimePoints[hoveredIndex].y, recurringPoints[hoveredIndex].y) / height * 100}%`,
              transform: 'translate(-50%, -120%)'
            }}
          >
            <div className="font-black text-[10px] uppercase tracking-[2px] mb-3 pb-2 border-b border-white/10 flex items-center justify-between gap-4">
              {new Date(data[hoveredIndex].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              {data[hoveredIndex].date >= today && <span className="px-2 py-0.5 bg-primary/40 rounded-md text-[8px]">PROJ</span>}
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-8">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                  <span className="text-xs font-bold opacity-70">One-time</span>
                </div>
                <span className="text-sm font-black font-literata">{data[hoveredIndex].oneTime}</span>
              </div>
              <div className="flex items-center justify-between gap-8">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                  <span className="text-xs font-bold opacity-70">Recurring</span>
                </div>
                <span className="text-sm font-black font-literata">{data[hoveredIndex].recurring}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between px-2 mt-6">
        {data.filter((_, i) => i % Math.ceil(data.length / 6) === 0 || i === data.length - 1).map((d) => (
          <span key={d.date} className="text-[9px] font-black text-text-tertiary uppercase tracking-[2px] opacity-40">
            {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        ))}
      </div>
    </div>
  );
}
