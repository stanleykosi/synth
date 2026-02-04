export interface Drop {
  id: string;
  name: string;
  description: string;
  type: 'token' | 'nft' | 'dapp' | 'contract';
  contractAddress: string;
  githubUrl: string;
  webappUrl?: string;
  deployedAt: string;
  trend: string;
}

export interface TrendItem {
  id: string;
  source: string;
  summary: string;
  score: number;
  capturedAt: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

async function handle<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function fetchDrops(): Promise<Drop[]> {
  const res = await fetch(`${API_BASE}/api/drops`, { cache: 'no-store' });
  return handle<Drop[]>(res);
}

export async function fetchTrends(): Promise<TrendItem[]> {
  const res = await fetch(`${API_BASE}/api/trends`, { cache: 'no-store' });
  return handle<TrendItem[]>(res);
}
