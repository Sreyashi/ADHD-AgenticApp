import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';

// ── Arize AX Tracing — zero OTel dependencies, plain fetch ───────────────────
function randomHex(bytes: number) {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sendTrace({
  model, inputTokens, outputTokens, prompt, response, durationMs,
}: {
  model: string; inputTokens: number; outputTokens: number;
  prompt: string; response: string; durationMs: number;
}) {
  const apiKey = process.env.ARIZE_API_KEY;
  const spaceId = process.env.ARIZE_SPACE_ID;
  if (!apiKey || !spaceId) {
    console.log('[Arize] Skipping trace — ARIZE_API_KEY or ARIZE_SPACE_ID not set');
    return;
  }

  const endNs = BigInt(Date.now()) * 1_000_000n;
  const startNs = endNs - BigInt(durationMs) * 1_000_000n;

  const payload = {
    resourceSpans: [{
      resource: {
        attributes: [
          { key: 'service.name',                value: { stringValue: 'adhd-behavior-tracker' } },
          { key: 'openinference.project.name',  value: { stringValue: 'adhd-behavior-tracker' } },
        ],
      },
      scopeSpans: [{
        scope: { name: 'adhd-tracker', version: '1.0.0' },
        spans: [{
          traceId:            randomHex(16),
          spanId:             randomHex(8),
          name:               'anthropic.messages.create',
          kind:               3, // CLIENT
          startTimeUnixNano:  String(startNs),
          endTimeUnixNano:    String(endNs),
          attributes: [
            { key: 'openinference.span.kind',   value: { stringValue: 'LLM' } },
            { key: 'llm.model_name',            value: { stringValue: model } },
            { key: 'llm.token_count.prompt',    value: { intValue: inputTokens } },
            { key: 'llm.token_count.completion',value: { intValue: outputTokens } },
            { key: 'llm.token_count.total',     value: { intValue: inputTokens + outputTokens } },
            { key: 'input.value',               value: { stringValue: prompt.slice(0, 1000) } },
            { key: 'output.value',              value: { stringValue: response.slice(0, 1000) } },
          ],
          status: { code: 1 },
        }],
      }],
    }],
  };

  try {
    const res = await fetch('https://otlp.arize.com/v1/traces', {
      method: 'POST',
      headers: {
        'Content-Type':     'application/json',
        'x-auth-token':     apiKey,
        'x-arize-space-id': spaceId,
      },
      body: JSON.stringify(payload),
    });
    console.log('[Arize] Trace sent. Status:', res.status, await res.text().catch(() => ''));
  } catch (e) {
    console.error('[Arize] Failed to send trace:', e);
  }
}
// ─────────────────────────────────────────────────────────────────────────────

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // DIAGNOSTIC — remove after confirming traces work
  console.log('[DIAG] Handler called. ENV CHECK:',
    'ARIZE_API_KEY:', process.env.ARIZE_API_KEY ? 'SET('+process.env.ARIZE_API_KEY.length+'chars)' : 'MISSING',
    'ARIZE_SPACE_ID:', process.env.ARIZE_SPACE_ID ? 'SET('+process.env.ARIZE_SPACE_ID.length+'chars)' : 'MISSING',
    'ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? 'SET' : 'MISSING',
  );
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({
      error: 'ANTHROPIC_API_KEY is not configured.',
    });
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

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const durationMs = Date.now() - t0;
    const rawText = (response.content[0] as { type: string; text: string }).text.trim();

    let analysisData: Record<string, unknown>;
    try {
      analysisData = JSON.parse(rawText);
    } catch {
      const match = rawText.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
      if (match) {
        analysisData = JSON.parse(match[1]);
      } else {
        throw new Error('Failed to parse AI response as JSON');
      }
    }

    // Send trace to Arize (non-blocking — don't let trace failure affect the response)
    await sendTrace({
      model:        response.model,
      inputTokens:  response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      prompt:       userPrompt,
      response:     rawText,
      durationMs,
    });

    return res.status(200).json(analysisData);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('AI Insights error:', msg);
    return res.status(500).json({ error: `Analysis failed: ${msg}` });
  }
}
