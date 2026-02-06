import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { formatEther } from 'viem';

export interface ForgeResult {
  success: boolean;
  output: string;
}

export function runForge(args: string[], opts: { cwd: string; env?: NodeJS.ProcessEnv }): Promise<ForgeResult> {
  return new Promise((resolve) => {
    const child = spawn('forge', args, {
      cwd: opts.cwd,
      env: { ...process.env, ...opts.env },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let output = '';
    child.stdout.on('data', (chunk) => {
      output += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      output += chunk.toString();
    });

    child.on('close', (code) => {
      resolve({ success: code === 0, output });
    });
  });
}

export function parseDeployedAddress(output: string): string | null {
  const match = output.match(/deployed to:\s*(0x[a-fA-F0-9]{40})/);
  return match ? match[1] : null;
}

function parseBigInt(value: unknown): bigint | null {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') return BigInt(Math.floor(value));
  if (typeof value === 'string') {
    try {
      return value.startsWith('0x') ? BigInt(value) : BigInt(value);
    } catch {
      return null;
    }
  }
  return null;
}

export interface BroadcastGasInfo {
  txHash?: string;
  gasUsed?: string;
  gasPrice?: string;
  gasCostEth?: string;
}

export async function readBroadcastGasInfo(params: {
  contractsDir: string;
  scriptName: string;
  chainId: string;
}): Promise<BroadcastGasInfo> {
  const scriptPath = params.scriptName.split(':')[0];
  const scriptFile = path.basename(scriptPath);
  const filePath = path.join(params.contractsDir, 'broadcast', scriptFile, params.chainId, 'run-latest.json');

  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(raw) as Record<string, unknown>;
    const transactions = Array.isArray(data.transactions) ? data.transactions : [];
    const receipts = Array.isArray(data.receipts) ? data.receipts : [];

    const tx = transactions.length > 0 ? (transactions[transactions.length - 1] as Record<string, unknown>) : null;
    const receipt = (tx?.receipt as Record<string, unknown> | undefined) ??
      (receipts.length > 0 ? (receipts[receipts.length - 1] as Record<string, unknown>) : undefined);

    const txHash = (tx?.hash as string | undefined) ?? (receipt?.transactionHash as string | undefined);
    const gasUsed = parseBigInt(receipt?.gasUsed ?? receipt?.gas_used);
    const gasPrice = parseBigInt(receipt?.effectiveGasPrice ?? receipt?.effective_gas_price ?? tx?.gasPrice ?? tx?.gas_price);

    let gasCostEth: string | undefined;
    if (gasUsed && gasPrice) {
      gasCostEth = formatEther(gasUsed * gasPrice);
    }

    return {
      txHash,
      gasUsed: gasUsed ? gasUsed.toString() : undefined,
      gasPrice: gasPrice ? gasPrice.toString() : undefined,
      gasCostEth
    };
  } catch {
    return {};
  }
}
