type ToolInvokeResponse<T> =
  | { ok: true; result: T }
  | { ok: false; error?: { type?: string; message?: string } };

function buildGatewayUrl(): string {
  const explicit = process.env.OPENCLAW_GATEWAY_URL;
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }
  const port = process.env.OPENCLAW_GATEWAY_PORT ?? '18789';
  return `http://127.0.0.1:${port}`;
}

function buildAuthHeader(): string | undefined {
  const token = process.env.OPENCLAW_GATEWAY_TOKEN || process.env.OPENCLAW_GATEWAY_PASSWORD;
  if (!token) return undefined;
  return `Bearer ${token}`;
}

type FetchOptions = Parameters<typeof fetch>[1];

async function fetchWithTimeout(url: string, options: FetchOptions, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

export async function invokeOpenClawTool<T>(input: {
  tool: string;
  action: string;
  args?: Record<string, unknown>;
  sessionKey?: string;
  timeoutMs?: number;
}): Promise<T> {
  const gatewayUrl = buildGatewayUrl();
  const url = `${gatewayUrl}/tools/invoke`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  const auth = buildAuthHeader();
  if (auth) {
    headers.Authorization = auth;
  }

  const payload = {
    tool: input.tool,
    action: input.action,
    args: input.args ?? {},
    sessionKey: input.sessionKey ?? 'main'
  };

  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  }, input.timeoutMs ?? 20000);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenClaw tool HTTP ${response.status}: ${text.slice(0, 200)}`);
  }

  const body = await response.json() as ToolInvokeResponse<T>;
  if (!body.ok) {
    const message = body.error?.message ?? 'Unknown OpenClaw tool error';
    throw new Error(message);
  }

  return body.result;
}
