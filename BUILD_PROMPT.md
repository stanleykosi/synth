# SYNTH — Agent Build Prompt

> **Copy this entire file and send it to your coding agent.**

---

## PROMPT START

You are building **SYNTH**, a fully autonomous onchain synthesis engine. This is a production-ready project that must be deployable immediately after you complete it.

### YOUR TASK

Build the complete SYNTH project from scratch, following the specifications in these files located at `/home/stanley/openclaw-base/`:

1. **`AGENTS.md`** — Master specification (architecture, tech stack, design system, contracts, build order)
2. **`COMPONENTS.md`** — All React components with CSS modules
3. **`PAGES.md`** — All pages, API routes, admin panel, deployment scripts
4. **`openclaw_docs.md`** — OpenClaw framework documentation (reference for agent features)

### CRITICAL REQUIREMENTS

1. **Production-Ready Code Only**
   - No TODOs, no placeholders, no "implement later" comments
   - All error handling implemented
   - All edge cases covered
   - All TypeScript types properly defined
   - No `any` types unless absolutely necessary

2. **Exact Design System Compliance**
   - Use ONLY the CSS variables defined in `AGENTS.md`
   - NO Tailwind CSS under any circumstances
   - Match the aesthetic exactly: dark mode, cyber mint accents, glassmorphism
   - All components must be mobile responsive

3. **Smart Contract Requirements**
   - All contracts must compile without warnings
   - All contracts must pass their tests
   - Use OpenZeppelin v5.x contracts
   - Include NatSpec documentation on all public functions
   - Gas-optimized where possible

4. **Security Requirements**
   - No private keys or secrets in code
   - All secrets via environment variables
   - Input validation on all API routes
   - Rate limiting considerations documented
   - ReentrancyGuard on all payable functions

5. **Testing Requirements**
   - Foundry tests for all smart contracts
   - Minimum 80% coverage on contracts
   - Test all critical paths

### BUILD EXECUTION ORDER

Execute these steps in EXACT order. Do not skip steps.

#### Phase 1: Project Initialization
```bash
# Step 1.1: Create project directory
mkdir synth && cd synth

# Step 1.2: Initialize monorepo
npm init -y
npm install turbo -D

# Step 1.3: Create directory structure
mkdir -p apps/web/src/{app,components,lib,hooks}
mkdir -p apps/web/public
mkdir -p apps/admin/src/{app,components,lib}
mkdir -p packages/contracts/{src,test,script}
mkdir -p packages/contracts/src/templates
mkdir -p packages/agent/{memory,skills}
mkdir -p data
```

#### Phase 2: Root Configuration
- Create `turbo.json` (from AGENTS.md)
- Create root `package.json` with workspaces
- Create `.gitignore`
- Create `.env.example` with ALL required variables
- Create `README.md`

#### Phase 3: Smart Contracts (packages/contracts)
```bash
cd packages/contracts
forge init . --no-commit
forge install OpenZeppelin/openzeppelin-contracts
```
- Create `foundry.toml` (from AGENTS.md)
- Create `src/SynthSuggestions.sol` (from AGENTS.md)
- Create `src/templates/SynthERC20.sol` (from AGENTS.md)
- Create `src/templates/SynthERC721.sol`
- Create `src/templates/SynthERC1155.sol`
- Create `test/SynthSuggestions.t.sol` with full test coverage
- Create `script/DeploySuggestions.s.sol` (from PAGES.md)
- Run `forge build` — must pass
- Run `forge test` — must pass

#### Phase 4: Web Dashboard (apps/web)
```bash
cd apps/web
npx create-next-app@latest . --typescript --app --src-dir --no-tailwind --eslint --no-turbopack
npm install viem wagmi @tanstack/react-query
```
- Create `src/app/globals.css` (complete design system from AGENTS.md)
- Create `src/lib/wagmi.ts` (from COMPONENTS.md)
- Create `src/lib/contracts.ts` (from COMPONENTS.md)
- Create `src/lib/api.ts`
- Create `src/app/providers.tsx` (from COMPONENTS.md)
- Create `src/app/layout.tsx` (from COMPONENTS.md)
- Update `next.config.js` for production
- Create all components from COMPONENTS.md:
  - `src/components/Header.tsx` + `Header.module.css`
  - `src/components/DropCard.tsx` + `DropCard.module.css`
  - `src/components/SuggestionForm.tsx` + `SuggestionForm.module.css`
  - `src/components/ConnectButton.tsx` + `ConnectButton.module.css`
  - `src/components/Metrics.tsx` + `Metrics.module.css`
  - `src/components/TrendFeed.tsx` + `TrendFeed.module.css`
- Create all pages from PAGES.md:
  - `src/app/page.tsx` + `page.module.css`
  - `src/app/drops/page.tsx` + `page.module.css`
  - `src/app/suggest/page.tsx` + `page.module.css`
