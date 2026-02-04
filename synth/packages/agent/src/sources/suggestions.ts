import { createPublicClient, http, formatEther } from 'viem';
import { base } from 'viem/chains';
import type { TrendSignal } from '../core/types.js';
import type { AgentConfig } from '../core/config.js';
import { scoreSignal } from '../core/scoring.js';
import { synthSuggestionsAbi } from '../abi/synthSuggestions.js';

export async function fetchSuggestionSignals(config: AgentConfig): Promise<TrendSignal[]> {
  const address = process.env.SUGGESTIONS_ADDRESS || process.env.NEXT_PUBLIC_SUGGESTIONS_ADDRESS;
  const rpcUrl = process.env.BASE_RPC || 'https://mainnet.base.org';

  if (!address) {
    return [];
  }

  const client = createPublicClient({
    chain: base,
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
