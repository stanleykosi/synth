import type { TrendSignal, EvidenceItem } from '../core/types.js';
import type { AgentConfig } from '../core/config.js';
import { invokeOpenClawTool } from './openclaw.js';

const schema = {
  type: 'object',
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          trendId: { type: 'string' },
          influencer: { type: 'number', minimum: 0, maximum: 10 },
          velocity: { type: 'number', minimum: 0, maximum: 10 },
          feasibility: { type: 'number', minimum: 0, maximum: 10 },
          gap: { type: 'number', minimum: 0, maximum: 10 },
          originality: { type: 'number', minimum: 0, maximum: 10 },
          composite: { type: 'number', minimum: 0, maximum: 10 },
          rationale: { type: 'string' }
        },
        required: ['trendId', 'influencer', 'velocity', 'feasibility', 'gap', 'originality', 'composite', 'rationale'],
        additionalProperties: false
      }
    }
  },
  required: ['results'],
  additionalProperties: false
};

export interface ValidationResult {
  trendId: string;
  influencer: number;
  velocity: number;
  feasibility: number;
  gap: number;
  originality: number;
  composite: number;
  rationale: string;
}

export async function validateTrends(input: {
  signals: TrendSignal[];
  evidence: Record<string, EvidenceItem[]>;
  config: AgentConfig;
}): Promise<Record<string, ValidationResult>> {
  if (!input.config.validation.enabled) return {};

  const model = process.env.SYNTH_LLM_MODEL ?? 'openrouter/anthropic/claude-3.5-haiku';
  const maxTokens = process.env.SYNTH_LLM_MAX_TOKENS ? Number(process.env.SYNTH_LLM_MAX_TOKENS) : 900;
  const maxSignals = Math.max(1, input.config.validation.maxSignals);

  const prompt = [
    'You are SYNTH, validating trend candidates.',
    'Score each trend on: influencer weight, engagement velocity, feasibility, gap, originality.',
    'Use evidence when available.',
    'Return JSON only with composite score (0-10) and a short rationale.'
  ].join('\n');

  const payload = {
    prompt,
    input: {
      trends: input.signals.slice(0, maxSignals).map((signal) => ({
        trendId: signal.id,
        source: signal.source,
        summary: signal.summary,
        score: signal.score,
        evidence: input.evidence[signal.id] ?? []
      }))
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

    if (!result || typeof result !== 'object') return {};
    const data = result as { results?: ValidationResult[] };
    const results = Array.isArray(data.results) ? data.results : [];
    return results.reduce<Record<string, ValidationResult>>((acc, item) => {
      if (item?.trendId) {
        acc[item.trendId] = item;
      }
      return acc;
    }, {});
  } catch {
    return {};
  }
}