- Create all API routes from PAGES.md:
  - `src/app/api/drops/route.ts`
  - `src/app/api/suggestions/route.ts`
  - `src/app/api/trends/route.ts`
- Create `data/drops.json` with sample data
- Run `npm run build` — must pass with zero errors

#### Phase 5: Admin Panel (apps/admin)
```bash
cd apps/admin
npx create-next-app@latest . --typescript --app --src-dir --no-tailwind --eslint --no-turbopack
npm install viem
```
- Copy `globals.css` from web app
- Create admin-specific components from PAGES.md:
  - `src/components/LogViewer.tsx` + `LogViewer.module.css`
  - `src/components/WalletStatus.tsx` + `WalletStatus.module.css`
  - `src/components/ControlPanel.tsx` + `ControlPanel.module.css`
- Create admin pages:
  - `src/app/page.tsx` (dashboard)
  - `src/app/logs/page.tsx`
  - `src/app/wallet/page.tsx`
- Create admin API routes:
  - `src/app/api/logs/route.ts`
  - `src/app/api/wallet/route.ts`
  - `src/app/api/control/route.ts`
- Implement basic auth middleware
- Run `npm run build` — must pass

#### Phase 6: OpenClaw Agent (packages/agent)
- Create `IDENTITY.md` (from AGENTS.md)
- Create `HEARTBEAT.md` (from AGENTS.md)
- Create `AGENTS.md` (agent-specific instructions)
- Create `memory/drops.md` (template)
- Create `memory/trends.md` (template)
- Create skill folders:
  - `skills/trend-detector/SKILL.md`
  - `skills/contract-synth/SKILL.md`
  - `skills/social-broadcast/SKILL.md`
  - `skills/web-builder/SKILL.md`

#### Phase 7: Final Verification
```bash
# From root directory
npm run build  # Must complete with zero errors

# Verify contracts
cd packages/contracts
forge build
forge test -vvv

# Verify web
cd apps/web
npm run build
npm run lint

# Verify admin
cd apps/admin
npm run build
npm run lint
```

### OUTPUT REQUIREMENTS

After completing all phases, you MUST provide:

#### 1. Build Confirmation
Confirm that every step completed successfully:
```
✅ Phase 1: Project Initialization — COMPLETE
✅ Phase 2: Root Configuration — COMPLETE
✅ Phase 3: Smart Contracts — COMPLETE (forge build ✓, forge test ✓)
✅ Phase 4: Web Dashboard — COMPLETE (npm run build ✓)
✅ Phase 5: Admin Panel — COMPLETE (npm run build ✓)
✅ Phase 6: OpenClaw Agent — COMPLETE
✅ Phase 7: Final Verification — ALL CHECKS PASSED
```

#### 2. File Manifest
List every file created with its path.

#### 3. Production Deployment Report

Provide a COMPLETE deployment guide with these sections:

---

## SYNTH PRODUCTION DEPLOYMENT REPORT

### A. Prerequisites Checklist
- [ ] **Domain**: Purchase domain (e.g., synth.xyz, synthengine.xyz)
- [ ] **Vercel Account**: Create account at vercel.com
- [ ] **GitHub Account**: Create `synth-labs` organization
- [ ] **Twitter Developer Account**: Apply at developer.twitter.com
- [ ] **Neynar Account**: Sign up at neynar.com for Farcaster API
- [ ] **Alchemy Account**: For Base RPC (or use public RPC)
- [ ] **Basescan Account**: For contract verification API key

### B. Wallet Setup
1. Generate a new Ethereum wallet for SYNTH:
   ```bash
   cast wallet new
   ```
2. Save the private key securely (password manager)
3. Fund wallet with ~$10 ETH on Base mainnet:
   - Bridge ETH from mainnet via https://bridge.base.org
   - Or purchase directly via Base-supported onramp

### C. API Keys to Obtain
| Service | Purpose | URL |
|---------|---------|-----|
| Basescan | Contract verification | https://basescan.org/apis |
| Twitter API | Post threads | https://developer.twitter.com |
| Neynar | Farcaster posting | https://neynar.com |
| Vercel | Hosting | https://vercel.com |
| GitHub Token | Repo creation | https://github.com/settings/tokens |
| Dune (optional) | Onchain data | https://dune.com/docs/api |

### D. Environment Variables
Create `.env` files with these values:

**packages/contracts/.env**
```
DEPLOYER_PRIVATE_KEY=<your-wallet-private-key>
BASE_RPC=https://mainnet.base.org
BASE_SEPOLIA_RPC=https://sepolia.base.org
BASESCAN_API_KEY=<your-basescan-api-key>
```

**apps/web/.env.local**
```
NEXT_PUBLIC_SUGGESTIONS_ADDRESS=<deployed-contract-address>
NEXT_PUBLIC_CHAIN_ID=8453
NEXT_PUBLIC_API_URL=https://your-domain.com
ADMIN_SECRET=<generate-random-32-char-string>
```

