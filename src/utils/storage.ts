import { ChildProfile, BehaviorLog, AIAnalysis } from '../types';

const KEYS = {
  PROFILE: 'adhd_tracker_profile',
  LOGS: 'adhd_tracker_logs',
  ANALYSIS: 'adhd_tracker_analysis',
  LAST_REMINDER: 'adhd_tracker_last_reminder',
} as const;

// Profile
export function getProfile(): ChildProfile | null {
  try {
    const raw = localStorage.getItem(KEYS.PROFILE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveProfile(profile: ChildProfile): void {
  localStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
}

// Behavior Logs
export function getLogs(): BehaviorLog[] {
  try {
    const raw = localStorage.getItem(KEYS.LOGS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLog(log: BehaviorLog): void {
  const logs = getLogs();
  const existing = logs.findIndex(l => l.id === log.id);
  if (existing >= 0) {
    logs[existing] = log;
  } else {
    logs.unshift(log);
  }
  localStorage.setItem(KEYS.LOGS, JSON.stringify(logs));
}

export function deleteLog(id: string): void {
  const logs = getLogs().filter(l => l.id !== id);
  localStorage.setItem(KEYS.LOGS, JSON.stringify(logs));
}

export function getLogsForRange(days: number): BehaviorLog[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return getLogs().filter(l => new Date(l.date) >= cutoff);
}

// AI Analysis
export function getLatestAnalysis(): AIAnalysis | null {
  try {
    const raw = localStorage.getItem(KEYS.ANALYSIS);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveAnalysis(analysis: AIAnalysis): void {
  localStorage.setItem(KEYS.ANALYSIS, JSON.stringify(analysis));
}

// Reminder tracking
export function getLastReminderTime(): number {
  return parseInt(localStorage.getItem(KEYS.LAST_REMINDER) || '0', 10);
}

export function setLastReminderTime(): void {
  localStorage.setItem(KEYS.LAST_REMINDER, Date.now().toString());
}

// Utility
export function getLastLogDate(): Date | null {
  const logs = getLogs();
  if (logs.length === 0) return null;
  return new Date(logs[0].date);
}

export function shouldRemindToLog(): boolean {
  const lastLog = getLastLogDate();
  if (!lastLog) return true;
  const hoursSinceLast = (Date.now() - lastLog.getTime()) / (1000 * 60 * 60);
  return hoursSinceLast > 20;
}

export function exportLogsAsText(logs: BehaviorLog[], profile: ChildProfile | null): string {
  const header = `ADHD BEHAVIOR TRACKER REPORT
Child: ${profile?.name || 'Unknown'} (Age: ${profile?.age || '?'})
Therapist: ${profile?.currentTherapist || 'Not set'}
Generated: ${new Date().toLocaleString()}
Period: Last ${logs.length} entries
${'='.repeat(60)}

`;

  const entries = logs.map(log => `
Date: ${new Date(log.date).toLocaleDateString()} at ${log.time}
Location: ${log.location}
Triggers: ${log.triggers.join(', ') || 'None noted'}${log.customTrigger ? `, ${log.customTrigger}` : ''}
Behaviors: ${log.behaviors.join(', ') || 'None noted'}
Meltdown Level: ${log.meltdownLevel}/5
Focus Level: ${log.focusLevel}/5
Mood Level: ${log.moodLevel}/5
Duration: ${log.duration} min
Resolved by: ${log.resolvedBy.join(', ') || 'None noted'}
Notes: ${log.notes || 'None'}
${'-'.repeat(40)}`).join('\n');

  return header + entries;
}
