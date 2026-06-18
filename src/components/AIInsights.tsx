import { useState } from 'react';
import { format } from 'date-fns';
import { Brain, RefreshCw, CheckCircle, AlertTriangle, TrendingUp, TrendingDown, Minus, Lightbulb, Bell, AlertCircle } from 'lucide-react';
import { v4 as uuid } from 'uuid';
import { ChildProfile, BehaviorLog, AIAnalysis, InsightItem } from '../types';
import { saveAnalysis } from '../utils/storage';

interface Props {
  profile: ChildProfile;
  logs: BehaviorLog[];
  analysis: AIAnalysis | null;
  onAnalysisUpdated: (a: AIAnalysis) => void;
}

const INSIGHT_ICON = {
  pattern: Brain,
  warning: AlertTriangle,
  success: CheckCircle,
  recommendation: Lightbulb,
};

const INSIGHT_COLORS = {
  pattern: 'border-brand-200 bg-brand-50',
  warning: 'border-amber-200 bg-amber-50',
  success: 'border-emerald-200 bg-emerald-50',
  recommendation: 'border-violet-200 bg-violet-50',
};

const INSIGHT_ICON_COLORS = {
  pattern: 'text-brand-500',
  warning: 'text-amber-500',
  success: 'text-emerald-500',
  recommendation: 'text-violet-500',
};

