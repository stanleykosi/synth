import { Octokit } from '@octokit/rest';

export interface RepoResult {
  name: string;
  htmlUrl: string;
  cloneUrl: string;
}

export async function ensureRepo(params: { name: string; description: string }): Promise<RepoResult> {
  const token = process.env.GITHUB_TOKEN;
  const org = process.env.GITHUB_ORG;

  if (!token || !org) {
    throw new Error('Missing GITHUB_TOKEN or GITHUB_ORG');
  }

  const octokit = new Octokit({ auth: token });

  try {
    const existing = await octokit.repos.get({ owner: org, repo: params.name });
    return {
      name: existing.data.name,
      htmlUrl: existing.data.html_url,
      cloneUrl: existing.data.clone_url
    };
  } catch {
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
}
