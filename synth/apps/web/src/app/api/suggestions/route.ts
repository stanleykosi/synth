import { NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { SUGGESTIONS_ABI, SUGGESTIONS_ADDRESS } from '@/lib/contracts';

const client = createPublicClient({
  chain: base,
  transport: http('https://mainnet.base.org'),
});

export async function GET() {
  if (!SUGGESTIONS_ADDRESS) {
    return NextResponse.json({ error: 'Contract not configured' }, { status: 500 });
  }

  try {
    const suggestions = await client.readContract({
      address: SUGGESTIONS_ADDRESS,
      abi: SUGGESTIONS_ABI,
      functionName: 'getTopSuggestions',
      args: [BigInt(20)],
    });

    return NextResponse.json(suggestions);
  } catch {
    // Rate limiting should be enforced at the edge to protect upstream RPC usage.
    return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 });
  }
}
