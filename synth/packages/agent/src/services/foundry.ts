import { spawn } from 'child_process';

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
