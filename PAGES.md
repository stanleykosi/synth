# SYNTH — Pages & API Reference

> Complete page layouts and API route implementations. Use with AGENTS.md and COMPONENTS.md.

---

## HOME PAGE (app/page.tsx)

```tsx
import { Metrics } from '@/components/Metrics';
import { DropCard } from '@/components/DropCard';
import styles from './page.module.css';

async function getDrops() {
  // In production, fetch from your API
  return [
    {
      id: '1',
      name: 'BASEDVIBES',
      description: 'A community token for Base ecosystem builders. Born from the #basedvibes trend.',
      type: 'token' as const,
      contractAddress: '0x1234...5678',
      githubUrl: 'https://github.com/synth-labs/basedvibes',
      deployedAt: '2024-02-03',
      trend: 'Twitter: #basedvibes trending with 2.4k mentions',
    },
  ];
}

async function getMetrics() {
  return {
    totalDrops: 12,
    totalContracts: 15,
    totalGasSpent: '0.042',
    suggestionsPending: 7,
  };
}

export default async function HomePage() {
  const [drops, metrics] = await Promise.all([getDrops(), getMetrics()]);

  return (
    <div className={styles.page}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.title}>
            <span className={styles.titleAccent}>◈</span> SYNTH
          </h1>
          <p className={styles.subtitle}>
            Autonomous Onchain Synthesis Engine
          </p>
          <p className={styles.tagline}>
            From noise to signal. Watch an AI build and deploy products daily.
          </p>
          <div className={styles.heroCta}>
            <a href="/drops" className="btn btn-primary">View All Drops</a>
            <a href="/suggest" className="btn btn-secondary">Inject Signal</a>
          </div>
        </div>
      </section>

      {/* Metrics */}
      <section className={styles.section}>
        <div className="container">
          <Metrics data={metrics} />
        </div>
      </section>

      {/* Recent Drops */}
      <section className={styles.section}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <h2>Recent Drops</h2>
            <a href="/drops" className={styles.viewAll}>View all →</a>
          </div>
          <div className={styles.dropGrid}>
            {drops.slice(0, 3).map((drop) => (
              <DropCard key={drop.id} drop={drop} />
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className={styles.section}>
        <div className="container">
          <h2 className="text-center mb-lg">How SYNTH Works</h2>
          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepNumber}>01</div>
              <h3>Signal Detection</h3>
              <p>SYNTH monitors Twitter, Farcaster, and onchain data for emerging trends.</p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>02</div>
              <h3>Synthesis</h3>
              <p>The AI designs and builds the appropriate solution—token, NFT, or dApp.</p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>03</div>
              <h3>Deployment</h3>
              <p>After testnet verification, contracts deploy to Base mainnet.</p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>04</div>
              <h3>Broadcast</h3>
              <p>Every drop is open-sourced and announced on Twitter/Farcaster.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
```

### page.module.css

```css
.page {
  min-height: 100vh;
}

.hero {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: var(--space-3xl) var(--space-lg);
  text-align: center;
  background: 
    radial-gradient(ellipse at center, rgba(0, 255, 163, 0.05) 0%, transparent 60%);
}

.heroContent {
  max-width: 700px;
}

.title {
  font-size: 5rem;
  font-weight: 800;
  letter-spacing: 0.15em;
  margin-bottom: var(--space-md);
}

.titleAccent {
  color: var(--accent-primary);
  text-shadow: 0 0 40px rgba(0, 255, 163, 0.6);
}

.subtitle {
  font-family: var(--font-mono);
  font-size: 1rem;
  color: var(--text-muted);
  letter-spacing: 0.2em;
  text-transform: uppercase;
  margin-bottom: var(--space-lg);
}

.tagline {
  font-size: 1.25rem;
  color: var(--text-secondary);
  margin-bottom: var(--space-xl);
}

.heroCta {
  display: flex;
  gap: var(--space-md);
  justify-content: center;
}

.section {
  padding: var(--space-3xl) 0;
}

.sectionHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-xl);
}

.viewAll {
  font-size: 0.875rem;
  color: var(--text-muted);
}

.viewAll:hover {
  color: var(--accent-primary);
}

.dropGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-lg);
}

@media (max-width: 1024px) {
  .dropGrid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .dropGrid {
    grid-template-columns: 1fr;
  }
  
  .title {
    font-size: 3rem;
  }
  
  .heroCta {
    flex-direction: column;
  }
}

.steps {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-lg);
}

@media (max-width: 1024px) {
  .steps {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .steps {
    grid-template-columns: 1fr;
  }
}

.step {
  padding: var(--space-xl);
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  text-align: center;
}

.stepNumber {
  font-family: var(--font-mono);
  font-size: 2rem;
  font-weight: 700;
  color: var(--accent-primary);
  margin-bottom: var(--space-md);
  text-shadow: 0 0 20px rgba(0, 255, 163, 0.4);
}

.step h3 {
  font-size: 1rem;
  margin-bottom: var(--space-sm);
}

.step p {
  font-size: 0.875rem;
  color: var(--text-secondary);
}
```

