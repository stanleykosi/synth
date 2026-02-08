import fs from 'fs/promises';
import path from 'path';
import { memoryPaths, writeJson } from '../core/memory.js';
import type { DropRecord, DecisionRecord, EvidenceItem, TrendSignal } from '../core/types.js';
import type { GeneratedFile } from './repo.js';
import type { DropContent } from './content.js';

export interface ArtifactInput {
  runId?: string;
  drop: DropRecord;
  decision?: DecisionRecord | null;
  trend: TrendSignal;
  evidence?: EvidenceItem[];
  content?: DropContent | null;
  generatedFiles?: GeneratedFile[] | null;
  social?: { thread: string[]; farcaster: string; farcasterThread?: string[] } | null;
  contractsDir?: string;
}

const MAX_OUT_BYTES = 50 * 1024 * 1024;
const MAX_BROADCAST_BYTES = 25 * 1024 * 1024;

async function writeText(filePath: string, content: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content.trim() + '\n');
}

async function copyDirWithLimit(src: string, dest: string, maxBytes: number) {
  let total = 0;

  const walk = async (currentSrc: string, currentDest: string) => {
    const entries = await fs.readdir(currentSrc, { withFileTypes: true }).catch(() => []);
    await fs.mkdir(currentDest, { recursive: true });
    for (const entry of entries) {
      if (total >= maxBytes) return;
      const srcPath = path.join(currentSrc, entry.name);
      const destPath = path.join(currentDest, entry.name);
      if (entry.isDirectory()) {
        await walk(srcPath, destPath);
        continue;
      }
      if (!entry.isFile()) continue;
      const stat = await fs.stat(srcPath);
      if (total + stat.size > maxBytes) continue;
      await fs.mkdir(path.dirname(destPath), { recursive: true });
      await fs.copyFile(srcPath, destPath);
      total += stat.size;
    }
  };

  await walk(src, dest);
}

export async function saveArtifacts(baseDir: string, input: ArtifactInput) {
  const artifactsDir = memoryPaths(baseDir).artifactsDir;
  const runLabel = input.runId ? input.runId : `drop-${input.drop.id}`;
  const targetDir = path.join(artifactsDir, runLabel);
  await fs.mkdir(targetDir, { recursive: true });

  await writeJson(path.join(targetDir, 'drop.json'), input.drop);
  await writeJson(path.join(targetDir, 'trend.json'), input.trend);
  if (input.decision) {
    await writeJson(path.join(targetDir, 'decision.json'), input.decision);
  }
  if (input.evidence) {
    await writeJson(path.join(targetDir, 'evidence.json'), input.evidence);
  }
  if (input.generatedFiles) {
    await writeJson(path.join(targetDir, 'generated-files.json'), input.generatedFiles);
  }
  if (input.social) {
    await writeJson(path.join(targetDir, 'social.json'), input.social);
  }
  if (input.content?.readme) {
    await writeText(path.join(targetDir, 'README.md'), input.content.readme);
  }

  const contractsDir = input.contractsDir ?? path.join(baseDir, '..', 'contracts');
  await copyDirWithLimit(
    path.join(contractsDir, 'broadcast'),
    path.join(targetDir, 'contracts', 'broadcast'),
    MAX_BROADCAST_BYTES
  ).catch(() => null);
  await copyDirWithLimit(
    path.join(contractsDir, 'out'),
    path.join(targetDir, 'contracts', 'out'),
    MAX_OUT_BYTES
  ).catch(() => null);
}

export async function clearArtifacts(baseDir: string) {
  const artifactsDir = memoryPaths(baseDir).artifactsDir;
  await fs.rm(artifactsDir, { recursive: true, force: true });
}
