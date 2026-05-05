'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  X,
  Calendar,
  ArrowRight,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/utils/supabase/client';
import {
  updateMeetingOccurrence,
  setMeetingTasks,
  applyTaskTemplateToMeetings,
  splitSeriesAtDate,
  addMeetingParticipants,
  removeMeetingParticipant,
  type TaskDraft,
} from '@/lib/meetings';
import { PeoplePicker, type PersonOption } from '@/components/ui/PeoplePicker';

interface EditMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId: string;
  seriesId: string | null;
  meetingDate: string;
  currentValues: {
    title: string;
    description?: string;
    date: string;
    start_time?: string;
    end_time?: string;
  };
  onSuccess?: (newMeetingId?: string) => void;
}

type EditScope = 'single' | 'following';

interface SeriesPattern {
  frequency: 'daily' | 'weekly' | 'bi-weekly' | 'monthly';
  days_of_week: string[] | null;
  duration_minutes: number | null;
  buffer_minutes: number | null;
  timezone: string | null;
  end_date: string | null;
  template_id: string | null;
}

/* -------------------------------------------------------------------------- */
/*                        Due-date <-> days-before utils                      */
/* -------------------------------------------------------------------------- */

function calcDaysBefore(absoluteDate: string, meetingDate: string): number | null {
  if (!absoluteDate || !meetingDate) return null;
  const md = new Date(meetingDate + 'T00:00:00');
  const dd = new Date(absoluteDate + 'T00:00:00');
  const diff = Math.round((md.getTime() - dd.getTime()) / 86400000);
  return diff >= 0 ? diff : null;
}

function calcAbsoluteDue(daysBefore: number | null, meetingDate: string): string {
  if (daysBefore == null || !meetingDate) return '';
  const d = new Date(meetingDate + 'T00:00:00');
  d.setDate(d.getDate() - daysBefore);
  return d.toISOString().split('T')[0];
}

/* -------------------------------------------------------------------------- */
/*                               Component                                    */
/* -------------------------------------------------------------------------- */

