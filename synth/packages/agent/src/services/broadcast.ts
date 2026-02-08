import { TwitterApi } from 'twitter-api-v2';
import type { DropRecord, TrendSignal } from '../core/types.js';
import { log } from '../core/logger.js';
import { generateSocialCopy } from './social.js';

interface BroadcastInput {
  baseDir: string;
  drop: DropRecord;
  trend: TrendSignal;
  skills?: string;
  context?: string;
}

function buildThread(drop: DropRecord, trend: TrendSignal): string[] {
  const explorer = drop.explorerUrl ?? (drop.contractAddress ? `https://basescan.org/address/${drop.contractAddress}` : '');
  const contractLine = drop.contractAddress
    ? `Contract: ${drop.contractAddress}\nExplorer: ${explorer || 'N/A'}`
    : 'Contract: none (offchain app)';
  return [
    `SYNTH drop: ${drop.name}\n\nSignal: ${trend.summary}`,
    `What shipped: ${drop.description}`,
    contractLine,
    `Repo: ${drop.githubUrl}`,
    drop.webappUrl ? `Web: ${drop.webappUrl}` : 'Web: not applicable',
    'Share feedback or submit a new suggestion in the SYNTH dashboard.'
  ];
}

function clampFarcaster(text: string): string {
  if (text.length <= 320) return text;
  const cut = text.slice(0, 320);
  return cut.replace(/\s+\S*$/, '').trim();
}

function normalizeFarcasterThread(lines: string[]): string[] {
  return lines
    .filter((line) => typeof line === 'string' && line.trim().length > 0)
    .map((line) => clampFarcaster(line.trim()))
    .filter(Boolean)
    .slice(0, 8);
}

export async function broadcastDrop(input: BroadcastInput): Promise<{ thread: string[]; farcaster: string; farcasterThread?: string[] }> {
  const generated = await generateSocialCopy({
    drop: input.drop,
    trend: input.trend,
    skills: input.skills,
    context: input.context
  });
  const thread = generated?.thread && generated.thread.length > 0
    ? generated.thread
    : buildThread(input.drop, input.trend);
  const farcasterThread = generated?.farcasterThread && generated.farcasterThread.length > 0
    ? normalizeFarcasterThread(generated.farcasterThread)
    : normalizeFarcasterThread(thread);
  const farcaster = farcasterThread[0] || thread[0];

  await Promise.all([
    postTwitterThread(input.baseDir, thread).catch(async (error) => {
      const message = error instanceof Error ? error.message : String(error);
      await log(input.baseDir, 'warn', `Twitter broadcast failed: ${message}`);
    }),
    postFarcasterThread(input.baseDir, farcasterThread).catch(async (error) => {
      const message = error instanceof Error ? error.message : String(error);
      await log(input.baseDir, 'warn', `Farcaster broadcast failed: ${message}`);
    })
  ]);

  return { thread, farcaster, farcasterThread };
}

async function postTwitterThread(baseDir: string, thread: string[]) {
  const apiKey = process.env.TWITTER_API_KEY;
  const apiSecret = process.env.TWITTER_API_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.TWITTER_ACCESS_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    await log(baseDir, 'warn', 'Twitter credentials missing, skipping broadcast.');
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

  await log(baseDir, 'info', 'Twitter thread published.');
}

async function postFarcasterThread(baseDir: string, thread: string[]) {
  const apiKey = process.env.NEYNAR_API_KEY;
  const signer = process.env.NEYNAR_SIGNER_UUID;
  if (!apiKey || !signer) {
    await log(baseDir, 'warn', 'Farcaster credentials missing, skipping broadcast.');
    return;
  }

  if (!thread.length) {
    await log(baseDir, 'warn', 'Farcaster broadcast skipped: empty thread.');
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
      await log(baseDir, 'warn', `Farcaster broadcast failed: ${error}`);
      return;
    }

    const data = await res.json().catch(() => null) as {
      cast?: { hash?: string; author?: { fid?: number } };
    } | null;

    const castHash = data?.cast?.hash;
    const castFid = data?.cast?.author?.fid;
    if (!castHash || !castFid) {
      await log(baseDir, 'warn', 'Farcaster broadcast failed: missing cast hash or fid.');
      return;
    }

    parentHash = castHash;
    parentFid = castFid;
  }

  await log(baseDir, 'info', 'Farcaster thread published.');
}
