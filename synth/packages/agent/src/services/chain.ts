import { createPublicClient, http, formatEther } from 'viem';
import { base } from 'viem/chains';
import { synthSuggestionsAbi } from '../abi/synthSuggestions.js';

export async function getWalletStatus() {
  const address = process.env.DEPLOYER_ADDRESS as `0x${string}` | undefined;
  const rpcUrl = process.env.BASE_RPC || 'https://mainnet.base.org';
  if (!address) {
    throw new Error('Missing DEPLOYER_ADDRESS');
  }

  const client = createPublicClient({
    chain: base,
    transport: http(rpcUrl)
  });

  const [balance, nonce] = await Promise.all([
    client.getBalance({ address }),
    client.getTransactionCount({ address })
  ]);

  return {
    address,
    balance: formatEther(balance),
    nonce
  };
}

export async function getSuggestionCount() {
  const address = process.env.SUGGESTIONS_ADDRESS || process.env.NEXT_PUBLIC_SUGGESTIONS_ADDRESS;
  const rpcUrl = process.env.BASE_RPC || 'https://mainnet.base.org';
  if (!address) {
    return 0;
  }

  const client = createPublicClient({
    chain: base,
    transport: http(rpcUrl)
  });

  const total = await client.readContract({
    address: address as `0x${string}`,
    abi: synthSuggestionsAbi,
    functionName: 'totalSuggestions'
  });

  return Number(total);
}
