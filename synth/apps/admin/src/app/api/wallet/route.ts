import { NextResponse } from 'next/server';
import { createPublicClient, http, formatEther } from 'viem';
import { base } from 'viem/chains';

export async function GET() {
  const address = process.env.DEPLOYER_ADDRESS as `0x${string}` | undefined;
  const rpcUrl = process.env.BASE_RPC ?? 'https://mainnet.base.org';

  if (!address) {
    return NextResponse.json({ error: 'Missing DEPLOYER_ADDRESS' }, { status: 500 });
  }

  try {
    const client = createPublicClient({
      chain: base,
      transport: http(rpcUrl),
    });

    const [balance, nonce] = await Promise.all([
      client.getBalance({ address }),
      client.getTransactionCount({ address }),
    ]);

    return NextResponse.json({
      address,
      balance: formatEther(balance),
      nonce,
    });
  } catch {
    // Rate limiting should be applied at the edge for admin endpoints.
    return NextResponse.json({ error: 'Failed to fetch wallet status' }, { status: 500 });
  }
}
