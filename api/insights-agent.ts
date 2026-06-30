import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';
import { sendTrace } from './_lib/arizeTrace';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface TriggerWindow {
  days: number;
  label: string;
  logCount: number;
  frequencies: { trigger: string; count: number }[];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured.' });
  }

  const { profile, analysis, triggerWindows, messages } = req.body as {
    profile: Record<string, unknown>;
    analysis: Record<string, unknown> | null;
    triggerWindows: TriggerWindow[];
    messages: { role: 'user' | 'assistant'; content: string }[];
  };

  if (!messages || messages.length === 0) {
    return res.status(400).json({ error: 'At least one message is required' });
  }

  const triggerWindowsText = (triggerWindows || [])
    .map(w => `${w.label} (${w.logCount} logs): ${w.frequencies.length ? w.frequencies.map(f => `${f.trigger} x${f.count}`).join(', ') : 'no triggers logged'}`)
    .join('\n');

  const systemPrompt = `You are a supportive assistant helping a parent understand their child's ADHD behavior-tracking report.
You're discussing ${profile.name}, age ${profile.age}.

LATEST AI ANALYSIS:
${analysis ? JSON.stringify(analysis) : 'No analysis has been run yet — encourage the parent to run one first if their question depends on it.'}

TOP TRIGGER FREQUENCY BY TIME WINDOW (cumulative — "Last 2 months" includes "Last 1 month"):
${triggerWindowsText || 'No behavior logs yet.'}

Answer the parent's questions about this report in plain, empathetic language. Ground every claim in the
analysis and trigger data above — never invent numbers or patterns that aren't in it. If the parent asks
how triggers compare across time periods (e.g. last 1 month vs last 2 months), use the window data above
to describe what's increased, decreased, or stayed the same, citing the actual counts. If the parent asks
you to prepare a summary to send to their child's therapist, write one as a concise, professional paragraph
suitable for a therapist email — start that reply with the exact line "THERAPIST SUMMARY:" on its own line
so the app can detect it, followed by the summary text. Keep replies to a short paragraph or a few bullet
points — this is a chat, not a full report.`;

  const t0 = Date.now();
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    });
    const reply = (response.content[0] as { type: string; text: string }).text.trim();

    sendTrace({
      spanName:     'anthropic.messages.create',
      model:        response.model,
      inputTokens:  response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      prompt:       messages[messages.length - 1].content,
      response:     reply,
      durationMs:   Date.now() - t0,
    }).catch(e => console.error('[Arize] sendTrace threw:', e));

    await new Promise(r => setTimeout(r, 500));

    return res.status(200).json({ reply });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Insights agent error:', msg);
    return res.status(500).json({ error: `Chat failed: ${msg}` });
  }
}
