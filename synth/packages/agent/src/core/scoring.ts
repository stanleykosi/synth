import type { TrendSignal, TrendSource } from './types.js';
import type { AgentConfig } from './config.js';

export function scoreSignal(
  source: TrendSource,
  engagement: number,
  config: AgentConfig
): number {
  const weight = config.scoring.weights[source] ?? 1;
  const capped = Math.min(engagement, config.scoring.engagementCap);
  const normalized = config.scoring.engagementCap === 0
    ? 0
    : capped / config.scoring.engagementCap;
  return Math.round((normalized * 8 + 2) * weight * 10) / 10;
}

export function finalizeScores(signals: TrendSignal[]): TrendSignal[] {
  return signals
    .map((signal) => ({
      ...signal,
      score: Math.max(0, Math.min(10, signal.score))
    }))
    .sort((a, b) => b.score - a.score);
}
