import { Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';

type FrequencyType = 'daily' | 'weekly' | 'bi-weekly' | 'monthly';
type EndRuleType = 'never' | 'count' | 'date';

interface RecurrenceSettingsProps {
  isRecurring: boolean;
  setIsRecurring: (val: boolean) => void;
  frequency: FrequencyType;
  setFrequency: (val: FrequencyType) => void;
  selectedDays: string[];
  toggleDay: (day: string) => void;
  endRule: EndRuleType;
  setEndRule: (val: EndRuleType) => void;
  endCount: number;
  setEndCount: (val: number) => void;
  endDate: string;
  setEndDate: (val: string) => void;
  startDate: string;
}

export function RecurrenceSettings({
  isRecurring,
  setIsRecurring,
  frequency,
  setFrequency,
  selectedDays,
  toggleDay,
  endRule,
  setEndRule,
  endCount,
  setEndCount,
  endDate,
  setEndDate,
  startDate
}: RecurrenceSettingsProps) {
  return (
    <div className="bg-white border border-border/20 rounded-[24px] p-6 flex flex-col gap-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Repeat className="h-5 w-5 text-text-primary" />
          <h2 className="text-xl font-bold text-text-primary font-literata">
            Recurrence Settings
          </h2>
        </div>
        {/* Recurrence Toggle */}
        <button
          onClick={() => setIsRecurring(!isRecurring)}
          className={cn(
            "relative inline-flex h-7 w-12 items-center rounded-full transition-colors",
            isRecurring ? "bg-primary" : "bg-status-grey-bg"
          )}
        >
          <span
            className={cn(
              "inline-block h-5 w-5 transform rounded-full bg-white transition-transform",
              isRecurring ? "translate-x-6" : "translate-x-1"
            )}
          />
        </button>
      </div>

      {isRecurring && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
            <div className="flex flex-col gap-3">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Frequency</label>
              <div className="flex bg-status-grey-bg rounded-[16px] p-1">
                {(['daily', 'weekly', 'bi-weekly', 'monthly'] as const).map((freq) => (
                  <button
                    key={freq}
                    onClick={() => setFrequency(freq)}
                    className={cn(
                      "flex-1 py-1.5 rounded-[12px] text-sm font-bold transition-all capitalize",
                      frequency === freq
                        ? "bg-white text-text-primary shadow-sm"
                        : "text-text-primary hover:bg-white/50"
                    )}
                  >
                    {freq === 'daily' ? 'Daily' : freq === 'weekly' ? 'Weekly' : freq === 'bi-weekly' ? 'Bi-Weekly' : 'Monthly'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Repeat Days</label>
              <div className="flex items-center gap-2 mt-1">
                {['M', 'T', 'W', 'Th', 'F'].map((day) => {
                  const mappedDay = day === 'Th' ? 'T' : day;
                  return (
                    <button
                      key={day}
                      onClick={() => toggleDay(day)}
                      className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold transition-all border",
                        selectedDays.includes(day)
                          ? "bg-primary text-white border-primary"
                          : "bg-status-grey-bg text-text-primary border-transparent hover:bg-cream"
                      )}
                    >
                      {mappedDay}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* End Rule */}
          <div className="flex flex-col gap-3 border-t border-border/20 pt-5">
            <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Ends</label>
            <div className="flex flex-col gap-3">
              {/* Never */}
              <div
                className={cn(
                  "flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all",
                  endRule === 'never' ? "border-primary bg-surface/50" : "border-border/50 hover:border-primary/30"
                )}
                onClick={() => setEndRule('never')}
              >
                <div className={cn("h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0", endRule === 'never' ? "border-primary bg-primary" : "border-border/50")}>
                  {endRule === 'never' && <div className="h-2 w-2 rounded-full bg-white" />}
                </div>
                <div>
                  <h4 className="font-bold text-text-primary text-sm">No end</h4>
                  <p className="text-xs font-light text-text-secondary">Series continues indefinitely</p>
                </div>
              </div>

              {/* After N occurrences */}
              <div
                className={cn(
                  "flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all",
                  endRule === 'count' ? "border-primary bg-surface/50" : "border-border/50 hover:border-primary/30"
                )}
                onClick={() => setEndRule('count')}
              >
                <div className={cn("h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0", endRule === 'count' ? "border-primary bg-primary" : "border-border/50")}>
                  {endRule === 'count' && <div className="h-2 w-2 rounded-full bg-white" />}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-text-primary text-sm mb-1">After occurrences</h4>
                  {endRule === 'count' ? (
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={endCount}
                        onChange={(e) => setEndCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                        className="w-20 px-3 py-1.5 bg-white border border-border rounded-xl text-sm font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-center"
                      />
                      <span className="text-xs font-light text-text-secondary">occurrences (max 100)</span>
                    </div>
                  ) : (
                    <p className="text-xs font-light text-text-secondary">Stop after a set number of meetings</p>
                  )}
                </div>
              </div>

              {/* Until date */}
              <div
                className={cn(
                  "flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all",
                  endRule === 'date' ? "border-primary bg-surface/50" : "border-border/50 hover:border-primary/30"
                )}
                onClick={() => setEndRule('date')}
              >
                <div className={cn("h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0", endRule === 'date' ? "border-primary bg-primary" : "border-border/50")}>
                  {endRule === 'date' && <div className="h-2 w-2 rounded-full bg-white" />}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-text-primary text-sm mb-1">Until date</h4>
                  {endRule === 'date' ? (
                    <div onClick={(e) => e.stopPropagation()}>
                      <input
                        type="date"
                        value={endDate}
                        min={startDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-border rounded-xl text-sm font-light text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  ) : (
                    <p className="text-xs font-light text-text-secondary">Stop on a specific calendar date</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isRecurring && (
        <p className="text-sm text-text-tertiary font-light">
          This meeting will occur once on the selected date.
        </p>
      )}
    </div>
  );
}
