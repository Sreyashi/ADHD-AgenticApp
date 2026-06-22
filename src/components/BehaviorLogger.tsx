import { useState } from 'react';
import { format } from 'date-fns';
import { v4 as uuid } from 'uuid';
import { CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { BehaviorLog, PREDEFINED_TRIGGERS, PREDEFINED_BEHAVIORS, RESOLUTION_STRATEGIES, LOG_LOCATIONS } from '../types';
import { saveLog } from '../utils/storage';

interface Props {
  onSaved: () => void;
  editLog?: BehaviorLog;
}

type Step = 1 | 2 | 3 | 4;

function LevelSelector({ value, onChange, colors }: { value: number; onChange: (v: number) => void; colors: string[] }) {
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map(v => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`level-dot border-2 transition-all ${
            value === v
              ? `${colors[v - 1]} border-transparent text-white scale-110 shadow-md`
              : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
          }`}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

const MELTDOWN_COLORS = ['bg-emerald-400', 'bg-lime-400', 'bg-amber-400', 'bg-orange-400', 'bg-red-500'];
const FOCUS_COLORS = ['bg-red-500', 'bg-orange-400', 'bg-amber-400', 'bg-lime-400', 'bg-emerald-400'];
const MOOD_COLORS = ['bg-red-500', 'bg-orange-400', 'bg-amber-400', 'bg-lime-400', 'bg-emerald-400'];

const MELTDOWN_LABELS = ['None (0)','Very mild','Moderate','Significant','Severe'];
const FOCUS_LABELS = ['Very poor','Poor','Average','Good','Excellent'];
const MOOD_LABELS = ['Very negative','Negative','Neutral','Positive','Very positive'];

export function BehaviorLogger({ onSaved, editLog }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [saved, setSaved] = useState(false);

  const [date, setDate] = useState(editLog?.date ?? format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState(editLog?.time ?? format(new Date(), 'HH:mm'));
  const [location, setLocation] = useState(editLog?.location ?? 'Home');
  const [triggers, setTriggers] = useState<string[]>(editLog?.triggers ?? []);
  const [customTrigger, setCustomTrigger] = useState(editLog?.customTrigger ?? '');
  const [behaviors, setBehaviors] = useState<string[]>(editLog?.behaviors ?? []);
  const [meltdownLevel, setMeltdownLevel] = useState(editLog?.meltdownLevel ?? 0);
  const [focusLevel, setFocusLevel] = useState(editLog?.focusLevel ?? 3);
  const [moodLevel, setMoodLevel] = useState(editLog?.moodLevel ?? 3);
  const [duration, setDuration] = useState(editLog?.duration ?? 15);
  const [resolvedBy, setResolvedBy] = useState<string[]>(editLog?.resolvedBy ?? []);
  const [notes, setNotes] = useState(editLog?.notes ?? '');

  const toggle = <T extends string>(list: T[], item: T, setter: (v: T[]) => void) => {
    setter(list.includes(item) ? list.filter(x => x !== item) : [...list, item]);
  };

  const handleSave = () => {
    const log: Omit<BehaviorLog, 'childId'> = {
      id: editLog?.id ?? uuid(),
      date,
      time,
      triggers,
      customTrigger,
      behaviors,
      meltdownLevel,
      focusLevel,
      moodLevel,
      duration,
      location,
      resolvedBy,
      notes,
      therapistShared: false,
      createdAt: editLog?.createdAt ?? new Date().toISOString(),
    };
    saveLog(log);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onSaved();
    }, 1800);
  };

  if (saved) {
    return (
      <div className="flex flex-col items-center justify-center py-24 animate-fade-in">
        <CheckCircle2 size={56} className="text-emerald-500 mb-4" />
        <p className="text-xl font-bold text-slate-800">Log Saved!</p>
        <p className="text-slate-500 mt-1">Great job tracking {date === format(new Date(), 'yyyy-MM-dd') ? 'today' : date}'s behaviors</p>
      </div>
    );
  }

  const STEPS = ['When & Where', 'Triggers', 'Behaviors', 'Levels & Notes'];

  return (
    <div className="animate-fade-in">
      <h2 className="text-lg font-bold text-slate-800 mb-4">{editLog ? 'Edit Log Entry' : 'Log Behavior'}</h2>

      {/* Step indicators */}
      <div className="flex gap-1 mb-6">
        {STEPS.map((label, i) => (
          <button
            key={i}
            onClick={() => setStep((i + 1) as Step)}
            className="flex-1 text-center"
          >
            <div className={`h-1.5 rounded-full mb-1 transition-all ${i + 1 <= step ? 'bg-brand-600' : 'bg-slate-200'}`} />
            <span className={`text-[10px] font-medium hidden md:block ${i + 1 === step ? 'text-brand-600' : 'text-slate-400'}`}>{label}</span>
          </button>
        ))}
      </div>

      {/* Step 1: When & Where */}
      {step === 1 && (
        <div className="space-y-4 animate-fade-in">
          <div className="card">
            <h3 className="font-semibold text-slate-800 mb-4">When did this happen?</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Date</label>
                <input type="date" className="input-field" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Time</label>
                <input type="time" className="input-field" value={time} onChange={e => setTime(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold text-slate-800 mb-3">Where did it happen?</h3>
            <div className="flex flex-wrap gap-2">
              {LOG_LOCATIONS.map(loc => (
                <button
                  key={loc}
                  onClick={() => setLocation(loc)}
                  className={`tag-trigger ${location === loc ? 'selected' : ''}`}
                >{loc}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Triggers */}
      {step === 2 && (
        <div className="card animate-fade-in">
          <h3 className="font-semibold text-slate-800 mb-1">What triggered it?</h3>
          <p className="text-xs text-slate-400 mb-4">Select all that apply</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {PREDEFINED_TRIGGERS.map(t => (
              <button
                key={t}
                onClick={() => toggle(triggers, t, setTriggers)}
                className={`tag-trigger ${triggers.includes(t) ? 'selected' : ''}`}
              >{t}</button>
            ))}
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Custom trigger (optional)</label>
            <input
              type="text"
              className="input-field"
              placeholder="Describe a specific trigger..."
              value={customTrigger}
              onChange={e => setCustomTrigger(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Step 3: Behaviors */}
      {step === 3 && (
        <div className="space-y-4 animate-fade-in">
          <div className="card">
            <h3 className="font-semibold text-slate-800 mb-1">What behaviors occurred?</h3>
            <p className="text-xs text-slate-400 mb-4">Select all that apply</p>
            <div className="flex flex-wrap gap-2">
              {PREDEFINED_BEHAVIORS.map(b => (
                <button
                  key={b}
                  onClick={() => toggle(behaviors, b, setBehaviors)}
                  className={`tag-trigger ${behaviors.includes(b) ? 'selected' : ''}`}
                >{b}</button>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold text-slate-800 mb-3">How was it resolved?</h3>
            <div className="flex flex-wrap gap-2">
              {RESOLUTION_STRATEGIES.map(s => (
                <button
                  key={s}
                  onClick={() => toggle(resolvedBy, s, setResolvedBy)}
                  className={`tag-trigger text-xs ${resolvedBy.includes(s) ? 'selected' : ''}`}
                >{s}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Levels & Notes */}
      {step === 4 && (
        <div className="space-y-4 animate-fade-in">
          <div className="card">
            <h3 className="font-semibold text-slate-800 mb-4">Rate the incident</h3>

            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700">Meltdown Severity</label>
                  <span className="text-xs text-slate-400">{meltdownLevel > 0 ? MELTDOWN_LABELS[meltdownLevel - 1] : 'None'}</span>
                </div>
                <div className="flex gap-2 items-center">
                  <button
                    onClick={() => setMeltdownLevel(0)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg border-2 transition-all ${meltdownLevel === 0 ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500'}`}
                  >None</button>
                  <LevelSelector value={meltdownLevel === 0 ? 0 : meltdownLevel} onChange={v => setMeltdownLevel(v)} colors={MELTDOWN_COLORS} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700">Focus Level</label>
                  <span className="text-xs text-slate-400">{FOCUS_LABELS[focusLevel - 1]}</span>
                </div>
                <LevelSelector value={focusLevel} onChange={setFocusLevel} colors={FOCUS_COLORS} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700">Overall Mood</label>
                  <span className="text-xs text-slate-400">{MOOD_LABELS[moodLevel - 1]}</span>
                </div>
                <LevelSelector value={moodLevel} onChange={setMoodLevel} colors={MOOD_COLORS} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700">Duration</label>
                  <span className="text-xs font-bold text-slate-600">{duration} min</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={120}
                  value={duration}
                  onChange={e => setDuration(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>1 min</span><span>1 hour</span><span>2 hours</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <label className="text-sm font-medium text-slate-700 mb-2 block">Notes (optional)</label>
            <textarea
              className="input-field resize-none"
              rows={3}
              placeholder="Any additional context, what worked, patterns noticed..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          {/* Summary */}
          <div className="card bg-slate-50 border-slate-200">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Summary</p>
            <div className="text-sm text-slate-700 space-y-1">
              <p><span className="font-medium">Date:</span> {date} at {time} · {location}</p>
              {triggers.length > 0 && <p><span className="font-medium">Triggers:</span> {triggers.join(', ')}</p>}
              {behaviors.length > 0 && <p><span className="font-medium">Behaviors:</span> {behaviors.join(', ')}</p>}
              <p><span className="font-medium">Meltdown:</span> {meltdownLevel === 0 ? 'None' : `${meltdownLevel}/5`} · <span className="font-medium">Focus:</span> {focusLevel}/5 · <span className="font-medium">Mood:</span> {moodLevel}/5</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex gap-3 mt-6">
        {step > 1 && (
          <button className="btn-secondary flex items-center gap-2" onClick={() => setStep(s => (s - 1) as Step)}>
            <ChevronLeft size={16} />Back
          </button>
        )}
        {step < 4 ? (
          <button className="btn-primary flex-1 flex items-center justify-center gap-2" onClick={() => setStep(s => (s + 1) as Step)}>
            Next<ChevronRight size={16} />
          </button>
        ) : (
          <button className="btn-primary flex-1" onClick={handleSave}>
            Save Log Entry
          </button>
        )}
      </div>
    </div>
  );
}
