import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { Resource } from '@opentelemetry/resources';
import { BatchSpanProcessor, BasicTracerProvider } from '@opentelemetry/sdk-trace-base';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { SEMRESATTRS_PROJECT_NAME } from '@arizeai/openinference-semantic-conventions';
import { AnthropicInstrumentation } from '@arizeai/openinference-instrumentation-anthropic';

// ── Arize AX Tracing ──────────────────────────────────────────────────────────
// Fresh provider per invocation — required for Vercel serverless
// (no persistent process state between cold starts)
function createTracerProvider() {
  const exporter = new OTLPTraceExporter({
    url: 'https://otlp.arize.com/v1/traces',
    headers: {
      space_id: process.env.ARIZE_SPACE_ID ?? '',
      api_key:  process.env.ARIZE_API_KEY ?? '',
    },
  });

  const provider = new BasicTracerProvider({
    resource: new Resource({
      [ATTR_SERVICE_NAME]: 'adhd-behavior-tracker',
      [SEMRESATTRS_PROJECT_NAME]: 'adhd-behavior-tracker',
    }),
    spanProcessors: [new BatchSpanProcessor(exporter)],
  });

  const instrumentation = new AnthropicInstrumentation();
  instrumentation.manuallyInstrument(Anthropic);
  instrumentation.setTracerProvider(provider);

  provider.register();

  return provider;
}
// ─────────────────────────────────────────────────────────────────────────────

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({
      error: 'ANTHROPIC_API_KEY is not configured. Add it in Vercel → Project Settings → Environment Variables.',
    });
  }

  // Init tracing per-request so spans are guaranteed to exist within this invocation
  const tracerProvider = createTracerProvider();

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

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

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

    // Force flush before Vercel shuts down the function
    await tracerProvider.forceFlush();

    return res.status(200).json(analysisData);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('AI Insights error:', msg);
    await tracerProvider.forceFlush().catch(() => {});
    return res.status(500).json({ error: `Analysis failed: ${msg}` });
  }
}
