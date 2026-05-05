// Server-safe helpers shared between server and client components.

export type SelectedTypes = { meetings: boolean; tasks: boolean };

export function parseTypes(raw: string | undefined): SelectedTypes {
  if (!raw) return { meetings: true, tasks: true };
  const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
  const meetings = parts.includes('meetings');
  const tasks = parts.includes('tasks');
  // Both off is meaningless; fall back to both on.
  if (!meetings && !tasks) return { meetings: true, tasks: true };
  return { meetings, tasks };
}

export function serializeTypes(t: SelectedTypes): string | undefined {
  if (t.meetings && t.tasks) return undefined; // default
  const parts: string[] = [];
  if (t.meetings) parts.push('meetings');
  if (t.tasks) parts.push('tasks');
  return parts.join(',') || undefined;
}
