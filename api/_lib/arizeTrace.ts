// ── Arize AX Tracing — zero OTel dependencies, plain fetch ───────────────────
function randomHex(bytes: number) {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function sendTrace({
  spanName, model, inputTokens, outputTokens, prompt, response, durationMs,
}: {
  spanName: string; model: string; inputTokens: number; outputTokens: number;
  prompt: string; response: string; durationMs: number;
}) {
  const apiKey = process.env.ARIZE_API_KEY;
  const spaceId = process.env.ARIZE_SPACE_ID;

  if (!apiKey || !spaceId) return;

  const endNs = BigInt(Date.now()) * 1_000_000n;
  const startNs = endNs - BigInt(durationMs) * 1_000_000n;

  const payload = {
    resourceSpans: [{
      resource: {
        attributes: [
          { key: 'service.name',               value: { stringValue: 'adhd-behavior-tracker' } },
          { key: 'openinference.project.name', value: { stringValue: 'adhd-behavior-tracker' } },
        ],
      },
      scopeSpans: [{
        scope: { name: 'adhd-tracker', version: '1.0.0' },
        spans: [{
          traceId:           randomHex(16),
          spanId:            randomHex(8),
          name:              spanName,
          kind:              3,
          startTimeUnixNano: String(startNs),
          endTimeUnixNano:   String(endNs),
          attributes: [
            { key: 'openinference.span.kind',    value: { stringValue: 'LLM' } },
            { key: 'llm.model_name',             value: { stringValue: model } },
            { key: 'llm.token_count.prompt',     value: { intValue: inputTokens } },
            { key: 'llm.token_count.completion', value: { intValue: outputTokens } },
            { key: 'llm.token_count.total',      value: { intValue: inputTokens + outputTokens } },
            { key: 'input.value',                value: { stringValue: prompt.slice(0, 1000) } },
            { key: 'output.value',               value: { stringValue: response.slice(0, 1000) } },
          ],
          status: { code: 1 },
        }],
      }],
    }],
  };

  const r = await fetch('https://otlp.arize.com/v1/traces', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'space_id': spaceId,
      'api_key':  apiKey,
    },
    body: JSON.stringify(payload),
  });
  const body = await r.text().catch(() => '');
  console.log('[Arize] Response:', r.status, body);
}
// ─────────────────────────────────────────────────────────────────────────────
