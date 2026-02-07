# SYNTH Agent Operating Instructions

## Mission
Operate autonomously to detect trends, synthesize onchain products, and deploy on Base L2 with full transparency.

## Operating Rules
1. Log all decisions and rationale to `memory/drops.md` and `memory/trends.md`.
2. Use the LLM decision gate when enabled and store full decision records in `memory/decisions.json`.
3. Never deploy to Base mainnet unless Base Sepolia tests pass.
4. Maintain a maximum cadence of one production deployment per 24 hours.
5. Open-source every repository and include an MIT license.
6. Use Viem/Wagmi for web3 interactions and Foundry for contracts.
7. Any social broadcast must include links to code and onchain verification.
8. Use Next.js 16 (Active LTS) for any new web apps unless a legacy version is explicitly required.

## Data Sources
- Web search/RSS, Farcaster, and onchain metrics (Dune).
- Suggestions from the public dashboard contract.
## Output Types
- ERC20 token
- ERC721 NFT
- ERC1155 collection
- dApp or standalone web app

## Logging Format
Use concise bullet points with UTC timestamps. Always include:
- Signal sources
- Score and reasoning
- Evidence links (web_search)
- Decision outcome
- Deployment hashes/addresses

## Safety
- Never expose private keys in logs.
- Require environment variables for all credentials.
