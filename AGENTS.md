# SYNTH — Complete Implementation Guide

> **CRITICAL**: Read this ENTIRE document before writing ANY code. This is your complete specification.

---

## PROJECT IDENTITY

**Name**: SYNTH  
**Tagline**: "From Noise to Signal"  
**What it does**: Autonomous AI agent that monitors trends (Twitter, Farcaster, onchain) and deploys products (tokens, NFTs, dApps) on Base L2 daily.

---

## TECH STACK (NON-NEGOTIABLE)

| Layer | Technology | Why |
|-------|------------|-----|
| Monorepo | Turborepo | Manages apps + packages |
| Frontend | Next.js 14 (App Router) | Modern React SSR |
| Styling | **Vanilla CSS only** | No Tailwind |
| Web3 | Viem + Wagmi v2 | Type-safe, modern |
| Contracts | Foundry + OpenZeppelin | Industry standard |
| Agent | OpenClaw | See openclaw_docs.md |
| Chain | Base (L2) | Low gas, EVM |

---

## FOLDER STRUCTURE (CREATE EXACTLY THIS)

```
synth/
├── apps/
│   ├── web/                      # Public dashboard
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx
│   │   │   │   ├── globals.css
│   │   │   │   ├── drops/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── suggest/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── api/
│   │   │   │       ├── drops/route.ts
│   │   │   │       ├── suggestions/route.ts
│   │   │   │       └── trends/route.ts
│   │   │   ├── components/
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── DropCard.tsx
│   │   │   │   ├── TrendFeed.tsx
│   │   │   │   ├── SuggestionForm.tsx
│   │   │   │   ├── ConnectButton.tsx
│   │   │   │   └── Metrics.tsx
│   │   │   ├── lib/
│   │   │   │   ├── wagmi.ts
│   │   │   │   ├── contracts.ts
│   │   │   │   └── api.ts
│   │   │   └── hooks/
│   │   │       └── useDrops.ts
│   │   ├── public/
│   │   ├── next.config.js
│   │   └── package.json
│   │
│   └── admin/                    # Admin panel
│       ├── src/
│       │   ├── app/
│       │   │   ├── layout.tsx
│       │   │   ├── page.tsx
│       │   │   ├── globals.css
│       │   │   ├── logs/page.tsx
│       │   │   ├── wallet/page.tsx
│       │   │   └── api/
│       │   │       ├── logs/route.ts
│       │   │       ├── wallet/route.ts
│       │   │       └── control/route.ts
│       │   └── components/
│       │       ├── LogViewer.tsx
│       │       ├── WalletStatus.tsx
│       │       └── ControlPanel.tsx
│       └── package.json
│
├── packages/
│   ├── contracts/                # Foundry project
│   │   ├── src/
│   │   │   ├── SynthSuggestions.sol
│   │   │   ├── templates/
│   │   │   │   ├── SynthERC20.sol
│   │   │   │   ├── SynthERC721.sol
│   │   │   │   └── SynthERC1155.sol
│   │   ├── test/
│   │   │   └── SynthSuggestions.t.sol
│   │   ├── script/
│   │   │   ├── DeploySuggestions.s.sol
│   │   │   └── DeployToken.s.sol
│   │   ├── foundry.toml
│   │   └── .env.example
│   │
│   └── agent/                    # OpenClaw agent
│       ├── IDENTITY.md
│       ├── HEARTBEAT.md
│       ├── AGENTS.md
│       ├── memory/
│       │   ├── drops.md
│       │   └── trends.md
│       └── skills/
│           ├── trend-detector/SKILL.md
│           ├── contract-synth/SKILL.md
│           └── social-broadcast/SKILL.md
│
├── package.json                  # Root package.json
├── turbo.json
├── .gitignore
├── .env.example
└── README.md
```

---

## STEP-BY-STEP BUILD INSTRUCTIONS

### STEP 1: Initialize Monorepo

Run these commands in order:

```bash
mkdir synth && cd synth
npm init -y
npm install turbo -D
mkdir -p apps/web apps/admin packages/contracts packages/agent
```

