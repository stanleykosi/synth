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

function stripAnsi(input: string): string {
  return input.replace(
    // eslint-disable-next-line no-control-regex
    /\u001b\[[0-9;]*m/g,
    ''
  );
}

function extractEventText(event: Record<string, unknown>): string | null {
  const direct = event.text ?? event.message ?? event.log;
  if (typeof direct === 'string') return direct;
  const payload = event.payload as Record<string, unknown> | undefined;
  if (payload) {
    const payloadText = payload.text ?? payload.message ?? payload.log;
    if (typeof payloadText === 'string') return payloadText;
    const data = payload.data as Record<string, unknown> | undefined;
    const dataText = data?.text ?? data?.message ?? data?.log;
    if (typeof dataText === 'string') return dataText;
  }
  return null;
}

function parseVercelEvents(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    const events = Array.isArray(parsed)
      ? parsed
      : (parsed as { events?: unknown }).events;
    if (Array.isArray(events)) {
      return events
        .map((event) => (event && typeof event === 'object' ? extractEventText(event as Record<string, unknown>) : null))
        .filter((line): line is string => Boolean(line))
        .map(stripAnsi);
    }
  } catch {
    // fall through to SSE parsing
  }

  const lines: string[] = [];
  for (const line of raw.split('\n')) {
    const trimmedLine = line.trim();
    if (!trimmedLine.startsWith('data:')) continue;
    const payload = trimmedLine.replace(/^data:\s*/, '');
    if (!payload || payload === '[DONE]') continue;
    try {
      const parsed = JSON.parse(payload) as Record<string, unknown>;
      const text = extractEventText(parsed);
      if (text) lines.push(stripAnsi(text));
    } catch {
      lines.push(stripAnsi(payload));
    }
  }
  return lines;
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

export async function getVercelDeploymentLogTail(id: string, limit = 120): Promise<string | null> {
  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    throw new Error('Missing VERCEL_TOKEN');
  }

  const url = new URL(`https://api.vercel.com/v3/deployments/${id}/events`);
  url.searchParams.set('direction', 'backward');
  url.searchParams.set('limit', String(Math.min(Math.max(limit * 2, 50), 1000)));
  url.searchParams.set('builds', '1');
  url.searchParams.set('delimiter', '1');

  const res = await fetch(resolveVercelUrl(url.toString()), {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Vercel events error: ${error}`);
  }

  const raw = await res.text();
  const lines = parseVercelEvents(raw);
  if (lines.length === 0) return null;

  const tail = lines.slice(-limit).join('\n').trim();
  if (!tail) return null;
  const maxChars = 4000;
  return tail.length > maxChars ? tail.slice(-maxChars) : tail;
}