**apps/admin/.env.local**
```
ADMIN_SECRET=<same-as-above>
DEPLOYER_ADDRESS=<your-wallet-address>
BASE_RPC=https://mainnet.base.org
```

### E. Contract Deployment Steps

**Step 1: Deploy to Base Sepolia (Testnet)**
```bash
cd packages/contracts

# Deploy
forge script script/DeploySuggestions.s.sol:DeploySuggestions \
  --rpc-url $BASE_SEPOLIA_RPC \
  --broadcast \
  --verify

# Note the deployed address from output
```

**Step 2: Test on Testnet**
- Connect wallet to Base Sepolia
- Submit a test suggestion via dashboard
- Verify contract on Sepolia Basescan

**Step 3: Deploy to Base Mainnet**
```bash
forge script script/DeploySuggestions.s.sol:DeploySuggestions \
  --rpc-url $BASE_RPC \
  --broadcast \
  --verify

# Save the mainnet contract address
```

### F. Frontend Deployment (Vercel)

**Step 1: Push to GitHub**
```bash
git init
git add .
git commit -m "Initial SYNTH deployment"
git remote add origin https://github.com/synth-labs/synth.git
git push -u origin main
```

**Step 2: Deploy Web Dashboard**
1. Go to https://vercel.com/new
2. Import `synth` repository
3. Set root directory to `apps/web`
4. Add environment variables from section D
5. Deploy

**Step 3: Deploy Admin Panel**
1. Create new Vercel project
2. Set root directory to `apps/admin`
3. Add environment variables
4. Set custom domain (e.g., admin.synth.xyz)
5. Deploy

### G. Domain Configuration
1. In Vercel, go to Project Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Wait for SSL certificate (automatic)

### H. OpenClaw Agent Setup

**Step 1: Install OpenClaw**
```bash
npm install -g openclaw
openclaw setup --wizard
```

**Step 2: Configure Agent**
```bash
# Copy agent files to OpenClaw workspace
cp -r packages/agent/* ~/.openclaw/workspace/
```

**Step 3: Configure API Keys**
Edit `~/.openclaw/openclaw.json`:
```json
{
  "tools": {
    "web": {
      "search": {
        "provider": "brave",
        "apiKey": "<your-brave-api-key>"
      }
    }
  },
  "env": {
    "TWITTER_API_KEY": "<key>",
    "TWITTER_API_SECRET": "<secret>",
    "TWITTER_ACCESS_TOKEN": "<token>",
    "TWITTER_ACCESS_SECRET": "<token-secret>",
    "NEYNAR_API_KEY": "<key>",
    "GITHUB_TOKEN": "<token>",
    "VERCEL_TOKEN": "<token>",
    "DEPLOYER_PRIVATE_KEY": "<key>"
  }
}
```

**Step 4: Enable Heartbeat**
Edit `~/.openclaw/openclaw.json`:
```json
{
  "agents": {
    "defaults": {
      "heartbeat": {
        "every": "24h"
      }
    }
  }
}
```

**Step 5: Start Gateway**
```bash
openclaw gateway start
```

### I. Social Account Setup

**Twitter/X**
1. Create @SynthEngine account (or similar)
2. Apply for developer account
3. Create app with read/write permissions
4. Generate access tokens

**Farcaster**
1. Create account at warpcast.com
2. Sign up for Neynar API
3. Get API key and signer


### J. Final Go-Live Checklist

- [ ] Mainnet contract deployed and verified
- [ ] Web dashboard accessible at production URL
- [ ] Admin panel accessible and authenticated
- [ ] Wallet funded with sufficient ETH (~$10+)
- [ ] All environment variables set
- [ ] OpenClaw agent configured and running
- [ ] Twitter API connected and posting works
- [ ] Farcaster API connected and posting works
- [ ] GitHub org created and token configured
- [ ] Sample drop data added to dashboard
- [ ] Mobile responsive verified
- [ ] SSL certificates active

### K. Monitoring & Maintenance

**Daily**
- Check wallet balance (should not drop below $2)
- Review agent logs for errors
- Verify heartbeat is running

**Weekly**
- Review deployment costs
- Check API rate limits
- Backup memory files

**Monthly**
- Review gas costs and optimize if needed
- Update dependencies
- Review and prune old data

---

### COST ESTIMATE

| Item | Monthly Cost |
|------|-------------|
| Vercel (Hobby) | $0 |
| VPS for OpenClaw (optional) | $5-20 |
| Base gas (~30 deploys) | ~$5 |
| Twitter API (Basic) | $100 |
| Domain | ~$1 |
| **Total** | **~$110-130/month** |

*Note: Twitter API Basic tier may not be needed if using browser automation for trends.*

---

## END OF PROMPT

### REMINDER TO CODING AGENT

1. Build everything in the exact order specified
2. Every file must be production-ready
3. All builds must pass with zero errors
4. Provide the complete deployment report at the end
5. Do not skip any steps
6. Do not use placeholders or TODOs

**START BUILDING NOW.**