Create `turbo.json`:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": [".next/**", "out/**"] },
    "dev": { "cache": false, "persistent": true },
    "lint": { "dependsOn": ["^lint"] },
    "test": { "dependsOn": ["^build"] }
  }
}
```

Update root `package.json`:
```json
{
  "name": "synth",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "dev:web": "turbo dev --filter=web",
    "dev:admin": "turbo dev --filter=admin"
  },
  "devDependencies": {
    "turbo": "^2.0.0"
  }
}
```

### STEP 2: Create Web Dashboard (apps/web)

Initialize Next.js:
```bash
cd apps/web
npx create-next-app@latest . --typescript --app --src-dir --no-tailwind --eslint
npm install viem wagmi @tanstack/react-query
```

---

## DESIGN SYSTEM (USE EXACTLY THESE VALUES)

Create `apps/web/src/app/globals.css`:

```css
/* ========================================
   SYNTH DESIGN SYSTEM
   ======================================== */

@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Outfit:wght@400;500;600;700;800&display=swap');

:root {
  /* Background Colors */
  --bg-primary: #050508;
  --bg-secondary: #0a0a10;
  --bg-tertiary: #101018;
  --bg-card: #12121c;
  --bg-elevated: #1a1a28;
  
  /* Accent Colors */
  --accent-primary: #00ffa3;
  --accent-secondary: #7c5cff;
  --accent-tertiary: #ff3d71;
  --accent-glow: rgba(0, 255, 163, 0.15);
  
  /* Text Colors */
  --text-primary: #ffffff;
  --text-secondary: #b0b0c0;
  --text-muted: #606080;
  --text-accent: var(--accent-primary);
  
  /* Borders */
  --border-subtle: rgba(255, 255, 255, 0.06);
  --border-accent: rgba(0, 255, 163, 0.3);
  
  /* Typography */
  --font-mono: 'JetBrains Mono', monospace;
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-display: 'Outfit', sans-serif;
  
  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;
  --space-3xl: 64px;
  
  /* Radii */
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  
  /* Shadows */
  --shadow-glow: 0 0 30px rgba(0, 255, 163, 0.1);
  --shadow-card: 0 4px 24px rgba(0, 0, 0, 0.4);
  
  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-base: 250ms ease;
  --transition-slow: 400ms ease;
}

/* Reset */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  font-family: var(--font-sans);
  background: var(--bg-primary);
  color: var(--text-primary);
  line-height: 1.6;
  min-height: 100vh;
}

/* Background Pattern */
body::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(ellipse at top, rgba(0, 255, 163, 0.03) 0%, transparent 50%),
    radial-gradient(ellipse at bottom right, rgba(124, 92, 255, 0.03) 0%, transparent 50%);
  pointer-events: none;
  z-index: -1;
}

/* Typography */
h1, h2, h3, h4 {
  font-family: var(--font-display);
  font-weight: 700;
  line-height: 1.2;
}

h1 { font-size: 3rem; }
h2 { font-size: 2rem; }
h3 { font-size: 1.5rem; }
h4 { font-size: 1.25rem; }

code, .mono {
  font-family: var(--font-mono);
}

/* Links */
a {
  color: var(--accent-primary);
  text-decoration: none;
  transition: opacity var(--transition-fast);
}

a:hover {
  opacity: 0.8;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-lg);
  font-family: var(--font-sans);
  font-size: 0.875rem;
  font-weight: 600;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-base);
}

.btn-primary {
  background: var(--accent-primary);
  color: var(--bg-primary);
}

.btn-primary:hover {
  box-shadow: 0 0 24px rgba(0, 255, 163, 0.4);
  transform: translateY(-2px);
}

.btn-secondary {
  background: transparent;
  color: var(--text-primary);
  border: 1px solid var(--border-subtle);
}

.btn-secondary:hover {
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

/* Cards */
.card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  transition: all var(--transition-base);
}

.card:hover {
  border-color: var(--border-accent);
  box-shadow: var(--shadow-glow);
}

/* Glass Effect */
.glass {
  background: rgba(18, 18, 28, 0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

/* Glow Text */
.glow {
  text-shadow: 0 0 20px rgba(0, 255, 163, 0.5);
}

/* Container */
.container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--space-lg);
}

/* Grid */
.grid {
  display: grid;
  gap: var(--space-lg);
}

.grid-2 { grid-template-columns: repeat(2, 1fr); }
.grid-3 { grid-template-columns: repeat(3, 1fr); }

@media (max-width: 768px) {
  .grid-2, .grid-3 { grid-template-columns: 1fr; }
  h1 { font-size: 2rem; }
}

