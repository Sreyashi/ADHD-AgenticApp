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

  let body: { location: string; childAge: number; diagnosis: string[]; specialtyFocus: string };
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid request body" }) };
  }

  const { location, childAge, diagnosis, specialtyFocus } = body;

  if (!location) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Location is required" }) };
  }

  const systemPrompt = `You are a helpful assistant that helps parents of children with ADHD find qualified therapists and mental health professionals.
You have extensive knowledge of therapist directories, mental health resources, and ADHD treatment specialists across the United States.
Always respond with valid JSON only — no markdown, no code blocks, just raw JSON.
Important: Generate realistic, plausible therapist information based on the location. Include real area codes and realistic contact information. Clearly note that contact details should be verified.`;

  const diagnosisText = Array.isArray(diagnosis) ? diagnosis.join(", ") : "ADHD";
  const focusText = specialtyFocus ? ` with specific focus on: ${specialtyFocus}` : "";

  const userPrompt = `Find ADHD therapists and mental health specialists near ${location} for a ${childAge || "child"}-year-old with ${diagnosisText}${focusText}.

Return a JSON object with EXACTLY this structure:
{
  "therapists": [
    {
      "id": "unique-id",
      "name": "Dr. First Last",
      "credentials": "PhD, LCSW, or similar",
      "specialty": "Brief specialty description",
      "phone": "(XXX) XXX-XXXX",
      "email": "contact@practice.com",
      "address": "123 Main Street, Suite 100",
      "city": "City name",
      "state": "State abbreviation",
      "acceptingNewPatients": true,
      "telehealth": true,
      "approaches": ["CBT", "Behavioral Therapy", "Parent Coaching"],
      "yearsExperience": 10,
      "notes": "Brief note about their approach or specialization",
      "directoryLink": "https://www.psychologytoday.com/us/therapists/state/city"
    }
  ],
  "disclaimer": "Brief disclaimer about verifying contact information"
}

Generate 5-6 realistic therapist profiles for ${location}:
- Use realistic names, addresses, and area codes for ${location}
- Include a mix of: child psychologists, LCSWs, behavioral therapists
- Vary telehealth availability, accepting status, and specialties
- Include therapists who specialize in ADHD, behavioral issues, and parent coaching
- For directoryLink, use real Psychology Today or CHADD directory URLs for the region
- Make disclaimer note that "These results are AI-generated examples. Please verify all contact information on Psychology Today (psychologytoday.com) or CHADD directory (chadd.org) before reaching out."`;

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const rawText = (response.content[0] as { type: string; text: string }).text.trim();

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(rawText);
    } catch {
      const match = rawText.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
      if (match) {
        data = JSON.parse(match[1]);
      } else {
        throw new Error("Failed to parse AI response as JSON");
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data),
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("Therapist finder error:", msg);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: `Search failed: ${msg}` }),
    };
  }
};
