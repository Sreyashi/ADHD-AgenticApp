import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';

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

  const { location, childAge, diagnosis, specialtyFocus } = req.body as {
    location: string;
    childAge: number;
    diagnosis: string[];
    specialtyFocus: string;
  };

  if (!location) {
    return res.status(400).json({ error: 'Location is required' });
  }

  const diagnosisText = Array.isArray(diagnosis) ? diagnosis.join(', ') : 'ADHD';
  const focusText = specialtyFocus ? ` with specific focus on: ${specialtyFocus}` : '';

  const systemPrompt = `You are a helpful assistant that helps parents of children with ADHD find qualified therapists.
You have extensive knowledge of therapist directories and ADHD treatment specialists across the US.
Always respond with valid JSON only — no markdown, no code blocks.`;

  const userPrompt = `Find ADHD therapists near ${location} for a ${childAge || 'child'}-year-old with ${diagnosisText}${focusText}.

Return this exact JSON:
{
  "therapists": [
    {
      "id": "unique-id",
      "name": "Dr. First Last",
      "credentials": "PhD / LCSW / etc",
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
      "notes": "Brief note about their approach",
      "directoryLink": "https://www.psychologytoday.com/us/therapists/state/city"
    }
  ],
  "disclaimer": "These results are AI-generated examples. Please verify all contact information on Psychology Today (psychologytoday.com) or the CHADD directory (chadd.org) before reaching out."
}

Generate 5-6 realistic therapist profiles for ${location}:
- Use realistic names, addresses, and area codes for that city
- Mix of child psychologists, LCSWs, behavioral therapists
- Vary telehealth availability, accepting status, and specialties
- Specializing in ADHD, behavioral issues, and parent coaching`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
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
        throw new Error('Failed to parse AI response as JSON');
      }
    }

    return res.status(200).json(data);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Therapist finder error:', msg);
    return res.status(500).json({ error: `Search failed: ${msg}` });
  }
}
