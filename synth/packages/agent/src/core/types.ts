export type TrendSource = 'twitter' | 'farcaster' | 'discord' | 'onchain' | 'suggestion';

export interface TrendSignal {
  id: string;
  source: TrendSource;
  summary: string;
  score: number;
  capturedAt: string;
  url?: string;
  engagement?: number;
  meta?: Record<string, string | number | boolean>;
}

export type DropType = 'token' | 'nft' | 'dapp' | 'contract';

export interface DropRecord {
  id: string;
  name: string;
  description: string;
  type: DropType;
  contractAddress: string;
  githubUrl: string;
  webappUrl?: string;
  deployedAt: string;
  trend: string;
  status: 'planned' | 'testnet' | 'mainnet' | 'failed';
}

export interface AgentState {
  paused: boolean;
  currentPhase: 'idle' | 'signal-detection' | 'decision' | 'development' | 'broadcast';
  lastRunAt?: string;
  lastResult?: 'success' | 'failed' | 'skipped';
  lastError?: string;
  overrideSignalId?: string;
}

export interface MetricSnapshot {
  totalDrops: number;
  contractsByType: Record<DropType, number>;
  suggestionsReceived: number;
  suggestionsBuilt: number;
  walletBalanceEth?: string;
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}
