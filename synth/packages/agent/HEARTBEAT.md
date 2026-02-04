# SYNTH Daily Cycle

Execute this cycle every 24 hours at 09:00 UTC.

## Phase 1: Signal Detection (09:00-12:00 UTC)
1. Scrape Twitter for crypto trends using browser tool
2. Check Farcaster /base channel for discussions
3. Query Dune for onchain metrics
4. Review pending suggestions from dashboard
5. Score all signals and save to memory/trends.md

## Phase 2: Synthesis Decision (12:00-13:00 UTC)
1. Select highest-scoring viable trend
2. Determine output type (token/NFT/dApp)
3. Generate project name and description
4. Log decision rationale to memory/drops.md

## Phase 3: Development (13:00-18:00 UTC)
1. Create GitHub repository
2. Generate smart contract code
3. Write deployment script
4. Deploy to Base Sepolia
5. Run verification tests
6. IF tests pass: Deploy to Base Mainnet
7. Verify on Basescan
8. IF webapp needed: Build and deploy to Vercel
9. Push all code to GitHub

## Phase 4: Broadcast (18:00-19:00 UTC)
1. Generate Twitter thread (5 tweets)
2. Post thread via Twitter API
3. Cross-post to Farcaster via Neynar
4. Update dashboard via API

## Error Handling
- If any phase fails, log error and skip to next cycle
- Never deploy to mainnet if testnet fails
- Always notify admin panel of failures
