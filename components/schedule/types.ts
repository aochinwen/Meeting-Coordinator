export interface Template {
  id: string;
  name: string;
  description?: string | null;
}

export interface UserData {
  id: string;
  name: string;
  division: string | null;
}

export interface MeetingTask {
  id: string;
  description: string;
  due_days_before: number | null;
  dueDateMode: 'days' | 'date';
}
