import type { DropType, TrendSignal } from '../core/types.js';
import { runLlmTask } from './llm-runner.js';
import type { GeneratedFile } from './repo.js';

interface CodegenInput {
  dropType: DropType;
  contractType?: string;
  appMode?: string;
  dropName: string;
  symbol: string;
  description: string;
  tagline: string;
  hero: string;
  cta: string;
  features: string[];
  rationale: string;
  trend: TrendSignal;
  chain: string;
  network: string;
  chainId: string;
  contractAddress: string;
  explorerUrl: string;
  repoUrl: string;
  webappUrl?: string;
  rpcUrl: string;
  skills?: string;
  context?: string;
}

const schema = {
  type: 'object',
  properties: {
    files: {
      type: 'array',
      minItems: 3,
      maxItems: 40,
      items: {
        type: 'object',
        properties: {
          path: { type: 'string', minLength: 3 },
          content: { type: 'string', minLength: 20 }
        },
        required: ['path', 'content'],
        additionalProperties: false
      }
    }
  },
  required: ['files'],
  additionalProperties: false
};

function enforceFileLimits(files: GeneratedFile[]): GeneratedFile[] {
  const maxChars = 200_000;
  const trimmed: GeneratedFile[] = [];
  let total = 0;
  for (const file of files) {
    if (total + file.content.length > maxChars) break;
    trimmed.push(file);
    total += file.content.length;
  }
  return trimmed;
}

export async function generateRepoFiles(input: CodegenInput): Promise<GeneratedFile[] | null> {
  const model = process.env.SYNTH_LLM_MODEL ?? 'openrouter/anthropic/claude-3.5-haiku';
  const maxTokens = process.env.SYNTH_CODEGEN_MAX_TOKENS
    ? Number(process.env.SYNTH_CODEGEN_MAX_TOKENS)
    : 3500;

  const prompt = [
    'You are SYNTH. Generate production-ready code for a drop repo.',
    'Return JSON only. Follow the schema.',
    'You must generate novel code (no placeholders like __DROP_NAME__).',
    'Allowed files only: src/**, public/**, contracts/src/**, contracts/script/**, contracts/README.md.',
    'Use Next.js 16 App Router and vanilla CSS. No Tailwind.',
    'If appMode is "onchain", include onchain read panels. If appMode is "offchain", build a standalone webapp without wallet requirements.',
    'If contractType is "none", do not generate any contract files and omit all onchain UI.',
    'If dropType is nft or contract and appMode is onchain, include an owner mint UI.',
    'Contracts must be Solidity ^0.8.24 and use OpenZeppelin v5 imports.',
    'Keep code concise and compile-ready.',
    'Do not include package.json or next.config.js.',
    input.skills ? 'Use the skills guidance provided when relevant.' : '',
    input.context ? 'Follow the persona and operator preferences provided.' : ''
  ].join('\n');

  const payload = {
    prompt,
    input: {
      dropType: input.dropType,
      contractType: input.contractType ?? '',
      appMode: input.appMode ?? '',
      dropName: input.dropName,
      symbol: input.symbol,
      description: input.description,
      tagline: input.tagline,
      hero: input.hero,
      cta: input.cta,
      features: input.features,
      rationale: input.rationale,
      trend: input.trend.summary,
      chain: input.chain,
      network: input.network,
      chainId: input.chainId,
      contractAddress: input.contractAddress,
      explorerUrl: input.explorerUrl,
      repoUrl: input.repoUrl,
      webappUrl: input.webappUrl ?? '',
      rpcUrl: input.rpcUrl
    },
    schema,
    model,
    maxTokens
  };

  try {
    const result = await runLlmTask<unknown>(payload);
    if (!result || typeof result !== 'object') return null;
    const files = (result as { files?: GeneratedFile[] }).files;
    if (!Array.isArray(files) || files.length === 0) return null;
    return enforceFileLimits(files);
  } catch {
    return null;
  }
}
