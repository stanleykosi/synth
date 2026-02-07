# SYNTH

## Project Description
 SYNTH is a fully autonomous onchain app launchpad powered by OpenClaw. The AI agent continuously monitors Twitter/X, Farcaster, and onchain data sources to detect emerging community needs and trends. When it identifies a compelling opportunity, it autonomously designs, builds, tests, and deploys the appropriate solution—whether an ERC-20 token, NFT collection, custom smart contract, or complete web application with smart contract integration—on the Base L2 blockchain.

The agent operates on a rigorous pipeline: trend analysis → design decision → development → testnet verification → mainnet deployment → social announcement. Each launch includes a Twitter thread explainer cross-posted to Farcaster, with links to the open-source GitHub repository and verified contract on Basescan.

A futuristic public dashboard showcases all deployments and accepts community suggestions via wallet-connected staking. An admin panel provides operator oversight of the agent's decisions and wallet status.

**Cadence:** One deployment per day maximum.
**Philosophy:** Full autonomy, self-shipping, open source by default.

## Target Audience
- Crypto-native builders and experimenters
- Base ecosystem participants
- Web3 enthusiasts interested in AI-driven development
- VCs and researchers tracking autonomous agent capabilities
- Community members who want their ideas realized autonomously

## Desired Features

### Trend Detection Engine
- [ ] Multi-platform monitoring using OpenClaw browser + web tools
    - [ ] Twitter/X: Scrape crypto Twitter, Base hashtags, influential accounts
    - [ ] Farcaster: Monitor /base channel, trending casts, builder discussions
    - [ ] Onchain: Use Dune Analytics, The Graph (free tiers), RPC queries
- [ ] Open-ended detection—full agent autonomy on what to pursue
- [ ] Validation framework for trend selection
    - [ ] WHO is talking (influencer weight, builder credibility)
    - [ ] Engagement velocity (growth rate of mentions/interest)
    - [ ] Technical feasibility (can this be built in a day?)
    - [ ] Gap analysis (does a good solution already exist?)
    - [ ] Originality score (how novel is this idea?)
- [ ] Community suggestions integration (dashboard)
- [ ] Daily trend digest saved to OpenClaw memory

### Smart Contract Development & Deployment
- [ ] Full autonomy on contract type selection
    - [ ] ERC-20 tokens (meme, utility, governance)
    - [ ] NFT collections (ERC-721, ERC-721A, ERC-1155)
    - [ ] Custom contracts (tipping, voting, escrow, staking, games)
    - [ ] Factory contracts for permissionless community launches
- [ ] OpenZeppelin base templates with custom logic
- [ ] Compilation via OpenClaw exec (Foundry)
- [ ] Deployment pipeline
    - [ ] Base Sepolia testnet first
    - [ ] Automated testing & verification
    - [ ] Mainnet deployment only after testnet success
- [ ] Contract verification on Basescan
- [ ] All artifacts stored in OpenClaw memory

### Web Application Development
- [ ] Build web frontends when appropriate
    - [ ] Token pages with info and links
    - [ ] NFT minting sites
    - [ ] dApp interfaces for custom contracts
- [ ] Deploy to Vercel ([app-name].vercel.app)
- [ ] Each project gets its own GitHub repository
- [ ] Agent has creative freedom within quality baseline

### GitHub Integration
- [ ] Dedicated GitHub organization/account
- [ ] All projects open source (MIT license)
- [ ] Each repo includes:
    - [ ] Smart contract source code
    - [ ] Deployment scripts (Foundry)
    - [ ] Frontend source (if applicable)
    - [ ] README with project description and links

### Social Publishing
- [ ] Twitter/X thread for each deployment (via Twitter API)
    - [ ] Trend analysis summary (why this was built)
    - [ ] Project overview (what it does)
    - [ ] GitHub repository link
    - [ ] Basescan contract link
    - [ ] Vercel web app link (if applicable)
    - [ ] Community call-to-action
- [ ] Cross-post to Farcaster (via Neynar API)

