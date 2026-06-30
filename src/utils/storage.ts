import { ChildProfile, BehaviorLog, AIAnalysis } from '../types';

const KEYS = {
  PROFILE_LEGACY: 'adhd_tracker_profile',
  PROFILES: 'adhd_tracker_profiles',
  ACTIVE_CHILD: 'adhd_tracker_active_child_id',
  LOGS: 'adhd_tracker_logs',
  ANALYSIS: 'adhd_tracker_analysis',
  LAST_REMINDER: 'adhd_tracker_last_reminder',
} as const;

// One-time migration from the old single-child format to the multi-child format,
// so existing users keep their data instead of being dropped back into onboarding.
function migrateLegacyData(): void {
  if (localStorage.getItem(KEYS.PROFILES)) return;
  const legacyRaw = localStorage.getItem(KEYS.PROFILE_LEGACY);
  if (!legacyRaw) return;

  try {
    const legacyProfile: ChildProfile = JSON.parse(legacyRaw);
    localStorage.setItem(KEYS.PROFILES, JSON.stringify([legacyProfile]));
    localStorage.setItem(KEYS.ACTIVE_CHILD, legacyProfile.id);

    const rawLogs = localStorage.getItem(KEYS.LOGS);
    if (rawLogs) {
      const logs: BehaviorLog[] = JSON.parse(rawLogs);
      localStorage.setItem(KEYS.LOGS, JSON.stringify(logs.map(l => ({ ...l, childId: l.childId ?? legacyProfile.id }))));
    }

    const rawAnalysis = localStorage.getItem(KEYS.ANALYSIS);
    if (rawAnalysis) {
      const parsed = JSON.parse(rawAnalysis);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && !parsed[legacyProfile.id]) {
        localStorage.setItem(KEYS.ANALYSIS, JSON.stringify({ [legacyProfile.id]: parsed }));
      }
    }

    const rawReminder = localStorage.getItem(KEYS.LAST_REMINDER);
    if (rawReminder && !isNaN(Number(rawReminder))) {
      localStorage.setItem(KEYS.LAST_REMINDER, JSON.stringify({ [legacyProfile.id]: Number(rawReminder) }));
    }
  } catch {
    // Malformed legacy data — skip migration rather than crash the app.
  }
}

