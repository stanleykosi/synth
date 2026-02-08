export type TrendSource = 'twitter' | 'farcaster' | 'onchain' | 'suggestion' | 'web';

export interface TrendSignal {
  id: string;
  source: TrendSource;
  summary: string;
  score: number;
  capturedAt: string;
  url?: string;
  engagement?: number;
  meta?: Record<string, unknown>;
}

export interface TrendPoolEntry extends TrendSignal {
  detectedAt: string;
  runId?: string;
  rank: number;
  key: string;
}

export interface TrendPostRecord {
  id: string;
  createdAt: string;
  twitter: string;
  farcaster: string;
  twitterThread?: string[];
  farcasterThread?: string[];
  trendKeys: string[];
}

export type DropType = 'token' | 'nft' | 'dapp' | 'contract';
export type AppMode = 'onchain' | 'offchain';
export type ContractType = 'erc20' | 'erc721' | 'erc1155' | 'none';

export interface DropRecord {
  id: string;
  name: string;
  description: string;
  type: DropType;
  contractAddress: string;
  contractType?: ContractType;
  appMode?: AppMode;
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
  trendSource?: TrendSource;
  trendScore?: number;
  trendEngagement?: number;
  txHash?: string;
  gasUsed?: string;
  gasPrice?: string;
  gasCostEth?: string;
  status: 'planned' | 'testnet' | 'mainnet' | 'failed';
}

export interface AgentState {
  paused: boolean;
  currentPhase: 'idle' | 'signal-detection' | 'decision' | 'development' | 'broadcast';
  runId?: string;
  runStartedAt?: string;
  phaseStartedAt?: string;
  lastRunAt?: string;
  lastResult?: 'success' | 'failed' | 'skipped';
  lastError?: string;
  lastSignalAt?: string;
  lastSignalResult?: 'success' | 'failed' | 'skipped';
  lastSignalError?: string;
  overrideSignalId?: string;
}

export interface EvidenceItem {
  title: string;
  url: string;
  snippet?: string;
  source?: string;
}

export interface DecisionRecord {
  id: string;
  createdAt: string;
  trendId: string;
  go: boolean;
  dropType: DropType;
  contractType?: ContractType;
  appMode?: AppMode;
  name: string;
  symbol: string;
  description: string;
  tagline: string;
  hero: string;
  cta: string;
  features: string[];
  rationale: string;
  confidence: number;
  evidence: EvidenceItem[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

export interface MetricSnapshot {
  totalDrops: number;
  contractsByType: Record<DropType, number>;
  suggestionsReceived: number;
  suggestionsBuilt: number;
  githubStars?: number;
  gasSpentEth?: string;
  rateLimits?: {
    github?: {
      remaining: number;
      limit: number;
      reset: string;
    };
  };
  walletBalanceEth?: string;
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}
