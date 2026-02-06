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
  discord: {
    channelIds: string[];
    limit: number;
  };
  dune: {
    queryIds: number[];
  };
  scoring: {
    weights: Record<string, number>;
    engagementCap: number;
  };
  pipeline: {
    maxSignals: number;
    dailyRunHourUTC: number;
    autoDeployMainnet: boolean;
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
    maxSignals: 3,
    resultsPerSignal: 5,
    fetchTop: 1
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
  discord: {
    channelIds: [],
    limit: 20
  },
  dune: {
    queryIds: [5737569, 6436472, 6314894, 3798745]
  },
  scoring: {
    weights: {
      twitter: 1.0,
      web: 1.0,
      farcaster: 1.0,
      discord: 0.7,
      onchain: 1.2,
      suggestion: 1.3
    },
    engagementCap: 5000
  },
  pipeline: {
    maxSignals: 50,
    dailyRunHourUTC: 9,
    autoDeployMainnet: false
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
    discord: { ...base.discord, ...overrides.discord },
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
