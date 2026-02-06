import fs from 'fs/promises';
import path from 'path';
import { resolveMemoryDir } from '../utils/paths.js';
import type { TrendSignal, DropRecord, LogEntry, AgentState, DecisionRecord, ChatMessage } from './types.js';

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export function memoryPaths(baseDir: string) {
  const memoryDir = resolveMemoryDir(baseDir);
  return {
    memoryDir,
    trendsJson: path.join(memoryDir, 'trends.json'),
    dropsJson: path.join(memoryDir, 'drops.json'),
    logsJson: path.join(memoryDir, 'logs.json'),
    stateJson: path.join(memoryDir, 'state.json'),
    decisionsJson: path.join(memoryDir, 'decisions.json'),
    chatJson: path.join(memoryDir, 'chat.json'),
    trendsMd: path.join(memoryDir, 'trends.md'),
    dropsMd: path.join(memoryDir, 'drops.md')
  };
}

export async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function writeJson(filePath: string, data: unknown) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

export async function appendMarkdown(filePath: string, line: string) {
  await ensureDir(path.dirname(filePath));
  await fs.appendFile(filePath, `${line}\n`);
}

export async function loadTrends(baseDir: string): Promise<TrendSignal[]> {
  const { trendsJson } = memoryPaths(baseDir);
  return readJson(trendsJson, [] as TrendSignal[]);
}

export async function saveTrends(baseDir: string, trends: TrendSignal[]) {
  const { trendsJson } = memoryPaths(baseDir);
  await writeJson(trendsJson, trends);
}

export async function loadDrops(baseDir: string): Promise<DropRecord[]> {
  const { dropsJson } = memoryPaths(baseDir);
  return readJson(dropsJson, [] as DropRecord[]);
}

export async function saveDrops(baseDir: string, drops: DropRecord[]) {
  const { dropsJson } = memoryPaths(baseDir);
  await writeJson(dropsJson, drops);
}

export async function loadLogs(baseDir: string): Promise<LogEntry[]> {
  const { logsJson } = memoryPaths(baseDir);
  return readJson(logsJson, [] as LogEntry[]);
}

export async function saveLogs(baseDir: string, logs: LogEntry[]) {
  const { logsJson } = memoryPaths(baseDir);
  await writeJson(logsJson, logs);
}

export async function loadState(baseDir: string): Promise<AgentState> {
  const { stateJson } = memoryPaths(baseDir);
  return readJson(stateJson, {
    paused: false,
    currentPhase: 'idle'
  } as AgentState);
}

export async function saveState(baseDir: string, state: AgentState) {
  const { stateJson } = memoryPaths(baseDir);
  await writeJson(stateJson, state);
}

export async function loadDecisions(baseDir: string): Promise<DecisionRecord[]> {
  const { decisionsJson } = memoryPaths(baseDir);
  return readJson(decisionsJson, [] as DecisionRecord[]);
}

export async function saveDecisions(baseDir: string, decisions: DecisionRecord[]) {
  const { decisionsJson } = memoryPaths(baseDir);
  await writeJson(decisionsJson, decisions);
}

export async function loadChat(baseDir: string): Promise<ChatMessage[]> {
  const { chatJson } = memoryPaths(baseDir);
  return readJson(chatJson, [] as ChatMessage[]);
}

export async function saveChat(baseDir: string, chat: ChatMessage[]) {
  const { chatJson } = memoryPaths(baseDir);
  await writeJson(chatJson, chat);
}
