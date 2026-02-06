import type { TrendSignal } from '../core/types.js';
import type { AgentConfig } from '../core/config.js';
import { scoreSignal } from '../core/scoring.js';
import { summarizeDuneRows } from '../services/dune.js';

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
    const slice = rows.slice(0, 8);
    let summary = slice
      .map((row) => Object.entries(row).map(([key, value]) => `${key}: ${String(value)}`).join(', '))
      .join(' | ')
      .slice(0, 240);

    const llmSummary = slice.length > 0
      ? await summarizeDuneRows({ queryId, rows: slice })
      : null;
    if (llmSummary) {
      summary = llmSummary;
    }

    const engagement = Math.max(30, 60 - slice.length * 3);
    signals.push({
      id: `onchain-${queryId}`,
      source: 'onchain',
      summary: summary.slice(0, 240),
      score: scoreSignal('onchain', engagement, config),
      capturedAt: new Date().toISOString(),
      url: `https://dune.com/queries/${queryId}`,
      engagement,
      meta: { queryId, rows: slice }
    });
  }

  return signals;
}
