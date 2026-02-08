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
    twitter: { type: 'string' },
    farcaster: { type: 'string' }
  },
  required: ['twitter', 'farcaster'],
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
  const maxTokens = process.env.SYNTH_LLM_MAX_TOKENS ? Number(process.env.SYNTH_LLM_MAX_TOKENS) : 600;

  const prompt = [
    'You are SYNTH, writing a single social post about trends you observed.',
    'Write as a real human analyst: clear, concise, grounded.',
    'No hashtags. No em dashes. No timestamps. No hype.',
    'Summarize the most important patterns across the trends below.',
    'Return JSON only with two fields: twitter and farcaster.',
    'Both posts must be under 280 characters and share the same analytical point, but with slightly different phrasing.',
    'Do not repeat the exact same sentence in both.'
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
    const data = result as { twitter?: string; farcaster?: string };
    if (!data.twitter || !data.farcaster) return null;
    return {
      twitter: data.twitter,
      farcaster: data.farcaster
    };
  } catch {
    return null;
  }
}

async function postTwitter(baseDir: string, text: string) {
  const apiKey = process.env.TWITTER_API_KEY;
  const apiSecret = process.env.TWITTER_API_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.TWITTER_ACCESS_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    await log(baseDir, 'warn', 'Twitter credentials missing, skipping trend post.');
    return;
  }

  const client = new TwitterApi({
    appKey: apiKey,
    appSecret: apiSecret,
    accessToken,
    accessSecret
  });

  await client.v2.tweet({ text });
  await log(baseDir, 'info', 'Trend post published to Twitter.');
}

async function postFarcaster(baseDir: string, text: string) {
  const apiKey = process.env.NEYNAR_API_KEY;
  const signer = process.env.NEYNAR_SIGNER_UUID;
  if (!apiKey || !signer) {
    await log(baseDir, 'warn', 'Farcaster credentials missing, skipping trend post.');
    return;
  }

  const res = await fetch('https://api.neynar.com/v2/farcaster/cast/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey
    },
    body: JSON.stringify({
      signer_uuid: signer,
      text
    })
  });

  if (!res.ok) {
    const error = await res.text();
    await log(baseDir, 'warn', `Farcaster trend post failed: ${error}`);
    return;
  }

  await log(baseDir, 'info', 'Trend post published to Farcaster.');
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
      await log(baseDir, 'warn', 'Trend post generation failed.');
      return;
    }

    let twitter = sanitizePost(generated.twitter);
    let farcaster = sanitizePost(generated.farcaster);

    twitter = truncateToLimit(twitter, 280);
    farcaster = truncateToLimit(farcaster, 280);

    if (!twitter || !farcaster) {
      await log(baseDir, 'warn', 'Trend post skipped: empty content after sanitization.');
      return;
    }

    if (twitter === farcaster) {
      const suffix = 'Worth watching how this evolves.';
      farcaster = truncateToLimit(`${farcaster} ${suffix}`, 280);
    }

    await Promise.all([
      postTwitter(baseDir, twitter).catch(async (error) => {
        const message = error instanceof Error ? error.message : String(error);
        await log(baseDir, 'warn', `Twitter trend post failed: ${message}`);
      }),
      postFarcaster(baseDir, farcaster).catch(async (error) => {
        const message = error instanceof Error ? error.message : String(error);
        await log(baseDir, 'warn', `Farcaster trend post failed: ${message}`);
      })
    ]);

    const record: TrendPostRecord = {
      id: `trend-post-${Date.now()}`,
      createdAt: new Date().toISOString(),
      twitter,
      farcaster,
      trendKeys: selected.map((trend) => trend.key)
    };
    posts.unshift(record);
    await saveTrendPosts(baseDir, posts.slice(0, 200));
  } finally {
    isPosting = false;
  }
}
