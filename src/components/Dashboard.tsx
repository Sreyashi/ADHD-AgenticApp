import { useMemo } from 'react';
import { format, isToday, isYesterday, subDays } from 'date-fns';
import { AlertCircle, TrendingUp, TrendingDown, Minus, PlusCircle, FileText, Bell } from 'lucide-react';
import { ChildProfile, BehaviorLog, AIAnalysis } from '../types';
import { shouldRemindToLog } from '../utils/storage';

interface Props {
  profile: ChildProfile;
  logs: BehaviorLog[];
  analysis: AIAnalysis | null;
  onNavigate: (view: 'log' | 'history' | 'insights' | 'therapists') => void;
}

function LevelBadge({ value, max = 5, type }: { value: number; max?: number; type: 'meltdown' | 'focus' | 'mood' }) {
  const colors = {
    meltdown: value <= 1 ? 'text-emerald-600 bg-emerald-50' : value <= 3 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50',
    focus: value >= 4 ? 'text-emerald-600 bg-emerald-50' : value >= 2 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50',
    mood: value >= 4 ? 'text-emerald-600 bg-emerald-50' : value >= 2 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50',
  };
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${colors[type]}`}>
      {value}/{max}
    </span>
  );
}

function formatLogDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMM d');
}

export function Dashboard({ profile, logs, analysis, onNavigate }: Props) {
  const remind = shouldRemindToLog();

  const stats = useMemo(() => {
    const last7 = logs.filter(l => new Date(l.date) >= subDays(new Date(), 7));
    const today = logs.filter(l => isToday(new Date(l.date)));
    const avgMeltdown = last7.length ? (last7.reduce((s, l) => s + l.meltdownLevel, 0) / last7.length).toFixed(1) : '—';
    const avgFocus = last7.length ? (last7.reduce((s, l) => s + l.focusLevel, 0) / last7.length).toFixed(1) : '—';

    // Top trigger this week
    const triggerCount: Record<string, number> = {};
    last7.forEach(l => l.triggers.forEach(t => { triggerCount[t] = (triggerCount[t] || 0) + 1; }));
    const topTrigger = Object.entries(triggerCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    return { last7Count: last7.length, todayCount: today.length, avgMeltdown, avgFocus, topTrigger };
  }, [logs]);

  const recentLogs = logs.slice(0, 5);

  const TrendIcon = analysis?.trend === 'improving' ? TrendingUp :
    analysis?.trend === 'declining' ? TrendingDown : Minus;
  const trendColor = analysis?.trend === 'improving' ? 'text-emerald-500' :
    analysis?.trend === 'declining' ? 'text-red-500' : 'text-amber-500';

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-600 to-indigo-500 rounded-2xl p-5 text-white shadow-md">
        <p className="text-brand-100 text-sm">{greeting()}</p>
        <h1 className="text-xl font-bold mt-0.5">Tracking {profile.name}</h1>
        <p className="text-brand-100 text-sm mt-1">
          {stats.todayCount > 0
            ? `${stats.todayCount} log${stats.todayCount > 1 ? 's' : ''} recorded today`
            : 'No logs yet today'}
        </p>

        {remind && (
          <div className="mt-3 bg-white/20 rounded-xl px-3 py-2 flex items-center gap-2">
            <Bell size={14} className="text-amber-200 animate-pulse-slow" />
            <p className="text-xs text-white">Reminder: log today's behaviors to keep the tracker current</p>
          </div>
        )}

        <div className="flex gap-3 mt-4">
          <button
            onClick={() => onNavigate('log')}
            className="flex items-center gap-1.5 bg-white text-brand-600 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-brand-50 transition-colors"
          >
            <PlusCircle size={15} />
            Log Now
          </button>
          <button
            onClick={() => onNavigate('insights')}
            className="flex items-center gap-1.5 bg-white/20 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-white/30 transition-colors"
          >
            <FileText size={15} />
            View Insights
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card">
          <p className="text-xs text-slate-500 font-medium">Logs this week</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{stats.last7Count}</p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-500 font-medium">Avg meltdown</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{stats.avgMeltdown}<span className="text-sm text-slate-400">/5</span></p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-500 font-medium">Avg focus</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{stats.avgFocus}<span className="text-sm text-slate-400">/5</span></p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-500 font-medium">Trend</p>
          <div className="flex items-center gap-1.5 mt-1">
            <TrendIcon size={22} className={trendColor} />
            <p className={`text-sm font-semibold capitalize ${trendColor}`}>
              {analysis?.trend ?? 'No data'}
            </p>
          </div>
        </div>
      </div>

      {/* Therapist change warning */}
      {analysis?.recommendChangeTherapist && (
        <div className="card border-red-200 bg-red-50">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-700">Consider reviewing therapy approach</p>
              <p className="text-sm text-red-600 mt-1">AI analysis suggests limited progress over the past few weeks. Consider consulting about therapy modifications.</p>
              <button onClick={() => onNavigate('insights')} className="text-red-600 text-sm font-medium mt-2 underline">View full recommendation →</button>
            </div>
          </div>
        </div>
      )}

      {/* Top trigger */}
      {stats.topTrigger && (
        <div className="card border-amber-200 bg-amber-50">
          <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">Most frequent trigger this week</p>
          <p className="font-semibold text-amber-900 mt-1">{stats.topTrigger}</p>
        </div>
      )}

      {/* Recent logs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-800">Recent Logs</h2>
          <button onClick={() => onNavigate('history')} className="text-sm text-brand-600 font-medium">View all →</button>
        </div>

        {recentLogs.length === 0 ? (
          <div className="card text-center py-10">
            <p className="text-4xl mb-3">📋</p>
            <p className="font-medium text-slate-600">No logs yet</p>
            <p className="text-sm text-slate-400 mt-1">Start logging {profile.name}'s behaviors to see insights here</p>
            <button onClick={() => onNavigate('log')} className="btn-primary mt-4">Log First Entry</button>
          </div>
        ) : (
          <div className="space-y-3">
            {recentLogs.map(log => (
              <div key={log.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-slate-500">{formatLogDate(log.date)} · {log.time}</span>
                      <span className="text-xs text-slate-400">{log.location}</span>
                    </div>
                    {log.triggers.length > 0 && (
                      <p className="text-sm text-slate-700 mt-1 truncate">
                        <span className="font-medium">Triggers:</span> {log.triggers.slice(0, 2).join(', ')}{log.triggers.length > 2 ? ` +${log.triggers.length - 2}` : ''}
                      </p>
                    )}
                    {log.behaviors.length > 0 && (
                      <p className="text-sm text-slate-700 truncate">
                        <span className="font-medium">Behaviors:</span> {log.behaviors.slice(0, 2).join(', ')}{log.behaviors.length > 2 ? ` +${log.behaviors.length - 2}` : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <LevelBadge value={log.meltdownLevel} type="meltdown" />
                  </div>
                </div>
                {log.notes && <p className="text-xs text-slate-400 mt-2 italic truncate">"{log.notes}"</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Latest insight */}
      {analysis && analysis.insights.length > 0 && (
        <div className="card border-brand-100 bg-brand-50">
          <p className="text-xs font-medium text-brand-600 uppercase tracking-wide mb-2">Latest AI Insight</p>
          <p className="font-semibold text-brand-900">{analysis.insights[0].title}</p>
          <p className="text-sm text-brand-700 mt-1">{analysis.insights[0].content}</p>
          <button onClick={() => onNavigate('insights')} className="text-brand-600 text-sm font-medium mt-2">See all insights →</button>
        </div>
      )}
    </div>
  );
}
