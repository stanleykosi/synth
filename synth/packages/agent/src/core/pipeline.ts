import path from 'path';
import fs from 'fs/promises';
import { loadConfig } from './config.js';
import { finalizeScores } from './scoring.js';
import { loadDrops, loadState, saveDrops, saveState, appendMarkdown, memoryPaths, saveTrends, loadDecisions, saveDecisions } from './memory.js';
import { log } from './logger.js';
import type { DropRecord, TrendSignal, DropType } from './types.js';
import { fetchTwitterSignals } from '../sources/twitter.js';
import { fetchWebSignals } from '../sources/web.js';
import { fetchFarcasterSignals } from '../sources/farcaster.js';
import { fetchDiscordSignals } from '../sources/discord.js';
import { fetchOnchainSignals } from '../sources/onchain.js';
import { fetchSuggestionSignals } from '../sources/suggestions.js';
import { fetchGraphSignals } from '../sources/graph.js';
import { runForge, parseDeployedAddress, readBroadcastGasInfo } from '../services/foundry.js';
import { ensureRepo, updateRepoDescription } from '../services/github.js';
import { prepareRepoTemplate, initAndPushRepo } from '../services/repo.js';
import { createVercelProject } from '../services/vercel.js';
import { broadcastDrop } from '../services/broadcast.js';
import { buildEvidence } from '../services/research.js';
import { generateDecision } from '../services/llm.js';
import { buildSkillsContext } from '../services/skills.js';
import { validateTrends } from '../services/validation.js';
import { buildAgentContext } from '../services/context.js';
import { generateDropContent } from '../services/content.js';

function nowIso() {
  return new Date().toISOString();
}

