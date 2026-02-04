export const synthSuggestionsAbi = [
  {
    type: 'function',
    name: 'getTopSuggestions',
    stateMutability: 'view',
    inputs: [
      { name: 'limit', type: 'uint256' }
    ],
    outputs: [
      {
        name: '',
        type: 'tuple[]',
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'submitter', type: 'address' },
          { name: 'content', type: 'string' },
          { name: 'stake', type: 'uint256' },
          { name: 'timestamp', type: 'uint256' },
          { name: 'reviewed', type: 'bool' },
          { name: 'built', type: 'bool' }
        ]
      }
    ]
  },
  {
    type: 'function',
    name: 'totalSuggestions',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  }
] as const;
