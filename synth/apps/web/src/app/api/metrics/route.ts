import { NextResponse } from 'next/server';

const AGENT_API_URL = process.env.AGENT_API_URL;

export async function GET() {
  if (AGENT_API_URL) {
    const res = await fetch(`${AGENT_API_URL}/api/metrics`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  }

  return NextResponse.json({
    totalDrops: 0,
    contractsByType: { token: 0, nft: 0, dapp: 0, contract: 0 },
    suggestionsReceived: 0,
    suggestionsBuilt: 0,
    githubStars: 0,
    gasSpentEth: '0.000000'
  });
}
