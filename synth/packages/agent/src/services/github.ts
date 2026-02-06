import { Octokit } from '@octokit/rest';
import type { DropRecord } from '../core/types.js';

export interface RepoResult {
  name: string;
  htmlUrl: string;
  cloneUrl: string;
}

export async function ensureRepo(params: { name: string; description: string }): Promise<RepoResult> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('Missing GITHUB_TOKEN');
  }

  const octokit = new Octokit({ auth: token });
  const org = (process.env.GITHUB_ORG ?? '').trim();
  const owner = org || (await octokit.users.getAuthenticated()).data.login;

  try {
    const existing = await octokit.repos.get({ owner, repo: params.name });
    return {
      name: existing.data.name,
      htmlUrl: existing.data.html_url,
      cloneUrl: existing.data.clone_url
    };
  } catch (error) {
    if (org) {
      const created = await octokit.repos.createInOrg({
        org,
        name: params.name,
        description: params.description,
        private: false
      });

      return {
        name: created.data.name,
        htmlUrl: created.data.html_url,
        cloneUrl: created.data.clone_url
      };
    }

    try {
      const created = await octokit.repos.createForAuthenticatedUser({
        name: params.name,
        description: params.description,
        private: false
      });

      return {
        name: created.data.name,
        htmlUrl: created.data.html_url,
        cloneUrl: created.data.clone_url
      };
    } catch (createError) {
      const status = (createError as { status?: number }).status;
      if (status === 422) {
        const existing = await octokit.repos.get({ owner, repo: params.name });
        return {
          name: existing.data.name,
          htmlUrl: existing.data.html_url,
          cloneUrl: existing.data.clone_url
        };
      }
      throw createError;
    }
  }
}

export async function updateRepoDescription(params: {
  owner: string;
  repo: string;
  description: string;
}): Promise<void> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return;
  const octokit = new Octokit({ auth: token });
  try {
    await octokit.repos.update({
      owner: params.owner,
      repo: params.repo,
      description: params.description
    });
  } catch {
    // Best-effort only.
  }
}

function parseRepoFromUrl(url: string): { owner: string; repo: string } | null {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return null;
    return { owner: parts[0], repo: parts[1].replace(/\.git$/, '') };
  } catch {
    return null;
  }
}

export async function fetchGithubStarsTotal(drops: DropRecord[]): Promise<number> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return 0;

  const octokit = new Octokit({ auth: token });
  const seen = new Set<string>();
  let total = 0;

  for (const drop of drops) {
    const parsed = drop.githubUrl ? parseRepoFromUrl(drop.githubUrl) : null;
    if (!parsed) continue;
    const key = `${parsed.owner}/${parsed.repo}`;
    if (seen.has(key)) continue;
    seen.add(key);

    try {
      const repo = await octokit.repos.get({ owner: parsed.owner, repo: parsed.repo });
      total += repo.data.stargazers_count ?? 0;
    } catch {
      continue;
    }
  }

  return total;
}

export async function fetchGithubRateLimit() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return undefined;
  const octokit = new Octokit({ auth: token });
  try {
    const res = await octokit.rateLimit.get();
    const core = res.data.resources.core;
    return {
      remaining: core.remaining,
      limit: core.limit,
      reset: new Date(core.reset * 1000).toISOString()
    };
  } catch {
    return undefined;
  }
}
