export interface Drop {
  id: string;
  name: string;
  description: string;
  type: 'token' | 'nft' | 'dapp' | 'contract';
  contractAddress: string;
  githubUrl: string;
  webappUrl?: string;
  explorerUrl?: string;
  network?: string;
  deployedAt: string;
  trend: string;
  trendSource?: string;
  trendScore?: number;
  txHash?: string;
  gasCostEth?: string;
}

export interface TrendItem {
  id: string;
  source: string;
  summary: string;
  score: number;
  capturedAt: string;
}

export interface Metrics {
  totalDrops: number;
  contractsByType: Record<'token' | 'nft' | 'dapp' | 'contract', number>;
  suggestionsReceived: number;
  suggestionsBuilt: number;
  githubStars?: number;
  gasSpentEth?: string;
}

const SERVER_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.SITE_URL || 'https://synthclaw.xyz';
const API_BASE = typeof window === 'undefined' ? SERVER_BASE : (process.env.NEXT_PUBLIC_API_URL ?? '');

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

export async function fetchMetrics(): Promise<Metrics> {
  const res = await fetch(`${API_BASE}/api/metrics`, { cache: 'no-store' });
  return handle<Metrics>(res);
}
