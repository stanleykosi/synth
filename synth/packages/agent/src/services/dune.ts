import { invokeOpenClawTool } from './openclaw.js';

const schema = {
  type: 'object',
  properties: {
    summary: { type: 'string', minLength: 20, maxLength: 260 }
  },
  required: ['summary'],
  additionalProperties: false
};

export async function summarizeDuneRows(input: {
  queryId: number;
  rows: Record<string, unknown>[];
  context?: string;
}): Promise<string | null> {
  const model = process.env.SYNTH_LLM_MODEL ?? 'openrouter/anthropic/claude-3.5-haiku';
  const maxTokens = process.env.SYNTH_LLM_MAX_TOKENS ? Number(process.env.SYNTH_LLM_MAX_TOKENS) : 400;

  const prompt = [
    'You are SYNTH. Summarize Dune query results into a concise trend insight.',
    'Focus on what changed, why it matters, and what should be built.',
    'Return JSON only.',
    input.context ? 'Follow the persona and operator preferences provided.' : ''
  ].join('\n');

  const payload = {
    prompt,
    input: {
      queryId: input.queryId,
      rows: input.rows
    },
    schema,
    model,
    maxTokens
  };

  try {
    const result = await invokeOpenClawTool<unknown>({
      tool: 'llm-task',
      action: 'json',
      args: payload
    });

    if (!result || typeof result !== 'object') return null;
    const summary = String((result as { summary?: string }).summary ?? '').trim();
    return summary.length > 0 ? summary : null;
  } catch {
    return null;
  }
}
