import Parser from 'rss-parser';
import type { TrendSignal } from '../core/types.js';
import type { AgentConfig } from '../core/config.js';
import { scoreSignal } from '../core/scoring.js';

const parser = new Parser({
  timeout: 20000,
  headers: {
    'User-Agent': 'SYNTH-Agent/1.0'
  }
});

function computeEngagement(publishedAt?: string): number {
  if (!publishedAt) return 20;
  const published = new Date(publishedAt).getTime();
  if (Number.isNaN(published)) return 20;
  const hours = (Date.now() - published) / 36e5;
  if (hours <= 12) return 100;
  if (hours <= 24) return 80;
  if (hours <= 72) return 60;
  if (hours <= 168) return 40;
  if (hours <= 336) return 25;
  return 15;
}

function buildSummary(title?: string, snippet?: string) {
  const parts = [title?.trim(), snippet?.trim()].filter(Boolean);
  if (parts.length === 0) return 'Untitled update';
  return parts.join(' — ').slice(0, 240);
}

function buildId(sourceName: string, link?: string, title?: string) {
  const basis = link ?? title ?? `${sourceName}-${Date.now()}`;
  const slug = basis.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return `web-${sourceName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${slug || 'item'}`;
}

export async function fetchWebSignals(config: AgentConfig): Promise<TrendSignal[]> {
  if (!config.web.enabled || config.web.sources.length === 0) {
    return [];
  }

  const signals: TrendSignal[] = [];
  for (const source of config.web.sources) {
    try {
      const feed = await parser.parseURL(source.url);
      const items = (feed.items ?? []).slice(0, config.web.perSourceLimit);
      for (const item of items) {
        const summary = buildSummary(item.title, item.contentSnippet ?? item.content);
        const engagement = computeEngagement(item.isoDate ?? item.pubDate);
        signals.push({
          id: buildId(source.name, item.link ?? item.guid, item.title),
          source: 'web',
          summary,
          score: scoreSignal('web', engagement, config),
          capturedAt: item.isoDate ?? item.pubDate ?? new Date().toISOString(),
          url: item.link,
          engagement,
          meta: { source: source.name }
        });
      }
    } catch {
      continue;
    }
  }

  return signals.slice(0, config.web.maxItems);
}
