import { BehaviorLog } from '../types';

export interface TriggerFrequency {
  trigger: string;
  count: number;
}

export interface TriggerWindow {
  days: number;
  label: string;
  logCount: number;
  frequencies: TriggerFrequency[];
}

function frequencyForLogs(logs: BehaviorLog[]): TriggerFrequency[] {
  const counts: Record<string, number> = {};
  logs.forEach(l => l.triggers.forEach(t => { counts[t] = (counts[t] || 0) + 1; }));
  return Object.entries(counts)
    .map(([trigger, count]) => ({ trigger, count }))
    .sort((a, b) => b.count - a.count);
}

const WINDOWS = [
  { days: 30, label: 'Last 1 month' },
  { days: 60, label: 'Last 2 months' },
  { days: 90, label: 'Last 3 months' },
];

// Cumulative windows (e.g. "Last 2 months" includes everything in "Last 1 month") so the
// agent can talk about how a trigger's frequency has shifted as the window widens.
export function getTriggerWindows(logs: BehaviorLog[]): TriggerWindow[] {
  const now = new Date();
  return WINDOWS.map(({ days, label }) => {
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - days);
    const windowLogs = logs.filter(l => new Date(l.date) >= cutoff);
    return { days, label, logCount: windowLogs.length, frequencies: frequencyForLogs(windowLogs) };
  });
}
