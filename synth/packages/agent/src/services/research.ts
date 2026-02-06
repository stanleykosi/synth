import type { EvidenceItem, TrendSignal } from '../core/types.js';
import type { AgentConfig } from '../core/config.js';
import { invokeOpenClawTool } from './openclaw.js';

interface SearchResultRaw {
  title?: string;
  url?: string;
  link?: string;
  snippet?: string;
  description?: string;
  content?: string;
  source?: string;
}

function normalizeResult(raw: SearchResultRaw): EvidenceItem | null {
  const title = raw.title?.trim();
  const url = raw.url ?? raw.link;
  const snippet = raw.snippet ?? raw.description ?? raw.content;
  if (!title || !url) return null;
  return {
    title,
    url,
    snippet: snippet?.slice(0, 240),
    source: raw.source
  };
}

function extractResults(payload: unknown): SearchResultRaw[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload as SearchResultRaw[];
  if (typeof payload === 'object') {
    const candidate = payload as Record<string, unknown>;
    if (Array.isArray(candidate.results)) return candidate.results as SearchResultRaw[];
    if (Array.isArray(candidate.web)) return candidate.web as SearchResultRaw[];
    if (Array.isArray(candidate.data)) return candidate.data as SearchResultRaw[];
    if (candidate.data && typeof candidate.data === 'object') {
      const data = candidate.data as Record<string, unknown>;
      if (Array.isArray(data.results)) return data.results as SearchResultRaw[];
    }
    if (Array.isArray(candidate.citations)) {
      const snippet = typeof candidate.answer === 'string' ? candidate.answer : undefined;
      return (candidate.citations as unknown[]).map((url) => ({
        title: typeof url === 'string' ? url : 'Citation',
        url: typeof url === 'string' ? url : '',
        snippet
      }));
    }
  }
  return [];
}

export async function buildEvidence(signals: TrendSignal[], config: AgentConfig): Promise<Record<string, EvidenceItem[]>> {
  if (!config.research.enabled) {
    return {};
  }

  const evidenceMap: Record<string, EvidenceItem[]> = {};
  const limit = Math.max(1, config.research.maxSignals);

  for (const signal of signals.slice(0, limit)) {
    try {
      const results = await invokeOpenClawTool<unknown>({
        tool: 'web_search',
        action: 'json',
        args: {
          query: signal.summary,
          count: config.research.resultsPerSignal
        }
      });

      let normalized = extractResults(results)
        .map(normalizeResult)
        .filter((item): item is EvidenceItem => Boolean(item));

      normalized = normalized.slice(0, config.research.resultsPerSignal);

      const fetchTop = Math.max(0, config.research.fetchTop);
      if (fetchTop > 0) {
        const targets = normalized.slice(0, fetchTop);
        await Promise.all(targets.map(async (item) => {
          try {
            const fetched = await invokeOpenClawTool<unknown>({
              tool: 'web_fetch',
              action: 'json',
              args: {
                url: item.url,
                extractMode: 'text',
                maxChars: 400
              }
            });

            if (typeof fetched === 'string') {
              item.snippet = fetched.slice(0, 240);
            } else if (fetched && typeof fetched === 'object') {
              const data = fetched as Record<string, unknown>;
              const text = typeof data.text === 'string' ? data.text : typeof data.content === 'string' ? data.content : undefined;
              if (text) {
                item.snippet = text.slice(0, 240);
              }
            }
          } catch {
            return;
          }
        }));
      }

      evidenceMap[signal.id] = normalized;
    } catch {
      evidenceMap[signal.id] = [];
    }
  }

  return evidenceMap;
}
