import type { TrendSignal } from '../core/types.js';
import type { AgentConfig } from '../core/config.js';
import { scoreSignal } from '../core/scoring.js';

function buildQuery(): string {
  return process.env.GRAPH_QUERY || 'query { _meta { block { number } } }';
}

export async function fetchGraphSignals(config: AgentConfig): Promise<TrendSignal[]> {
  const endpoint = process.env.GRAPH_ENDPOINT;
  if (!endpoint) {
    return [];
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: buildQuery() })
  });

  if (!res.ok) {
    return [];
  }

  const body = await res.json() as { data?: Record<string, unknown> };
  const summary = JSON.stringify(body.data ?? {}).slice(0, 240);
  const engagement = 30;

  return [{
    id: `graph-${Date.now()}`,
    source: 'onchain',
    summary: summary.length > 0 ? summary : 'Graph signal',
    score: scoreSignal('onchain', engagement, config),
    capturedAt: new Date().toISOString(),
    engagement,
    meta: { endpoint }
  }];
}
