import { useState, useMemo } from 'react';
import { format, subDays, parseISO } from 'date-fns';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, AreaChart, Area
} from 'recharts';
import { Trash2, Share2, Copy, CheckCheck } from 'lucide-react';
import { BehaviorLog, ChildProfile } from '../types';
import { deleteLog, exportLogsAsText } from '../utils/storage';

interface Props {
  logs: BehaviorLog[];
  profile: ChildProfile;
  onLogsChanged: () => void;
}

const RANGE_OPTIONS = [7, 14, 30, 90] as const;
type Range = typeof RANGE_OPTIONS[number];

export function HistoryView({ logs, profile, onLogsChanged }: Props) {
  const [range, setRange] = useState<Range>(30);
  const [copied, setCopied] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filteredLogs = useMemo(() =>
    logs.filter(l => new Date(l.date) >= subDays(new Date(), range)),
    [logs, range]
  );

  // Build daily chart data
  const chartData = useMemo(() => {
    const map: Record<string, { date: string; meltdown: number; focus: number; mood: number; count: number }> = {};
    for (let i = range - 1; i >= 0; i--) {
      const d = format(subDays(new Date(), i), 'yyyy-MM-dd');
      map[d] = { date: format(subDays(new Date(), i), 'MMM d'), meltdown: 0, focus: 0, mood: 0, count: 0 };
    }
    filteredLogs.forEach(l => {
      const d = l.date.slice(0, 10);
      if (map[d]) {
        map[d].meltdown += l.meltdownLevel;
        map[d].focus += l.focusLevel;
        map[d].mood += l.moodLevel;
        map[d].count++;
      }
    });
    return Object.values(map).map(d => ({
      date: d.date,
      meltdown: d.count > 0 ? parseFloat((d.meltdown / d.count).toFixed(1)) : null,
      focus: d.count > 0 ? parseFloat((d.focus / d.count).toFixed(1)) : null,
      mood: d.count > 0 ? parseFloat((d.mood / d.count).toFixed(1)) : null,
    }));
  }, [filteredLogs, range]);

  // Trigger frequency
  const triggerData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredLogs.forEach(l => l.triggers.forEach(t => { counts[t] = (counts[t] || 0) + 1; }));
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name: name.split(' / ')[0], count }));
  }, [filteredLogs]);

  const handleDelete = (id: string) => {
    deleteLog(id);
    setDeleteConfirm(null);
    onLogsChanged();
  };

  const handleShare = async () => {
    const text = exportLogsAsText(filteredLogs, profile);
    try {
      if (navigator.share) {
        await navigator.share({ title: `${profile.name}'s Behavior Report`, text });
      } else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">History</h2>
        <button onClick={handleShare} className="btn-secondary flex items-center gap-2 text-sm py-2">
          {copied ? <CheckCheck size={15} className="text-emerald-500" /> : <Share2 size={15} />}
          {copied ? 'Copied!' : 'Share Report'}
        </button>
      </div>

      {/* Range selector */}
      <div className="flex gap-2">
        {RANGE_OPTIONS.map(r => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              range === r ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >{r}d</button>
        ))}
      </div>

      {filteredLogs.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">📊</p>
          <p className="font-medium text-slate-600">No logs in this period</p>
          <p className="text-sm text-slate-400 mt-1">Start logging to see charts and trends here</p>
        </div>
      ) : (
        <>
          {/* Trend chart */}
          <div className="card">
            <h3 className="font-semibold text-slate-700 mb-4">Daily Trends</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <defs>
                  <linearGradient id="meltdownGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="focusGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} interval={Math.floor(range / 6)} />
                <YAxis domain={[0, 5]} tick={{ fontSize: 10 }} tickLine={false} ticks={[0, 1, 2, 3, 4, 5]} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                <Legend iconType="circle" iconSize={8} />
                <Area type="monotone" dataKey="meltdown" name="Meltdown" stroke="#EF4444" fill="url(#meltdownGrad)" strokeWidth={2} dot={false} connectNulls />
                <Area type="monotone" dataKey="focus" name="Focus" stroke="#4F46E5" fill="url(#focusGrad)" strokeWidth={2} dot={false} connectNulls />
                <Area type="monotone" dataKey="mood" name="Mood" stroke="#10B981" fill="url(#moodGrad)" strokeWidth={2} dot={false} connectNulls />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Trigger frequency */}
          {triggerData.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-slate-700 mb-4">Trigger Frequency</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={triggerData} margin={{ top: 5, right: 5, bottom: 40, left: -20 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} tickLine={false} width={90} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="count" name="Incidents" fill="#4F46E5" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total logs', value: filteredLogs.length },
              {
                label: 'Avg meltdown', value:
                  (filteredLogs.reduce((s, l) => s + l.meltdownLevel, 0) / filteredLogs.length).toFixed(1) + '/5'
              },
              {
                label: 'Avg focus', value:
                  (filteredLogs.reduce((s, l) => s + l.focusLevel, 0) / filteredLogs.length).toFixed(1) + '/5'
              },
            ].map(s => (
              <div key={s.label} className="card text-center">
                <p className="text-xs text-slate-500">{s.label}</p>
                <p className="text-xl font-bold text-slate-800 mt-1">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Log list */}
          <div>
            <h3 className="font-semibold text-slate-800 mb-3">All Entries ({filteredLogs.length})</h3>
            <div className="space-y-3">
              {filteredLogs.map(log => (
                <div key={log.id} className="card hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-semibold text-slate-500">
                          {format(parseISO(log.date), 'MMM d, yyyy')} · {log.time}
                        </span>
                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg">{log.location}</span>
                      </div>
                      {log.triggers.length > 0 && (
                        <p className="text-sm text-slate-600 truncate">
                          <span className="font-medium text-slate-700">Triggers:</span> {log.triggers.join(', ')}
                        </p>
                      )}
                      {log.behaviors.length > 0 && (
                        <p className="text-sm text-slate-600 truncate">
                          <span className="font-medium text-slate-700">Behaviors:</span> {log.behaviors.join(', ')}
                        </p>
                      )}
                      <div className="flex gap-3 mt-2 text-xs text-slate-500">
                        <span>Meltdown: <strong className="text-slate-700">{log.meltdownLevel === 0 ? 'None' : `${log.meltdownLevel}/5`}</strong></span>
                        <span>Focus: <strong className="text-slate-700">{log.focusLevel}/5</strong></span>
                        <span>Mood: <strong className="text-slate-700">{log.moodLevel}/5</strong></span>
                      </div>
                      {log.notes && <p className="text-xs text-slate-400 mt-1 italic">"{log.notes}"</p>}
                    </div>

                    {deleteConfirm === log.id ? (
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => handleDelete(log.id)} className="text-xs text-white bg-red-500 px-2 py-1 rounded-lg">Delete</button>
                        <button onClick={() => setDeleteConfirm(null)} className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">Cancel</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(log.id)}
                        className="text-slate-300 hover:text-red-400 transition-colors flex-shrink-0"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
