import { createPublicClient, http, formatEther } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import type { TrendSignal } from '../core/types.js';
import type { AgentConfig } from '../core/config.js';
import { scoreSignal } from '../core/scoring.js';
import { synthSuggestionsAbi } from '../abi/synthSuggestions.js';

export async function fetchSuggestionSignals(config: AgentConfig): Promise<TrendSignal[]> {
  const address = process.env.SUGGESTIONS_ADDRESS || process.env.NEXT_PUBLIC_SUGGESTIONS_ADDRESS;
  const chainId = Number(process.env.SUGGESTIONS_CHAIN_ID ?? process.env.NEXT_PUBLIC_CHAIN_ID ?? '8453');
  const isSepolia = chainId === 84532;
  const rpcUrl = isSepolia
    ? (process.env.BASE_SEPOLIA_RPC || 'https://sepolia.base.org')
    : (process.env.BASE_RPC || 'https://mainnet.base.org');

  if (!address) {
    return [];
  }

  const client = createPublicClient({
    chain: isSepolia ? baseSepolia : base,
    transport: http(rpcUrl)
  });

  const suggestions = await client.readContract({
    address: address as `0x${string}`,
    abi: synthSuggestionsAbi,
    functionName: 'getTopSuggestions',
    args: [10n]
  });

  return suggestions.map((suggestion) => {
    const stake = Number(formatEther(suggestion.stake));
    const engagement = Math.min(stake * 1000, config.scoring.engagementCap);
    return {
      id: `suggestion-${suggestion.id.toString()}`,
      source: 'suggestion',
      summary: suggestion.content.slice(0, 240),
      score: scoreSignal('suggestion', engagement, config),
      capturedAt: new Date(Number(suggestion.timestamp) * 1000).toISOString(),
      engagement,
      meta: {
        submitter: suggestion.submitter,
        stakeEth: stake
      }
    };
  });
}