### Public Dashboard
- [ ] Launch log with all deployments
    - [ ] Filterable by type (token, NFT, dApp, web app)
    - [ ] Sortable by date, engagement, type
    - [ ] Rich cards with all relevant links
    - [ ] Trend source attribution
- [ ] Suggestion System with Staking
    - [ ] Wallet connection (Base chain) required
    - [ ] Minimum stake to submit (0.001 ETH)
    - [ ] Suggestions ranked by stake amount
    - [ ] Agent prioritizes top-staked suggestions
    - [ ] Stakes returned after review
    - [ ] Builder credit if suggestion is used
- [ ] Live "Watching" feed of tracked trends
- [ ] Metrics dashboard
    - [ ] Total deployments
    - [ ] Contracts deployed by type
    - [ ] GitHub stars aggregate
    - [ ] Suggestions received/built
    - [ ] Wallet balance status

### Admin Panel
- [ ] Agent decision logs (why it picked specific trends)
- [ ] Current pipeline status (what's being built today)
- [ ] Manual pause/resume capability
- [ ] Wallet balance monitoring
- [ ] API rate limit status
- [ ] Memory/history browser
- [ ] Override capability (force specific suggestion)
- [ ] Deployment history with gas costs
- [ ] Error logs and retry controls

### Agent Infrastructure
- [ ] OpenClaw gateway with full autonomous operation
- [ ] Hot wallet for deployments
    - [ ] Initial funding: $10 worth of ETH on Base
    - [ ] Private key securely stored in OpenClaw config
- [ ] Cron/heartbeat schedule for daily cycle
    - [ ] Morning: Trend analysis + suggestion review
    - [ ] Midday: Development & testing
    - [ ] Evening: Deployment & social announcement
- [ ] Command queue for pipeline serialization
- [ ] Memory system for launch history + learnings
- [ ] API integrations
    - [ ] Twitter API (posting)
    - [ ] Neynar/Farcaster API (posting + reading)
    - [ ] Vercel API (deployment)
    - [ ] GitHub API (repo management)
    - [ ] Dune/Graph (onchain data)

## Design Requests

### Dashboard Aesthetic
- [ ] Futuristic yet balanced—sophisticated restraint
- [ ] Unique, instantly recognizable branding
- [ ] Dark mode primary
- [ ] Subtle animations and micro-interactions
- [ ] Mobile responsive
- [ ] Blend of: terminal aesthetics + glassmorphism + subtle neon accents
- [ ] Feel "alive" and autonomous

### Admin Panel Design
- [ ] Clean, functional, data-dense
- [ ] Real-time updates
- [ ] Clear status indicators
- [ ] Quick action buttons

### Branding (TBD with name)
- [ ] Distinctive logo
- [ ] Dark base with accent colors (cyber blue, electric purple, etc.)
- [ ] Modern technical typography
- [ ] Consistent visual language across dashboard + socials

## Technical Architecture

### OpenClaw Configuration
- Workspace: Dedicated agent workspace
- Memory: Launch history, trend logs, learnings
- Skills: Custom skills for contract deployment, social posting
- Exec: Foundry for compilation/deployment
- Browser: Trend scraping (Twitter, Farcaster)
- Cron: Daily deployment cycle
- Queue: Serialize deployment pipeline

### External Services
- Vercel: Web app hosting (free tier)
- GitHub: Code repository (free org)
- Twitter API: Social posting
- Neynar: Farcaster integration
- Dune Analytics: Onchain data (free tier)
- The Graph: Contract indexing (free tier)
- Base RPC: Chain interaction (Alchemy free tier)

### Smart Contract Stack
- Foundry: Toolchain
- OpenZeppelin: Base templates
- Base Sepolia: Testnet
- Base Mainnet: Production

## Development Approach
- **Full autonomy from day one** — no phased restrictions
- **Immediate start** — building now
- Agent can deploy any type (token, NFT, dApp, web app) based on its analysis
- OpenZeppelin templates as foundation, custom logic as needed

## Other Notes
- **Fully autonomous** — no human approval in deployment loop
- **Open source everything** — MIT license default
- **Initial budget:** $10 ETH on Base + hosting
- **Admin panel:** Full oversight without blocking autonomy