export function EditMeetingModal({
  isOpen,
  onClose,
  meetingId,
  seriesId,
  meetingDate,
  currentValues,
  onSuccess,
}: EditMeetingModalProps) {
  const supabase = createClient();
  const isRecurring = !!seriesId;

  const [scope, setScope] = useState<EditScope>('single');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Core meeting fields
  const [title, setTitle] = useState(currentValues.title);
  const [description, setDescription] = useState(currentValues.description ?? '');
  const [date, setDate] = useState(currentValues.date);
  const [startTime, setStartTime] = useState(currentValues.start_time ?? '');
  const [endTime, setEndTime] = useState(currentValues.end_time ?? '');

  // People
  const [people, setPeople] = useState<PersonOption[]>([]);
  const [chairmanIds, setChairmanIds] = useState<string[]>([]);
  const [coordinatorIds, setCoordinatorIds] = useState<string[]>([]);
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [originalParticipantIds, setOriginalParticipantIds] = useState<string[]>([]);

  // Tasks
  const [tasks, setTasks] = useState<TaskDraft[]>([]);

  // Series pattern (for split)
  const [seriesPattern, setSeriesPattern] = useState<SeriesPattern | null>(null);

  /* --------------------------- Load when opened --------------------------- */

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setScope('single');
    setLoading(true);

    (async () => {
      // 1. Load people directory.
      const { data: peopleRows } = await supabase
        .from('people')
        .select('id, name, division, rank')
        .order('name');
      setPeople(peopleRows || []);

      // 2. Load meeting row to get chairman/coordinator + sync core fields.
      const { data: meeting } = await supabase
        .from('meetings')
        .select('chairman_id, coordinator_id, title, description, date, start_time, end_time')
        .eq('id', meetingId)
        .single();
      if (meeting) {
        setTitle(meeting.title ?? currentValues.title);
        setDescription(meeting.description ?? '');
        setDate(meeting.date ?? currentValues.date);
        setStartTime(meeting.start_time ?? '');
        setEndTime(meeting.end_time ?? '');
        setChairmanIds(meeting.chairman_id ? [meeting.chairman_id] : []);
        setCoordinatorIds(meeting.coordinator_id ? [meeting.coordinator_id] : []);
      }

      // 3. Load participants.
      const { data: parts } = await supabase
        .from('meeting_participants')
        .select('user_id')
        .eq('meeting_id', meetingId);
      const ids = (parts || []).map((p) => p.user_id);
      setParticipantIds(ids);
      setOriginalParticipantIds(ids);

      // 4. Load tasks + assignee junction. Order by created_at on the
      //    server and apply sort_order client-side so the modal still works
      //    if migration 008 has not been applied yet.
      const { data: taskRowsRaw } = await supabase
        .from('meeting_checklist_tasks')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('created_at', { ascending: true });
      const taskRows = [...(taskRowsRaw || [])].sort((a, b) => {
        const ao = a.sort_order ?? Number.MAX_SAFE_INTEGER;
        const bo = b.sort_order ?? Number.MAX_SAFE_INTEGER;
        if (ao !== bo) return ao - bo;
        return String(a.created_at).localeCompare(String(b.created_at));
      });
      const taskIds = (taskRows || []).map((t) => t.id);
      const assigneeMap = new Map<string, string[]>();
      if (taskIds.length > 0) {
        const { data: assigneeRows } = await supabase
          .from('meeting_task_assignees')
          .select('task_id, person_id')
          .in('task_id', taskIds);
        for (const row of assigneeRows || []) {
          const list = assigneeMap.get(row.task_id) ?? [];
          list.push(row.person_id);
          assigneeMap.set(row.task_id, list);
        }
      }
      setTasks(
        (taskRows || []).map((t, i) => ({
          id: t.id,
          description: t.description,
          due_days_before: t.due_days_before,
          assignee_ids: assigneeMap.get(t.id) ?? [],
          sort_order: t.sort_order ?? i + 1,
          is_completed: t.is_completed,
        }))
      );

      // 5. Load series pattern if recurring.
      if (seriesId) {
        const { data: series } = await supabase
          .from('meeting_series')
          .select(
            'frequency, days_of_week, duration_minutes, buffer_minutes, timezone, end_date, template_id'
          )
          .eq('id', seriesId)
          .single();
        if (series) {
          setSeriesPattern({
            frequency: series.frequency as SeriesPattern['frequency'],
            days_of_week: series.days_of_week,
            duration_minutes: series.duration_minutes,
            buffer_minutes: series.buffer_minutes,
            timezone: series.timezone,
            end_date: series.end_date,
            template_id: series.template_id,
          });
        }
      } else {
        setSeriesPattern(null);
      }

      setLoading(false);
    })().catch((e) => {
      console.error('Failed to load meeting for edit:', e);
      setError('Failed to load meeting data.');
      setLoading(false);
    });
  }, [isOpen, meetingId, seriesId, supabase, currentValues.title, currentValues.date]);

  /* -------------------------- Task editor handlers ------------------------- */

  function addTask() {
    setTasks((prev) => [
      ...prev,
      {
        description: '',
        due_days_before: null,
        assignee_ids: [],
        sort_order: prev.length + 1,
      },
    ]);
  }

  function updateTaskAt(index: number, patch: Partial<TaskDraft>) {
    setTasks((prev) => prev.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  }

  function removeTaskAt(index: number) {
    setTasks((prev) =>
      prev.filter((_, i) => i !== index).map((t, i) => ({ ...t, sort_order: i + 1 }))
    );
  }

  function moveTask(index: number, dir: -1 | 1) {
    setTasks((prev) => {
      const next = [...prev];
      const swap = index + dir;
      if (swap < 0 || swap >= next.length) return prev;
      [next[index], next[swap]] = [next[swap], next[index]];
      return next.map((t, i) => ({ ...t, sort_order: i + 1 }));
    });
  }

  /* ------------------------------ Save flow ------------------------------- */

  const cleanedTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.description.trim().length > 0)
        .map((t, i) => ({ ...t, description: t.description.trim(), sort_order: i + 1 })),
    [tasks]
  );

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const chairman_id = chairmanIds[0] ?? null;
      const coordinator_id = coordinatorIds[0] ?? null;

      let resultMeetingId: string = meetingId;

      if (scope === 'single' || !seriesId || !seriesPattern) {
        // Update only this occurrence.
        await updateMeetingOccurrence(
          meetingId,
          {
            title,
            description,
            date,
            start_time: startTime || null,
            end_time: endTime || null,
            chairman_id,
            coordinator_id,
          },
          // Only treat as override if this meeting is part of a series.
          !!seriesId
        );

        // Diff participants and apply.
        const origSet = new Set(originalParticipantIds);
        const nextSet = new Set(participantIds);
        const toAdd = participantIds.filter((id) => !origSet.has(id));
        const toRemove = originalParticipantIds.filter((id) => !nextSet.has(id));
        if (toAdd.length > 0) await addMeetingParticipants(meetingId, toAdd, true);
        for (const userId of toRemove) await removeMeetingParticipant(meetingId, userId);

        // Update tasks for this meeting.
        await setMeetingTasks(meetingId, cleanedTasks);
        resultMeetingId = meetingId;
      } else {
        // 'following' on a recurring series → split.
        const split = await splitSeriesAtDate(seriesId, new Date(date + 'T00:00:00'), {
          title,
          description,
          frequency: seriesPattern.frequency,
          days_of_week: seriesPattern.days_of_week,
          start_date: date,
          end_date: seriesPattern.end_date,
          start_time: startTime || null,
          end_time: endTime || null,
          duration_minutes: seriesPattern.duration_minutes ?? 30,
          buffer_minutes: seriesPattern.buffer_minutes ?? 0,
          timezone: seriesPattern.timezone ?? 'UTC',
          chairman_id,
          coordinator_id,
          participants: participantIds,
          template_id: seriesPattern.template_id,
        });

        // Apply task template to every meeting on the new series.
        const { data: newSeriesMeetings } = await supabase
          .from('meetings')
          .select('id')
          .eq('series_id', split.newSeriesId);
        const ids = (newSeriesMeetings || []).map((m) => m.id);
        if (ids.length > 0) {
          await applyTaskTemplateToMeetings(
            ids,
            cleanedTasks.map((t) => ({
              description: t.description,
              due_days_before: t.due_days_before,
              sort_order: t.sort_order,
              assignee_ids: t.assignee_ids,
            }))
          );
        }

        resultMeetingId = split.newMeetingId ?? meetingId;
      }

      onSuccess?.(resultMeetingId);
      onClose();
    } catch (e: unknown) {
      console.error('Error saving meeting edit:', e);
      const msg = e instanceof Error ? e.message : 'Failed to save changes.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-6 pb-6 px-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-xl max-w-2xl w-full max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface/30 shrink-0">
          <h2 className="text-xl font-bold text-text-primary font-literata">Edit Meeting</h2>
          <button onClick={onClose} className="p-2 hover:bg-board rounded-full transition-colors">
            <X className="h-5 w-5 text-text-secondary" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              {/* Scope (only for recurring) */}
              {isRecurring && (
                <div className="p-6 border-b border-border/30">
                  <p className="text-sm font-medium text-text-secondary mb-4">
                    This meeting is part of a recurring series. What would you like to edit?
                  </p>
                  <div className="flex flex-col gap-3">
                    <ScopeOption
                      icon={<Calendar className="h-4 w-4 text-primary" />}
                      title="This occurrence only"
                      desc={`Changes apply only to the meeting on ${new Date(
                        meetingDate
                      ).toLocaleDateString()}`}
                      checked={scope === 'single'}
                      onSelect={() => setScope('single')}
                    />
                    <ScopeOption
                      icon={<ArrowRight className="h-4 w-4 text-primary" />}
                      title="This and following"
                      desc="Past occurrences keep the original details. This date forward becomes a new series with the changes."
                      checked={scope === 'following'}
                      onSelect={() => setScope('following')}
                    />
                  </div>
                </div>
              )}

              {/* Meeting fields */}
              <div className="p-6 space-y-4 border-b border-border/30">
                <Field label="Meeting Title">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-3 bg-surface border border-border rounded-2xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                  />
                </Field>
                <Field label="Date">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-4 py-3 bg-surface border border-border rounded-2xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                  />
                </Field>
                <Field label="Description">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-surface border border-border rounded-2xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm resize-none"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Start Time">
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-4 py-3 bg-surface border border-border rounded-2xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                    />
                  </Field>
                  <Field label="End Time">
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-4 py-3 bg-surface border border-border rounded-2xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                    />
                  </Field>
                </div>
              </div>

              {/* People */}
              <div className="p-6 space-y-4 border-b border-border/30">
                <Field label="Chairman">
                  <PeoplePicker
                    people={people}
                    value={chairmanIds}
                    onChange={setChairmanIds}
                    multiple={false}
                    placeholder="Select chairman..."
                  />
                </Field>
                <Field label="Coordinator">
                  <PeoplePicker
                    people={people}
                    value={coordinatorIds}
                    onChange={setCoordinatorIds}
                    multiple={false}
                    placeholder="Select coordinator..."
                  />
                </Field>
                <Field label="Participants">
                  <PeoplePicker
                    people={people}
                    value={participantIds}
                    onChange={setParticipantIds}
                    multiple
                    placeholder="Add participants..."
                  />
                </Field>
              </div>

              {/* Tasks */}
              <div className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-text-primary">Tasks</h3>
                  <button
                    type="button"
                    onClick={addTask}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add task
                  </button>
                </div>

                {tasks.length === 0 ? (
                  <p className="text-xs text-text-tertiary italic">No tasks yet.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {tasks.map((t, i) => (
                      <TaskEditorRow
                        key={t.id ?? `new-${i}`}
                        index={i}
                        total={tasks.length}
                        task={t}
                        meetingDate={date}
                        people={people}
                        scope={scope}
                        onChange={(patch) => updateTaskAt(i, patch)}
                        onRemove={() => removeTaskAt(i)}
                        onMove={(dir) => moveTask(i, dir)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {error && (
                <div className="mx-6 mb-6 p-4 bg-coral-bg border border-coral-text/30 rounded-2xl text-sm text-coral-text">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-surface/30 flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 border border-border text-text-primary rounded-2xl text-sm font-bold hover:bg-board transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || loading || !title.trim()}
            className="px-6 py-2.5 bg-primary text-white rounded-2xl text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Sub-components                                */
/* -------------------------------------------------------------------------- */

function ScopeOption({
  icon,
  title,
  desc,
  checked,
  onSelect,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  checked: boolean;
  onSelect: () => void;
}) {
  return (
    <label
      className={cn(
        'flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all',
        checked ? 'border-primary bg-surface/50' : 'border-border/50 hover:border-primary/30'
      )}
    >
      <input
        type="radio"
        name="editScope"
        checked={checked}
        onChange={onSelect}
        className="mt-1"
      />
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          {icon}
          <span className="font-bold text-text-primary">{title}</span>
        </div>
        <p className="text-xs text-text-secondary">{desc}</p>
      </div>
    </label>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-bold text-text-primary mb-2">{label}</label>
      {children}
    </div>
  );
}

function TaskEditorRow({
  index,
  total,
  task,
  meetingDate,
  people,
  scope,
  onChange,
  onRemove,
  onMove,
}: {
  index: number;
  total: number;
  task: TaskDraft;
  meetingDate: string;
  people: PersonOption[];
  scope: EditScope;
  onChange: (patch: Partial<TaskDraft>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const dueAbsolute = calcAbsoluteDue(task.due_days_before, meetingDate);
  const isFollowingScope = scope === 'following';
  return (
    <div className="bg-surface/40 border border-border/40 rounded-2xl p-3 space-y-2">
      <div className="flex items-start gap-2">
        <div className="flex flex-col gap-0.5 pt-1">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            className="p-1 rounded hover:bg-board disabled:opacity-30"
            aria-label="Move up"
          >
            <ArrowUp className="h-3 w-3 text-text-secondary" />
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            className="p-1 rounded hover:bg-board disabled:opacity-30"
            aria-label="Move down"
          >
            <ArrowDown className="h-3 w-3 text-text-secondary" />
          </button>
        </div>
        <input
          type="text"
          value={task.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Task description"
          className="flex-1 px-3 py-2 bg-white border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <button
          type="button"
          onClick={onRemove}
          className="p-2 rounded-xl text-coral-text hover:bg-coral-bg transition-colors"
          aria-label="Delete task"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-7">
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-text-tertiary shrink-0" />
          {isFollowingScope ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                type="number"
                min={0}
                value={task.due_days_before ?? ''}
                onChange={(e) =>
                  onChange({ due_days_before: e.target.value === '' ? null : parseInt(e.target.value, 10) })
                }
                placeholder="Days"
                className="w-16 px-2 py-1.5 bg-white border border-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <span className="text-xs text-text-secondary">days before meeting</span>
            </div>
          ) : (
            <input
              type="date"
              value={dueAbsolute}
              onChange={(e) =>
                onChange({ due_days_before: calcDaysBefore(e.target.value, meetingDate) })
              }
              className="flex-1 px-2 py-1.5 bg-white border border-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          )}
        </div>
        <PeoplePicker
          people={people}
          value={task.assignee_ids}
          onChange={(ids) => onChange({ assignee_ids: ids })}
          multiple
          placeholder="Assignees..."
          compact
        />
      </div>
    </div>
  );
}
