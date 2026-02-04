import { TwitterApi } from 'twitter-api-v2';
import type { TrendSignal } from '../core/types.js';
import type { AgentConfig } from '../core/config.js';
import { scoreSignal } from '../core/scoring.js';

export async function fetchTwitterSignals(config: AgentConfig): Promise<TrendSignal[]> {
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
      meta: { authorId: tweet.author_id ?? 'unknown' }
    });
  }

  return signals;
}
