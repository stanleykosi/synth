import path from 'path';
import fs from 'fs/promises';
import { loadConfig } from './config.js';
import { finalizeScores } from './scoring.js';
import { loadDrops, loadState, saveDrops, saveState, appendMarkdown, memoryPaths, saveTrends } from './memory.js';
import { log } from './logger.js';
import type { DropRecord, TrendSignal, DropType } from './types.js';
import { fetchTwitterSignals } from '../sources/twitter.js';
import { fetchWebSignals } from '../sources/web.js';
import { fetchFarcasterSignals } from '../sources/farcaster.js';
import { fetchDiscordSignals } from '../sources/discord.js';
import { fetchOnchainSignals } from '../sources/onchain.js';
import { fetchSuggestionSignals } from '../sources/suggestions.js';
import { runForge, parseDeployedAddress } from '../services/foundry.js';
import { ensureRepo } from '../services/github.js';
import { prepareRepoTemplate, initAndPushRepo } from '../services/repo.js';
import { createVercelProject } from '../services/vercel.js';
import { broadcastDrop } from '../services/broadcast.js';

function nowIso() {
  return new Date().toISOString();
}

function pickDropType(signal: TrendSignal): DropType {
  const text = signal.summary.toLowerCase();
  if (text.includes('nft') || text.includes('mint')) return 'nft';
  if (text.includes('token') || text.includes('meme')) return 'token';
  if (text.includes('dapp') || text.includes('app')) return 'dapp';
  return 'contract';
}

function generateDropName(signal: TrendSignal): string {
  const words = signal.summary.replace(/[^a-zA-Z0-9 ]/g, '').split(' ').filter(Boolean);
  const core = words.slice(0, 3).join(' ');
  return core.length > 0 ? `SYNTH ${core}` : `SYNTH Drop ${new Date().toISOString().slice(0, 10)}`;
}

function generateSymbol(name: string): string {
  const letters = name.replace(/[^A-Za-z]/g, '').toUpperCase();
  return (letters.slice(0, 5) || 'SYNTH').slice(0, 5);
}

function sanitizeRepoName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);
}

function parseRepoOwner(htmlUrl: string): string | undefined {
  try {
    const url = new URL(htmlUrl);
    const [owner] = url.pathname.split('/').filter(Boolean);
    return owner;
  } catch {
    return undefined;
  }
}

async function deployWithForge(options: {
  baseDir: string;
  script: string;
  rpcUrl: string;
  env: NodeJS.ProcessEnv;
}) {
  const contractsDir = path.join(options.baseDir, '..', 'contracts');
  const result = await runForge([
    'script',
    options.script,
    '--rpc-url',
    options.rpcUrl,
    '--broadcast',
    '--verify'
  ], { cwd: contractsDir, env: options.env });

  return result;
}

async function runTests(baseDir: string): Promise<boolean> {
  const contractsDir = path.join(baseDir, '..', 'contracts');
  const result = await runForge(['test', '-vvv'], { cwd: contractsDir, env: process.env });
  if (!result.success) {
    await log(baseDir, 'error', `Forge tests failed: ${result.output.slice(0, 4000)}`);
  }
  return result.success;
}

async function ensureTemplateFiles(baseDir: string) {
  const { dropsMd, trendsMd } = memoryPaths(baseDir);
  await fs.mkdir(path.dirname(dropsMd), { recursive: true });
  await fs.mkdir(path.dirname(trendsMd), { recursive: true });
}

