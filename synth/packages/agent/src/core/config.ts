import fs from 'fs/promises';
import { resolveConfigPath } from '../utils/paths.js';

export interface AgentConfig {
  twitter: {
    queries: string[];
    maxResults: number;
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
    queryIds: string[];
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
    queries: ['base chain', 'base l2'],
    maxResults: 20
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
    queryIds: []
  },
  scoring: {
    weights: {
      twitter: 1.0,
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
