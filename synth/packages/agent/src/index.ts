import { resolveAgentBase } from './utils/paths.js';
import { loadEnvironment } from './utils/env.js';
import { loadConfig } from './core/config.js';
import { startServer } from './services/server.js';
import { startScheduler } from './services/scheduler.js';
import { runDailyCycle } from './core/pipeline.js';
import { log } from './core/logger.js';

const baseDir = resolveAgentBase();
loadEnvironment(baseDir);

const args = process.argv.slice(2);
const modeArg = args.find((arg) => arg.startsWith('--mode='));
const mode = modeArg ? modeArg.split('=')[1] : 'server';

const config = await loadConfig(baseDir);

if (mode === 'cycle') {
  await log(baseDir, 'info', 'Running one-off SYNTH cycle.');
  await runDailyCycle(baseDir);
} else {
  startServer(baseDir, config);
  const enableScheduler = process.env.SYNTH_ENABLE_SCHEDULER === 'true';
  if (enableScheduler) {
    startScheduler(baseDir, config);
  } else {
    await log(baseDir, 'info', 'Scheduler disabled. Set SYNTH_ENABLE_SCHEDULER=true to enable.');
  }
}
