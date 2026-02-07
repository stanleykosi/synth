import { memoryPaths, readJson, writeJson } from '../core/memory.js';
import { loadState } from '../core/memory.js';
import { log } from '../core/logger.js';
import { getQueueState } from '../core/queue.js';

interface MonitorConfig {
  enabled: boolean;
  intervalMs: number;
  staleRunHours: number;
  stuckPhaseMinutes: number;
  queueBacklogThreshold: number;
  alertCooldownMinutes: number;
}

interface MonitorState {
  lastAlerts: Record<string, string>;
}

function nowIso() {
  return new Date().toISOString();
}

function hoursSince(timestamp?: string): number | null {
  if (!timestamp) return null;
  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) return null;
  return (Date.now() - parsed) / 3_600_000;
}

function minutesSince(timestamp?: string): number | null {
  if (!timestamp) return null;
  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) return null;
  return (Date.now() - parsed) / 60_000;
}

function resolveConfig(): MonitorConfig {
  return {
    enabled: (process.env.SYNTH_MONITOR_ENABLED ?? 'true').toLowerCase() === 'true',
    intervalMs: Number(process.env.SYNTH_MONITOR_INTERVAL_MS ?? '300000'),
    staleRunHours: Number(process.env.SYNTH_MONITOR_STALE_HOURS ?? '36'),
    stuckPhaseMinutes: Number(process.env.SYNTH_MONITOR_STUCK_MINUTES ?? '120'),
    queueBacklogThreshold: Number(process.env.SYNTH_MONITOR_QUEUE_THRESHOLD ?? '3'),
    alertCooldownMinutes: Number(process.env.SYNTH_MONITOR_COOLDOWN_MINUTES ?? '60')
  };
}

async function loadMonitorState(baseDir: string): Promise<MonitorState> {
  const path = memoryPaths(baseDir).monitorJson;
  return readJson(path, { lastAlerts: {} } as MonitorState);
}

async function saveMonitorState(baseDir: string, state: MonitorState) {
  const path = memoryPaths(baseDir).monitorJson;
  await writeJson(path, state);
}

async function sendAlert(baseDir: string, key: string, message: string, payload: Record<string, unknown>) {
  const state = await loadMonitorState(baseDir);
  const cooldownMin = resolveConfig().alertCooldownMinutes;
  const last = state.lastAlerts[key];
  const since = minutesSince(last);
  if (since !== null && since < cooldownMin) {
    return;
  }

  state.lastAlerts[key] = nowIso();
  await saveMonitorState(baseDir, state);

  await log(baseDir, 'warn', `ALERT: ${message}`);

  const webhook = process.env.SYNTH_ALERT_WEBHOOK_URL;
  if (!webhook) return;

  try {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        key,
        timestamp: nowIso(),
        payload
      })
    });
  } catch {
    return;
  }
}

export function startMonitor(baseDir: string) {
  const config = resolveConfig();
  if (!config.enabled) return;

  const run = async () => {
    const state = await loadState(baseDir);
    const queue = await getQueueState(baseDir);

    const lastRunHours = hoursSince(state.lastRunAt);
    if (lastRunHours !== null && lastRunHours > config.staleRunHours && queue.items.length === 0) {
      await sendAlert(baseDir, 'stale-run', `No run in ${lastRunHours.toFixed(1)}h`, {
        lastRunAt: state.lastRunAt,
        currentPhase: state.currentPhase
      });
    }

    if (state.lastResult === 'failed') {
      await sendAlert(baseDir, 'last-run-failed', 'Last run failed', {
        lastRunAt: state.lastRunAt,
        lastError: state.lastError
      });
    }

    if (state.currentPhase !== 'idle') {
      const phaseMinutes = minutesSince(state.phaseStartedAt);
      if (phaseMinutes !== null && phaseMinutes > config.stuckPhaseMinutes) {
        await sendAlert(baseDir, 'stuck-phase', `Phase "${state.currentPhase}" running for ${phaseMinutes.toFixed(0)} minutes`, {
          currentPhase: state.currentPhase,
          phaseStartedAt: state.phaseStartedAt,
          runId: state.runId
        });
      }
    }

    if (queue.items.length >= config.queueBacklogThreshold) {
      await sendAlert(baseDir, 'queue-backlog', `Queue backlog: ${queue.items.length} pending runs`, {
        queueSize: queue.items.length
      });
    }
  };

  setInterval(() => {
    run().catch(() => null);
  }, config.intervalMs);

  run().catch(() => null);
}
