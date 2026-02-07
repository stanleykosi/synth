import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import rateLimit from 'express-rate-limit';
import type { AgentConfig } from '../core/config.js';
import { loadDrops, loadLogs, loadState, loadTrends, saveState, saveDrops, loadDecisions, loadChat, saveChat, saveLogs, saveTrends, saveDecisions, memoryPaths, saveTrendPool, saveTrendPosts } from '../core/memory.js';
import { buildMetrics } from '../core/metrics.js';
import { getSuggestionCount, getWalletStatus } from './chain.js';
import { fetchGithubStarsTotal, fetchGithubRateLimit } from './github.js';
import { enqueueRun, enqueueDetection, clearQueue, getQueueState } from '../core/queue.js';
import { clearArtifacts } from './artifacts.js';
import { log } from '../core/logger.js';
import type { DropRecord } from '../core/types.js';
import { runChat } from './chat.js';
import { runTrendPost } from './trend-post.js';

interface SkillRecord {
  name: string;
  path: string;
  content: string;
  updatedAt: string;
}

function requireAdmin(req: express.Request): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  const header = req.headers['x-admin-secret'];
  if (typeof header !== 'string') return false;
  return header === secret;
}

function resolveSkillsDir(baseDir: string) {
  return path.join(baseDir, 'skills');
}

async function loadSkills(baseDir: string): Promise<SkillRecord[]> {
  const skillsDir = resolveSkillsDir(baseDir);
  const entries = await fs.readdir(skillsDir, { withFileTypes: true }).catch(() => []);
  const skills: SkillRecord[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillPath = path.join(skillsDir, entry.name, 'SKILL.md');
    try {
      const content = await fs.readFile(skillPath, 'utf-8');
      const stat = await fs.stat(skillPath);
      skills.push({
        name: entry.name,
        path: skillPath,
        content,
        updatedAt: stat.mtime.toISOString()
      });
    } catch {
      continue;
    }
  }
  return skills;
}

async function saveSkill(baseDir: string, name: string, content: string) {
  const safeName = name.replace(/[^a-z0-9-]/gi, '').toLowerCase();
  if (!safeName) {
    throw new Error('Invalid skill name');
  }
  const skillDir = path.join(resolveSkillsDir(baseDir), safeName);
  await fs.mkdir(skillDir, { recursive: true });
  const skillPath = path.join(skillDir, 'SKILL.md');
  await fs.writeFile(skillPath, content.trim() + '\n');

  const workspaceDir = process.env.OPENCLAW_WORKSPACE_DIR || process.env.SYNTH_OPENCLAW_WORKSPACE;
  if (workspaceDir) {
    const targetDir = path.join(workspaceDir, 'skills', safeName);
    await fs.mkdir(targetDir, { recursive: true });
    await fs.writeFile(path.join(targetDir, 'SKILL.md'), content.trim() + '\n');
  }
}