export async function runDailyCycle(baseDir: string) {
  await ensureTemplateFiles(baseDir);
  const config = await loadConfig(baseDir);
  const state = await loadState(baseDir);
  let currentState = state;
  if (state.paused) {
    await log(baseDir, 'warn', 'Agent is paused. Skipping cycle.');
    return;
  }

  try {
    currentState = { ...currentState, currentPhase: 'signal-detection' };
    await saveState(baseDir, currentState);

    const [twitter, web, farcaster, discord, onchain, suggestions] = await Promise.all([
      fetchTwitterSignals(config),
      fetchWebSignals(config),
      fetchFarcasterSignals(config),
      fetchDiscordSignals(config),
      fetchOnchainSignals(config),
      fetchSuggestionSignals(config)
    ]);

    const signals = finalizeScores([
      ...twitter,
      ...web,
      ...farcaster,
      ...discord,
      ...onchain,
      ...suggestions
    ]);

    const deduped: TrendSignal[] = [];
    const seen = new Set<string>();
    for (const signal of signals) {
      const key = signal.summary.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(signal);
      if (deduped.length >= config.pipeline.maxSignals) break;
    }

    await saveTrends(baseDir, deduped);
    await appendMarkdown(memoryPaths(baseDir).trendsMd, `- ${nowIso()} captured ${deduped.length} signals`);

    const overrideId = state.overrideSignalId;
    const topSignal = overrideId ? deduped.find((signal) => signal.id === overrideId) ?? deduped[0] : deduped[0];
    if (!topSignal) {
      await log(baseDir, 'warn', 'No signals found.');
      currentState = { ...currentState, currentPhase: 'idle', lastRunAt: nowIso(), lastResult: 'skipped' };
      await saveState(baseDir, currentState);
      return;
    }

    currentState = overrideId ? { ...currentState, overrideSignalId: undefined } : currentState;
    currentState = { ...currentState, currentPhase: 'decision' };
    await saveState(baseDir, currentState);
    const dropType = pickDropType(topSignal);
    const dropName = generateDropName(topSignal);
    const description = `Built from signal: ${topSignal.summary}`;

    await appendMarkdown(memoryPaths(baseDir).dropsMd, `- ${nowIso()} decision: ${dropType} for "${dropName}"`);

    currentState = { ...currentState, currentPhase: 'development' };
    await saveState(baseDir, currentState);

    const testsPass = await runTests(baseDir);
    if (!testsPass) {
      currentState = { ...currentState, currentPhase: 'idle', lastRunAt: nowIso(), lastResult: 'failed' };
      await saveState(baseDir, currentState);
      return;
    }

    const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;
    const sepoliaRpc = process.env.BASE_SEPOLIA_RPC;
    if (!deployerKey || !sepoliaRpc) {
      throw new Error('Missing DEPLOYER_PRIVATE_KEY or BASE_SEPOLIA_RPC');
    }

    const deployerAddress = process.env.DEPLOYER_ADDRESS;
    if (!deployerAddress) {
      throw new Error('Missing DEPLOYER_ADDRESS');
    }

    const tokenUri = process.env.TOKEN_URI;
    if (dropType === 'contract' && !tokenUri) {
      throw new Error('Missing TOKEN_URI for ERC1155 deployment');
    }

    const env: NodeJS.ProcessEnv = {
      DEPLOYER_PRIVATE_KEY: deployerKey,
      TOKEN_NAME: dropName,
      TOKEN_SYMBOL: generateSymbol(dropName),
      TOKEN_DECIMALS: '18',
      TOKEN_SUPPLY: '1000000',
      TOKEN_HOLDER: deployerAddress,
      TOKEN_URI: tokenUri ?? ''
    };

    let scriptName = 'script/DeployToken.s.sol:DeployToken';
    if (dropType === 'nft') {
      scriptName = 'script/DeployERC721.s.sol:DeployERC721';
    } else if (dropType === 'contract') {
      scriptName = 'script/DeployERC1155.s.sol:DeployERC1155';
    }

    const sepoliaResult = await deployWithForge({
      baseDir,
      script: scriptName,
      rpcUrl: sepoliaRpc,
      env
    });

    const sepoliaAddress = parseDeployedAddress(sepoliaResult.output);
    if (!sepoliaResult.success || !sepoliaAddress) {
      await log(baseDir, 'error', `Sepolia deployment failed: ${sepoliaResult.output.slice(0, 4000)}`);
      await saveState(baseDir, { ...state, currentPhase: 'idle', lastRunAt: nowIso(), lastResult: 'failed' });
      return;
    }

    await log(baseDir, 'info', `Sepolia deployment success: ${sepoliaAddress}`);

    let mainnetAddress = sepoliaAddress;
    if (config.pipeline.autoDeployMainnet && process.env.BASE_RPC) {
      const mainnetResult = await deployWithForge({
        baseDir,
        script: scriptName,
        rpcUrl: process.env.BASE_RPC,
        env
      });
      const addr = parseDeployedAddress(mainnetResult.output);
      if (!mainnetResult.success || !addr) {
        await log(baseDir, 'error', `Mainnet deployment failed: ${mainnetResult.output.slice(0, 4000)}`);
      } else {
        mainnetAddress = addr;
        await log(baseDir, 'info', `Mainnet deployment success: ${mainnetAddress}`);
      }
    }

    const repoName = sanitizeRepoName(`${dropName}-${Date.now()}`);
    const repo = await ensureRepo({ name: repoName, description });
    const token = process.env.GITHUB_TOKEN ?? '';
    const tempDir = await prepareRepoTemplate({
      baseDir,
      repoName,
      dropName,
      description,
      contractAddress: mainnetAddress,
      chain: 'Base'
    });
    await initAndPushRepo(tempDir, repo.cloneUrl, token);

    let vercelProjectUrl: string | undefined;
    const repoOwner = process.env.GITHUB_ORG ?? parseRepoOwner(repo.htmlUrl);
    if (repoOwner && process.env.VERCEL_TOKEN) {
      try {
        const vercelProject = await createVercelProject({
          name: repoName,
          repo: `${repoOwner}/${repoName}`
        });
        vercelProjectUrl = vercelProject.url;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await log(baseDir, 'error', message);
      }
    } else if (!repoOwner) {
      await log(baseDir, 'warn', 'Skipping Vercel project: unable to determine GitHub repo owner.');
    } else {
      await log(baseDir, 'warn', 'Skipping Vercel project: missing VERCEL_TOKEN.');
    }

    const dropRecord: DropRecord = {
      id: `${Date.now()}`,
      name: dropName,
      description,
      type: dropType,
      contractAddress: mainnetAddress,
      githubUrl: repo.htmlUrl,
      webappUrl: vercelProjectUrl,
      deployedAt: nowIso(),
      trend: topSignal.summary,
      status: config.pipeline.autoDeployMainnet ? 'mainnet' : 'testnet'
    };

    const drops = await loadDrops(baseDir);
    drops.unshift(dropRecord);
    await saveDrops(baseDir, drops);

    await broadcastDrop({ baseDir, drop: dropRecord, trend: topSignal });

    await appendMarkdown(memoryPaths(baseDir).dropsMd, `- ${nowIso()} deployed ${dropRecord.type} ${dropRecord.contractAddress}`);

    currentState = { ...currentState, currentPhase: 'idle', lastRunAt: nowIso(), lastResult: 'success' };
    await saveState(baseDir, currentState);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await log(baseDir, 'error', message);
    currentState = { ...currentState, currentPhase: 'idle', lastRunAt: nowIso(), lastResult: 'failed', lastError: message };
    await saveState(baseDir, currentState);
  }
}
