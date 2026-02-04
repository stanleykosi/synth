import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const DROPS_FILE = path.join(process.cwd(), 'data', 'drops.json');

interface DropPayload {
  name: string;
  description: string;
  type: 'token' | 'nft' | 'dapp' | 'contract';
  contractAddress: string;
  githubUrl: string;
  webappUrl?: string;
  deployedAt: string;
  trend: string;
}

function isValidDrop(payload: unknown): payload is DropPayload {
  if (!payload || typeof payload !== 'object') return false;
  const drop = payload as DropPayload;
  const validTypes = ['token', 'nft', 'dapp', 'contract'];

  return (
    typeof drop.name === 'string' && drop.name.length > 0 &&
    typeof drop.description === 'string' && drop.description.length > 0 &&
    validTypes.includes(drop.type) &&
    typeof drop.contractAddress === 'string' && drop.contractAddress.length > 0 &&
    typeof drop.githubUrl === 'string' && drop.githubUrl.length > 0 &&
    typeof drop.deployedAt === 'string' && drop.deployedAt.length > 0 &&
    typeof drop.trend === 'string' && drop.trend.length > 0 &&
    (drop.webappUrl === undefined || typeof drop.webappUrl === 'string')
  );
}

export async function GET() {
  try {
    const data = await fs.readFile(DROPS_FILE, 'utf-8');
    const drops = JSON.parse(data);
    return NextResponse.json(drops);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  const adminSecret = request.headers.get('x-admin-secret');
  if (adminSecret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limiting should be enforced at the edge (e.g., Vercel/Cloudflare)
  // using IP- or token-based limits to prevent abuse of admin endpoints.
  try {
    const contentType = request.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      return NextResponse.json({ error: 'Invalid content type' }, { status: 400 });
    }

    const drop = await request.json();
    if (!isValidDrop(drop)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    let drops: DropPayload[] = [];
    try {
      const data = await fs.readFile(DROPS_FILE, 'utf-8');
      drops = JSON.parse(data);
    } catch {}

    drops.unshift({ ...drop, id: Date.now().toString() } as DropPayload & { id: string });

    await fs.mkdir(path.dirname(DROPS_FILE), { recursive: true });
    await fs.writeFile(DROPS_FILE, JSON.stringify(drops, null, 2));

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to save drop' }, { status: 500 });
  }
}
