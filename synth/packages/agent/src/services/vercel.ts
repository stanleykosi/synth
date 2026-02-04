export interface VercelProject {
  name: string;
  url: string;
}

export async function createVercelProject(params: { name: string; repo: string }): Promise<VercelProject> {
  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    throw new Error('Missing VERCEL_TOKEN');
  }

  const teamId = process.env.VERCEL_TEAM_ID;
  const url = new URL('https://api.vercel.com/v9/projects');
  if (teamId) {
    url.searchParams.set('teamId', teamId);
  }

  const body = {
    name: params.name,
    framework: 'nextjs',
    gitRepository: {
      type: 'github',
      repo: params.repo
    }
  };

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Vercel project error: ${error}`);
  }

  const data = await res.json() as { name: string; url?: string };
  return {
    name: data.name,
    url: data.url ? `https://${data.url}` : `https://${data.name}.vercel.app`
  };
}
