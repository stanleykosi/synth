export interface VercelProject {
  name: string;
  url: string;
}

export interface VercelDeployment {
  id: string;
  url?: string;
  status?: string;
  readyState?: string;
  errorMessage?: string;
}

function resolveVercelUrl(path: string) {
  const url = new URL(path);
  const teamId = process.env.VERCEL_TEAM_ID;
  if (teamId) {
    url.searchParams.set('teamId', teamId);
  }
  return url.toString();
}

export async function createVercelProject(params: { name: string; repo: string }): Promise<VercelProject> {
  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    throw new Error('Missing VERCEL_TOKEN');
  }

  const url = resolveVercelUrl('https://api.vercel.com/v9/projects');

  const body = {
    name: params.name,
    framework: 'nextjs',
    gitRepository: {
      type: 'github',
      repo: params.repo
    }
  };

  const res = await fetch(url, {
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

export async function createVercelDeployment(params: {
  projectName: string;
  repo: string;
  org: string;
  ref?: string;
  target?: 'production' | 'preview';
}): Promise<VercelDeployment> {
  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    throw new Error('Missing VERCEL_TOKEN');
  }

  const url = resolveVercelUrl('https://api.vercel.com/v13/deployments');
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: params.projectName,
      project: params.projectName,
      target: params.target ?? 'production',
      gitSource: {
        type: 'github',
        repo: params.repo,
        org: params.org,
        ref: params.ref ?? 'main'
      }
    })
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Vercel deployment error: ${error}`);
  }

  const data = await res.json() as { id: string; url?: string; status?: string; readyState?: string; errorMessage?: string };
  return {
    id: data.id,
    url: data.url ? `https://${data.url}` : undefined,
    status: data.status,
    readyState: data.readyState,
    errorMessage: data.errorMessage
  };
}

export async function getVercelDeployment(id: string): Promise<VercelDeployment> {
  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    throw new Error('Missing VERCEL_TOKEN');
  }

  const url = resolveVercelUrl(`https://api.vercel.com/v13/deployments/${id}`);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Vercel deployment fetch error: ${error}`);
  }

  const data = await res.json() as { id: string; url?: string; status?: string; readyState?: string; errorMessage?: string };
  return {
    id: data.id,
    url: data.url ? `https://${data.url}` : undefined,
    status: data.status,
    readyState: data.readyState,
    errorMessage: data.errorMessage
  };
}
