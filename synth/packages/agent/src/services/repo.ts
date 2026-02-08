import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { simpleGit } from 'simple-git';
import { resolveTemplatesDir } from '../utils/paths.js';

export interface RepoTemplateInput {
  baseDir: string;
  repoName: string;
  dropName: string;
  description: string;
  tagline: string;
  hero: string;
  cta: string;
  features: string[];
  symbol: string;
  dropType: string;
  rationale: string;
  contractAddress: string;
  chain: string;
  network: string;
  explorerUrl: string;
  rpcUrl: string;
  chainId: string;
  about?: string;
  repoUrl?: string;
  webappUrl?: string;
  contractType?: string;
  appMode?: string;
  hasContract?: boolean;
}

export interface GeneratedFile {
  path: string;
  content: string;
}

const tokenMap: Record<string, (input: RepoTemplateInput) => string> = {
  '__REPO_NAME__': (input) => input.repoName,
  '__DROP_NAME__': (input) => input.dropName,
  '__DESCRIPTION__': (input) => input.description,
  '__TAGLINE__': (input) => input.tagline,
  '__HERO__': (input) => input.hero,
  '__CTA__': (input) => input.cta,
  '__FEATURES__': (input) => input.features.map((feature) => `- ${feature}`).join('\n'),
  '__FEATURES_HTML__': (input) => input.features.map((feature) => `<li>${feature}</li>`).join(''),
  '__ABOUT__': (input) => input.about ?? '',
  '__REPO_URL__': (input) => input.repoUrl ?? '',
  '__WEBAPP_URL__': (input) => input.webappUrl ?? '',
  '__SYMBOL__': (input) => input.symbol,
  '__DROP_TYPE__': (input) => input.dropType,
  '__CONTRACT_TYPE__': (input) => input.contractType ?? (input.dropType === 'token' ? 'erc20' : input.dropType === 'nft' ? 'erc721' : input.dropType === 'contract' ? 'erc1155' : 'none'),
  '__APP_MODE__': (input) => input.appMode ?? (input.dropType === 'dapp' ? 'offchain' : 'onchain'),
  '__HAS_CONTRACT__': (input) => {
    if (typeof input.hasContract === 'boolean') return String(input.hasContract);
    if (input.contractType) return String(input.contractType !== 'none');
    return String(input.dropType !== 'dapp');
  },
  '__RATIONALE__': (input) => input.rationale,
  '__CONTRACT_ADDRESS__': (input) => input.contractAddress,
  '__CHAIN__': (input) => input.chain,
  '__NETWORK__': (input) => input.network,
  '__EXPLORER_URL__': (input) => input.explorerUrl,
  '__RPC_URL__': (input) => input.rpcUrl,
  '__CHAIN_ID__': (input) => input.chainId,
  '__CONTRACT_SECTION__': (input) => {
    const hasContract = typeof input.hasContract === 'boolean'
      ? input.hasContract
      : input.contractType
        ? input.contractType !== 'none'
        : input.dropType !== 'dapp';
    if (!hasContract || !input.contractAddress) {
      return 'This drop ships as an offchain web app. No onchain contract was deployed.';
    }
    const explorer = input.explorerUrl || 'N/A';
    return [
      `- Network: ${input.network}`,
      `- Chain: ${input.chain}`,
      `- Contract type: ${input.contractType ?? 'erc20'}`,
      `- Address: ${input.contractAddress}`,
      `- Explorer: ${explorer}`,
      `- Symbol: ${input.symbol}`,
      `- Drop type: ${input.dropType}`
    ].join('\n');
  }
};

function escapeJson(value: string): string {
  return JSON.stringify(value).slice(1, -1);
}

async function replaceTokens(filePath: string, input: RepoTemplateInput) {
  let content = await fs.readFile(filePath, 'utf-8');
  const jsonSafe = filePath.endsWith('.json');
  for (const [token, resolver] of Object.entries(tokenMap)) {
    const raw = resolver(input);
    content = content.replaceAll(token, jsonSafe ? escapeJson(raw) : raw);
  }
  await fs.writeFile(filePath, content);
}

async function replaceTokensRecursively(dir: string, input: RepoTemplateInput) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await replaceTokensRecursively(target, input);
    } else if (entry.isFile()) {
      const textFiles = ['.md', '.ts', '.tsx', '.css', '.json', '.js', '.toml', '.env', '.env.example'];
      if (textFiles.some((ext) => entry.name.endsWith(ext))) {
        await replaceTokens(target, input);
      }
    }
  }
}

function isAllowedGeneratedPath(filePath: string): boolean {
  if (filePath.includes('..') || filePath.startsWith('/')) return false;
  const allowedPrefixes = [
    'src/',
    'public/',
    'contracts/src/',
    'contracts/script/',
    'contracts/README.md'
  ];
  return allowedPrefixes.some((prefix) => filePath.startsWith(prefix));
}

function containsPlaceholders(content: string): boolean {
  return content.includes('__DROP_') || content.includes('__CONTRACT_') || content.includes('__REPO_');
}

async function applyGeneratedFiles(tempDir: string, files?: GeneratedFile[]) {
  if (!files || files.length === 0) return;
  for (const file of files) {
    if (!isAllowedGeneratedPath(file.path)) continue;
    if (containsPlaceholders(file.content)) continue;
    const targetPath = path.join(tempDir, file.path);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, file.content);
  }
}

export async function prepareRepoTemplate(input: RepoTemplateInput, files?: GeneratedFile[]): Promise<string> {
  const templatesDir = resolveTemplatesDir(input.baseDir);
  const templateDir = path.join(templatesDir, 'drop-repo');

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'synth-drop-'));
  await fs.cp(templateDir, tempDir, { recursive: true });
  await replaceTokensRecursively(tempDir, input);
  await applyGeneratedFiles(tempDir, files);

  return tempDir;
}

export async function initAndPushRepo(
  tempDir: string,
  repoUrl: string,
  token: string,
  commitMessage = 'Initial SYNTH drop'
) {
  const git = simpleGit(tempDir);
  await git.init();
  await git.add('.');
  await git.commit(commitMessage);

  const authedUrl = repoUrl.replace('https://', `https://x-access-token:${token}@`);
  await git.addRemote('origin', authedUrl);
  await git.branch(['-M', 'main']);
  try {
    await git.push('origin', 'main');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('fetch first') || message.includes('non-fast-forward')) {
      await git.fetch('origin', 'main');
      await git.push(['--set-upstream', 'origin', 'main', '--force-with-lease']);
    } else {
      throw error;
    }
  }
}

export async function commitAndPushChanges(
  repoDir: string,
  commitMessage = 'Repair build'
) {
  const git = simpleGit(repoDir);
  const status = await git.status();
  if (status.isClean()) {
    return false;
  }
  await git.add('.');
  await git.commit(commitMessage);
  await git.push('origin', 'main');
  return true;
}
