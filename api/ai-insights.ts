import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';
import { sendTrace } from './_lib/arizeTrace';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[DIAG] Handler called. ARIZE_API_KEY:', !!process.env.ARIZE_API_KEY, 'ARIZE_SPACE_ID:', !!process.env.ARIZE_SPACE_ID);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured.' });
  }

  const { profile, logs } = req.body as { profile: Record<string, unknown>; logs: Record<string, unknown>[] };

  if (!logs || logs.length < 3) {
    return res.status(400).json({ error: 'At least 3 logs are required for analysis' });
  }

  const logsText = logs.slice(0, 60).map((l) =>
    `Date: ${l.date} ${l.time} | Location: ${l.location} | Triggers: ${(l.triggers as string[]).join(', ') || 'none'} | Behaviors: ${(l.behaviors as string[]).join(', ') || 'none'} | Meltdown: ${l.meltdownLevel}/5 | Focus: ${l.focusLevel}/5 | Mood: ${l.moodLevel}/5 | Duration: ${l.duration}min | Resolved by: ${(l.resolvedBy as string[]).join(', ') || 'none'} | Notes: ${l.notes || '—'}`
  ).join('\n');

  const systemPrompt = `You are an expert AI assistant specializing in ADHD behavior analysis for parents and therapists.
Analyze behavior logs, identify patterns, track therapy progress, and provide actionable insights.
Be empathetic, data-driven, and practical. Always respond with valid JSON only — no markdown, no code blocks.`;

  const userPrompt = `Analyze the following behavior logs for ${profile.name}, age ${profile.age}, diagnosed with: ${(profile.diagnosis as string[]).join(', ')}.
Therapy started: ${profile.therapyStartDate || 'unknown'}. Current therapist: ${profile.currentTherapist || 'unknown'}.

BEHAVIOR LOGS (most recent first):
${logsText}

Respond with this exact JSON structure:
{
  "topTriggers": ["trigger1", "trigger2", "trigger3"],
  "trend": "improving" | "stable" | "declining",
  "summary": "2-3 sentence overall summary",
  "weeklyAverages": [
    { "week": "Week 1", "meltdownAvg": 2.1, "focusAvg": 3.2, "moodAvg": 2.8 }
  ],
  "insights": [
    {
      "type": "pattern" | "warning" | "success" | "recommendation",
      "title": "Short title",
      "content": "2-3 sentence explanation",
      "actionItems": ["action 1", "action 2"]
    }
  ],
  "recommendChangeTherapist": true | false,
  "improvementAreas": ["area 1", "area 2", "area 3"],
  "reminders": ["reminder 1", "reminder 2"]
}

Rules:
- trend = "improving" if meltdown decreasing and focus increasing; "declining" if worsening 3+ weeks; else "stable"
- recommendChangeTherapist = true ONLY if 4+ weeks of data with no improvement
- improvementAreas = 3 specific therapy specializations (meaningful only if recommendChangeTherapist is true)
- Include 3-5 insights, weeklyAverages for weeks present in data (max 8)`;

  const t0 = Date.now();
  let claudeResponse: Anthropic.Message | null = null;
  let rawText = '';

  try {
    claudeResponse = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });
    rawText = (claudeResponse.content[0] as { type: string; text: string }).text.trim();
    console.log('[DIAG] Claude responded. tokens:', claudeResponse.usage.input_tokens, '+', claudeResponse.usage.output_tokens);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[DIAG] Claude call failed:', msg);
    return res.status(500).json({ error: `Analysis failed: ${msg}` });
  }

  // Always send trace — even if JSON parsing fails below
  const durationMs = Date.now() - t0;
  sendTrace({
    spanName:     'anthropic.messages.create',
    model:        claudeResponse.model,
    inputTokens:  claudeResponse.usage.input_tokens,
    outputTokens: claudeResponse.usage.output_tokens,
    prompt:       userPrompt,
    response:     rawText,
    durationMs,
  }).catch(e => console.error('[Arize] sendTrace threw:', e));

  // Parse Claude's JSON response
  let analysisData: Record<string, unknown>;
  try {
    analysisData = JSON.parse(rawText);
  } catch {
    const match = rawText.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
    if (match) {
      try { analysisData = JSON.parse(match[1]); }
      catch { return res.status(500).json({ error: 'Failed to parse AI response as JSON' }); }
    } else {
      return res.status(500).json({ error: 'Failed to parse AI response as JSON' });
    }
  }

  // Wait briefly for trace to flush before response closes the connection
  await new Promise(r => setTimeout(r, 500));

  return res.status(200).json(analysisData);
}
