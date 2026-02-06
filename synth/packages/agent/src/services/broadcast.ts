import { TwitterApi } from 'twitter-api-v2';
import { Client, GatewayIntentBits } from 'discord.js';
import type { DropRecord, TrendSignal } from '../core/types.js';
import { log } from '../core/logger.js';
import { generateSocialCopy } from './social.js';

interface BroadcastInput {
  baseDir: string;
  drop: DropRecord;
  trend: TrendSignal;
}

function buildThread(drop: DropRecord, trend: TrendSignal): string[] {
  const explorer = drop.explorerUrl ?? `https://basescan.org/address/${drop.contractAddress}`;
  return [
    `SYNTH drop: ${drop.name}\n\nSignal: ${trend.summary}`,
    `What shipped: ${drop.description}`,
    `Contract: ${drop.contractAddress}\nExplorer: ${explorer}`,
    `Repo: ${drop.githubUrl}`,
    drop.webappUrl ? `Web: ${drop.webappUrl}` : 'Web: not applicable',
    'Share feedback or submit a new suggestion in the SYNTH dashboard.'
  ];
}

export async function broadcastDrop(input: BroadcastInput) {
  const generated = await generateSocialCopy({ drop: input.drop, trend: input.trend });
  const thread = generated?.thread && generated.thread.length > 0
    ? generated.thread
    : buildThread(input.drop, input.trend);
  const farcaster = generated?.farcaster || thread[0];

  await Promise.all([
    postTwitterThread(input.baseDir, thread),
    postFarcaster(input.baseDir, farcaster),
    postDiscord(input.baseDir, input.drop, thread[0])
  ]);
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

async function postFarcaster(baseDir: string, text: string) {
  const apiKey = process.env.NEYNAR_API_KEY;
  const signer = process.env.NEYNAR_SIGNER_UUID;
  if (!apiKey || !signer) {
    await log(baseDir, 'warn', 'Farcaster credentials missing, skipping broadcast.');
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
    await log(baseDir, 'warn', `Farcaster broadcast failed: ${error}`);
    return;
  }

  await log(baseDir, 'info', 'Farcaster cast published.');
}

async function postDiscord(baseDir: string, drop: DropRecord, text: string) {
  const token = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.DISCORD_LAUNCH_CHANNEL_ID;

  if (!token || !channelId) {
    await log(baseDir, 'warn', 'Discord credentials missing, skipping broadcast.');
    return;
  }

  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
  });

  await client.login(token);
  const channel = await client.channels.fetch(channelId).catch(() => null);

  if (channel && channel.isTextBased()) {
    await channel.send({
      content: `${text}\nRepo: ${drop.githubUrl}\nContract: ${drop.contractAddress}`
    });
  }

  await client.destroy();
  await log(baseDir, 'info', 'Discord announcement published.');
}