export function startServer(baseDir: string, config: AgentConfig) {
  const app = express();
  app.set('trust proxy', 1);
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
    if (!payload.name || !payload.description || !payload.type || !payload.githubUrl) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const drops = await loadDrops(baseDir);
    const record: DropRecord = {
      id: `${Date.now()}`,
      name: payload.name,
      description: payload.description,
      type: payload.type,
      contractAddress: payload.contractAddress ?? '',
      contractType: payload.contractType,
      appMode: payload.appMode,
      builder: payload.builder,
      githubUrl: payload.githubUrl,
      webappUrl: payload.webappUrl,
      explorerUrl: payload.explorerUrl,
      network: payload.network,
      deployedAt: payload.deployedAt ?? new Date().toISOString(),
      trend: payload.trend ?? 'manual',
      trendSource: payload.trendSource,
      trendScore: payload.trendScore,
      trendEngagement: payload.trendEngagement,
      txHash: payload.txHash,
      gasUsed: payload.gasUsed,
      gasPrice: payload.gasPrice,
      gasCostEth: payload.gasCostEth,
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
    const githubStars = await fetchGithubStarsTotal(drops).catch(() => 0);
    const githubRate = await fetchGithubRateLimit();
    const metrics = buildMetrics(drops, suggestionsReceived, suggestionsBuilt, githubStars, {
      github: githubRate
    });
    res.json(metrics);
  });

  app.get('/api/logs', async (_req, res) => {
    const logs = await loadLogs(baseDir);
    res.json(logs);
  });

  app.get('/status', statusHandler);
  app.get('/api/status', statusHandler);

  app.get('/api/decisions', async (_req, res) => {
    const decisions = await loadDecisions(baseDir);
    res.json(decisions);
  });

  app.get('/api/queue', async (_req, res) => {
    const queue = await getQueueState(baseDir);
    res.json(queue);
  });

  app.get('/api/decision', async (_req, res) => {
    const decisions = await loadDecisions(baseDir);
    res.json(decisions[0] ?? null);
  });

  app.get('/api/chat', async (_req, res) => {
    const chat = await loadChat(baseDir);
    res.json(chat);
  });

  app.post('/api/chat', async (req, res) => {
    if (!requireAdmin(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { message } = req.body as { message?: string };
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Missing message' });
    }

    const history = await loadChat(baseDir);
    const userEntry = {
      id: `chat-${Date.now()}`,
      role: 'user' as const,
      content: message.trim(),
      createdAt: new Date().toISOString()
    };
    history.push(userEntry);
    let reply = 'Unable to generate a response right now.';
    try {
      reply = await runChat(baseDir, message.trim(), history);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Chat error';
      await log(baseDir, 'error', message);
    }
    const assistantEntry = {
      id: `chat-${Date.now() + 1}`,
      role: 'assistant' as const,
      content: reply,
      createdAt: new Date().toISOString()
    };
    history.push(assistantEntry);
    await saveChat(baseDir, history.slice(-50));
    res.json({ reply, history: history.slice(-50) });
  });

  app.get('/api/skills', async (_req, res) => {
    const skills = await loadSkills(baseDir);
    res.json(skills);
  });

  app.post('/api/skills', async (req, res) => {
    if (!requireAdmin(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { name, content } = req.body as { name?: string; content?: string };
    if (!name || !content) {
      return res.status(400).json({ error: 'Missing name or content' });
    }
    await saveSkill(baseDir, name, content);
    const skills = await loadSkills(baseDir);
    res.json(skills);
  });

  app.post('/api/control', async (req, res) => {
    if (!requireAdmin(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { action, signalId, force } = req.body as { action?: string; signalId?: string; force?: boolean };
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
      await enqueueRun(baseDir, {
        requestedBy: 'admin',
        reason: 'Manual admin run',
        force: Boolean(force),
        source: 'admin'
      });
      const updated = await loadState(baseDir);
      return res.json(updated);
    }

    if (action === 'detect') {
      await enqueueDetection(baseDir, {
        requestedBy: 'admin',
        reason: 'Manual signal detection',
        force: Boolean(force),
        source: 'admin'
      });
      const updated = await loadState(baseDir);
      return res.json(updated);
    }

    if (action === 'trend-post') {
      await runTrendPost(baseDir);
      await log(baseDir, 'info', 'Manual trend post triggered via admin.');
      return res.json({ ok: true });
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

    if (action === 'unlock') {
      const next = {
        ...state,
        currentPhase: 'idle',
        lastResult: 'skipped',
        lastError: null
      };
      await saveState(baseDir, next);
      await clearQueue(baseDir);
      await log(baseDir, 'info', 'Run lock cleared via admin.');
      return res.json(next);
    }

    if (action === 'clear-queue') {
      await clearQueue(baseDir);
      await log(baseDir, 'info', 'Queue cleared via admin.');
      return res.json({ ok: true });
    }

    if (action === 'clear-drops') {
      await saveDrops(baseDir, []);
      await log(baseDir, 'info', 'Drops cleared via admin.');
      return res.json({ ok: true });
    }

    if (action === 'clear-trends') {
      await saveTrends(baseDir, []);
      await saveTrendPool(baseDir, []);
      await saveTrendPosts(baseDir, []);
      const { trendsMd } = memoryPaths(baseDir);
      await fs.mkdir(path.dirname(trendsMd), { recursive: true });
      await fs.writeFile(trendsMd, '');
      await log(baseDir, 'info', 'Trends cleared via admin.');
      return res.json({ ok: true });
    }

    if (action === 'clear-chat') {
      await saveChat(baseDir, []);
      await log(baseDir, 'info', 'Chat history cleared via admin.');
      return res.json({ ok: true });
    }

    if (action === 'reset-memory') {
      await Promise.all([
        saveDrops(baseDir, []),
        saveTrends(baseDir, []),
        saveTrendPool(baseDir, []),
        saveTrendPosts(baseDir, []),
        saveDecisions(baseDir, []),
        saveLogs(baseDir, []),
        saveChat(baseDir, []),
        clearQueue(baseDir),
        clearArtifacts(baseDir)
      ]);
      const next = { ...state, currentPhase: 'idle', lastResult: 'skipped', lastError: null };
      await saveState(baseDir, next);
      await log(baseDir, 'info', 'Memory reset via admin.');
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
