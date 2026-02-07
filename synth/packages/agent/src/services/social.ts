import type { DropRecord, TrendSignal } from '../core/types.js';
import { runLlmTask } from './llm-runner.js';

const schema = {
  type: 'object',
  properties: {
    thread: {
      type: 'array',
      items: { type: 'string' },
      minItems: 4,
      maxItems: 6
    },
    farcaster: { type: 'string' }
  },
  required: ['thread', 'farcaster'],
  additionalProperties: false
};

export interface SocialCopy {
  thread: string[];
  farcaster: string;
}

export async function generateSocialCopy(input: {
  drop: DropRecord;
  trend: TrendSignal;
  skills?: string;
  context?: string;
}): Promise<SocialCopy | null> {
  const model = process.env.SYNTH_LLM_MODEL ?? 'openrouter/anthropic/claude-3.5-haiku';
  const maxTokens = process.env.SYNTH_LLM_MAX_TOKENS ? Number(process.env.SYNTH_LLM_MAX_TOKENS) : 800;

  const prompt = [
    'You are SYNTH. Generate a short social post set for a launch.',
    'Return JSON only. Use the template structure below.',
    'Template for thread:',
    '1) SYNTH drop: <name> — <tagline> | Signal: <summary>',
    '2) What shipped: <description>',
    '3) Contract: <address> | Explorer: <link>',
    '4) Repo: <link> | Web: <link or "N/A">',
    '5) CTA: submit suggestions or feedback',
    'Keep each tweet <= 280 characters.',
    'Farcaster should be a single post summarizing the drop with repo + web + explorer links.',
    input.skills ? 'Use the skills guidance provided when relevant.' : '',
    input.context ? 'Follow the persona and operator preferences provided.' : ''
  ].join('\n');

  const payload = {
    prompt,
    input: {
      name: input.drop.name,
      description: input.drop.description,
      trend: input.trend.summary,
      contract: input.drop.contractAddress,
      explorer: input.drop.explorerUrl ?? '',
      repo: input.drop.githubUrl,
      web: input.drop.webappUrl ?? '',
      network: input.drop.network ?? '',
      skills: input.skills ?? '',
      context: input.context ?? ''
    },
    schema,
    model,
    maxTokens
  };

  try {
  const result = await runLlmTask<unknown>(payload);

    if (!result || typeof result !== 'object') return null;
    const data = result as SocialCopy;
    if (!Array.isArray(data.thread) || typeof data.farcaster !== 'string') return null;
    return {
      thread: data.thread.filter((line) => typeof line === 'string' && line.trim().length > 0).slice(0, 6),
      farcaster: data.farcaster.trim()
    };
  } catch {
    return null;
  }
}
