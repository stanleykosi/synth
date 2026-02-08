import { TwitterApi } from 'twitter-api-v2';
import { loadTrendPosts, saveTrendPosts } from '../core/memory.js';
import { log } from '../core/logger.js';
import type { TrendPoolEntry, TrendPostRecord } from '../core/types.js';
import { loadTrendPoolWindow, pickLatestTrendKeys, sortTrendEntries } from './trend-pool.js';
import { buildAgentContext } from './context.js';
import { buildSkillsContext } from './skills.js';
import { runLlmTask } from './llm-runner.js';

const schema = {
  type: 'object',
  properties: {
    twitterThread: {
      type: 'array',
      items: { type: 'string' },
      minItems: 4,
      maxItems: 8
    },
    farcasterThread: {
      type: 'array',
      items: { type: 'string' },
      minItems: 4,
      maxItems: 8
    }
  },
  required: ['twitterThread', 'farcasterThread'],
  additionalProperties: false
};

let isPosting = false;

function stripHashtags(text: string): string {
  return text.replace(/#[\p{L}0-9_]+/gu, '').trim();
}

function stripEmDash(text: string): string {
  return text.replace(/[—–]/g, '-');
}

function cleanupSpacing(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function sanitizePost(text: string): string {
  let cleaned = text;
  cleaned = stripEmDash(cleaned);
  cleaned = stripHashtags(cleaned);
  cleaned = cleaned.replace(/^["'“”]+|["'“”]+$/g, '');
  cleaned = cleanupSpacing(cleaned);
  return cleaned;
}

function truncateToLimit(text: string, limit: number): string {
  if (text.length <= limit) return text;
  const trimmed = text.slice(0, limit);
  const lastPeriod = trimmed.lastIndexOf('.');
  if (lastPeriod > 60) {
    return trimmed.slice(0, lastPeriod + 1).trim();
  }
  return trimmed.replace(/\s+\S*$/, '').trim();
}

function normalizeThread(lines: string[], limit: number, maxItems: number): string[] {
  return lines
    .filter((line) => typeof line === 'string' && line.trim().length > 0)
    .map((line) => truncateToLimit(sanitizePost(line), limit))
    .filter(Boolean)
    .slice(0, maxItems);
}

function buildFallbackThread(trends: TrendPoolEntry[]): string[] {
  const summaries = trends.map((trend) => cleanSummary(trend.summary)).filter(Boolean);
  const top = summaries.slice(0, 4);
  const lines: string[] = [];

  lines.push(`SYNTH trend pulse: ${top[0] ?? 'Multiple signals converging across Base + crypto infra.'}`);
  if (top[1]) lines.push(`Signal 2: ${top[1]}`);
  if (top[2]) lines.push(`Signal 3: ${top[2]}`);
  if (top[3]) lines.push(`Signal 4: ${top[3]}`);
  lines.push('Why it matters: the signal density is rising, and the overlap suggests a real demand shift, not noise.');
  lines.push('We’re tracking it live and will turn the strongest thread into a shipped drop if the data holds.');

  return lines;
}

function cleanSummary(text: string): string {
  return text.replace(/\s+/g, ' ').replace(/[—–]/g, '-').trim();
}

function buildTrendPayload(trends: TrendPoolEntry[]) {
  return trends.map((trend) => ({
    summary: trend.summary,
    source: trend.source,
    score: Number.isFinite(trend.score) ? Number(trend.score.toFixed(2)) : trend.score,
    capturedAt: trend.capturedAt,
    engagement: trend.engagement ?? null
  }));
}

function minutesSince(timestamp?: string): number | null {
  if (!timestamp) return null;
  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) return null;
  return (Date.now() - parsed) / 60_000;
}

async function generateTrendPost(trends: TrendPoolEntry[], skills: string, context: string) {
  const model = process.env.SYNTH_LLM_MODEL ?? 'openrouter/anthropic/claude-3.5-haiku';
  const maxTokens = process.env.SYNTH_LLM_MAX_TOKENS ? Number(process.env.SYNTH_LLM_MAX_TOKENS) : 1200;

  const prompt = [
    'You are SYNTH, writing a trend analysis thread.',
    'Write like a real human analyst blended with the SYNTH soul: technical, candid, signal-first.',
    'Be verbose, grounded, and specific to the trends provided.',
    'No hashtags. No em dashes. No timestamps. No hype.',
    'Return JSON only with two fields: twitterThread and farcasterThread.',
    'Twitter thread: 4-8 posts, each <= 280 characters, 1-2 sentences each.',
    'Farcaster thread: 4-8 casts, each <= 320 characters, as detailed as Twitter.',
    'Both threads should cover the same analysis, but vary phrasing and structure.',
    'Do not repeat the exact same sentence across both threads.'
  ].join('\n');

  const payload = {
    prompt,
    input: {
      trends: buildTrendPayload(trends),
      skills,
      context
    },
    schema,
    model,
    maxTokens
  };

  try {
    const result = await runLlmTask<unknown>(payload);
    if (!result || typeof result !== 'object') return null;
    const data = result as { twitterThread?: string[]; farcasterThread?: string[] };
    if (!Array.isArray(data.twitterThread) || !Array.isArray(data.farcasterThread)) return null;
    return {
      twitterThread: data.twitterThread,
      farcasterThread: data.farcasterThread
    };
  } catch {
    return null;
  }
}

async function postTwitterThread(baseDir: string, thread: string[]) {
  const apiKey = process.env.TWITTER_API_KEY;
  const apiSecret = process.env.TWITTER_API_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.TWITTER_ACCESS_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    await log(baseDir, 'warn', 'Twitter credentials missing, skipping trend post.');
    return;
  }

  if (!thread.length) {
    await log(baseDir, 'warn', 'Twitter trend post skipped: empty thread.');
    return;
  }

  const client = new TwitterApi({
    appKey: apiKey,
    appSecret: apiSecret,
    accessToken,
    accessSecret
  });

  let replyTo: string | undefined;
  for (const tweet of thread) {
    const res = await client.v2.tweet({
      text: tweet,
      reply: replyTo ? { in_reply_to_tweet_id: replyTo } : undefined
    });
    replyTo = res.data.id;
  }

  await log(baseDir, 'info', 'Trend thread published to Twitter.');
}

async function postFarcasterThread(baseDir: string, thread: string[]) {
  const apiKey = process.env.NEYNAR_API_KEY;
  const signer = process.env.NEYNAR_SIGNER_UUID;
  if (!apiKey || !signer) {
    await log(baseDir, 'warn', 'Farcaster credentials missing, skipping trend post.');
    return;
  }

  if (!thread.length) {
    await log(baseDir, 'warn', 'Farcaster trend post skipped: empty thread.');
    return;
  }

  let parentHash: string | null = null;
  let parentFid: number | null = null;

  for (const text of thread) {
    const body: Record<string, unknown> = {
      signer_uuid: signer,
      text
    };
    if (parentHash && parentFid) {
      body.parent = parentHash;
      body.parent_author_fid = parentFid;
    }

    const res = await fetch('https://api.neynar.com/v2/farcaster/cast/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const error = await res.text();
      await log(baseDir, 'warn', `Farcaster trend post failed: ${error}`);
      return;
    }

    const data = await res.json().catch(() => null) as {
      cast?: { hash?: string; author?: { fid?: number } };
    } | null;

    const castHash = data?.cast?.hash;
    const castFid = data?.cast?.author?.fid;
    if (!castHash || !castFid) {
      await log(baseDir, 'warn', 'Farcaster trend post failed: missing cast hash or fid.');
      return;
    }

    parentHash = castHash;
    parentFid = castFid;
  }

  await log(baseDir, 'info', 'Trend thread published to Farcaster.');
}

export async function runTrendPost(baseDir: string, options?: { force?: boolean }) {
  if (isPosting) return;
  isPosting = true;
  const force = Boolean(options?.force);

  try {
    const lookbackHoursRaw = process.env.SYNTH_TREND_POST_LOOKBACK_HOURS
      ? Number(process.env.SYNTH_TREND_POST_LOOKBACK_HOURS)
      : 12;
    const lookbackHours = Number.isFinite(lookbackHoursRaw) && lookbackHoursRaw > 0 ? lookbackHoursRaw : 12;
    const maxSignalsRaw = process.env.SYNTH_TREND_POST_MAX_SIGNALS
      ? Number(process.env.SYNTH_TREND_POST_MAX_SIGNALS)
      : 6;
    const maxSignals = Number.isFinite(maxSignalsRaw) && maxSignalsRaw > 0 ? maxSignalsRaw : 6;

    const pool = await loadTrendPoolWindow(baseDir, lookbackHours);
    if (pool.length === 0) {
      await log(baseDir, 'info', 'Trend post skipped: no pool signals in window.');
      return;
    }

    const posts = await loadTrendPosts(baseDir);
    const cooldownRaw = process.env.SYNTH_TREND_POST_COOLDOWN_MINUTES
      ? Number(process.env.SYNTH_TREND_POST_COOLDOWN_MINUTES)
      : 150;
    const cooldownMinutes = Number.isFinite(cooldownRaw) && cooldownRaw > 0 ? cooldownRaw : 150;
    const lastPostMinutes = minutesSince(posts[0]?.createdAt);
    if (!force && lastPostMinutes !== null && lastPostMinutes < cooldownMinutes) {
      await log(baseDir, 'info', `Trend post skipped: last post ${lastPostMinutes.toFixed(0)}m ago (< ${cooldownMinutes}m).`);
      return;
    }
    const usedKeys = pickLatestTrendKeys(posts);
    const fresh = sortTrendEntries(pool).filter((trend) => !usedKeys.has(trend.key));
    if (fresh.length === 0) {
      await log(baseDir, 'info', 'Trend post skipped: no new trends since last post.');
      return;
    }

    const selected = fresh.slice(0, Math.max(1, maxSignals));
    const skills = await buildSkillsContext(baseDir, { include: ['trend-detector', 'dune-analyst', 'trend-pulse'] });
    const context = await buildAgentContext(baseDir);
    const generated = await generateTrendPost(selected, skills, context);
    if (!generated) {
      await log(baseDir, 'warn', 'Trend post generation failed. Using fallback copy.');
    }
    const fallbackRaw = buildFallbackThread(selected);
    const fallbackTwitter = normalizeThread(fallbackRaw, 280, 8);
    const fallbackFarcaster = normalizeThread(fallbackRaw, 320, 8);

    let twitterThread = normalizeThread(
      generated?.twitterThread ?? fallbackRaw,
      280,
      8
    );
    if (twitterThread.length < 4) {
      twitterThread = fallbackTwitter;
    }

    let farcasterThread = normalizeThread(
      generated?.farcasterThread ?? twitterThread,
      320,
      8
    );
    if (farcasterThread.length < 4) {
      farcasterThread = normalizeThread(twitterThread, 320, 8);
    }
    if (farcasterThread.length < 4) {
      farcasterThread = fallbackFarcaster;
    }

    if (twitterThread.length < 4 || farcasterThread.length < 4) {
      await log(baseDir, 'warn', 'Trend post skipped: thread content too short after sanitization.');
      return;
    }

    await Promise.all([
      postTwitterThread(baseDir, twitterThread).catch(async (error) => {
        const message = error instanceof Error ? error.message : String(error);
        await log(baseDir, 'warn', `Twitter trend post failed: ${message}`);
      }),
      postFarcasterThread(baseDir, farcasterThread).catch(async (error) => {
        const message = error instanceof Error ? error.message : String(error);
        await log(baseDir, 'warn', `Farcaster trend post failed: ${message}`);
      })
    ]);

    const record: TrendPostRecord = {
      id: `trend-post-${Date.now()}`,
      createdAt: new Date().toISOString(),
      twitter: twitterThread[0],
      farcaster: farcasterThread[0],
      twitterThread,
      farcasterThread,
      trendKeys: selected.map((trend) => trend.key)
    };
    posts.unshift(record);
    await saveTrendPosts(baseDir, posts.slice(0, 200));
  } finally {
    isPosting = false;
  }
}
