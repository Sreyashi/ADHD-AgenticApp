export interface ChildProfile {
  id: string;
  name: string;
  age: number;
  diagnosis: string[];
  currentTherapist: string;
  therapistPhone: string;
  therapistEmail: string;
  therapyStartDate: string;
  location: string;
  medications: string;
  notes: string;
  createdAt: string;
}

export interface BehaviorLog {
  id: string;
  date: string;
  time: string;
  triggers: string[];
  customTrigger: string;
  behaviors: string[];
  meltdownLevel: number; // 0 = none, 1-5 severity
  focusLevel: number;    // 1-5
  moodLevel: number;     // 1-5 (1=very negative, 5=very positive)
  duration: number;      // minutes
  location: string;
  resolvedBy: string[];
  notes: string;
  therapistShared: boolean;
  createdAt: string;
}

export type InsightType = 'pattern' | 'warning' | 'success' | 'recommendation';

export interface InsightItem {
  type: InsightType;
  title: string;
  content: string;
  actionItems: string[];
}

export interface AIAnalysis {
  id: string;
  generatedAt: string;
  topTriggers: string[];
  trend: 'improving' | 'stable' | 'declining';
  weeklyAverages: { week: string; meltdownAvg: number; focusAvg: number; moodAvg: number }[];
  insights: InsightItem[];
  recommendChangeTherapist: boolean;
  improvementAreas: string[];
  reminders: string[];
  summary: string;
}

export interface TherapistResult {
  id: string;
  name: string;
  credentials: string;
  specialty: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  acceptingNewPatients: boolean;
  telehealth: boolean;
  approaches: string[];
  yearsExperience: number;
  notes: string;
  directoryLink: string;
}

export const PREDEFINED_TRIGGERS = [
  'Homework / School work',
  'Screen time limits',
  'Transitions / Routine changes',
  'Bedtime / Sleep',
  'Hunger / Food',
  'Sensory overload',
  'Social situations',
  'Unexpected changes',
  'Frustration with tasks',
  'Overstimulation',
  'Boredom',
  'Physical discomfort',
] as const;

export const PREDEFINED_BEHAVIORS = [
  'Meltdown / Tantrum',
  'Physical aggression',
  'Verbal outbursts',
  'Crying / Distress',
  'Task refusal',
  'Hyperactivity',
  'Impulsivity',
  'Difficulty focusing',
  'Emotional dysregulation',
  'Withdrawal / Shutdown',
  'Self-stimming',
  'Property destruction',
] as const;

export const RESOLUTION_STRATEGIES = [
  'Deep breathing',
  'Quiet time / Sensory break',
  'Physical exercise',
  'Redirection',
  'Verbal de-escalation',
  'Fidget / Sensory tool',
  'Changed activity',
  'Scheduled break',
  'Therapist strategies',
  'Ignored / Waited out',
] as const;

export const LOG_LOCATIONS = [
  'Home',
  'School',
  'Car / Transit',
  'Public place',
  'Grandparents / Family',
  "Friend's house",
  'Therapy office',
  'Other',
] as const;
