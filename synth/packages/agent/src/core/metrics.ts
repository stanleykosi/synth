import type { DropRecord, MetricSnapshot } from './types.js';

function sumGasSpent(drops: DropRecord[]): string | undefined {
  let total = 0;
  for (const drop of drops) {
    if (!drop.gasCostEth) continue;
    const value = Number(drop.gasCostEth);
    if (!Number.isNaN(value)) {
      total += value;
    }
  }
  return total > 0 ? total.toFixed(6) : undefined;
}

export function buildMetrics(
  drops: DropRecord[],
  suggestionsReceived: number,
  suggestionsBuilt: number,
  githubStars?: number,
  rateLimits?: MetricSnapshot['rateLimits']
): MetricSnapshot {
  const contractsByType = drops.reduce((acc, drop) => {
    acc[drop.type] = (acc[drop.type] ?? 0) + 1;
    return acc;
  }, { token: 0, nft: 0, dapp: 0, contract: 0 } as Record<DropRecord['type'], number>);

  return {
    totalDrops: drops.length,
    contractsByType,
    suggestionsReceived,
    suggestionsBuilt,
    githubStars,
    gasSpentEth: sumGasSpent(drops),
    rateLimits
  };
}
