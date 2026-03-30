import { cn } from '@/lib/utils';
import { Database } from '@/types/supabase';

type MeetingStatus = Database['public']['Tables']['meetings']['Row']['status'] | 'conflict';

interface StatusBadgeProps {
  status: MeetingStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const getStatusConfig = (s: MeetingStatus) => {
    switch (s) {
      case 'completed':
      case 'scheduled':
        return {
          label: s === 'scheduled' ? 'On Track' : 'Completed',
          className: 'bg-green-100 text-green-800 border-green-200',
        };
      case 'conflict':
        return {
          label: 'Holiday Conflict',
          className: 'bg-amber-100 text-amber-800 border-amber-200',
        };
      case 'cancelled':
        return {
          label: 'Cancelled',
          className: 'bg-gray-100 text-gray-800 border-gray-200',
        };
      default:
        return {
          label: s,
          className: 'bg-gray-100 text-gray-800 border-gray-200',
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        config.className
      )}
    >
      {config.label}
    </span>
  );
}
