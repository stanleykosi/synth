import { invokeOpenClawTool } from './openclaw.js';

type LlmTaskPayload = {
  prompt: string;
  input: Record<string, unknown>;
  schema?: Record<string, unknown>;
  model: string;
  maxTokens: number;
};

function extractJson(text: string): unknown | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function runOpenRouterTask<T>(payload: LlmTaskPayload): Promise<T> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OPENROUTER_API_KEY');
  }

  const model = payload.model.includes('/') ? payload.model : `openrouter/${payload.model}`;
  const schemaBlock = payload.schema ? `\nJSON schema:\n${JSON.stringify(payload.schema)}` : '';
  const system = `${payload.prompt}\nReturn JSON only.${schemaBlock}`;
  const user = JSON.stringify(payload.input);

  const response = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Title': 'SYNTH'
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      temperature: 0.2,
      max_tokens: payload.maxTokens
    })
  }, 30000);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenRouter HTTP ${response.status}: ${text.slice(0, 200)}`);
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content ?? '';
  const parsed = extractJson(content);
  if (!parsed) {
    throw new Error('OpenRouter response was not valid JSON');
  }
  return parsed as T;
}

export async function runLlmTask<T>(payload: LlmTaskPayload): Promise<T> {
  try {
    return await invokeOpenClawTool<T>({
      tool: 'llm-task',
      action: 'json',
      args: payload
    });
  } catch {
    return await runOpenRouterTask<T>(payload);
  }
}
