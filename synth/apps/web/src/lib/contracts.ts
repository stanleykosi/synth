export const SUGGESTIONS_ADDRESS =
  process.env.NEXT_PUBLIC_SUGGESTIONS_ADDRESS as `0x${string}`;

export const SUGGESTIONS_ABI = [
  {
    inputs: [{ name: 'content', type: 'string' }],
    name: 'submit',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ name: 'limit', type: 'uint256' }],
    name: 'getTopSuggestions',
    outputs: [
      {
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'submitter', type: 'address' },
          { name: 'content', type: 'string' },
          { name: 'stake', type: 'uint256' },
          { name: 'timestamp', type: 'uint256' },
          { name: 'reviewed', type: 'bool' },
          { name: 'built', type: 'bool' },
        ],
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalSuggestions',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;
