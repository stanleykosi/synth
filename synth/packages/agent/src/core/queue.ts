import { loadState } from './memory.js';
import { log } from './logger.js';
import { memoryPaths, readJson, writeJson } from './memory.js';
import type { AgentState } from './types.js';
import { runDailyCycle, runSignalDetection } from './pipeline.js';

export type QueueItemType = 'run' | 'detect';

export interface QueueItem {
  id: string;
  type: QueueItemType;
  requestedAt: string;
  requestedBy: 'admin' | 'scheduler' | 'api' | 'system';
  reason?: string;
  force?: boolean;
  source?: string;
  priority: number;
}

interface QueueState {
  items: QueueItem[];
  active?: {
    id: string;
    type?: QueueItemType;
    startedAt: string;
  };
}

let isProcessing = false;
let retryTimer: NodeJS.Timeout | null = null;

function nowIso() {
  return new Date().toISOString();
}

function queuePath(baseDir: string) {
  return memoryPaths(baseDir).queueJson;
}

async function loadQueue(baseDir: string): Promise<QueueState> {
  return readJson(queuePath(baseDir), { items: [] } as QueueState);
}

async function saveQueue(baseDir: string, state: QueueState) {
  await writeJson(queuePath(baseDir), state);
}

function shouldSkipEnqueue(queue: QueueState, item: QueueItem): boolean {
  if (item.force) return false;
  if (item.type === 'run') {
    return queue.items.some((entry) => entry.type === 'run');
  }
  if (item.type === 'detect') {
    return queue.items.some((entry) => entry.type === 'detect');
  }
  return false;
}

export async function enqueueRun(baseDir: string, input: {
  requestedBy: QueueItem['requestedBy'];
  reason?: string;
  force?: boolean;
  source?: string;
  priority?: number;
}): Promise<QueueItem> {
  const queue = await loadQueue(baseDir);
  const item: QueueItem = {
    id: `run-${Date.now()}`,
    type: 'run',
    requestedAt: nowIso(),
    requestedBy: input.requestedBy,
    reason: input.reason,
    force: Boolean(input.force),
    source: input.source,
    priority: input.priority ?? (input.force ? 10 : 5)
  };

  if (shouldSkipEnqueue(queue, item)) {
    await log(baseDir, 'info', 'Queue already has a pending run. Skipping enqueue.');
    return item;
  }

  queue.items.push(item);
  queue.items.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime();
  });
  await saveQueue(baseDir, queue);
  await processQueue(baseDir);
  return item;
}

export async function enqueueDetection(baseDir: string, input: {
  requestedBy: QueueItem['requestedBy'];
  reason?: string;
  force?: boolean;
  source?: string;
  priority?: number;
}): Promise<QueueItem> {
  const queue = await loadQueue(baseDir);
  const item: QueueItem = {
    id: `detect-${Date.now()}`,
    type: 'detect',
    requestedAt: nowIso(),
    requestedBy: input.requestedBy,
    reason: input.reason,
    force: Boolean(input.force),
    source: input.source,
    priority: input.priority ?? (input.force ? 8 : 4)
  };

  if (shouldSkipEnqueue(queue, item)) {
    await log(baseDir, 'info', 'Queue already has a pending detection. Skipping enqueue.');
    return item;
  }

  queue.items.push(item);
  queue.items.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime();
  });
  await saveQueue(baseDir, queue);
  await processQueue(baseDir);
  return item;
}

async function clearActiveIfIdle(baseDir: string, state: AgentState, queue: QueueState) {
  if (queue.active && state.currentPhase === 'idle') {
    queue.active = undefined;
    await saveQueue(baseDir, queue);
  }
}

function scheduleRetry(baseDir: string, delayMs = 30000) {
  if (retryTimer) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    processQueue(baseDir).catch(() => null);
  }, delayMs);
}

export async function processQueue(baseDir: string) {
  if (isProcessing) return;
  isProcessing = true;

  try {
    while (true) {
      const state = await loadState(baseDir);
      const queue = await loadQueue(baseDir);
      await clearActiveIfIdle(baseDir, state, queue);

      if (state.currentPhase !== 'idle') {
        scheduleRetry(baseDir);
        return;
      }

      const next = queue.items.shift();
      if (!next) {
        return;
      }

      queue.active = { id: next.id, type: next.type, startedAt: nowIso() };
      await saveQueue(baseDir, queue);

      await log(baseDir, 'info', `Queue starting ${next.type} ${next.id} (force=${Boolean(next.force)}).`);
      if (next.type === 'run') {
        await runDailyCycle(baseDir, {
          force: Boolean(next.force),
          runId: next.id,
          source: next.source,
          reason: next.reason
        });
      } else if (next.type === 'detect') {
        await runSignalDetection(baseDir, {
          runId: next.id,
          source: next.source,
          reason: next.reason
        });
      }

      const refreshed = await loadQueue(baseDir);
      refreshed.active = undefined;
      await saveQueue(baseDir, refreshed);
    }
  } finally {
    isProcessing = false;
  }
}

export async function clearQueue(baseDir: string) {
  await saveQueue(baseDir, { items: [], active: undefined });
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
}

export async function getQueueState(baseDir: string): Promise<QueueState> {
  return loadQueue(baseDir);
}
