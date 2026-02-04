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
  contractAddress: string;
  chain: string;
}

const tokenMap: Record<string, (input: RepoTemplateInput) => string> = {
  '__REPO_NAME__': (input) => input.repoName,
  '__DROP_NAME__': (input) => input.dropName,
  '__DESCRIPTION__': (input) => input.description,
  '__CONTRACT_ADDRESS__': (input) => input.contractAddress,
  '__CHAIN__': (input) => input.chain
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
      const textFiles = ['.md', '.ts', '.tsx', '.css', '.json', '.js'];
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
  await git.push('origin', 'main');
}
