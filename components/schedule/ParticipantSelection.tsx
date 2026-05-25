import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserData } from './types';

interface ParticipantSelectionProps {
  users: UserData[];
  selectedParticipants: string[];
  toggleParticipant: (id: string) => void;
}

export function ParticipantSelection({
  users,
  selectedParticipants,
  toggleParticipant
}: ParticipantSelectionProps) {
  return (
    <div className="bg-white border border-border/20 rounded-[24px] p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-text-primary" />
        <h3 className="text-base font-bold text-text-primary font-literata">
          Participants
        </h3>
      </div>

      <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
        {users.map((user) => (
          <div
            key={user.id}
            onClick={() => toggleParticipant(user.id)}
            className={cn(
              "flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-colors",
              selectedParticipants.includes(user.id)
                ? "bg-mint/50 border border-sage/30"
                : "hover:bg-surface border border-transparent"
            )}
          >
            <div className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold",
              selectedParticipants.includes(user.id) ? "bg-primary" : "bg-sage"
            )}>
              {user.name.charAt(0)}
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-text-primary">{user.name}</p>
              <p className="text-xs text-text-tertiary">{user.division}</p>
            </div>
            {selectedParticipants.includes(user.id) && (
              <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                <div className="h-2 w-2 bg-white rounded-full" />
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-text-tertiary">
        {selectedParticipants.length} participant{selectedParticipants.length !== 1 ? 's' : ''} selected
      </p>
    </div>
  );
}