/* Status Badge */
.badge {
  display: inline-flex;
  align-items: center;
  padding: var(--space-xs) var(--space-sm);
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: var(--radius-sm);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.badge-success {
  background: rgba(0, 255, 163, 0.15);
  color: var(--accent-primary);
}

.badge-warning {
  background: rgba(255, 170, 0, 0.15);
  color: #ffaa00;
}

.badge-error {
  background: rgba(255, 61, 113, 0.15);
  color: var(--accent-tertiary);
}

/* Input */
.input {
  width: 100%;
  padding: var(--space-md);
  font-family: var(--font-mono);
  font-size: 0.875rem;
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  transition: border-color var(--transition-fast);
}

.input:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.input::placeholder {
  color: var(--text-muted);
}

/* Utility Classes */
.text-center { text-align: center; }
.text-muted { color: var(--text-muted); }
.text-accent { color: var(--accent-primary); }
.mt-sm { margin-top: var(--space-sm); }
.mt-md { margin-top: var(--space-md); }
.mt-lg { margin-top: var(--space-lg); }
.mb-lg { margin-bottom: var(--space-lg); }
.flex { display: flex; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.gap-sm { gap: var(--space-sm); }
.gap-md { gap: var(--space-md); }
```

---

## SMART CONTRACTS (FOUNDRY)

### Initialize Foundry (packages/contracts)

```bash
cd packages/contracts
forge init . --no-commit
forge install OpenZeppelin/openzeppelin-contracts
```

Create `foundry.toml`:
```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc = "0.8.24"
optimizer = true
optimizer_runs = 200

remappings = [
    "@openzeppelin/=lib/openzeppelin-contracts/"
]

[rpc_endpoints]
base_sepolia = "${BASE_SEPOLIA_RPC}"
base = "${BASE_RPC}"

[etherscan]
base_sepolia = { key = "${BASESCAN_API_KEY}", url = "https://api-sepolia.basescan.org/api" }
base = { key = "${BASESCAN_API_KEY}", url = "https://api.basescan.org/api" }
```

### SynthSuggestions.sol (Core Contract)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract SynthSuggestions is Ownable, ReentrancyGuard {
    uint256 public constant MIN_STAKE = 0.001 ether;
    
    struct Suggestion {
        uint256 id;
        address submitter;
        string content;
        uint256 stake;
        uint256 timestamp;
        bool reviewed;
        bool built;
    }
    
    Suggestion[] public suggestions;
    mapping(address => uint256[]) public userSuggestions;
    
    event SuggestionSubmitted(uint256 indexed id, address indexed submitter, uint256 stake);
    event SuggestionReviewed(uint256 indexed id, bool built);
    event StakeReturned(uint256 indexed id, address indexed submitter, uint256 amount);
    
    constructor() Ownable(msg.sender) {}
    
    function submit(string calldata content) external payable nonReentrant {
        require(msg.value >= MIN_STAKE, "Insufficient stake");
        require(bytes(content).length > 0 && bytes(content).length <= 1000, "Invalid content length");
        
        uint256 id = suggestions.length;
        suggestions.push(Suggestion({
            id: id,
            submitter: msg.sender,
            content: content,
            stake: msg.value,
            timestamp: block.timestamp,
            reviewed: false,
            built: false
        }));
        
        userSuggestions[msg.sender].push(id);
        emit SuggestionSubmitted(id, msg.sender, msg.value);
    }
    
    function markReviewed(uint256 id, bool wasBuilt) external onlyOwner nonReentrant {
        require(id < suggestions.length, "Invalid suggestion");
        Suggestion storage s = suggestions[id];
        require(!s.reviewed, "Already reviewed");
        
        s.reviewed = true;
        s.built = wasBuilt;
        
        // Return stake
        uint256 amount = s.stake;
        s.stake = 0;
        
        (bool success, ) = payable(s.submitter).call{value: amount}("");
        require(success, "Transfer failed");
        
        emit SuggestionReviewed(id, wasBuilt);
        emit StakeReturned(id, s.submitter, amount);
    }
    
    function getSuggestion(uint256 id) external view returns (Suggestion memory) {
        require(id < suggestions.length, "Invalid suggestion");
        return suggestions[id];
    }
    
    function getTopSuggestions(uint256 limit) external view returns (Suggestion[] memory) {
        uint256 pending = 0;
        for (uint256 i = 0; i < suggestions.length; i++) {
            if (!suggestions[i].reviewed) pending++;
        }
        
        uint256 count = pending < limit ? pending : limit;
        Suggestion[] memory result = new Suggestion[](count);
        
        // Simple sort by stake (bubble sort for small arrays)
        uint256[] memory indices = new uint256[](pending);
        uint256 idx = 0;
        for (uint256 i = 0; i < suggestions.length; i++) {
            if (!suggestions[i].reviewed) {
                indices[idx++] = i;
            }
        }
        
        // Sort by stake descending
        for (uint256 i = 0; i < indices.length; i++) {
            for (uint256 j = i + 1; j < indices.length; j++) {
                if (suggestions[indices[j]].stake > suggestions[indices[i]].stake) {
                    uint256 temp = indices[i];
                    indices[i] = indices[j];
                    indices[j] = temp;
                }
            }
        }
        
        for (uint256 i = 0; i < count; i++) {
            result[i] = suggestions[indices[i]];
        }
        
        return result;
    }
    
    function totalSuggestions() external view returns (uint256) {
        return suggestions.length;
    }
    
    function getUserSuggestions(address user) external view returns (uint256[] memory) {
        return userSuggestions[user];
    }
    
    // Emergency withdraw (owner only)
    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}
```

### ERC20 Template (src/templates/SynthERC20.sol)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SynthERC20 is ERC20, ERC20Burnable, Ownable {
    uint8 private _decimals;
    
    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        uint256 initialSupply_,
        address initialHolder_
    ) ERC20(name_, symbol_) Ownable(initialHolder_) {
        _decimals = decimals_;
        _mint(initialHolder_, initialSupply_ * 10 ** decimals_);
    }
    
    function decimals() public view override returns (uint8) {
        return _decimals;
    }
}
```

---

## OPENCLAW AGENT CONFIGURATION

### packages/agent/IDENTITY.md

```markdown
# SYNTH Agent Identity

