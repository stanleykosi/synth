import type { TrendSignal } from '../core/types.js';
import type { AgentConfig } from '../core/config.js';
import { scoreSignal } from '../core/scoring.js';

interface NeynarCast {
  hash: string;
  text: string;
  author?: { username?: string };
  reactions?: { likes_count?: number; recasts_count?: number };
  replies?: { count?: number };
  created_at?: string;
}

export async function fetchFarcasterSignals(config: AgentConfig): Promise<TrendSignal[]> {
  const apiKey = process.env.NEYNAR_API_KEY;
  if (!apiKey || config.farcaster.channels.length === 0) {
    return [];
  }

  const channels = config.farcaster.channels.join(',');
  const url = new URL('https://api.neynar.com/v2/farcaster/feed/channels/');
  url.searchParams.set('channel_ids', channels);
  url.searchParams.set('with_recasts', 'true');
  url.searchParams.set('limit', String(config.farcaster.limit));

  const res = await fetch(url.toString(), {
    headers: {
      'x-api-key': apiKey
    }
  });

  if (!res.ok) {
    return [];
  }

  const body = await res.json() as { casts?: NeynarCast[] };
  const casts = body.casts ?? [];

  return casts.map((cast) => {
    const engagement =
      (cast.reactions?.likes_count ?? 0) +
      (cast.reactions?.recasts_count ?? 0) +
      (cast.replies?.count ?? 0);

    return {
      id: `farcaster-${cast.hash}`,
      source: 'farcaster',
      summary: cast.text.slice(0, 240),
      score: scoreSignal('farcaster', engagement, config),
      capturedAt: cast.created_at ?? new Date().toISOString(),
      url: `https://warpcast.com/${cast.author?.username ?? 'unknown'}/${cast.hash.slice(0, 10)}`,
      engagement,
      meta: { author: cast.author?.username ?? 'unknown' }
    };
  });
}
