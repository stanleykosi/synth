import path from 'path';
import fs from 'fs/promises';
import { loadConfig } from './config.js';
import type { AgentConfig } from './config.js';
import { finalizeScores } from './scoring.js';
import { loadDrops, loadState, saveDrops, saveState, appendMarkdown, memoryPaths, saveTrends, loadDecisions, saveDecisions, loadTrends } from './memory.js';
import { log } from './logger.js';
import type { DropRecord, TrendSignal, DropType, ContractType, AppMode, AgentState, EvidenceItem } from './types.js';
import { fetchTwitterSignals } from '../sources/twitter.js';
import { fetchWebSignals } from '../sources/web.js';
import { fetchFarcasterSignals } from '../sources/farcaster.js';
import { fetchOnchainSignals } from '../sources/onchain.js';
import { fetchSuggestionSignals } from '../sources/suggestions.js';
import { fetchGraphSignals } from '../sources/graph.js';
import { runForge, parseDeployedAddress, readBroadcastGasInfo } from '../services/foundry.js';
import { ensureRepo, updateRepoDescription } from '../services/github.js';
import { prepareRepoTemplate, initAndPushRepo, commitAndPushChanges } from '../services/repo.js';
import { generateRepoFiles } from '../services/codegen.js';
import { createVercelProject, createVercelDeployment, getVercelDeployment } from '../services/vercel.js';
import { broadcastDrop } from '../services/broadcast.js';
import { buildEvidence } from '../services/research.js';
import { generateDecision } from '../services/llm.js';
import { buildSkillsContext } from '../services/skills.js';
import { validateTrends } from '../services/validation.js';
import { buildAgentContext } from '../services/context.js';
import { generateDropContent } from '../services/content.js';
import { markSuggestionReviewed } from '../services/chain.js';
import { saveArtifacts } from '../services/artifacts.js';
import { appendTrendPool, loadTrendPoolWindow, sortTrendEntries } from '../services/trend-pool.js';
import { applyRepairFiles, generateRepairFiles, listRepoFiles } from '../services/repair.js';

function nowIso() {
  return new Date().toISOString();
}

function cleanSignalSummary(text: string): string {
  return text
    .replace(/_/g, ' ')
    .replace(/\b0x[a-fA-F0-9]{6,}\b/g, '0x…')
    .replace(/\s+/g, ' ')
    .replace(/\s*UTC\b/gi, '')
    .trim()
    .slice(0, 180);
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
  if (
    text.includes('token launch') ||
    text.includes('new token') ||
    text.includes('airdrop') ||
    text.includes('memecoin') ||
    text.includes('meme token')
  ) {
    return 'token';
  }
  if (text.includes('dapp') || text.includes('app')) return 'dapp';
  return 'contract';
}

function deriveContractType(dropType: DropType): ContractType {
  if (dropType === 'token') return 'erc20';
  if (dropType === 'nft') return 'erc721';
  if (dropType === 'contract') return 'erc1155';
  return 'none';
}

function deriveAppMode(dropType: DropType, contractType: ContractType | undefined): AppMode {
  if (dropType !== 'dapp') return 'onchain';
  return contractType && contractType !== 'none' ? 'onchain' : 'offchain';
}

function generateDropName(signal: TrendSignal): string {
  const words = cleanSignalSummary(signal.summary).replace(/[^a-zA-Z0-9 ]/g, '').split(' ').filter(Boolean);
  const core = words.slice(0, 3).join(' ');
  return core.length > 0 ? `SYNTH ${core}` : `SYNTH Drop ${new Date().toISOString().slice(0, 10)}`;
}

function generateSymbol(name: string): string {
  const letters = name.replace(/[^A-Za-z]/g, '').toUpperCase();
  return (letters.slice(0, 5) || 'SYNTH').slice(0, 5);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ensureReadmeLinks(readme: string, links: { label: string; url: string }[]) {
  const cleanLinks = links.filter((link) => link.url && link.url.length > 0);
  if (cleanLinks.length === 0) return readme;

  const lines = cleanLinks.map((link) => `- ${link.label}: ${link.url}`);
  if (!readme.includes('## Links')) {
    return `${readme.trim()}\n\n## Links\n\n${lines.join('\n')}\n`;
  }

  const missing = lines.filter((line) => !readme.includes(line));
  if (missing.length === 0) return readme;
  return `${readme.trim()}\n${missing.join('\n')}\n`;
}

function applyRecencyBoost(signals: TrendSignal[], config: AgentConfig): TrendSignal[] {
  const now = Date.now();
  const windowHours = config.scoring.recencyWindowHours || 24;
  const boost = config.scoring.recencyBoost || 0;

  return signals.map((signal) => {
    const capturedAt = Date.parse(signal.capturedAt);
    if (Number.isNaN(capturedAt) || windowHours <= 0 || boost <= 0) {
      return signal;
    }
    const ageHours = Math.max(0, (now - capturedAt) / 3_600_000);
    const factor = Math.max(0, (windowHours - ageHours) / windowHours);
    const score = Math.min(10, signal.score + factor * boost);
    return {
      ...signal,
      score,
      meta: {
        ...(signal.meta ?? {}),
        recencyHours: Math.round(ageHours * 10) / 10
      }
    };
  });
}

function selectPrioritySuggestion(signals: TrendSignal[], stakeThreshold: number): TrendSignal | null {
  const suggestions = signals.filter((signal) => signal.source === 'suggestion');
  const eligible = suggestions
    .filter((signal) => typeof signal.meta?.stakeEth === 'number' && signal.meta?.stakeEth >= stakeThreshold)
    .sort((a, b) => (b.meta?.stakeEth as number) - (a.meta?.stakeEth as number));
  return eligible[0] ?? null;
}

function selectHighestStakeSuggestion(signals: TrendSignal[]): TrendSignal | null {
  const suggestions = signals
    .filter((signal) => signal.source === 'suggestion' && typeof signal.meta?.stakeEth === 'number')
    .sort((a, b) => (b.meta?.stakeEth as number) - (a.meta?.stakeEth as number));
  return suggestions[0] ?? null;
}

function parseSuggestionId(signal: TrendSignal): bigint | null {
  if (signal.source !== 'suggestion') return null;
  const raw = signal.id.replace('suggestion-', '').trim();
  if (!raw) return null;
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) return null;
  return BigInt(Math.floor(numeric));
}

