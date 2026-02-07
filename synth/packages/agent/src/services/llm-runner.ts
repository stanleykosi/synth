import { execFile } from 'child_process';
import { promisify } from 'util';

type LlmTaskPayload = {
  prompt: string;
  input: Record<string, unknown>;
  schema?: Record<string, unknown>;
  model: string;
  maxTokens: number;
};

const execFileAsync = promisify(execFile);

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

function normalizeReply(payload: unknown): string {
  if (!payload) return '';
  if (typeof payload === 'string') return payload;
  if (typeof payload === 'object') {
    const data = payload as Record<string, unknown>;
    const result = data.result as Record<string, unknown> | undefined;
    if (result && Array.isArray(result.payloads)) {
      const payloadText = (result.payloads[0] as { text?: unknown } | undefined)?.text;
      if (typeof payloadText === 'string') return payloadText;
    }
    const reply = data.reply ?? data.message ?? data.output ?? data.text;
    if (typeof reply === 'string') return reply;
    if (reply && typeof reply === 'object') {
      const nested = reply as Record<string, unknown>;
      const content = nested.content ?? nested.text;
      if (typeof content === 'string') return content;
    }
  }
  return '';
}

function buildAgentMessage(payload: LlmTaskPayload): string {
  const schemaBlock = payload.schema ? `\nJSON schema:\n${JSON.stringify(payload.schema)}` : '';
  return [
    payload.prompt,
    'This is NOT a heartbeat run. Do NOT reply with HEARTBEAT_OK.',
    'You are running inside the OpenClaw agent loop with native skills enabled.',
    'Follow the JSON schema exactly and respond with JSON only (no prose).',
    'Your response must start with "{" and end with "}".',
    schemaBlock,
    'Input:',
    JSON.stringify(payload.input)
  ].join('\n');
}

async function runOpenClawAgent<T>(payload: LlmTaskPayload): Promise<T> {
  const cli = process.env.OPENCLAW_CLI_PATH ?? 'openclaw';
  const agentId = process.env.OPENCLAW_AGENT_ID ?? 'main';
  const timeoutSec = Number(process.env.OPENCLAW_AGENT_TIMEOUT ?? '180');
  const sessionMode = (process.env.OPENCLAW_SESSION_MODE ?? 'sticky').toLowerCase();
  const sessionId = sessionMode === 'stateless'
    ? `synth-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    : process.env.OPENCLAW_SESSION_ID;
  const message = buildAgentMessage(payload);

  const args = [
    'agent',
    '--agent',
    agentId,
    '--message',
    message,
    '--json',
    '--timeout',
    String(timeoutSec)
  ];

  if (sessionId) {
    args.push('--session-id', sessionId);
  }

  const { stdout } = await execFileAsync(cli, args, {
    env: process.env,
    maxBuffer: 5 * 1024 * 1024
  });

  const output = stdout.trim();
  const parsed = extractJson(output);
  if (!parsed) {
    throw new Error('OpenClaw agent output was not JSON.');
  }
  const replyText = normalizeReply(parsed);
  const replyJson = extractJson(replyText);
  if (!replyJson) {
    throw new Error('OpenClaw agent reply was not valid JSON.');
  }
  return replyJson as T;
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
    return await runOpenClawAgent<T>(payload);
  } catch {
    return await runOpenRouterTask<T>(payload);
  }
}
