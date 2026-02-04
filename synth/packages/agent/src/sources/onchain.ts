import type { TrendSignal } from '../core/types.js';
import type { AgentConfig } from '../core/config.js';
import { scoreSignal } from '../core/scoring.js';

export async function fetchOnchainSignals(config: AgentConfig): Promise<TrendSignal[]> {
  const apiKey = process.env.DUNE_API_KEY;
  if (!apiKey || config.dune.queryIds.length === 0) {
    return [];
  }

  const signals: TrendSignal[] = [];

  for (const queryId of config.dune.queryIds) {
    const url = `https://api.dune.com/api/v1/query/${queryId}/results`;
    const res = await fetch(url, {
      headers: { 'X-DUNE-API-KEY': apiKey }
    });
    if (!res.ok) {
      continue;
    }

    const body = await res.json() as { result?: { rows?: Record<string, unknown>[] } };
    const rows = body.result?.rows ?? [];
    rows.slice(0, 5).forEach((row, index) => {
      const summary = Object.entries(row)
        .map(([key, value]) => `${key}: ${String(value)}`)
        .join(', ');

      const engagement = 50 - index * 5;
      signals.push({
        id: `onchain-${queryId}-${index}`,
        source: 'onchain',
        summary: summary.slice(0, 240),
        score: scoreSignal('onchain', engagement, config),
        capturedAt: new Date().toISOString(),
        url: `https://dune.com/queries/${queryId}`,
        engagement,
        meta: { queryId }
      });
    });
  }

  return signals;
}