---

## DROPS PAGE (app/drops/page.tsx)

```tsx
import { DropCard } from '@/components/DropCard';
import styles from './page.module.css';

async function getDrops() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/drops`, {
    cache: 'no-store',
  });
  if (!res.ok) return [];
  return res.json();
}

export default async function DropsPage() {
  const drops = await getDrops();

  return (
    <div className="container">
      <div className={styles.header}>
        <h1>All Drops</h1>
        <p className={styles.description}>
          Every product SYNTH has synthesized and deployed.
        </p>
      </div>
      
      <div className={styles.filters}>
        <button className={styles.filterActive}>All</button>
        <button className={styles.filter}>Tokens</button>
        <button className={styles.filter}>NFTs</button>
        <button className={styles.filter}>dApps</button>
      </div>
      
      <div className={styles.grid}>
        {drops.map((drop: any) => (
          <DropCard key={drop.id} drop={drop} />
        ))}
      </div>
      
      {drops.length === 0 && (
        <div className={styles.empty}>
          <p>No drops yet. Check back soon.</p>
        </div>
      )}
    </div>
  );
}
```

---

## SUGGEST PAGE (app/suggest/page.tsx)

```tsx
import { SuggestionForm } from '@/components/SuggestionForm';
import styles from './page.module.css';

export default function SuggestPage() {
  return (
    <div className="container">
      <div className={styles.page}>
        <div className={styles.content}>
          <h1>Inject Signal</h1>
          <p className={styles.description}>
            Submit a trend, need, or product idea. Stake ETH to prioritize your signal.
            SYNTH analyzes top suggestions and may build yours.
          </p>
          
          <div className={styles.rules}>
            <h3>How it works</h3>
            <ul>
              <li>Minimum stake: 0.001 ETH</li>
              <li>Higher stakes get priority review</li>
              <li>Stakes are returned after review (built or not)</li>
              <li>If built, you get credit in the launch</li>
            </ul>
          </div>
        </div>
        
        <div className={styles.formWrapper}>
          <SuggestionForm />
        </div>
      </div>
    </div>
  );
}
```

### suggest/page.module.css

```css
.page {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3xl);
  padding: var(--space-3xl) 0;
  min-height: 80vh;
  align-items: start;
}

@media (max-width: 1024px) {
  .page {
    grid-template-columns: 1fr;
  }
}

.content h1 {
  margin-bottom: var(--space-md);
}

.description {
  color: var(--text-secondary);
  margin-bottom: var(--space-xl);
}

.rules {
  padding: var(--space-lg);
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-subtle);
}

.rules h3 {
  font-size: 1rem;
  margin-bottom: var(--space-md);
  color: var(--accent-primary);
}

.rules ul {
  list-style: none;
}

.rules li {
  position: relative;
  padding-left: var(--space-lg);
  margin-bottom: var(--space-sm);
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.rules li::before {
  content: '◈';
  position: absolute;
  left: 0;
  color: var(--accent-primary);
  font-size: 0.75rem;
}

.formWrapper {
  padding: var(--space-xl);
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-xl);
}
```

---

## API ROUTES

### api/drops/route.ts

```tsx
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const DROPS_FILE = path.join(process.cwd(), 'data', 'drops.json');

export async function GET() {
  try {
    const data = await fs.readFile(DROPS_FILE, 'utf-8');
    const drops = JSON.parse(data);
    return NextResponse.json(drops);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  const adminSecret = request.headers.get('x-admin-secret');
  if (adminSecret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const drop = await request.json();
    
    let drops = [];
    try {
      const data = await fs.readFile(DROPS_FILE, 'utf-8');
      drops = JSON.parse(data);
    } catch {}
    
    drops.unshift({ ...drop, id: Date.now().toString() });
    
    await fs.mkdir(path.dirname(DROPS_FILE), { recursive: true });
    await fs.writeFile(DROPS_FILE, JSON.stringify(drops, null, 2));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save drop' }, { status: 500 });
  }
}
```

### api/suggestions/route.ts

```tsx
import { NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { SUGGESTIONS_ABI, SUGGESTIONS_ADDRESS } from '@/lib/contracts';

const client = createPublicClient({
  chain: base,
  transport: http('https://mainnet.base.org'),
});

export async function GET() {
  try {
    const suggestions = await client.readContract({
      address: SUGGESTIONS_ADDRESS,
      abi: SUGGESTIONS_ABI,
      functionName: 'getTopSuggestions',
      args: [BigInt(20)],
    });

    return NextResponse.json(suggestions);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 });
  }
}
```

### api/trends/route.ts

```tsx
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const TRENDS_FILE = path.join(process.cwd(), 'data', 'trends.json');

