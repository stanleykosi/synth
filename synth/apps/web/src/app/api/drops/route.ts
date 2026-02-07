import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const DROPS_FILE = path.join(process.cwd(), 'data', 'drops.json');
const AGENT_API_URL = process.env.AGENT_API_URL;

interface DropPayload {
  name: string;
  description: string;
  type: 'token' | 'nft' | 'dapp' | 'contract';
  contractAddress?: string;
  contractType?: 'erc20' | 'erc721' | 'erc1155' | 'none';
  appMode?: 'onchain' | 'offchain';
  builder?: {
    address: string;
    stakeEth?: number;
    suggestionId?: string;
    stakeReturned?: boolean;
  };
  githubUrl: string;
  webappUrl?: string;
  deployedAt: string;
  trend: string;
  trendSource?: string;
  trendScore?: number;
  trendEngagement?: number;
}

function isValidDrop(payload: unknown): payload is DropPayload {
  if (!payload || typeof payload !== 'object') return false;
  const drop = payload as DropPayload;
  const validTypes = ['token', 'nft', 'dapp', 'contract'];

  return (
    typeof drop.name === 'string' && drop.name.length > 0 &&
    typeof drop.description === 'string' && drop.description.length > 0 &&
    validTypes.includes(drop.type) &&
    typeof drop.githubUrl === 'string' && drop.githubUrl.length > 0 &&
    typeof drop.deployedAt === 'string' && drop.deployedAt.length > 0 &&
    typeof drop.trend === 'string' && drop.trend.length > 0 &&
    (drop.contractAddress === undefined || typeof drop.contractAddress === 'string') &&
    (drop.contractType === undefined || typeof drop.contractType === 'string') &&
    (drop.appMode === undefined || typeof drop.appMode === 'string') &&
    (drop.webappUrl === undefined || typeof drop.webappUrl === 'string') &&
    (drop.trendSource === undefined || typeof drop.trendSource === 'string') &&
    (drop.trendScore === undefined || typeof drop.trendScore === 'number') &&
    (drop.trendEngagement === undefined || typeof drop.trendEngagement === 'number') &&
    (drop.builder === undefined || (typeof drop.builder === 'object' && typeof drop.builder.address === 'string'))
  );
}

export async function GET() {
  if (AGENT_API_URL) {
    const res = await fetch(`${AGENT_API_URL}/api/drops`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  }

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

    if (AGENT_API_URL) {
      const res = await fetch(`${AGENT_API_URL}/api/drops`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': process.env.ADMIN_SECRET ?? ''
        },
        body: JSON.stringify(drop)
      });
      if (!res.ok) {
        return NextResponse.json({ error: 'Failed to save drop' }, { status: 502 });
      }
      return NextResponse.json({ success: true });
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
