import fs from 'fs/promises';
import { resolveConfigPath } from '../utils/paths.js';

export interface AgentConfig {
  twitter: {
    enabled: boolean;
    mode: 'api' | 'browser';
    browserProfile: string;
    browserTarget: 'host' | 'sandbox' | 'node';
    queries: string[];
    maxResults: number;
  };
  web: {
    enabled: boolean;
    maxItems: number;
    perSourceLimit: number;
    sources: Array<{
      name: string;
      url: string;
      type: 'rss' | 'atom';
    }>;
  };
  research: {
    enabled: boolean;
    maxSignals: number;
    resultsPerSignal: number;
    fetchTop: number;
  };
  decision: {
    enabled: boolean;
    minScore: number;
    minConfidence: number;
  };
  validation: {
    enabled: boolean;
    maxSignals: number;
    weight: number;
  };
  farcaster: {
    channels: string[];
    limit: number;
  };
  dune: {
    queryIds: number[];
    refreshOnRun: boolean;
    maxAgeHours: number;
    maxWaitMs: number;
    pollIntervalMs: number;
    allowPartialResults: boolean;
  };
  scoring: {
    weights: Record<string, number>;
    engagementCap: number;
    suggestionStakeMultiplier: number;
    stakePriorityEth: number;
    recencyBoost: number;
    recencyWindowHours: number;
  };
  pipeline: {
    maxSignals: number;
    dailyRunHourUTC: number;
    autoDeployMainnet: boolean;
    minCycleHours: number;
  };
}

const fallbackConfig: AgentConfig = {
  twitter: {
    enabled: false,
    mode: 'browser',
    browserProfile: 'openclaw',
    browserTarget: 'host',
    queries: [
      'base chain',
      'base l2',
      'coinbase base',
      'base bridge',
      'base airdrop',
      'base memecoin',
      'base nft',
      'base gaming',
      'base social',
      'base defi',
      'farcaster frames',
      'onchain social',
      'onchain ai',
      'autonomous agent'
    ],
    maxResults: 30
  },
  web: {
    enabled: true,
    maxItems: 25,
    perSourceLimit: 6,
    sources: [
      { name: 'Base Mirror', url: 'https://base.mirror.xyz/feed/atom', type: 'atom' },
      { name: 'Ethereum Blog', url: 'https://blog.ethereum.org/feed.xml', type: 'rss' },
      { name: 'Coinbase Blog', url: 'https://blog.coinbase.com/feed', type: 'rss' },
      { name: 'CoinDesk RSS', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', type: 'rss' },
      { name: 'Farcaster Base Channel', url: 'https://feeds.fcstr.xyz/rss/channel?url=https://warpcast.com/~/channel/base', type: 'rss' }
    ]
  },
  research: {
    enabled: true,
    maxSignals: 4,
    resultsPerSignal: 6,
    fetchTop: 2
  },
  decision: {
    enabled: true,
    minScore: 6,
    minConfidence: 0.55
  },
  validation: {
    enabled: true,
    maxSignals: 6,
    weight: 0.6
  },
  farcaster: {
    channels: ['base'],
    limit: 20
  },
  dune: {
    queryIds: [5737569, 6436472, 6314894, 3798745],
    refreshOnRun: true,
    maxAgeHours: 12,
    maxWaitMs: 20000,
    pollIntervalMs: 2000,
    allowPartialResults: true
  },
  scoring: {
    weights: {
      twitter: 0.6,
      web: 1.4,
      farcaster: 1.1,
      onchain: 1.4,
      suggestion: 1.2
    },
    engagementCap: 5000,
    suggestionStakeMultiplier: 200000,
    stakePriorityEth: 0.1,
    recencyBoost: 1.6,
    recencyWindowHours: 24
  },
  pipeline: {
    maxSignals: 50,
    dailyRunHourUTC: 9,
    autoDeployMainnet: false,
    minCycleHours: 24
  }
};

function mergeConfig(base: AgentConfig, overrides: Partial<AgentConfig>): AgentConfig {
  return {
    ...base,
    ...overrides,
    twitter: { ...base.twitter, ...overrides.twitter },
    web: { ...base.web, ...overrides.web },
    research: { ...base.research, ...overrides.research },
    decision: { ...base.decision, ...overrides.decision },
    validation: { ...base.validation, ...overrides.validation },
    farcaster: { ...base.farcaster, ...overrides.farcaster },
    dune: { ...base.dune, ...overrides.dune },
    scoring: { ...base.scoring, ...overrides.scoring },
    pipeline: { ...base.pipeline, ...overrides.pipeline }
  };
}

export async function loadConfig(baseDir: string): Promise<AgentConfig> {
  const configPath = resolveConfigPath(baseDir);
  try {
    const raw = await fs.readFile(configPath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<AgentConfig>;
    return mergeConfig(fallbackConfig, parsed);
  } catch {
    return fallbackConfig;
  }
}
