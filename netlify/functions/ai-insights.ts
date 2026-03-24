import type { Handler } from "@netlify/functions";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const handler: Handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured. Please set it in your Netlify environment variables." }),
    };
  }

  let body: { profile: Record<string, unknown>; logs: Record<string, unknown>[] };
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid request body" }) };
  }

  const { profile, logs } = body;

  if (!logs || logs.length < 3) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "At least 3 logs are required for analysis" }) };
  }

  // Build weekly summaries for the prompt
  const logsText = (logs as Record<string, unknown>[]).slice(0, 60).map((l) => {
    return `Date: ${l.date} ${l.time} | Location: ${l.location} | Triggers: ${(l.triggers as string[]).join(", ") || "none"} | Behaviors: ${(l.behaviors as string[]).join(", ") || "none"} | Meltdown: ${l.meltdownLevel}/5 | Focus: ${l.focusLevel}/5 | Mood: ${l.moodLevel}/5 | Duration: ${l.duration}min | Resolved by: ${(l.resolvedBy as string[]).join(", ") || "none"} | Notes: ${l.notes || "—"}`;
  }).join("\n");

  const systemPrompt = `You are an expert AI assistant specializing in ADHD behavior analysis for parents and therapists.
Your role is to analyze behavior logs, identify patterns, track therapy progress, and provide actionable insights.
Be empathetic, data-driven, and practical. Focus on patterns that help therapists and parents.
Always respond with valid JSON only — no markdown, no code blocks, just raw JSON.`;

  const userPrompt = `Analyze the following behavior logs for ${profile.name}, age ${profile.age}, diagnosed with: ${(profile.diagnosis as string[]).join(", ")}.
Therapy started: ${profile.therapyStartDate || "unknown"}. Current therapist: ${profile.currentTherapist || "unknown"}.

BEHAVIOR LOGS (most recent first):
${logsText}

Provide a comprehensive analysis as a JSON object with EXACTLY this structure:
{
  "topTriggers": ["trigger1", "trigger2", "trigger3"],
  "trend": "improving" | "stable" | "declining",
  "summary": "2-3 sentence overall summary of the child's behavioral patterns",
  "weeklyAverages": [
    { "week": "Week 1", "meltdownAvg": 2.1, "focusAvg": 3.2, "moodAvg": 2.8 },
    { "week": "Week 2", "meltdownAvg": 1.8, "focusAvg": 3.5, "moodAvg": 3.1 }
  ],
  "insights": [
    {
      "type": "pattern" | "warning" | "success" | "recommendation",
      "title": "Short title",
      "content": "2-3 sentence explanation",
      "actionItems": ["specific action 1", "specific action 2"]
    }
  ],
  "recommendChangeTherapist": true | false,
  "improvementAreas": ["area 1", "area 2", "area 3"],
  "reminders": ["reminder 1", "reminder 2"]
}

Rules:
- "trend" must be "improving" if meltdown averages are decreasing and focus is increasing over time, "declining" if worsening for 3+ weeks, otherwise "stable"
- "recommendChangeTherapist" must be true ONLY if there is 4+ weeks of data showing no improvement (stable or declining trend)
- "improvementAreas" should be 3 specific therapy specializations to look for in a new therapist (only meaningful if recommendChangeTherapist is true)
- "reminders" should include 1-3 practical reminders for parents (log timing patterns, upcoming therapy considerations, etc.)
- Include 3-5 insights covering patterns, successes, and recommendations
- weeklyAverages should cover the weeks present in the data (max 8 weeks)
- Keep all text concise and actionable`;

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const rawText = (response.content[0] as { type: string; text: string }).text.trim();

    // Parse JSON response
    let analysisData: Record<string, unknown>;
    try {
      analysisData = JSON.parse(rawText);
    } catch {
      // Try to extract JSON if wrapped in backticks
      const match = rawText.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
      if (match) {
        analysisData = JSON.parse(match[1]);
      } else {
        throw new Error("Failed to parse AI response as JSON");
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(analysisData),
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("AI Insights error:", msg);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: `Analysis failed: ${msg}` }),
    };
  }
};
