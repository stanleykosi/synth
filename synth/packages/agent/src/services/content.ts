import type { TrendSignal, DropType } from '../core/types.js';
import { runLlmTask } from './llm-runner.js';

export interface DropContentInput {
  dropType: DropType;
  contractType?: string;
  appMode?: string;
  dropName: string;
  symbol: string;
  tagline: string;
  description: string;
  hero: string;
  cta: string;
  features: string[];
  rationale: string;
  trend: TrendSignal;
  network: string;
  chain: string;
  chainId: string;
  contractAddress: string;
  explorerUrl: string;
  repoUrl: string;
  webappUrl?: string;
  skills?: string;
  context?: string;
}

export interface DropContent {
  about: string;
  readme: string;
  commitMessage: string;
  appName?: string;
}

const schema = {
  type: 'object',
  properties: {
    about: { type: 'string', minLength: 20, maxLength: 200 },
    readme: { type: 'string', minLength: 200 },
    commitMessage: { type: 'string', minLength: 5, maxLength: 72 },
    appName: { type: 'string', minLength: 3, maxLength: 36 }
  },
  required: ['about', 'readme', 'commitMessage'],
  additionalProperties: false
};

export async function generateDropContent(input: DropContentInput): Promise<DropContent | null> {
  const model = process.env.SYNTH_LLM_MODEL ?? 'openrouter/anthropic/claude-3.5-haiku';
  const maxTokens = process.env.SYNTH_LLM_MAX_TOKENS ? Number(process.env.SYNTH_LLM_MAX_TOKENS) : 1200;

  const prompt = [
    'You are SYNTH, an autonomous product builder.',
    'Generate professional launch copy for a GitHub repo.',
    'Return JSON only and follow the schema.',
    'README must be clear, concise, and ready for public release.',
    'Include sections: Overview, Why it exists, What shipped, Contract, Local development, Deploy, Links, License.',
    'If dropType is dapp, include a short "How it works" section describing the UI.',
    'If appMode is onchain, mention wallet connect and onchain reads. If offchain, mention data sources and web search evidence instead.',
    'If dropType is token, include Token summary + how to verify supply.',
    'If dropType is nft/contract, include Mint mechanics and metadata guidance.',
    'If contractAddress is empty, clearly state this is an offchain build and omit contract verification steps.',
    'Use the provided drop details and links. Do not invent addresses or metrics.',
    'About should be a short GitHub repo summary (<= 200 chars).',
    'Commit message should be <= 72 chars and professional.',
    'App name should be a short, memorable slug (no spaces), suitable for Vercel. Avoid generic names and avoid the prefix "synth".',
    input.skills ? 'Use the skills guidance provided when relevant.' : '',
    input.context ? 'Follow the persona and operator preferences provided.' : ''
  ].join('\n');

  const payload = {
    prompt,
    input: {
      dropType: input.dropType,
      contractType: input.contractType ?? '',
      appMode: input.appMode ?? '',
      name: input.dropName,
      symbol: input.symbol,
      tagline: input.tagline,
      description: input.description,
      hero: input.hero,
      cta: input.cta,
      features: input.features,
      rationale: input.rationale,
      trend: input.trend.summary,
      network: input.network,
      chain: input.chain,
      chainId: input.chainId,
      contractAddress: input.contractAddress,
      explorerUrl: input.explorerUrl,
      repoUrl: input.repoUrl,
      webappUrl: input.webappUrl ?? '',
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
    const data = result as DropContent;
    if (!data.about || !data.readme || !data.commitMessage) return null;
    return {
      about: String(data.about).trim(),
      readme: String(data.readme).trim(),
      commitMessage: String(data.commitMessage).trim(),
      appName: data.appName ? String(data.appName).trim() : undefined
    };
  } catch {
    return null;
  }
}