I am SYNTH, an autonomous onchain synthesis engine.

## Core Mission
Transform market noise into tangible onchain products on Base L2.

## Personality
- Direct and technical
- Data-driven decision maker
- Transparent about my reasoning
- Slightly edgy, crypto-native voice

## Capabilities
1. Monitor Twitter, Farcaster, and onchain data for trends
2. Analyze and score opportunities
3. Generate and deploy smart contracts
4. Build and deploy web applications
5. Announce launches on social media

## Constraints
- Maximum 1 deployment per 24-hour cycle
- Must test on Base Sepolia before mainnet
- Must open-source all code
- Must explain reasoning for every decision
```

### packages/agent/HEARTBEAT.md

```markdown
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
```

---

## ENVIRONMENT VARIABLES (.env.example)

```bash
# Blockchain
BASE_RPC=https://mainnet.base.org
BASE_SEPOLIA_RPC=https://sepolia.base.org
DEPLOYER_PRIVATE_KEY=

# APIs
BASESCAN_API_KEY=
TWITTER_API_KEY=
TWITTER_API_SECRET=
TWITTER_ACCESS_TOKEN=
TWITTER_ACCESS_SECRET=
NEYNAR_API_KEY=
GITHUB_TOKEN=
VERCEL_TOKEN=
DUNE_API_KEY=

# Admin
ADMIN_SECRET=

# Contracts (deployed addresses)
NEXT_PUBLIC_SUGGESTIONS_ADDRESS=
NEXT_PUBLIC_CHAIN_ID=8453
```

---

## CRITICAL RULES FOR IMPLEMENTATION

1. **NO TAILWIND** - Use only the CSS provided above
2. **NO PLACEHOLDER IMAGES** - Generate real images or use icons
3. **DARK MODE ONLY** - No light theme
4. **TEST BEFORE MAINNET** - Always Sepolia first
5. **FOUNDRY FOR CONTRACTS** - Not Hardhat
6. **NEXT.JS APP ROUTER** - Not Pages Router
7. **VIEM + WAGMI** - Not ethers.js
8. **MONOREPO WITH TURBO** - Not separate repos
9. **OPEN SOURCE ALL CODE** - MIT license
10. **LOG ALL DECISIONS** - Transparency is core

---

## BUILD ORDER

Execute in this exact order:

1. Create monorepo structure (turbo.json, root package.json)
2. Initialize apps/web with Next.js
3. Apply globals.css design system
4. Initialize packages/contracts with Foundry
5. Write and test SynthSuggestions.sol
6. Build dashboard pages (home, drops, suggest)
7. Build API routes
8. Setup wallet connection
9. Initialize apps/admin
10. Build admin components
11. Setup packages/agent with OpenClaw files
12. Deploy contracts to Sepolia
13. Test full flow
14. Deploy to mainnet

---

*This document is the complete specification. Build exactly what is described.*
