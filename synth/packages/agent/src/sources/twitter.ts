import { TwitterApi } from 'twitter-api-v2';
import type { TrendSignal } from '../core/types.js';
import type { AgentConfig } from '../core/config.js';
import { scoreSignal } from '../core/scoring.js';
import { invokeOpenClawTool } from '../services/openclaw.js';

function parseCount(raw: string | null | undefined): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/,/g, '').trim().toUpperCase();
  if (!cleaned) return 0;
  const multiplier = cleaned.endsWith('K') ? 1000 : cleaned.endsWith('M') ? 1000000 : 1;
  const numeric = parseFloat(cleaned.replace(/[KM]$/, ''));
  if (Number.isNaN(numeric)) return 0;
  return Math.round(numeric * multiplier);
}

async function fetchTwitterSignalsApi(config: AgentConfig): Promise<TrendSignal[]> {
  const apiKey = process.env.TWITTER_API_KEY;
  const apiSecret = process.env.TWITTER_API_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.TWITTER_ACCESS_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    return [];
  }

  const client = new TwitterApi({
    appKey: apiKey,
    appSecret: apiSecret,
    accessToken,
    accessSecret
  });

  const query = config.twitter.queries.join(' OR ');
  const response = await client.v2.search(query, {
    max_results: Math.min(config.twitter.maxResults, 100),
    'tweet.fields': ['created_at', 'public_metrics', 'author_id']
  });

  const signals: TrendSignal[] = [];
  for await (const tweet of response) {
    const metrics = tweet.public_metrics ?? { like_count: 0, retweet_count: 0, reply_count: 0, quote_count: 0 };
    const engagement = metrics.like_count + metrics.retweet_count + metrics.reply_count + metrics.quote_count;
    signals.push({
      id: `twitter-${tweet.id}`,
      source: 'twitter',
      summary: tweet.text.slice(0, 240),
      score: scoreSignal('twitter', engagement, config),
      capturedAt: tweet.created_at ?? new Date().toISOString(),
      url: `https://x.com/i/web/status/${tweet.id}`,
      engagement,
      meta: { authorId: tweet.author_id ?? 'unknown', mode: 'api' }
    });
  }

  return signals;
}

async function browserAction(config: AgentConfig, action: string, args?: Record<string, unknown>) {
  return invokeOpenClawTool<unknown>({
    tool: 'browser',
    action,
    args: {
      profile: config.twitter.browserProfile,
      target: config.twitter.browserTarget,
      ...args
    }
  });
}

async function browserEvaluate(config: AgentConfig, fn: string) {
  try {
    return await browserAction(config, 'evaluate', { fn });
  } catch {
    return browserAction(config, 'act', { kind: 'evaluate', fn });
  }
}

async function fetchTwitterSignalsBrowser(config: AgentConfig): Promise<TrendSignal[]> {
  if (config.twitter.queries.length === 0) return [];

  const query = config.twitter.queries.map((term) => `"${term}"`).join(' OR ');
  const searchUrl = `https://x.com/search?q=${encodeURIComponent(query)}&src=typed_query&f=live`;

  try {
    await browserAction(config, 'start');
  } catch {
    // ignore start errors; browser might already be running
  }

  try {
    await browserAction(config, 'open', { url: searchUrl });
  } catch {
    try {
      await browserAction(config, 'navigate', { url: searchUrl });
    } catch {
      return [];
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 2500));

  const limit = Math.max(5, Math.min(config.twitter.maxResults, 50));
  const fn = `() => {
    const parse = (value) => {
      if (!value) return 0;
      const cleaned = value.replace(/,/g, '').trim().toUpperCase();
      if (!cleaned) return 0;
      const mult = cleaned.endsWith('K') ? 1000 : cleaned.endsWith('M') ? 1000000 : 1;
      const numeric = parseFloat(cleaned.replace(/[KM]$/, ''));
      return Number.isNaN(numeric) ? 0 : Math.round(numeric * mult);
    };
    const toText = (nodes) => nodes.map((n) => n.innerText || '').join(' ').trim();
    const articles = Array.from(document.querySelectorAll('article')).slice(0, ${limit});
    return articles.map((article) => {
      const textNodes = Array.from(article.querySelectorAll('[data-testid="tweetText"]'));
      const text = textNodes.length ? toText(textNodes) : (article.innerText || '').trim();
      const timeEl = article.querySelector('time');
      const timestamp = timeEl ? timeEl.getAttribute('datetime') : '';
      const linkEl = timeEl && timeEl.closest('a');
      const url = linkEl ? linkEl.href : '';
      const getCount = (testId) => {
        const el = article.querySelector('[data-testid="' + testId + '"]');
        if (!el) return 0;
        const parent = el.closest('div[role="group"]') || el.parentElement;
        if (!parent) return 0;
        const spans = Array.from(parent.querySelectorAll('span'));
        const candidate = spans.map((span) => span.textContent || '').find((value) => /[0-9]/.test(value));
        return parse(candidate || '');
      };
      const replies = getCount('reply');
      const reposts = getCount('retweet') || getCount('repost');
      const likes = getCount('like');
      return {
        text,
        timestamp,
        url,
        engagement: replies + reposts + likes
      };
    });
  }`;

  let result: unknown;
  try {
    result = await browserEvaluate(config, fn);
  } catch {
    return [];
  }

  const items = Array.isArray(result)
    ? result
    : (result && typeof result === 'object' && 'value' in result && Array.isArray((result as { value: unknown }).value))
      ? (result as { value: unknown }).value
      : [];

  if (!Array.isArray(items)) {
    return [];
  }

  const signals: TrendSignal[] = [];
  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const record = item as { text?: string; timestamp?: string; url?: string; engagement?: number };
    const text = (record.text ?? '').trim();
    if (!text) continue;
    const engagement = typeof record.engagement === 'number' ? record.engagement : parseCount(String(record.engagement ?? ''));
    const url = record.url ?? '';
    const id = url.includes('/status/')
      ? `twitter-${url.split('/status/')[1]?.split('?')[0] ?? text.slice(0, 12)}`
      : `twitter-${text.slice(0, 12)}`;
    signals.push({
      id,
      source: 'twitter',
      summary: text.slice(0, 240),
      score: scoreSignal('twitter', engagement, config),
      capturedAt: record.timestamp || new Date().toISOString(),
      url,
      engagement,
      meta: { mode: 'browser' }
    });
  }

  return signals.slice(0, config.twitter.maxResults);
}

export async function fetchTwitterSignals(config: AgentConfig): Promise<TrendSignal[]> {
  if (!config.twitter.enabled) {
    return [];
  }

  if (config.twitter.mode === 'api') {
    return fetchTwitterSignalsApi(config);
  }

  return fetchTwitterSignalsBrowser(config);
}
