import { Client, GatewayIntentBits } from 'discord.js';
import type { TrendSignal } from '../core/types.js';
import type { AgentConfig } from '../core/config.js';
import { scoreSignal } from '../core/scoring.js';

export async function fetchDiscordSignals(config: AgentConfig): Promise<TrendSignal[]> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token || config.discord.channelIds.length === 0) {
    return [];
  }

  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
  });

  await client.login(token);

  const signals: TrendSignal[] = [];
  for (const channelId of config.discord.channelIds) {
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      continue;
    }

    const messages = await channel.messages.fetch({ limit: config.discord.limit });
    messages.forEach((message) => {
      if (message.author?.bot) return;
      const engagement = (message.reactions?.cache.size ?? 0) + (message.interaction ? 2 : 0);
      signals.push({
        id: `discord-${message.id}`,
        source: 'discord',
        summary: message.content.slice(0, 240),
        score: scoreSignal('discord', engagement, config),
        capturedAt: message.createdAt.toISOString(),
        url: message.url,
        engagement,
        meta: { channelId: channelId }
      });
    });
  }

  await client.destroy();

  return signals;
}