function getAllLogsRaw(): BehaviorLog[] {
  try {
    const raw = localStorage.getItem(KEYS.LOGS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Profiles
export function getProfiles(): ChildProfile[] {
  migrateLegacyData();
  try {
    const raw = localStorage.getItem(KEYS.PROFILES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveProfile(profile: ChildProfile): void {
  const profiles = getProfiles();
  const existing = profiles.findIndex(p => p.id === profile.id);
  if (existing >= 0) {
    profiles[existing] = profile;
  } else {
    profiles.push(profile);
  }
  localStorage.setItem(KEYS.PROFILES, JSON.stringify(profiles));
}

export function deleteProfile(id: string): void {
  localStorage.setItem(KEYS.PROFILES, JSON.stringify(getProfiles().filter(p => p.id !== id)));
  localStorage.setItem(KEYS.LOGS, JSON.stringify(getAllLogsRaw().filter(l => l.childId !== id)));
  if (getActiveChildId() === id) {
    localStorage.removeItem(KEYS.ACTIVE_CHILD);
  }
}

export function getActiveChildId(): string | null {
  migrateLegacyData();
  return localStorage.getItem(KEYS.ACTIVE_CHILD);
}

export function setActiveChildId(id: string): void {
  localStorage.setItem(KEYS.ACTIVE_CHILD, id);
}

export function getActiveProfile(): ChildProfile | null {
  const id = getActiveChildId();
  if (!id) return null;
  return getProfiles().find(p => p.id === id) ?? null;
}

// Behavior Logs — always scoped to whichever child is currently active
export function getLogs(): BehaviorLog[] {
  const childId = getActiveChildId();
  if (!childId) return [];
  return getAllLogsRaw().filter(l => l.childId === childId);
}

export function saveLog(log: Omit<BehaviorLog, 'childId'>): void {
  const childId = getActiveChildId();
  if (!childId) return;
  const logs = getAllLogsRaw();
  const tagged: BehaviorLog = { ...log, childId };
  const existing = logs.findIndex(l => l.id === log.id);
  if (existing >= 0) {
    logs[existing] = tagged;
  } else {
    logs.unshift(tagged);
  }
  localStorage.setItem(KEYS.LOGS, JSON.stringify(logs));
}

export function deleteLog(id: string): void {
  localStorage.setItem(KEYS.LOGS, JSON.stringify(getAllLogsRaw().filter(l => l.id !== id)));
}

export function getLogsForRange(days: number): BehaviorLog[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return getLogs().filter(l => new Date(l.date) >= cutoff);
}

// Per-child summaries — used by the family overview, independent of which child is active
export function getLogCountForChild(childId: string): number {
  return getAllLogsRaw().filter(l => l.childId === childId).length;
}

export function getLastLogDateForChild(childId: string): Date | null {
  const logs = getAllLogsRaw().filter(l => l.childId === childId);
  if (logs.length === 0) return null;
  return new Date(logs[0].date);
}

export function getAnalysisForChild(childId: string): AIAnalysis | null {
  try {
    const raw = localStorage.getItem(KEYS.ANALYSIS);
    const map = raw ? JSON.parse(raw) : {};
    return map[childId] ?? null;
  } catch {
    return null;
  }
}

// AI Analysis — scoped per child
export function getLatestAnalysis(): AIAnalysis | null {
  const childId = getActiveChildId();
  if (!childId) return null;
  try {
    const raw = localStorage.getItem(KEYS.ANALYSIS);
    const map = raw ? JSON.parse(raw) : {};
    return map[childId] ?? null;
  } catch {
    return null;
  }
}

export function saveAnalysis(analysis: AIAnalysis): void {
  const childId = getActiveChildId();
  if (!childId) return;
  let map: Record<string, AIAnalysis> = {};
  try {
    const raw = localStorage.getItem(KEYS.ANALYSIS);
    map = raw ? JSON.parse(raw) : {};
  } catch {
    // start fresh on malformed data
  }
  map[childId] = analysis;
  localStorage.setItem(KEYS.ANALYSIS, JSON.stringify(map));
}

// Reminder tracking — scoped per child
export function getLastReminderTime(): number {
  const childId = getActiveChildId();
  if (!childId) return 0;
  try {
    const raw = localStorage.getItem(KEYS.LAST_REMINDER);
    const map = raw ? JSON.parse(raw) : {};
    return map[childId] ?? 0;
  } catch {
    return 0;
  }
}

export function setLastReminderTime(): void {
  const childId = getActiveChildId();
  if (!childId) return;
  let map: Record<string, number> = {};
  try {
    const raw = localStorage.getItem(KEYS.LAST_REMINDER);
    map = raw ? JSON.parse(raw) : {};
  } catch {
    // start fresh on malformed data
  }
  map[childId] = Date.now();
  localStorage.setItem(KEYS.LAST_REMINDER, JSON.stringify(map));
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
Triggers: ${Array.isArray(log.triggers) ? log.triggers.join(', ') || 'None noted' : 'None noted'}${log.customTrigger ? `, ${log.customTrigger}` : ''}
Behaviors: ${Array.isArray(log.behaviors) ? log.behaviors.join(', ') || 'None noted' : 'None noted'}
Meltdown Level: ${log.meltdownLevel}/5
Focus Level: ${log.focusLevel}/5
Mood Level: ${log.moodLevel}/5
Duration: ${log.duration} min
Resolved by: ${Array.isArray(log.resolvedBy) ? log.resolvedBy.join(', ') || 'None noted' : 'None noted'}
Notes: ${log.notes || 'None'}
${'-'.repeat(40)}`).join('\n');

  return header + entries;
}