async function buildMemoryContext(baseDir: string): Promise<string> {
  const [drops, decisions, trends] = await Promise.all([
    loadDrops(baseDir),
    loadDecisions(baseDir),
    loadTrends(baseDir)
  ]);

  const recentDrops = drops.slice(0, 3).map((drop) => (
    `${drop.name} (${drop.type}) ${drop.network ?? ''} ${drop.contractAddress ? drop.contractAddress.slice(0, 8) + '…' : ''}`.trim()
  ));
  const recentDecisions = decisions.slice(0, 3).map((decision) => (
    `${decision.name} (${decision.dropType}) confidence ${Math.round(decision.confidence * 100)}%`
  ));
  const recentTrends = trends.slice(0, 3).map((trend) => (
    `${trend.summary.slice(0, 120)} (${trend.source}, ${trend.score.toFixed(1)})`
  ));

  const sections: string[] = [];
  if (recentDrops.length > 0) {
    sections.push(`Recent drops: ${recentDrops.join(' | ')}`);
  }
  if (recentDecisions.length > 0) {
    sections.push(`Recent decisions: ${recentDecisions.join(' | ')}`);
  }
  if (recentTrends.length > 0) {
    sections.push(`Recent trends: ${recentTrends.join(' | ')}`);
  }

  return sections.join('\n');
}

function buildStakeOverrideDecision(signal: TrendSignal, reason: string) {
  const summary = cleanSignalSummary(signal.summary);
  const name = generateDropName(signal);
  const dropType = pickDropType(signal);
  const contractType = deriveContractType(dropType);
  const appMode = deriveAppMode(dropType, contractType);
  const defaultFeatures = appMode === 'offchain'
    ? ['Signal-driven', 'Open source', 'Shipped by SYNTH']
    : ['Onchain-native', 'Open source', 'Shipped by SYNTH'];
  return {
    id: `decision-${Date.now()}`,
    createdAt: nowIso(),
    trendId: signal.id,
    go: true,
    dropType,
    contractType,
    appMode,
    name,
    symbol: generateSymbol(name),
    description: summary.length > 0 ? summary : `Built from signal: ${signal.summary}`,
    tagline: 'From noise to signal.',
    hero: summary.length > 0 ? summary : `Built from signal: ${signal.summary}`,
    cta: 'Explore the drop',
    features: defaultFeatures,
    rationale: reason,
    confidence: 0.75,
    evidence: Array.isArray(signal.meta?.evidence) ? signal.meta?.evidence : []
  };
}

