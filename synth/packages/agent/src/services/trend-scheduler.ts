import cron from 'node-cron';
import { log } from '../core/logger.js';
import { enqueueDetection } from '../core/queue.js';
import { runTrendPost } from './trend-post.js';

function resolveCron(value: string | undefined, fallback: string) {
  return value && value.trim().length > 0 ? value.trim() : fallback;
}

export function startTrendScheduler(baseDir: string) {
  const collectCron = resolveCron(process.env.SYNTH_TREND_COLLECT_CRON, '0 */1 * * *');
  const postCron = resolveCron(process.env.SYNTH_TREND_POST_CRON, '0 */3 * * *');

  cron.schedule(collectCron, async () => {
    await log(baseDir, 'info', 'Scheduled trend collection started.');
    await enqueueDetection(baseDir, {
      requestedBy: 'scheduler',
      reason: 'Scheduled trend collection',
      source: 'cron',
      force: false
    });
  }, { timezone: 'UTC' });

  cron.schedule(postCron, async () => {
    await log(baseDir, 'info', 'Scheduled trend post started.');
    await runTrendPost(baseDir);
  }, { timezone: 'UTC' });

  log(baseDir, `Trend scheduler enabled. Collect: ${collectCron} UTC. Post: ${postCron} UTC.`).catch(() => null);
}
