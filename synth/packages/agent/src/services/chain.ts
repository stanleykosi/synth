import { createPublicClient, createWalletClient, http, formatEther } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
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

function resolveSuggestionsNetwork() {
  const chainId = Number(process.env.SUGGESTIONS_CHAIN_ID ?? process.env.NEXT_PUBLIC_CHAIN_ID ?? '8453');
  const isSepolia = chainId === 84532;
  const rpcUrl = isSepolia
    ? (process.env.BASE_SEPOLIA_RPC || 'https://sepolia.base.org')
    : (process.env.BASE_RPC || 'https://mainnet.base.org');
  return {
    chainId,
    chain: isSepolia ? baseSepolia : base,
    rpcUrl
  };
}

export async function markSuggestionReviewed(input: { suggestionId: bigint; built: boolean }) {
  const address = process.env.SUGGESTIONS_ADDRESS || process.env.NEXT_PUBLIC_SUGGESTIONS_ADDRESS;
  if (!address) {
    throw new Error('Missing SUGGESTIONS_ADDRESS');
  }

  const privateKey = process.env.SUGGESTIONS_OWNER_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('Missing SUGGESTIONS_OWNER_PRIVATE_KEY or DEPLOYER_PRIVATE_KEY');
  }

  const key = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
  const account = privateKeyToAccount(key as `0x${string}`);
  const network = resolveSuggestionsNetwork();

  const wallet = createWalletClient({
    account,
    chain: network.chain,
    transport: http(network.rpcUrl)
  });

  const publicClient = createPublicClient({
    chain: network.chain,
    transport: http(network.rpcUrl)
  });

  const hash = await wallet.writeContract({
    address: address as `0x${string}`,
    abi: synthSuggestionsAbi,
    functionName: 'markReviewed',
    args: [input.suggestionId, input.built]
  });

  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}
