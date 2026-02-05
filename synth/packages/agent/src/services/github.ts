import { Octokit } from '@octokit/rest';

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
