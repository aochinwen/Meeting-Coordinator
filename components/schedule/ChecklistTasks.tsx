import React from 'react';
import { MeetingTask } from './types';

interface ChecklistTasksProps {
  meetingTasks: MeetingTask[];
  newMeetingTask: string;
  setNewMeetingTask: (val: string) => void;
  handleAddMeetingTask: () => void;
  removeMeetingTask: (id: string) => void;
  toggleTaskDueDateMode: (id: string) => void;
  updateTaskDueDays: (id: string, val: number | null) => void;
  handleTaskDatePickerChange: (id: string, val: string) => void;
  computeTaskAbsoluteDate: (days: number | null, startDate: string) => string;
  startDate: string;
}

export function ChecklistTasks({
  meetingTasks,
  newMeetingTask,
  setNewMeetingTask,
  handleAddMeetingTask,
  removeMeetingTask,
  toggleTaskDueDateMode,
  updateTaskDueDays,
  handleTaskDatePickerChange,
  computeTaskAbsoluteDate,
  startDate
}: ChecklistTasksProps) {
  return (
    <div className="bg-white border border-border/20 rounded-[24px] p-6 flex flex-col gap-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg className="h-5 w-5 text-text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <h2 className="text-xl font-bold text-text-primary font-literata">
            Checklist Tasks
          </h2>
        </div>
      </div>
      <p className="text-sm text-text-tertiary font-light -mt-4">
        Add default tasks for this meeting. These will be created for each occurrence.
      </p>

      <div className="space-y-3">
        {meetingTasks.map((task) => (
          <div
            key={task.id}
            className="flex items-start gap-4 p-4 bg-board border border-border/50 rounded-2xl hover:border-border transition-colors group"
          >
            <div className="w-6 h-6 rounded border border-border flex items-center justify-center text-transparent bg-white mt-1 shrink-0">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1 flex flex-col gap-2">
              <span className="text-base text-text-primary font-light">{task.description}</span>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => toggleTaskDueDateMode(task.id)}
                  className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border border-border bg-white text-text-tertiary hover:border-primary/50 hover:text-primary transition-colors shrink-0"
                >
                  {task.dueDateMode === 'days' ? '# days' : 'pick date'}
                </button>
                {task.dueDateMode === 'days' ? (
                  <>
                    <input
                      type="number"
                      placeholder="days before meeting"
                      value={task.due_days_before ?? ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? null : parseInt(e.target.value, 10);
                        updateTaskDueDays(task.id, isNaN(val as number) ? null : val);
                      }}
                      className="w-36 px-2 py-1 text-xs border border-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-primary/30 text-text-primary placeholder:text-text-tertiary"
                    />
                    <span className="text-xs text-text-tertiary">
                      {task.due_days_before === null
                        ? 'no due date'
                        : task.due_days_before >= 0
                        ? `${task.due_days_before} day${task.due_days_before !== 1 ? 's' : ''} before`
                        : `${Math.abs(task.due_days_before)} day${Math.abs(task.due_days_before) !== 1 ? 's' : ''} after`}
                    </span>
                  </>
                ) : (
                  <>
                    <input
                      type="date"
                      value={computeTaskAbsoluteDate(task.due_days_before, startDate)}
                      onChange={(e) => handleTaskDatePickerChange(task.id, e.target.value)}
                      className="px-2 py-1 text-xs border border-border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-primary/30 text-text-primary"
                    />
                    {task.due_days_before !== null && startDate && (
                      <span className="text-xs text-text-tertiary">
                        {task.due_days_before >= 0
                          ? `${task.due_days_before} day${task.due_days_before !== 1 ? 's' : ''} before`
                          : `${Math.abs(task.due_days_before)} day${Math.abs(task.due_days_before) !== 1 ? 's' : ''} after`}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
            <button
              onClick={() => removeMeetingTask(task.id)}
              className="text-text-tertiary hover:text-coral-text transition-colors p-2 rounded-xl hover:bg-coral-text/10 opacity-0 group-hover:opacity-100 mt-0.5"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <input
          type="text"
          value={newMeetingTask}
          onChange={(e) => setNewMeetingTask(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddMeetingTask()}
          placeholder="Add a checklist task..."
          className="flex-1 px-4 py-3 bg-surface border border-border rounded-2xl text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm font-light"
        />
        <button
          onClick={handleAddMeetingTask}
          disabled={!newMeetingTask.trim()}
          className="px-6 py-3 bg-board text-text-primary border border-border rounded-2xl text-base font-light hover:bg-surface transition-colors disabled:opacity-50 flex items-center gap-2 shrink-0"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Task
        </button>
      </div>
    </div>
  );
}
