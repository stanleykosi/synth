import { NextResponse } from 'next/server';

export async function GET() {
  const apiUrl = process.env.AGENT_API_URL;
  if (apiUrl) {
    const res = await fetch(`${apiUrl}/api/metrics`, { cache: 'no-store' });
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