function buildFallbackDecision(signal: TrendSignal, evidence: Record<string, unknown> | undefined) {
  const summary = cleanSignalSummary(signal.summary);
  const name = generateDropName(signal);
  const dropType = pickDropType(signal);
  const contractType = deriveContractType(dropType);
  const appMode = deriveAppMode(dropType, contractType);
  const defaultFeatures = appMode === 'offchain'
    ? ['Signal-driven', 'Open source', 'Shipped by SYNTH']
    : ['Onchain-native', 'Open source', 'Shipped by SYNTH'];
  return {
    id: `decision-${Date.now()}`,
    createdAt: nowIso(),
    trendId: signal.id,
    go: true,
    dropType,
    contractType,
    appMode,
    name,
    symbol: generateSymbol(name),
    description: summary.length > 0 ? summary : `Built from signal: ${signal.summary}`,
    tagline: 'From noise to signal.',
    hero: summary.length > 0 ? summary : `Built from signal: ${signal.summary}`,
    cta: 'Explore the drop',
    features: defaultFeatures,
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

async function detectSignals(input: {
  baseDir: string;
  config: AgentConfig;
  llmContext: string;
  trendSkills: string;
  runId?: string;
}): Promise<{ ranked: TrendSignal[]; evidenceMap: Record<string, EvidenceItem[]> }> {
  const { baseDir, config, llmContext, trendSkills } = input;

  const sources = [
    { name: 'twitter', fetch: fetchTwitterSignals(config) },
    { name: 'web', fetch: fetchWebSignals(config) },
    { name: 'farcaster', fetch: fetchFarcasterSignals(config) },
    { name: 'onchain', fetch: fetchOnchainSignals(config, { skills: trendSkills, context: llmContext }) },
    { name: 'graph', fetch: fetchGraphSignals(config) },
    { name: 'suggestion', fetch: fetchSuggestionSignals(config) }
  ];

  const settled = await Promise.allSettled(sources.map((source) => source.fetch));
  const signalBuckets: TrendSignal[][] = [];
  for (let i = 0; i < settled.length; i += 1) {
    const result = settled[i];
    if (result.status === 'fulfilled') {
      signalBuckets.push(result.value);
      await log(baseDir, 'info', `Signal source ${sources[i].name} returned ${result.value.length} items.`);
    } else {
      const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
      await log(baseDir, 'warn', `Signal source ${sources[i].name} failed: ${message}`);
      signalBuckets.push([]);
    }
  }

  const [twitter, web, farcaster, onchain, graph, suggestions] = signalBuckets;

  const signals = finalizeScores([
    ...twitter,
    ...web,
    ...farcaster,
    ...onchain,
    ...graph,
    ...suggestions
  ]);

  const boosted = applyRecencyBoost(signals, config);

  const suggestionSignals = boosted.filter((signal) => signal.source === 'suggestion');
  const otherSignals = boosted.filter((signal) => signal.source !== 'suggestion');

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
  const validations = await validateTrends({
    signals: deduped,
    evidence: evidenceMap,
    config,
    skills: trendSkills,
    context: llmContext
  });

  const enriched = deduped.map((signal) => {
    const validation = validations[signal.id];
    const validationBoost = validation ? validation.composite * config.validation.weight : 0;
    const score = Math.max(0, Math.min(10, signal.score + validationBoost));
    return {
      ...signal,
      score,
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
  await log(baseDir, 'info', `Signal detection ranked ${ranked.length} signals.`);

  const maxPerRunRaw = process.env.SYNTH_TREND_POOL_MAX_PER_RUN
    ? Number(process.env.SYNTH_TREND_POOL_MAX_PER_RUN)
    : 25;
  const maxPerRun = Number.isFinite(maxPerRunRaw) && maxPerRunRaw > 0 ? maxPerRunRaw : 25;
  await appendTrendPool(baseDir, ranked, {
    runId: input.runId,
    detectedAt: nowIso(),
    maxPerRun
  });

  return { ranked, evidenceMap };
}

export async function runDailyCycle(
  baseDir: string,
  options?: { force?: boolean; runId?: string; source?: string; reason?: string }
) {
  await ensureTemplateFiles(baseDir);
  const config = await loadConfig(baseDir);
  const state = await loadState(baseDir);
  let currentState = state;
  let selectedSuggestionId: bigint | null = null;
  let selectedSuggestionMeta: { submitter?: string; stakeEth?: number } | null = null;
  let suggestionReviewed = false;
  let reviewSuggestion: (built: boolean, note: string) => Promise<void> = async () => {};
  if (state.paused) {
    await log(baseDir, 'warn', 'Agent is paused. Skipping cycle.');
    return;
  }
  if (state.currentPhase !== 'idle') {
    await log(baseDir, 'warn', `Agent is already running (${state.currentPhase}). Skipping overlapping cycle.`);
    return;
  }

  try {
    const setPhase = async (phase: AgentState['currentPhase']) => {
      currentState = {
        ...currentState,
        currentPhase: phase,
        phaseStartedAt: nowIso(),
        runId: options?.runId ?? currentState.runId,
        runStartedAt: currentState.runStartedAt ?? nowIso()
      };
      await saveState(baseDir, currentState);
    };

    const setSelectedSuggestion = (signal: TrendSignal | null | undefined) => {
      if (!signal || signal.source !== 'suggestion') return;
      selectedSuggestionId = parseSuggestionId(signal);
      selectedSuggestionMeta = {
        submitter: typeof signal.meta?.submitter === 'string' ? signal.meta.submitter : undefined,
        stakeEth: typeof signal.meta?.stakeEth === 'number' ? signal.meta.stakeEth : undefined
      };
    };

    reviewSuggestion = async (built: boolean, note: string) => {
      if (!selectedSuggestionId || suggestionReviewed) return;
      try {
        await markSuggestionReviewed({ suggestionId: selectedSuggestionId, built });
        suggestionReviewed = true;
        await log(baseDir, 'info', `Suggestion ${selectedSuggestionId.toString()} reviewed (${note}).`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await log(baseDir, 'warn', `Failed to mark suggestion reviewed: ${message}`);
      }
    };

    const minCycleHours = Math.max(1, config.pipeline.minCycleHours || 24);
    const forceCycle = Boolean(options?.force);
    if (!forceCycle && state.lastRunAt) {
      const lastRun = Date.parse(state.lastRunAt);
      if (!Number.isNaN(lastRun)) {
        const elapsedHours = (Date.now() - lastRun) / 3_600_000;
        if (elapsedHours < minCycleHours) {
          await log(baseDir, 'info', `Skipping cycle: last run ${elapsedHours.toFixed(1)}h ago (< ${minCycleHours}h).`);
          currentState = {
            ...currentState,
            currentPhase: 'idle',
            lastResult: 'skipped',
            phaseStartedAt: nowIso(),
            runId: undefined,
            runStartedAt: undefined
          };
          await saveState(baseDir, currentState);
          return;
        }
      }
    }

    const agentContext = await buildAgentContext(baseDir);
    const memoryContext = await buildMemoryContext(baseDir);
    const llmContext = [agentContext, memoryContext].filter(Boolean).join('\n\n');
    const skills = await buildSkillsContext(baseDir);

    await setPhase('signal-detection');

    const lookbackHoursRaw = process.env.SYNTH_BUILD_TREND_LOOKBACK_HOURS
      ? Number(process.env.SYNTH_BUILD_TREND_LOOKBACK_HOURS)
      : 12;
    const lookbackHours = Number.isFinite(lookbackHoursRaw) && lookbackHoursRaw > 0 ? lookbackHoursRaw : 12;
    const poolEntries = await loadTrendPoolWindow(baseDir, lookbackHours);
    if (poolEntries.length === 0) {
      await log(baseDir, 'warn', 'No trend pool signals available for build window.');
      currentState = {
        ...currentState,
        currentPhase: 'idle',
        lastRunAt: nowIso(),
        lastResult: 'skipped',
        phaseStartedAt: nowIso(),
        runId: undefined,
        runStartedAt: undefined
      };
      await saveState(baseDir, currentState);
      return;
    }
    await log(baseDir, 'info', `Using trend pool window of ${Math.max(1, lookbackHours)}h with ${poolEntries.length} entries.`);

    const boostedPool = applyRecencyBoost(sortTrendEntries(poolEntries), config);
    const suggestionSignals = boostedPool.filter((signal) => signal.source === 'suggestion');
    const otherSignals = boostedPool.filter((signal) => signal.source !== 'suggestion');

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

    const ranked = [...deduped].sort((a, b) => b.score - a.score);
    if (ranked.length === 0) {
      await log(baseDir, 'warn', 'No deduped signals available in trend pool window.');
      currentState = {
        ...currentState,
        currentPhase: 'idle',
        lastRunAt: nowIso(),
        lastResult: 'skipped',
        phaseStartedAt: nowIso(),
        runId: undefined,
        runStartedAt: undefined
      };
      await saveState(baseDir, currentState);
      return;
    }

    const evidenceMap: Record<string, EvidenceItem[]> = {};
    const missingEvidence: TrendSignal[] = [];
    for (const signal of ranked) {
      const candidate = signal.meta?.evidence;
      if (Array.isArray(candidate)) {
        evidenceMap[signal.id] = candidate.filter((item) => item && typeof item === 'object') as EvidenceItem[];
      } else {
        missingEvidence.push(signal);
      }
    }
    if (missingEvidence.length > 0 && config.research.enabled) {
      const fetched = await buildEvidence(missingEvidence, config);
      for (const [key, value] of Object.entries(fetched)) {
        evidenceMap[key] = value;
      }
    }

    const prioritySuggestion = selectPrioritySuggestion(ranked, config.scoring.stakePriorityEth || 0.1);
    const highestStakeSuggestion = selectHighestStakeSuggestion(ranked);
    const decision = await generateDecision({
      signals: ranked,
      evidence: evidenceMap,
      config,
      skills,
      context: llmContext,
      prioritySignalId: prioritySuggestion?.id,
      prioritySignal: prioritySuggestion
        ? {
            id: prioritySuggestion.id,
            summary: prioritySuggestion.summary,
            stakeEth: typeof prioritySuggestion.meta?.stakeEth === 'number' ? prioritySuggestion.meta?.stakeEth : undefined
          }
        : undefined
    });

    if (decision) {
      await log(baseDir, 'info', `Decision: ${decision.name} (${decision.dropType}) confidence ${decision.confidence}`);
    }

    let effectiveDecision = decision;
    if (prioritySuggestion && (!decision || !decision.go || decision.confidence < config.decision.minConfidence)) {
      const stake = prioritySuggestion.meta?.stakeEth ?? 0;
      effectiveDecision = buildStakeOverrideDecision(
        prioritySuggestion,
        `High-stake suggestion override (${stake.toFixed(3)} ETH).`
      );
      await log(baseDir, 'info', `Priority suggestion override activated (${prioritySuggestion.id}).`);
    }

    const overrideId = state.overrideSignalId;
    const preferredId = effectiveDecision?.trendId;
    const defaultSignal = ranked[0];
    let topSignal = overrideId
      ? ranked.find((signal) => signal.id === overrideId) ?? defaultSignal
      : preferredId
        ? ranked.find((signal) => signal.id === preferredId) ?? defaultSignal
        : defaultSignal;

    if (effectiveDecision && (!effectiveDecision.go || effectiveDecision.confidence < config.decision.minConfidence)) {
      await log(baseDir, 'info', `Decision opted out (confidence ${effectiveDecision.confidence}).`);
      setSelectedSuggestion(topSignal);
      await reviewSuggestion(false, 'decision opted out');
      currentState = {
        ...currentState,
        currentPhase: 'idle',
        lastRunAt: nowIso(),
        lastResult: 'skipped',
        phaseStartedAt: nowIso(),
        runId: undefined,
        runStartedAt: undefined
      };
      await saveState(baseDir, currentState);
      return;
    }
    if (!topSignal) {
      await log(baseDir, 'warn', 'No signals found.');
      currentState = {
        ...currentState,
        currentPhase: 'idle',
        lastRunAt: nowIso(),
        lastResult: 'skipped',
        phaseStartedAt: nowIso(),
        runId: undefined,
        runStartedAt: undefined
      };
      await saveState(baseDir, currentState);
      return;
    }

    currentState = overrideId ? { ...currentState, overrideSignalId: undefined } : currentState;
    await setPhase('decision');
    if (!effectiveDecision && topSignal && topSignal.score < config.decision.minScore) {
      if (highestStakeSuggestion) {
        effectiveDecision = buildStakeOverrideDecision(
          highestStakeSuggestion,
          'Highest stake suggestion fallback (no strong signals).'
        );
        topSignal = highestStakeSuggestion;
        await log(baseDir, 'info', `Stake fallback selected (${highestStakeSuggestion.id}).`);
      } else {
        await log(baseDir, 'info', `Top signal score ${topSignal.score} below threshold ${config.decision.minScore}.`);
        setSelectedSuggestion(topSignal);
        await reviewSuggestion(false, 'below threshold');
        currentState = {
          ...currentState,
          currentPhase: 'idle',
          lastRunAt: nowIso(),
          lastResult: 'skipped',
          phaseStartedAt: nowIso(),
          runId: undefined,
          runStartedAt: undefined
        };
        await saveState(baseDir, currentState);
        return;
      }
    }

    setSelectedSuggestion(topSignal);

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
    let contractType = fallbackDecision.contractType ?? deriveContractType(dropType);
    let appMode = fallbackDecision.appMode ?? deriveAppMode(dropType, contractType);
    if (dropType !== 'dapp' && contractType === 'none') {
      contractType = deriveContractType(dropType);
      appMode = 'onchain';
    }

    const rationaleSnippet = fallbackDecision.rationale ? ` — ${fallbackDecision.rationale.slice(0, 180)}` : '';
    const rationale = fallbackDecision.rationale ?? 'SYNTH selected this drop based on the top scored signal.';
    await appendMarkdown(memoryPaths(baseDir).dropsMd, `- ${nowIso()} decision: ${dropType} for "${dropName}"${rationaleSnippet}`);

    await setPhase('development');

    const requiresContract = contractType !== 'none';
    let mainnetAddress = '';
    let mainnetSucceeded = false;
    let gasInfo = { txHash: '', gasUsed: '', gasPrice: '', gasCostEth: '' };

    if (requiresContract) {
      const testsPass = await runTests(baseDir);
      if (!testsPass) {
        await reviewSuggestion(false, 'tests failed');
        currentState = {
          ...currentState,
          currentPhase: 'idle',
          lastRunAt: nowIso(),
          lastResult: 'failed',
          phaseStartedAt: nowIso(),
          runId: undefined,
          runStartedAt: undefined
        };
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
      if (contractType === 'erc1155' && !tokenUri) {
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
      if (contractType === 'erc721') {
        scriptName = 'script/DeployERC721.s.sol:DeployERC721';
      } else if (contractType === 'erc1155') {
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
        await reviewSuggestion(false, 'sepolia deploy failed');
        currentState = {
          ...currentState,
          currentPhase: 'idle',
          lastRunAt: nowIso(),
          lastResult: 'failed',
          phaseStartedAt: nowIso(),
          runId: undefined,
          runStartedAt: undefined
        };
        await saveState(baseDir, currentState);
        return;
      }

      await log(baseDir, 'info', `Sepolia deployment success: ${sepoliaAddress}`);
      gasInfo = await readBroadcastGasInfo({
        contractsDir: path.join(baseDir, '..', 'contracts'),
        scriptName: scriptName,
        chainId: '84532'
      });

      mainnetAddress = sepoliaAddress;
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
    }

    const uniqueSuffix = Date.now().toString().slice(-6);
    const baseSlug = sanitizeRepoName(dropName);
    const uniqueMode = (process.env.SYNTH_REPO_UNIQUE ?? 'true').toLowerCase() === 'true';
    const baseName = baseSlug || 'synth-drop';
    const repoName = uniqueMode ? `${baseName}-${uniqueSuffix}` : baseName;
    const repo = await ensureRepo({ name: repoName, description });
    const token = process.env.GITHUB_TOKEN ?? '';
    const repoOwner = parseRepoOwner(repo.htmlUrl) ?? (process.env.GITHUB_ORG ?? '');

    let vercelProjectUrl: string | undefined;
    let vercelDeploymentState: string | undefined;
    let vercelDeploymentError: string | undefined;

    const isMainnet = requiresContract && mainnetSucceeded;
    const explorerUrl = isMainnet
      ? `https://basescan.org/address/${mainnetAddress}`
      : requiresContract
        ? `https://sepolia.basescan.org/address/${mainnetAddress}`
        : '';

    const rpcUrl = isMainnet
      ? (process.env.BASE_RPC ?? 'https://mainnet.base.org')
      : (process.env.BASE_SEPOLIA_RPC ?? 'https://sepolia.base.org');
    const chainId = isMainnet ? '8453' : '84532';

    const dropSkillNames = dropType === 'dapp'
      ? (contractType === 'none' || appMode === 'offchain' ? ['web-builder'] : ['web-builder', 'contract-synth'])
      : dropType === 'token'
        ? ['token-builder', 'contract-synth']
        : dropType === 'nft'
          ? ['nft-builder', 'contract-synth']
          : ['contract-synth'];
    const contentSkills = await buildSkillsContext(baseDir, { include: dropSkillNames });
    const socialSkills = await buildSkillsContext(baseDir, { include: ['social-broadcast', 'launch-voice', ...dropSkillNames] });

    const content = await generateDropContent({
      dropType,
      contractType,
      appMode,
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
      contractAddress: requiresContract ? mainnetAddress : '',
      explorerUrl,
      repoUrl: repo.htmlUrl,
      webappUrl: '',
      skills: contentSkills,
      context: llmContext
    });

    const fallbackContent = {
      about: description.slice(0, 180),
      commitMessage: `Ship ${dropName}`,
      appName: sanitizeRepoName(dropName)
    };
    const effectiveContent = content ?? fallbackContent;
    const repoAbout = effectiveContent.about ?? description;
    const vercelAppName = repo.name;

    if (repoOwner && process.env.VERCEL_TOKEN) {
      const repoSlug = `${repoOwner}/${repo.name}`;
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          const vercelProject = await createVercelProject({
            name: vercelAppName,
            repo: repoSlug
          });
          vercelProjectUrl = vercelProject.url;
          await log(baseDir, 'info', `Vercel project linked: ${vercelProject.url}`);
          break;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          await log(baseDir, 'error', `Vercel attempt ${attempt} failed: ${message}`);
          await sleep(1500 * attempt);
        }
      }
    } else if (!repoOwner) {
      await log(baseDir, 'warn', 'Skipping Vercel project: unable to determine GitHub repo owner.');
    } else {
      await log(baseDir, 'warn', 'Skipping Vercel project: missing VERCEL_TOKEN.');
    }

    const codegenMode = (process.env.SYNTH_CODEGEN_MODE ?? 'llm').toLowerCase();
    const generatedFiles = codegenMode === 'off' ? null : await generateRepoFiles({
      dropType,
      contractType,
      appMode,
      dropName,
      symbol,
      description,
      tagline,
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
      rpcUrl,
      skills: contentSkills,
      context: llmContext
    });

    if (codegenMode !== 'off' && (!generatedFiles || generatedFiles.length === 0)) {
      await log(baseDir, 'warn', 'LLM codegen failed or empty. Falling back to base template.');
    }

    const tempDir = await prepareRepoTemplate({
      baseDir,
      repoName: repo.name,
      dropName,
      description,
      tagline,
      hero,
      cta,
      features,
      symbol,
      dropType,
      contractType,
      appMode,
      hasContract: requiresContract,
      rationale,
      contractAddress: requiresContract ? mainnetAddress : '',
      chain: 'Base',
      network: isMainnet ? 'Base Mainnet' : 'Base Sepolia',
      explorerUrl,
      rpcUrl,
      chainId,
      about: repoAbout,
      repoUrl: repo.htmlUrl,
      webappUrl: vercelProjectUrl
    }, generatedFiles ?? undefined);

    if (content?.readme) {
      const patched = ensureReadmeLinks(content.readme, [
        { label: 'Repo', url: repo.htmlUrl },
        { label: 'Web', url: vercelProjectUrl ?? '' },
        { label: 'Explorer', url: explorerUrl }
      ]);
      await fs.writeFile(path.join(tempDir, 'README.md'), `${patched.trim()}\n`);
    }

    await initAndPushRepo(tempDir, repo.cloneUrl, token, effectiveContent.commitMessage);

    const deployAttemptsRaw = process.env.SYNTH_VERCEL_DEPLOY_RETRIES
      ? Number(process.env.SYNTH_VERCEL_DEPLOY_RETRIES)
      : 2;
    const deployAttempts = Number.isFinite(deployAttemptsRaw) && deployAttemptsRaw > 0 ? deployAttemptsRaw : 2;
    const pollIntervalRaw = process.env.SYNTH_VERCEL_POLL_INTERVAL_MS
      ? Number(process.env.SYNTH_VERCEL_POLL_INTERVAL_MS)
      : 5000;
    const pollIntervalMs = Number.isFinite(pollIntervalRaw) && pollIntervalRaw > 0 ? pollIntervalRaw : 5000;
    const pollTimeoutRaw = process.env.SYNTH_VERCEL_POLL_TIMEOUT_MS
      ? Number(process.env.SYNTH_VERCEL_POLL_TIMEOUT_MS)
      : 600000;
    const pollTimeoutMs = Number.isFinite(pollTimeoutRaw) && pollTimeoutRaw > 0 ? pollTimeoutRaw : 600000;

    if (vercelProjectUrl && repoOwner) {

      for (let attempt = 1; attempt <= deployAttempts; attempt += 1) {
        try {
          const deployment = await createVercelDeployment({
            projectName: vercelAppName,
            repo: repo.name,
            org: repoOwner,
            ref: 'main',
            target: 'production'
          });
          await log(baseDir, 'info', `Vercel deployment started: ${deployment.id}`);

          const startedAt = Date.now();
          let state = deployment.readyState || deployment.status || '';
          let finalUrl = deployment.url;
          while (Date.now() - startedAt < pollTimeoutMs) {
            await sleep(pollIntervalMs);
            const latest = await getVercelDeployment(deployment.id);
            state = latest.readyState || latest.status || state;
            finalUrl = latest.url || finalUrl;
            if (state === 'ERROR' && latest.errorMessage) {
              vercelDeploymentError = latest.errorMessage;
              await log(baseDir, 'warn', `Vercel deployment error: ${latest.errorMessage}`);
            }
            if (state && ['READY', 'ERROR', 'CANCELED'].includes(state)) {
              break;
            }
          }

          vercelDeploymentState = state;
          if (state === 'READY') {
            if (finalUrl) {
              vercelProjectUrl = finalUrl;
            }
            await log(baseDir, 'info', `Vercel deployment ready: ${finalUrl ?? vercelProjectUrl ?? 'unknown url'}`);
            break;
          }

          await log(baseDir, 'warn', `Vercel deployment attempt ${attempt} ended with state "${state}".`);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          await log(baseDir, 'warn', `Vercel deployment attempt ${attempt} failed: ${message}`);
        }
      }
    } else if (vercelProjectUrl && !repoOwner) {
      await log(baseDir, 'warn', 'Skipping Vercel deployment trigger: missing repo owner.');
    }

    const repairAttemptsRaw = process.env.SYNTH_REPAIR_ATTEMPTS
      ? Number(process.env.SYNTH_REPAIR_ATTEMPTS)
      : 0;
    const repairAttempts = Number.isFinite(repairAttemptsRaw) && repairAttemptsRaw > 0 ? repairAttemptsRaw : 0;

    if (repairAttempts > 0 && vercelProjectUrl && repoOwner && vercelDeploymentState && vercelDeploymentState !== 'READY') {
      const repoFiles = await listRepoFiles(tempDir);
      for (let attempt = 1; attempt <= repairAttempts; attempt += 1) {
        const errorMessage = vercelDeploymentError
          ? `Vercel error: ${vercelDeploymentError}`
          : `Vercel deployment ended with state "${vercelDeploymentState}".`;
        const repairFiles = await generateRepairFiles({
          dropType,
          contractType,
          appMode,
          dropName,
          symbol,
          description,
          tagline,
          hero,
          cta,
          features,
          rationale,
          trend: topSignal,
          network: isMainnet ? 'Base Mainnet' : 'Base Sepolia',
          chain: 'Base',
          chainId,
          contractAddress: requiresContract ? mainnetAddress : '',
          explorerUrl,
          repoUrl: repo.htmlUrl,
          webappUrl: vercelProjectUrl,
          rpcUrl,
          errorMessage,
          repoFiles,
          skills: contentSkills,
          context: llmContext
        });

        if (!repairFiles || repairFiles.length === 0) {
          await log(baseDir, 'warn', `Repair attempt ${attempt} produced no files.`);
          break;
        }

        const applied = await applyRepairFiles(tempDir, repairFiles);
        if (applied === 0) {
          await log(baseDir, 'warn', `Repair attempt ${attempt} produced no applicable changes.`);
          break;
        }

        const committed = await commitAndPushChanges(tempDir, `Repair build (${attempt})`);
        if (!committed) {
          await log(baseDir, 'warn', `Repair attempt ${attempt} had no git changes to push.`);
          break;
        }

        try {
          const deployment = await createVercelDeployment({
            projectName: vercelAppName,
            repo: repo.name,
            org: repoOwner,
            ref: 'main',
            target: 'production'
          });
          await log(baseDir, 'info', `Repair deployment started: ${deployment.id}`);

          const startedAt = Date.now();
          let state = deployment.readyState || deployment.status || '';
          let finalUrl = deployment.url;
          while (Date.now() - startedAt < pollTimeoutMs) {
            await sleep(pollIntervalMs);
            const latest = await getVercelDeployment(deployment.id);
            state = latest.readyState || latest.status || state;
            finalUrl = latest.url || finalUrl;
            if (state === 'ERROR' && latest.errorMessage) {
              vercelDeploymentError = latest.errorMessage;
              await log(baseDir, 'warn', `Vercel repair error: ${latest.errorMessage}`);
            }
            if (state && ['READY', 'ERROR', 'CANCELED'].includes(state)) {
              break;
            }
          }
          vercelDeploymentState = state;
          if (state === 'READY') {
            if (finalUrl) {
              vercelProjectUrl = finalUrl;
            }
            await log(baseDir, 'info', `Repair deployment ready: ${finalUrl ?? vercelProjectUrl ?? 'unknown url'}`);
            break;
          }
          await log(baseDir, 'warn', `Repair deployment attempt ${attempt} ended with state "${state}".`);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          await log(baseDir, 'warn', `Repair deployment attempt ${attempt} failed: ${message}`);
        }
      }
    }

    if (repoOwner && repoAbout) {
      await updateRepoDescription({
        owner: repoOwner,
        repo: repo.name,
        description: repoAbout
      });
    }

    let builderInfo: DropRecord['builder'] | undefined;
    if (selectedSuggestionMeta?.submitter) {
      builderInfo = {
        address: selectedSuggestionMeta.submitter,
        stakeEth: selectedSuggestionMeta.stakeEth,
        suggestionId: selectedSuggestionId ? selectedSuggestionId.toString() : undefined,
        stakeReturned: false
      };
      await reviewSuggestion(true, 'built');
      if (suggestionReviewed && builderInfo) {
        builderInfo.stakeReturned = true;
      }
    }

    const dropRecord: DropRecord = {
      id: `${Date.now()}`,
      name: dropName,
      description,
      type: dropType,
      contractAddress: requiresContract ? mainnetAddress : '',
      contractType,
      appMode,
      builder: builderInfo,
      githubUrl: repo.htmlUrl,
      webappUrl: vercelProjectUrl,
      explorerUrl: explorerUrl || undefined,
      network: isMainnet ? 'Base Mainnet' : 'Base Sepolia',
      deployedAt: nowIso(),
      trend: topSignal.summary,
      trendSource: topSignal.source,
      trendScore: topSignal.score,
      trendEngagement: typeof topSignal.engagement === 'number' ? topSignal.engagement : undefined,
      txHash: gasInfo.txHash || undefined,
      gasUsed: gasInfo.gasUsed || undefined,
      gasPrice: gasInfo.gasPrice || undefined,
      gasCostEth: gasInfo.gasCostEth || undefined,
      status: requiresContract ? (isMainnet ? 'mainnet' : 'testnet') : 'planned'
    };

    const drops = await loadDrops(baseDir);
    drops.unshift(dropRecord);
    await saveDrops(baseDir, drops);

    let social: { thread: string[]; farcaster: string } | null = null;
    try {
      social = await broadcastDrop({
        baseDir,
        drop: dropRecord,
        trend: topSignal,
        skills: socialSkills,
      context: llmContext
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await log(baseDir, 'warn', `Broadcast failed: ${message}`);
    }

    try {
      await saveArtifacts(baseDir, {
        runId: options?.runId,
        drop: dropRecord,
        decision: fallbackDecision,
        trend: topSignal,
        evidence: evidenceMap[topSignal.id],
        generatedFiles: generatedFiles ?? null,
        content,
        social
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await log(baseDir, 'warn', `Artifact capture failed: ${message}`);
    }

    const deployedLine = dropRecord.contractAddress
      ? `${dropRecord.type} ${dropRecord.contractAddress}`
      : `${dropRecord.type} (offchain)`;
    await appendMarkdown(memoryPaths(baseDir).dropsMd, `- ${nowIso()} deployed ${deployedLine}`);

    currentState = {
      ...currentState,
      currentPhase: 'idle',
      lastRunAt: nowIso(),
      lastResult: 'success',
      phaseStartedAt: nowIso(),
      runId: undefined,
      runStartedAt: undefined
    };
    await saveState(baseDir, currentState);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await log(baseDir, 'error', message);
    await reviewSuggestion(false, 'run failed');
    currentState = {
      ...currentState,
      currentPhase: 'idle',
      lastRunAt: nowIso(),
      lastResult: 'failed',
      lastError: message,
      phaseStartedAt: nowIso(),
      runId: undefined,
      runStartedAt: undefined
    };
    await saveState(baseDir, currentState);
  }
}

export async function runSignalDetection(
  baseDir: string,
  options?: { runId?: string; source?: string; reason?: string }
) {
  await ensureTemplateFiles(baseDir);
  const config = await loadConfig(baseDir);
  const state = await loadState(baseDir);
  let currentState = state;

  if (state.paused) {
    await log(baseDir, 'warn', 'Agent is paused. Skipping signal detection.');
    return;
  }
  if (state.currentPhase !== 'idle') {
    await log(baseDir, 'warn', `Agent is already running (${state.currentPhase}). Skipping overlapping detection.`);
    return;
  }

  try {
    const setPhase = async (phase: AgentState['currentPhase']) => {
      currentState = {
        ...currentState,
        currentPhase: phase,
        phaseStartedAt: nowIso(),
        runId: options?.runId ?? currentState.runId,
        runStartedAt: currentState.runStartedAt ?? nowIso()
      };
      await saveState(baseDir, currentState);
    };

    const agentContext = await buildAgentContext(baseDir);
    const memoryContext = await buildMemoryContext(baseDir);
    const llmContext = [agentContext, memoryContext].filter(Boolean).join('\n\n');
    const trendSkills = await buildSkillsContext(baseDir, { include: ['trend-detector', 'dune-analyst'] });

    await setPhase('signal-detection');
    await log(baseDir, 'info', `Signal-only detection started${options?.reason ? ` (${options.reason})` : ''}.`);

    const { ranked } = await detectSignals({
      baseDir,
      config,
      llmContext,
      trendSkills,
      runId: options?.runId
    });

    await log(baseDir, 'info', `Signal-only detection captured ${ranked.length} signals.`);
    currentState = {
      ...currentState,
      currentPhase: 'idle',
      lastSignalAt: nowIso(),
      lastSignalResult: ranked.length > 0 ? 'success' : 'skipped',
      lastSignalError: undefined,
      phaseStartedAt: nowIso(),
      runId: undefined,
      runStartedAt: undefined
    };
    await saveState(baseDir, currentState);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await log(baseDir, 'error', message);
    currentState = {
      ...currentState,
      currentPhase: 'idle',
      lastSignalAt: nowIso(),
      lastSignalResult: 'failed',
      lastSignalError: message,
      phaseStartedAt: nowIso(),
      runId: undefined,
      runStartedAt: undefined
    };
    await saveState(baseDir, currentState);
  }
}