function pickDropType(signal: TrendSignal): DropType {
  const text = signal.summary.toLowerCase();
  if (
    text.includes('webapp') ||
    text.includes('web app') ||
    text.includes('dashboard') ||
    text.includes('analytics') ||
    text.includes('tracker') ||
    text.includes('explorer') ||
    text.includes('frontend') ||
    text.includes('site')
  ) {
    return 'dapp';
  }
  if (signal.source === 'suggestion' && !text.includes('nft') && !text.includes('mint')) {
    return 'dapp';
  }
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

function buildFallbackDecision(signal: TrendSignal, evidence: Record<string, unknown> | undefined) {
  const name = generateDropName(signal);
  return {
    id: `decision-${Date.now()}`,
    createdAt: nowIso(),
    trendId: signal.id,
    go: true,
    dropType: pickDropType(signal),
    name,
    symbol: generateSymbol(name),
    description: `Built from signal: ${signal.summary}`,
    tagline: 'From noise to signal.',
    hero: `Built from signal: ${signal.summary}`,
    cta: 'Explore the drop',
    features: ['Onchain-native', 'Open source', 'Shipped by SYNTH'],
    rationale: 'Fallback decision generated because no LLM decision was available.',
    confidence: 0.5,
    evidence: Array.isArray(evidence) ? evidence : []
  };
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
  if (state.currentPhase !== 'idle') {
    await log(baseDir, 'warn', `Agent is already running (${state.currentPhase}). Skipping overlapping cycle.`);
    return;
  }

  try {
    currentState = { ...currentState, currentPhase: 'signal-detection' };
    await saveState(baseDir, currentState);

    const [twitter, web, farcaster, discord, onchain, graph, suggestions] = await Promise.all([
      fetchTwitterSignals(config),
      fetchWebSignals(config),
      fetchFarcasterSignals(config),
      fetchDiscordSignals(config),
      fetchOnchainSignals(config),
      fetchGraphSignals(config),
      fetchSuggestionSignals(config)
    ]);

    const signals = finalizeScores([
      ...twitter,
      ...web,
      ...farcaster,
      ...discord,
      ...onchain,
      ...graph,
      ...suggestions
    ]);

    const suggestionSignals = signals.filter((signal) => signal.source === 'suggestion');
    const otherSignals = signals.filter((signal) => signal.source !== 'suggestion');

    const maxSignals = Math.max(1, config.pipeline.maxSignals);
    const cap = Math.max(1, maxSignals - suggestionSignals.length);

    const deduped: TrendSignal[] = [];
    const seen = new Set<string>();

    for (const signal of otherSignals) {
      const key = signal.summary.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(signal);
      if (deduped.length >= cap) break;
    }

    for (const signal of suggestionSignals) {
      const key = signal.summary.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(signal);
    }

    const evidenceMap = await buildEvidence(deduped, config);
    const validations = await validateTrends({ signals: deduped, evidence: evidenceMap, config });

    const enriched = deduped.map((signal) => {
      const validation = validations[signal.id];
      const validationBoost = validation ? validation.composite * config.validation.weight : 0;
      return {
        ...signal,
        score: signal.score + validationBoost,
        meta: {
          ...(signal.meta ?? {}),
          evidence: evidenceMap[signal.id] ?? [],
          validation
        }
      };
    });
    

    const ranked = [...enriched].sort((a, b) => b.score - a.score);

    await saveTrends(baseDir, ranked);
    await appendMarkdown(memoryPaths(baseDir).trendsMd, `- ${nowIso()} captured ${ranked.length} signals`);

    const agentContext = await buildAgentContext(baseDir);
    const skills = await buildSkillsContext(baseDir);
    const decision = await generateDecision({
      signals: ranked,
      evidence: evidenceMap,
      config,
      skills,
      context: agentContext
    });

    if (decision) {
      await log(baseDir, 'info', `Decision: ${decision.name} (${decision.dropType}) confidence ${decision.confidence}`);
    }

    const overrideId = state.overrideSignalId;
    const preferredId = decision?.trendId;
    const defaultSignal = ranked[0];
    let topSignal = overrideId
      ? ranked.find((signal) => signal.id === overrideId) ?? defaultSignal
      : preferredId
        ? ranked.find((signal) => signal.id === preferredId) ?? defaultSignal
        : defaultSignal;

    const bestSuggestion = ranked.find((signal) => signal.source === 'suggestion');
    const suggestionFallback = Boolean(
      !overrideId &&
      bestSuggestion &&
      topSignal &&
      topSignal.score < config.decision.minScore
    );

    if (suggestionFallback) {
      await log(baseDir, 'info', `Suggestion fallback active. Using ${bestSuggestion?.id}.`);
      topSignal = bestSuggestion ?? topSignal;
    }

    const effectiveDecision = suggestionFallback ? null : decision;

    if (effectiveDecision && (!effectiveDecision.go || effectiveDecision.confidence < config.decision.minConfidence)) {
      await log(baseDir, 'info', `Decision opted out (confidence ${effectiveDecision.confidence}).`);
      currentState = { ...currentState, currentPhase: 'idle', lastRunAt: nowIso(), lastResult: 'skipped' };
      await saveState(baseDir, currentState);
      return;
    }
    if (!topSignal) {
      await log(baseDir, 'warn', 'No signals found.');
      currentState = { ...currentState, currentPhase: 'idle', lastRunAt: nowIso(), lastResult: 'skipped' };
      await saveState(baseDir, currentState);
      return;
    }

    currentState = overrideId ? { ...currentState, overrideSignalId: undefined } : currentState;
    currentState = { ...currentState, currentPhase: 'decision' };
    await saveState(baseDir, currentState);
    if (!suggestionFallback && topSignal && topSignal.score < config.decision.minScore) {
      await log(baseDir, 'info', `Top signal score ${topSignal.score} below threshold ${config.decision.minScore}.`);
      currentState = { ...currentState, currentPhase: 'idle', lastRunAt: nowIso(), lastResult: 'skipped' };
      await saveState(baseDir, currentState);
      return;
    }

    const fallbackDecision = effectiveDecision ?? buildFallbackDecision(topSignal, evidenceMap[topSignal.id]);
    const decisions = await loadDecisions(baseDir);
    decisions.unshift(fallbackDecision);
    await saveDecisions(baseDir, decisions.slice(0, 50));

    const dropType = fallbackDecision.dropType ?? pickDropType(topSignal);
    const dropName = fallbackDecision.name ?? generateDropName(topSignal);
    const description = fallbackDecision.description ?? `Built from signal: ${topSignal.summary}`;
    const tagline = fallbackDecision.tagline ?? 'From noise to signal.';
    const hero = fallbackDecision.hero ?? description;
    const cta = fallbackDecision.cta ?? 'Explore the drop';
    const features = fallbackDecision.features ?? ['Onchain-native', 'Open source', 'Shipped by SYNTH'];
    const symbol = fallbackDecision.symbol ?? generateSymbol(dropName);

    const rationaleSnippet = fallbackDecision.rationale ? ` — ${fallbackDecision.rationale.slice(0, 180)}` : '';
    const rationale = fallbackDecision.rationale ?? 'SYNTH selected this drop based on the top scored signal.';
    await appendMarkdown(memoryPaths(baseDir).dropsMd, `- ${nowIso()} decision: ${dropType} for "${dropName}"${rationaleSnippet}`);

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
      TOKEN_SYMBOL: symbol,
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
    let gasInfo = await readBroadcastGasInfo({
      contractsDir: path.join(baseDir, '..', 'contracts'),
      scriptName: scriptName,
      chainId: '84532'
    });

    let mainnetAddress = sepoliaAddress;
    let mainnetSucceeded = false;
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
        mainnetSucceeded = true;
        await log(baseDir, 'info', `Mainnet deployment success: ${mainnetAddress}`);
        gasInfo = await readBroadcastGasInfo({
          contractsDir: path.join(baseDir, '..', 'contracts'),
          scriptName: scriptName,
          chainId: '8453'
        });
      }
    }

    const repoName = sanitizeRepoName(`${Date.now()}-${dropName}`);
    const repo = await ensureRepo({ name: repoName, description });
    const token = process.env.GITHUB_TOKEN ?? '';
    const repoOwner = process.env.GITHUB_ORG ?? parseRepoOwner(repo.htmlUrl);

    let vercelProjectUrl: string | undefined;
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

    const isMainnet = mainnetSucceeded;
    const explorerUrl = isMainnet
      ? `https://basescan.org/address/${mainnetAddress}`
      : `https://sepolia.basescan.org/address/${mainnetAddress}`;

    const rpcUrl = isMainnet
      ? (process.env.BASE_RPC ?? 'https://mainnet.base.org')
      : (process.env.BASE_SEPOLIA_RPC ?? 'https://sepolia.base.org');
    const chainId = isMainnet ? '8453' : '84532';

    const dropSkillNames = dropType === 'dapp'
      ? ['web-builder', 'contract-synth']
      : dropType === 'token'
        ? ['token-builder', 'contract-synth']
        : dropType === 'nft'
          ? ['nft-builder', 'contract-synth']
          : ['contract-synth'];
    const contentSkills = await buildSkillsContext(baseDir, { include: dropSkillNames });
    const socialSkills = await buildSkillsContext(baseDir, { include: ['social-broadcast', ...dropSkillNames] });

    const content = await generateDropContent({
      dropType,
      dropName,
      symbol,
      tagline,
      description,
      hero,
      cta,
      features,
      rationale,
      trend: topSignal,
      network: isMainnet ? 'Base Mainnet' : 'Base Sepolia',
      chain: 'Base',
      chainId,
      contractAddress: mainnetAddress,
      explorerUrl,
      repoUrl: repo.htmlUrl,
      webappUrl: vercelProjectUrl,
      skills: contentSkills,
      context: agentContext
    });

    const repoAbout = content?.about ?? description;

    const tempDir = await prepareRepoTemplate({
      baseDir,
      repoName,
      dropName,
      description,
      tagline,
      hero,
      cta,
      features,
      symbol,
      dropType,
      rationale,
      contractAddress: mainnetAddress,
      chain: 'Base',
      network: isMainnet ? 'Base Mainnet' : 'Base Sepolia',
      explorerUrl,
      rpcUrl,
      chainId,
      about: repoAbout,
      repoUrl: repo.htmlUrl,
      webappUrl: vercelProjectUrl
    });

    if (content?.readme) {
      await fs.writeFile(path.join(tempDir, 'README.md'), `${content.readme.trim()}\n`);
    }

    await initAndPushRepo(tempDir, repo.cloneUrl, token, content?.commitMessage);

    if (repoOwner && repoAbout) {
      await updateRepoDescription({
        owner: repoOwner,
        repo: repo.name,
        description: repoAbout
      });
    }

    const dropRecord: DropRecord = {
      id: `${Date.now()}`,
      name: dropName,
      description,
      type: dropType,
      contractAddress: mainnetAddress,
      githubUrl: repo.htmlUrl,
      webappUrl: vercelProjectUrl,
      explorerUrl,
      network: isMainnet ? 'Base Mainnet' : 'Base Sepolia',
      deployedAt: nowIso(),
      trend: topSignal.summary,
      trendSource: topSignal.source,
      trendScore: topSignal.score,
      txHash: gasInfo.txHash,
      gasUsed: gasInfo.gasUsed,
      gasPrice: gasInfo.gasPrice,
      gasCostEth: gasInfo.gasCostEth,
      status: isMainnet ? 'mainnet' : 'testnet'
    };

    const drops = await loadDrops(baseDir);
    drops.unshift(dropRecord);
    await saveDrops(baseDir, drops);

    await broadcastDrop({
      baseDir,
      drop: dropRecord,
      trend: topSignal,
      skills: socialSkills,
      context: agentContext
    });

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
