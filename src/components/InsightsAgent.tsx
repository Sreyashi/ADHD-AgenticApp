import { useMemo, useState } from 'react';
import { MessageCircle, Send, Mail, AlertCircle, Loader2 } from 'lucide-react';
import { ChildProfile, BehaviorLog, AIAnalysis, AgentMessage } from '../types';
import { getTriggerWindows } from '../utils/triggerAnalysis';

interface Props {
  profile: ChildProfile;
  logs: BehaviorLog[];
  analysis: AIAnalysis;
  onGoToSettings: () => void;
}

const QUICK_QUESTIONS = [
  "What's changed in the top triggers over the last 2 months?",
  'Which trigger should I focus on first?',
  "Prepare a summary to send to my child's therapist",
];

const SUMMARY_PREFIX = 'THERAPIST SUMMARY:';

function extractTherapistSummary(content: string): string | null {
  if (!content.startsWith(SUMMARY_PREFIX)) return null;
  return content.slice(SUMMARY_PREFIX.length).trim();
}

function buildMailto(email: string, childName: string, summary: string): string {
  const subject = `Behavior Tracker Summary for ${childName}`;
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(summary)}`;
}

export function InsightsAgent({ profile, logs, analysis, onGoToSettings }: Props) {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const triggerWindows = useMemo(() => getTriggerWindows(logs), [logs]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const nextMessages = [...messages, { role: 'user' as const, content: trimmed }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const resp = await fetch('/api/insights-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, analysis, triggerWindows, messages: nextMessages }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `Server error: ${resp.status}`);
      }

      const data = await resp.json();
      setMessages(m => [...m, { role: 'assistant', content: data.reply }]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-1">
        <MessageCircle size={18} className="text-brand-500" />
        <h3 className="font-semibold text-slate-800">Ask About This Report</h3>
      </div>
      <p className="text-sm text-slate-500 mb-4">
        Have questions about {profile.name}'s top triggers or how things have changed? Ask below.
      </p>

      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {QUICK_QUESTIONS.map(q => (
            <button
              key={q}
              onClick={() => sendMessage(q)}
              disabled={loading}
              className="text-xs bg-brand-50 text-brand-700 border border-brand-200 rounded-lg px-3 py-1.5 hover:bg-brand-100 transition-colors disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {messages.length > 0 && (
        <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
          {messages.map((m, i) => {
            const summary = m.role === 'assistant' ? extractTherapistSummary(m.content) : null;

            if (summary) {
              return (
                <div key={i} className="bg-brand-50 border border-brand-200 rounded-2xl p-3">
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{summary}</p>
                  <div className="mt-3 pt-3 border-t border-brand-200">
                    {profile.therapistEmail ? (
                      <a
                        href={buildMailto(profile.therapistEmail, profile.name, summary)}
                        className="btn-primary inline-flex items-center gap-2 text-sm py-2"
                      >
                        <Mail size={14} />
                        Email to {profile.therapistEmail}
                      </a>
                    ) : (
                      <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                        <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
                        <span>
                          No therapist email on file.{' '}
                          <button onClick={onGoToSettings} className="font-semibold underline">
                            Add it in Settings
                          </button>{' '}
                          to send this summary.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            return (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap ${
                    m.role === 'user' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            );
          })}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-100 text-slate-400 rounded-2xl px-3.5 py-2 text-sm flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                Thinking...
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-3">
          <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          className="input-field text-sm flex-1"
          placeholder="Ask a question about this report..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') sendMessage(input); }}
          disabled={loading}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
          className="btn-primary px-4 disabled:opacity-50"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