function InsightCard({ insight }: { insight: InsightItem }) {
  const Icon = INSIGHT_ICON[insight.type];
  return (
    <div className={`rounded-2xl border p-4 ${INSIGHT_COLORS[insight.type]}`}>
      <div className="flex items-start gap-3">
        <Icon size={18} className={`mt-0.5 flex-shrink-0 ${INSIGHT_ICON_COLORS[insight.type]}`} />
        <div>
          <p className="font-semibold text-slate-800">{insight.title}</p>
          <p className="text-sm text-slate-600 mt-1">{insight.content}</p>
          {insight.actionItems.length > 0 && (
            <ul className="mt-2 space-y-1">
              {insight.actionItems.map((item, i) => (
                <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                  <span className="text-slate-400 mt-0.5">•</span>
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

const MIN_DAYS_FOR_USEFUL_INSIGHT = 15;

function getLoggedDaySpan(logs: BehaviorLog[]): number {
  if (logs.length === 0) return 0;
  const times = logs.map(l => new Date(l.date).getTime());
  const spanMs = Math.max(...times) - Math.min(...times);
  return Math.floor(spanMs / (1000 * 60 * 60 * 24)) + 1;
}

export function AIInsights({ profile, logs, analysis, onAnalysisUpdated }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const loggedDaySpan = getLoggedDaySpan(logs);

  const runAnalysis = async () => {
    if (logs.length < 3) {
      setError('Please add at least 3 behavior logs before running AI analysis.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const resp = await fetch('/api/ai-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, logs: logs.slice(0, 60) }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `Server error: ${resp.status}`);
      }

      const data = await resp.json();
      const newAnalysis: AIAnalysis = { ...data, id: uuid(), generatedAt: new Date().toISOString() };
      saveAnalysis(newAnalysis);
      onAnalysisUpdated(newAnalysis);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setError(msg.includes('Failed to fetch')
        ? 'Cannot connect to AI service. Make sure ANTHROPIC_API_KEY is set in Vercel environment variables.'
        : msg
      );
    } finally {
      setLoading(false);
    }
  };

  const TrendIcon = analysis?.trend === 'improving' ? TrendingUp :
    analysis?.trend === 'declining' ? TrendingDown : Minus;
  const trendConfig = {
    improving: { color: 'text-emerald-600 bg-emerald-50', label: 'Improving' },
    stable: { color: 'text-amber-600 bg-amber-50', label: 'Stable' },
    declining: { color: 'text-red-600 bg-red-50', label: 'Needs attention' },
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">AI Insights</h2>
          {analysis && (
            <p className="text-xs text-slate-400 mt-0.5">
              Last analyzed {format(new Date(analysis.generatedAt), 'MMM d, h:mm a')}
            </p>
          )}
        </div>
        <button
          onClick={runAnalysis}
          disabled={loading}
          className="btn-primary flex items-center gap-2 text-sm py-2"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Analyzing...' : analysis ? 'Re-analyze' : 'Run Analysis'}
        </button>
      </div>

      {/* Insufficient log history banner */}
      {loggedDaySpan < MIN_DAYS_FOR_USEFUL_INSIGHT && (
        <div className="card border-amber-200 bg-amber-50">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-amber-800 font-medium">
                You would need 15 days of behavioral logs to get an useful insight
              </p>
              <p className="text-xs text-amber-600 mt-1">
                {loggedDaySpan} of {MIN_DAYS_FOR_USEFUL_INSIGHT} days logged so far. You can still run an analysis now, but results will be more reliable with a longer history.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="card border-red-200 bg-red-50">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="card text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 relative">
            <div className="absolute inset-0 bg-brand-100 rounded-full animate-ping" />
            <div className="relative w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center">
              <Brain size={28} className="text-brand-500" />
            </div>
          </div>
          <p className="font-medium text-slate-700">AI is analyzing behavior patterns...</p>
          <p className="text-sm text-slate-400 mt-1">Reviewing {logs.length} log entries for {profile.name}</p>
        </div>
      )}

      {/* No analysis yet */}
      {!loading && !analysis && !error && (
        <div className="card text-center py-12">
          <Brain size={48} className="text-slate-200 mx-auto mb-4" />
          <p className="font-medium text-slate-600">No analysis yet</p>
          <p className="text-sm text-slate-400 mt-1 mb-6 max-w-sm mx-auto">
            Run AI analysis to get personalized insights about {profile.name}'s behavior patterns, triggers, and therapy progress.
          </p>
          {logs.length < 3 ? (
            <p className="text-xs text-amber-600 bg-amber-50 px-4 py-2 rounded-xl inline-block">
              Add at least 3 logs to enable analysis ({logs.length}/3 added)
            </p>
          ) : (
            <button onClick={runAnalysis} className="btn-primary">Run First Analysis</button>
          )}
        </div>
      )}

      {/* Analysis results */}
      {!loading && analysis && (
        <>
          {/* Trend overview */}
          <div className="card">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Overall Trend</p>
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl mt-1 ${trendConfig[analysis.trend].color}`}>
                  <TrendIcon size={16} />
                  <span className="font-semibold text-sm">{trendConfig[analysis.trend].label}</span>
                </div>
              </div>

              {analysis.topTriggers.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Top Triggers</p>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.topTriggers.slice(0, 3).map(t => (
                      <span key={t} className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-lg font-medium">
                        {t.split(' / ')[0]}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {analysis.summary && (
              <p className="text-sm text-slate-600 mt-3 border-t border-slate-100 pt-3">{analysis.summary}</p>
            )}
          </div>

          {/* Therapist change recommendation */}
          {analysis.recommendChangeTherapist && (
            <div className="card border-red-200 bg-red-50">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-red-700">Consider Reviewing Therapy Approach</p>
                  <p className="text-sm text-red-600 mt-1">
                    Based on the behavior data, limited improvement has been observed over the past few weeks.
                    It may be beneficial to discuss adjusting therapy goals or exploring alternative approaches.
                  </p>
                  {analysis.improvementAreas.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">Areas to look for in a therapist</p>
                      <ul className="space-y-1.5">
                        {analysis.improvementAreas.map((area, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-red-700">
                            <span className="font-bold text-red-400 mt-0.5">{i + 1}.</span>
                            {area}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Reminders */}
          {analysis.reminders.length > 0 && (
            <div className="card border-amber-200 bg-amber-50">
              <div className="flex items-start gap-3">
                <Bell size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-amber-800 mb-2">Reminders & Alerts</p>
                  <ul className="space-y-1.5">
                    {analysis.reminders.map((r, i) => (
                      <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Insights */}
          {analysis.insights.length > 0 && (
            <div>
              <h3 className="font-semibold text-slate-800 mb-3">Detailed Insights</h3>
              <div className="space-y-3">
                {analysis.insights.map((insight, i) => (
                  <InsightCard key={i} insight={insight} />
                ))}
              </div>
            </div>
          )}

          {/* Weekly trend chart */}
          {analysis.weeklyAverages && analysis.weeklyAverages.length > 1 && (
            <div className="card">
              <h3 className="font-semibold text-slate-700 mb-4">Weekly Averages</h3>
              <div className="space-y-2">
                {analysis.weeklyAverages.map((week, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <span className="text-slate-500 w-16 flex-shrink-0 text-xs">{week.week}</span>
                    <div className="flex-1 flex gap-2">
                      <div className="flex items-center gap-1 flex-1">
                        <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div className="bg-red-400 h-full rounded-full transition-all" style={{ width: `${(week.meltdownAvg / 5) * 100}%` }} />
                        </div>
                        <span className="text-xs text-slate-500 w-8">{week.meltdownAvg.toFixed(1)}</span>
                      </div>
                      <div className="flex items-center gap-1 flex-1">
                        <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div className="bg-brand-400 h-full rounded-full transition-all" style={{ width: `${(week.focusAvg / 5) * 100}%` }} />
                        </div>
                        <span className="text-xs text-slate-500 w-8">{week.focusAvg.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                  <span className="w-16" />
                  <div className="flex gap-4">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-400 rounded-full inline-block" />Meltdown</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-brand-400 rounded-full inline-block" />Focus</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