export async function GET() {
  try {
    const data = await fs.readFile(TRENDS_FILE, 'utf-8');
    const trends = JSON.parse(data);
    return NextResponse.json(trends);
  } catch {
    return NextResponse.json([]);
  }
}
```

---

## ADMIN PAGES

### admin/app/page.tsx

```tsx
import { LogViewer } from '@/components/LogViewer';
import { WalletStatus } from '@/components/WalletStatus';
import { ControlPanel } from '@/components/ControlPanel';
import styles from './page.module.css';

export default function AdminDashboard() {
  return (
    <div className={styles.dashboard}>
      <h1>SYNTH Admin</h1>
      
      <div className={styles.grid}>
        <section className={styles.section}>
          <h2>Wallet Status</h2>
          <WalletStatus />
        </section>
        
        <section className={styles.section}>
          <h2>Controls</h2>
          <ControlPanel />
        </section>
      </div>
      
      <section className={styles.section}>
        <h2>Decision Logs</h2>
        <LogViewer />
      </section>
    </div>
  );
}
```

### admin/components/WalletStatus.tsx

```tsx
'use client';

import { useEffect, useState } from 'react';
import styles from './WalletStatus.module.css';

interface WalletData {
  address: string;
  balance: string;
  nonce: number;
}

export function WalletStatus() {
  const [wallet, setWallet] = useState<WalletData | null>(null);

  useEffect(() => {
    fetch('/api/wallet')
      .then(res => res.json())
      .then(setWallet);
  }, []);

  if (!wallet) return <div>Loading...</div>;

  return (
    <div className={styles.card}>
      <div className={styles.row}>
        <span className={styles.label}>Address</span>
        <code className={styles.value}>{wallet.address}</code>
      </div>
      <div className={styles.row}>
        <span className={styles.label}>Balance</span>
        <span className={styles.value}>{wallet.balance} ETH</span>
      </div>
      <div className={styles.row}>
        <span className={styles.label}>Nonce</span>
        <span className={styles.value}>{wallet.nonce}</span>
      </div>
    </div>
  );
}
```

### admin/components/ControlPanel.tsx

```tsx
'use client';

import { useState } from 'react';
import styles from './ControlPanel.module.css';

export function ControlPanel() {
  const [status, setStatus] = useState<'active' | 'paused'>('active');

  const handlePause = async () => {
    await fetch('/api/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'pause' }),
    });
    setStatus('paused');
  };

  const handleResume = async () => {
    await fetch('/api/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resume' }),
    });
    setStatus('active');
  };

  return (
    <div className={styles.panel}>
      <div className={styles.status}>
        Status: <span className={status === 'active' ? styles.active : styles.paused}>
          {status.toUpperCase()}
        </span>
      </div>
      
      <div className={styles.buttons}>
        {status === 'active' ? (
          <button onClick={handlePause} className="btn btn-secondary">
            Pause Agent
          </button>
        ) : (
          <button onClick={handleResume} className="btn btn-primary">
            Resume Agent
          </button>
        )}
      </div>
    </div>
  );
}
```

### admin/components/LogViewer.tsx

```tsx
'use client';

import { useEffect, useState } from 'react';
import styles from './LogViewer.module.css';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

export function LogViewer() {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    fetch('/api/logs')
      .then(res => res.json())
      .then(setLogs);
  }, []);

  return (
    <div className={styles.viewer}>
      {logs.map((log, i) => (
        <div key={i} className={`${styles.entry} ${styles[log.level]}`}>
          <span className={styles.time}>{log.timestamp}</span>
          <span className={styles.level}>[{log.level.toUpperCase()}]</span>
          <span className={styles.message}>{log.message}</span>
        </div>
      ))}
    </div>
  );
}
```

---

## DEPLOYMENT SCRIPTS (Foundry)

### script/DeploySuggestions.s.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/SynthSuggestions.sol";

contract DeploySuggestions is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        SynthSuggestions suggestions = new SynthSuggestions();
        
        console.log("SynthSuggestions deployed to:", address(suggestions));
        
        vm.stopBroadcast();
    }
}
```

### Deployment Commands

```bash
# Deploy to Base Sepolia
forge script script/DeploySuggestions.s.sol:DeploySuggestions \
  --rpc-url $BASE_SEPOLIA_RPC \
  --broadcast \
  --verify

# Deploy to Base Mainnet
forge script script/DeploySuggestions.s.sol:DeploySuggestions \
  --rpc-url $BASE_RPC \
  --broadcast \
  --verify
```

---

## FINAL CHECKLIST

Before considering the project complete:

- [ ] Monorepo builds without errors (`npm run build`)
- [ ] All CSS uses only the design system variables
- [ ] No Tailwind classes anywhere
- [ ] Wallet connection works on Base
- [ ] Suggestion form submits to contract
- [ ] Drops display on dashboard
- [ ] Admin panel shows wallet status
- [ ] Contracts verified on Basescan
- [ ] Mobile responsive
- [ ] Dark mode only (no light theme)

---

*This is the complete pages and API reference. Use with AGENTS.md and COMPONENTS.md.*
