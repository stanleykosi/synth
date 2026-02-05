import express from 'express';
import rateLimit from 'express-rate-limit';
import type { AgentConfig } from '../core/config.js';
import { loadDrops, loadLogs, loadState, loadTrends, saveState, saveDrops } from '../core/memory.js';
import { buildMetrics } from '../core/metrics.js';
import { getSuggestionCount, getWalletStatus } from './chain.js';
import { runDailyCycle } from '../core/pipeline.js';
import { log } from '../core/logger.js';
import type { DropRecord } from '../core/types.js';

function requireAdmin(req: express.Request): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  const header = req.headers['x-admin-secret'];
  if (typeof header !== 'string') return false;
  return header === secret;
}

export function startServer(baseDir: string, config: AgentConfig) {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN ?? '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-secret');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  app.use(rateLimit({
    windowMs: 60_000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false
  }));

  const healthHandler = (_req: express.Request, res: express.Response) => {
    res.json({ status: 'ok' });
  };

  const trendsHandler = async (_req: express.Request, res: express.Response) => {
    const trends = await loadTrends(baseDir);
    res.json(trends);
  };

  const dropsHandler = async (_req: express.Request, res: express.Response) => {
    const drops = await loadDrops(baseDir);
    res.json(drops);
  };

  const statusHandler = async (_req: express.Request, res: express.Response) => {
    const state = await loadState(baseDir);
    res.json(state);
  };

  app.get('/health', healthHandler);
  app.get('/api/health', healthHandler);

  app.get('/trends', trendsHandler);
  app.get('/api/trends', trendsHandler);

  app.get('/drops', dropsHandler);
  app.get('/api/drops', dropsHandler);

  app.post('/api/drops', async (req, res) => {
    if (!requireAdmin(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const payload = req.body as Partial<DropRecord>;
    if (!payload.name || !payload.description || !payload.type || !payload.contractAddress || !payload.githubUrl) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const drops = await loadDrops(baseDir);
    const record: DropRecord = {
      id: `${Date.now()}`,
      name: payload.name,
      description: payload.description,
      type: payload.type,
      contractAddress: payload.contractAddress,
      githubUrl: payload.githubUrl,
      webappUrl: payload.webappUrl,
      deployedAt: payload.deployedAt ?? new Date().toISOString(),
      trend: payload.trend ?? 'manual',
      status: payload.status ?? 'mainnet'
    };
    drops.unshift(record);
    await saveDrops(baseDir, drops);

    res.json(record);
  });

  app.get('/api/metrics', async (_req, res) => {
    const drops = await loadDrops(baseDir);
    const suggestionsReceived = await getSuggestionCount().catch(() => 0);
    const suggestionsBuilt = drops.filter((drop) => drop.status === 'mainnet').length;
    const metrics = buildMetrics(drops, suggestionsReceived, suggestionsBuilt);
    res.json(metrics);
  });

  app.get('/api/logs', async (_req, res) => {
    const logs = await loadLogs(baseDir);
    res.json(logs);
  });

  app.get('/status', statusHandler);
  app.get('/api/status', statusHandler);

  app.post('/api/control', async (req, res) => {
    if (!requireAdmin(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { action, signalId } = req.body as { action?: string; signalId?: string };
    const state = await loadState(baseDir);

    if (action === 'pause') {
      const next = { ...state, paused: true };
      await saveState(baseDir, next);
      await log(baseDir, 'info', 'Agent paused via admin.');
      return res.json(next);
    }

    if (action === 'resume') {
      const next = { ...state, paused: false };
      await saveState(baseDir, next);
      await log(baseDir, 'info', 'Agent resumed via admin.');
      return res.json(next);
    }

    if (action === 'run') {
      await runDailyCycle(baseDir);
      const updated = await loadState(baseDir);
      return res.json(updated);
    }

    if (action === 'override') {
      if (!signalId) {
        return res.status(400).json({ error: 'Missing signalId' });
      }
      const next = { ...state, overrideSignalId: signalId };
      await saveState(baseDir, next);
      await log(baseDir, 'info', `Override set to ${signalId}.`);
      return res.json(next);
    }

    return res.status(400).json({ error: 'Unknown action' });
  });

  app.get('/api/wallet', async (_req, res) => {
    try {
      const wallet = await getWalletStatus();
      res.json(wallet);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Wallet error';
      res.status(500).json({ error: message });
    }
  });

  const port = Number(process.env.SYNTH_AGENT_PORT ?? 8787);
  app.listen(port, () => {
    log(baseDir, 'info', `Agent API listening on ${port}.`).catch(() => null);
  });
}
