import cron from 'node-cron';
import type { AgentConfig } from '../core/config.js';
import { log } from '../core/logger.js';
import { enqueueRun } from '../core/queue.js';

export function startScheduler(baseDir: string, config: AgentConfig) {
  const hour = config.pipeline.dailyRunHourUTC;
  const schedule = `0 ${hour} * * *`;

  cron.schedule(schedule, async () => {
    await log(baseDir, 'info', 'Starting scheduled SYNTH cycle.');
    await enqueueRun(baseDir, {
      requestedBy: 'scheduler',
      reason: 'Scheduled daily run',
      force: false,
      source: 'cron'
    });
  }, { timezone: 'UTC' });

  log(baseDir, 'info', `Scheduler enabled at ${hour}:00 UTC.`).catch(() => null);
}
