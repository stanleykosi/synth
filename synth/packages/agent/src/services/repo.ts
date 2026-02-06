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
  '__SYMBOL__': (input) => input.symbol,
  '__DROP_TYPE__': (input) => input.dropType,
  '__RATIONALE__': (input) => input.rationale,
  '__CONTRACT_ADDRESS__': (input) => input.contractAddress,
  '__CHAIN__': (input) => input.chain,
  '__NETWORK__': (input) => input.network,
  '__EXPLORER_URL__': (input) => input.explorerUrl,
  '__RPC_URL__': (input) => input.rpcUrl,
  '__CHAIN_ID__': (input) => input.chainId
};

async function replaceTokens(filePath: string, input: RepoTemplateInput) {
  let content = await fs.readFile(filePath, 'utf-8');
  for (const [token, resolver] of Object.entries(tokenMap)) {
    content = content.replaceAll(token, resolver(input));
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

export async function prepareRepoTemplate(input: RepoTemplateInput): Promise<string> {
  const templatesDir = resolveTemplatesDir(input.baseDir);
  const templateDir = path.join(templatesDir, 'drop-repo');

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'synth-drop-'));
  await fs.cp(templateDir, tempDir, { recursive: true });
  await replaceTokensRecursively(tempDir, input);

  return tempDir;
}

export async function initAndPushRepo(tempDir: string, repoUrl: string, token: string) {
  const git = simpleGit(tempDir);
  await git.init();
  await git.add('.');
  await git.commit('Initial SYNTH drop');

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
