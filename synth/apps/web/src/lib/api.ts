export interface Drop {
  id: string;
  name: string;
  description: string;
  type: 'token' | 'nft' | 'dapp' | 'contract';
  contractAddress: string;
  contractType?: 'erc20' | 'erc721' | 'erc1155' | 'none';
  appMode?: 'onchain' | 'offchain';
  builder?: {
    address: string;
    stakeEth?: number;
    suggestionId?: string;
    stakeReturned?: boolean;
  };
  githubUrl: string;
  webappUrl?: string;
  explorerUrl?: string;
  network?: string;
  deployedAt: string;
  trend: string;
  trendSource?: string;
  trendScore?: number;
  trendEngagement?: number;
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

const MOCK_DROPS: Drop[] = [
  {
    id: '1',
    name: 'Neural_Link v1.0',
    description: 'Autonomous brain-computer interface protocol for decentralized neural data exchange.',
    type: 'contract',
    contractAddress: '0x1234...5678',
    githubUrl: 'https://github.com/synth/neural-link',
    network: 'Base Mainnet',
    deployedAt: '2024-02-07T10:00:00Z',
    trend: 'Neural Interfaces',
    trendSource: 'Twitter',
    trendScore: 8.7,
    gasCostEth: '0.042'
  },
  {
    id: '2',
    name: 'Synth_OS Kernel',
    description: 'Micro-operating system kernel optimized for agentic workloads on L2 networks.',
    type: 'dapp',
    contractAddress: '0x8765...4321',
    githubUrl: 'https://github.com/synth/synth-os',
    webappUrl: 'https://synth-os.io',
    network: 'Base Mainnet',
    deployedAt: '2024-02-06T15:30:00Z',
    trend: 'Autonomous OS',
    trendSource: 'Farcaster',
    trendScore: 9.2,
    gasCostEth: '0.085'
  },
  {
    id: '3',
    name: 'Core_Unit NFT',
    description: 'Generative hardware components for the SYNTH autonomous ecosystem.',
    type: 'nft',
    contractAddress: '0xabcd...efgh',
    githubUrl: 'https://github.com/synth/core-unit',
    network: 'Base Mainnet',
    deployedAt: '2024-02-05T12:00:00Z',
    trend: 'Generative Hardware',
    trendSource: 'Onchain',
    trendScore: 7.4,
    gasCostEth: '0.015'
  }
];

const MOCK_METRICS: Metrics = {
  totalDrops: 42,
  contractsByType: { token: 10, nft: 15, dapp: 5, contract: 12 },
  suggestionsReceived: 156,
  suggestionsBuilt: 42,
  githubStars: 1250,
  gasSpentEth: '2.45'
};

const MOCK_TRENDS: TrendItem[] = [
  {
    id: 't1',
    source: 'Twitter',
    summary: 'Neural interface discussions peaking with new protocol announcements.',
    score: 8.7,
    capturedAt: '2024-02-07T09:30:00Z'
  },
  {
    id: 't2',
    source: 'Farcaster',
    summary: 'Base ecosystem growth driving demand for specialized agent tools.',
    score: 9.1,
    capturedAt: '2024-02-07T11:00:00Z'
  }
];

async function handle<T>(response: Response, fallback: T): Promise<T> {
  if (!response.ok) {
    return fallback;
  }
  try {
    const data = await response.json();
    return (data && Array.isArray(data) && data.length > 0) || (data && !Array.isArray(data)) ? data : fallback;
  } catch {
    return fallback;
  }
}

export async function fetchDrops(): Promise<Drop[]> {
  try {
    const res = await fetch(`${API_BASE}/api/drops`, { cache: 'no-store' });
    return handle<Drop[]>(res, MOCK_DROPS);
  } catch {
    return MOCK_DROPS;
  }
}

export async function fetchTrends(): Promise<TrendItem[]> {
  try {
    const res = await fetch(`${API_BASE}/api/trends`, { cache: 'no-store' });
    return handle<TrendItem[]>(res, MOCK_TRENDS);
  } catch {
    return MOCK_TRENDS;
  }
}

export async function fetchMetrics(): Promise<Metrics> {
  try {
    const res = await fetch(`${API_BASE}/api/metrics`, { cache: 'no-store' });
    return handle<Metrics>(res, MOCK_METRICS);
  } catch {
    return MOCK_METRICS;
  }
}
