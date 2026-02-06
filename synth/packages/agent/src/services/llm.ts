import type { DecisionRecord, EvidenceItem, TrendSignal } from '../core/types.js';
import type { AgentConfig } from '../core/config.js';
import { runLlmTask } from './llm-runner.js';

const decisionSchema = {
  type: 'object',
  properties: {
    go: { type: 'boolean' },
    trendId: { type: 'string' },
    dropType: { type: 'string', enum: ['token', 'nft', 'dapp', 'contract'] },
    name: { type: 'string', minLength: 3 },
    symbol: { type: 'string', minLength: 2 },
    description: { type: 'string', minLength: 10 },
    tagline: { type: 'string', minLength: 5 },
    hero: { type: 'string', minLength: 5 },
    cta: { type: 'string', minLength: 3 },
    features: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 6 },
    rationale: { type: 'string', minLength: 10 },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    evidence: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          url: { type: 'string' },
          snippet: { type: 'string' },
          source: { type: 'string' }
        },
        required: ['title', 'url'],
        additionalProperties: false
      }
    }
  },
  required: ['go', 'trendId', 'dropType', 'name', 'symbol', 'description', 'tagline', 'hero', 'cta', 'features', 'rationale', 'confidence'],
  additionalProperties: false
};

function nowIso() {
  return new Date().toISOString();
}

function parseDecision(raw: unknown): DecisionRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Partial<DecisionRecord>;
  if (!data.trendId || !data.dropType || !data.name || !data.description) return null;
  if (!data.tagline || !data.hero || !data.cta || !data.rationale) return null;
  if (!Array.isArray(data.features) || data.features.length < 3) return null;
  const confidence = typeof data.confidence === 'number' ? data.confidence : 0.5;
  return {
    id: `decision-${Date.now()}`,
    createdAt: nowIso(),
    trendId: String(data.trendId),
    go: Boolean(data.go),
    dropType: data.dropType,
    name: String(data.name),
    symbol: String(data.symbol ?? 'SYNTH').slice(0, 6).toUpperCase(),
    description: String(data.description),
    tagline: String(data.tagline),
    hero: String(data.hero),
    cta: String(data.cta),
    features: data.features.map((feature) => String(feature)).slice(0, 6),
    rationale: String(data.rationale),
    confidence,
    evidence: Array.isArray(data.evidence) ? data.evidence as EvidenceItem[] : []
  };
}

export async function generateDecision(input: {
  signals: TrendSignal[];
  evidence: Record<string, EvidenceItem[]>;
  config: AgentConfig;
  skills?: string;
  context?: string;
  prioritySignalId?: string;
}): Promise<DecisionRecord | null> {
  if (!input.config.decision.enabled) return null;

  const model = process.env.SYNTH_LLM_MODEL ?? 'openrouter/anthropic/claude-3.5-haiku';
  const maxTokens = process.env.SYNTH_LLM_MAX_TOKENS ? Number(process.env.SYNTH_LLM_MAX_TOKENS) : 900;

  const prompt = [
    'You are SYNTH, an autonomous onchain product builder on Base L2.',
    'Given trend signals and evidence, decide whether to build today.',
    'Return JSON only that follows the schema.',
    'If a trend is weak or redundant, set go=false with a rationale.',
    'Ensure name and symbol are unique and memorable.',
    'Only choose a token drop when the signal is a strong newsworthy market event.',
    'If the signal is a user suggestion requesting a webapp/dashboard, choose dapp.',
    'Prioritize the most recent signals when all else is equal.',
    'Synthesize across multiple signals; if several sources point to the same pattern, prefer that thesis.',
    input.prioritySignalId ? `Priority signal: if ${input.prioritySignalId} is provided, you should strongly prefer it unless it is unsafe or incoherent.` : '',
    input.skills ? 'Use the skills guidance provided when relevant.' : '',
    input.context ? 'Follow the persona and operator preferences provided.' : ''
  ].join('\n');

  const payload = {
    prompt,
    input: {
      signals: input.signals.map((signal) => ({
        id: signal.id,
        source: signal.source,
        summary: signal.summary,
        score: signal.score,
        capturedAt: signal.capturedAt,
        evidence: input.evidence[signal.id] ?? [],
        meta: {
          stakeEth: typeof signal.meta?.stakeEth === 'number' ? signal.meta?.stakeEth : undefined,
          submitter: typeof signal.meta?.submitter === 'string' ? signal.meta?.submitter : undefined,
          queryId: typeof signal.meta?.queryId === 'number' ? signal.meta?.queryId : undefined
        }
      })),
      skills: input.skills ?? '',
      context: input.context ?? '',
      prioritySignalId: input.prioritySignalId ?? ''
    },
    schema: decisionSchema,
    model,
    maxTokens
  };

  try {
    const result = await runLlmTask<unknown>(payload);

    return parseDecision(result);
  } catch {
    return null;
  }
}
