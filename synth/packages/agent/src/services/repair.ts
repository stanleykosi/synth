import fs from 'fs/promises';
import path from 'path';
import { runLlmTask } from './llm-runner.js';
import type { GeneratedFile } from './repo.js';
import type { DropType, TrendSignal } from '../core/types.js';

interface RepairInput {
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
  errorMessage: string;
  repoFiles: string[];
  skills?: string;
  context?: string;
}

const schema = {
  type: 'object',
  properties: {
    files: {
      type: 'array',
      minItems: 1,
      maxItems: 20,
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

const allowedPrefixes = [
  'src/',
  'public/',
  'contracts/src/',
  'contracts/script/',
  'contracts/README.md',
  'README.md',
  'next.config.js',
  'package.json',
  'tsconfig.json',
  '.env.example'
];

function isAllowedPath(filePath: string): boolean {
  if (filePath.includes('..') || filePath.startsWith('/')) return false;
  return allowedPrefixes.some((prefix) => filePath === prefix || filePath.startsWith(prefix));
}

function containsPlaceholders(content: string): boolean {
  return content.includes('__DROP_') || content.includes('__CONTRACT_') || content.includes('__REPO_');
}

function enforceFileLimits(files: GeneratedFile[]): GeneratedFile[] {
  const maxChars = 120_000;
  const trimmed: GeneratedFile[] = [];
  let total = 0;
  for (const file of files) {
    if (total + file.content.length > maxChars) break;
    trimmed.push(file);
    total += file.content.length;
  }
  return trimmed;
}

export async function applyRepairFiles(repoDir: string, files: GeneratedFile[]): Promise<number> {
  let applied = 0;
  for (const file of files) {
    if (!isAllowedPath(file.path)) continue;
    if (containsPlaceholders(file.content)) continue;
    const targetPath = path.join(repoDir, file.path);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, file.content);
    applied += 1;
  }
  return applied;
}

export async function listRepoFiles(repoDir: string, limit = 200): Promise<string[]> {
  const results: string[] = [];
  const queue: string[] = ['.'];
  const skip = new Set(['node_modules', '.git', '.next', 'out', 'dist']);

  while (queue.length > 0 && results.length < limit) {
    const current = queue.shift();
    if (!current) break;
    const dir = path.join(repoDir, current);
    const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (skip.has(entry.name)) continue;
      const rel = path.join(current, entry.name).replace(/\\/g, '/');
      if (entry.isDirectory()) {
        queue.push(rel);
      } else if (entry.isFile()) {
        results.push(rel.replace(/^\.\//, ''));
        if (results.length >= limit) break;
      }
    }
  }

  return results;
}

export async function generateRepairFiles(input: RepairInput): Promise<GeneratedFile[] | null> {
  const model = process.env.SYNTH_LLM_MODEL ?? 'openrouter/anthropic/claude-3.5-haiku';
  const maxTokens = process.env.SYNTH_CODEGEN_MAX_TOKENS
    ? Number(process.env.SYNTH_CODEGEN_MAX_TOKENS)
    : 3500;

  const prompt = [
    'You are SYNTH. A deployment failed. Produce a minimal repair patch.',
    'Return JSON only. Follow the schema.',
    'Only output files that need to change to fix the error.',
    'Allowed files: src/**, public/**, contracts/src/**, contracts/script/**, contracts/README.md, README.md, next.config.js, package.json, tsconfig.json, .env.example.',
    'Do not use placeholders like __DROP_NAME__.',
    'Do not invent metrics or data.',
    'Keep changes minimal and focused on the error.',
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
      rpcUrl: input.rpcUrl,
      error: input.errorMessage,
      repoFiles: input.repoFiles
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
