import type { DropRecord, MetricSnapshot } from './types.js';

export function buildMetrics(drops: DropRecord[], suggestionsReceived: number, suggestionsBuilt: number): MetricSnapshot {
  const contractsByType = drops.reduce((acc, drop) => {
    acc[drop.type] = (acc[drop.type] ?? 0) + 1;
    return acc;
  }, { token: 0, nft: 0, dapp: 0, contract: 0 } as Record<DropRecord['type'], number>);

  return {
    totalDrops: drops.length,
    contractsByType,
    suggestionsReceived,
    suggestionsBuilt
  };
}
