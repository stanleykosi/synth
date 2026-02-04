# SYNTH — Component Reference

> This file contains React component templates for the dashboard. Use with AGENTS.md.

---

## COMPONENT: Header.tsx

```tsx
'use client';

import { ConnectButton } from './ConnectButton';
import styles from './Header.module.css';

export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <a href="/" className={styles.logo}>
          <span className={styles.logoIcon}>◈</span>
          <span className={styles.logoText}>SYNTH</span>
        </a>
        
        <nav className={styles.nav}>
          <a href="/drops" className={styles.navLink}>Drops</a>
          <a href="/suggest" className={styles.navLink}>Suggest</a>
          <a href="https://twitter.com/synth" target="_blank" className={styles.navLink}>Twitter</a>
        </nav>
        
        <ConnectButton />
      </div>
    </header>
  );
}
```

### Header.module.css

```css
.header {
  position: sticky;
  top: 0;
  z-index: 100;
  padding: var(--space-md) 0;
  background: rgba(5, 5, 8, 0.8);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border-subtle);
}

.container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--space-lg);
}

.logo {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-primary);
}

.logoIcon {
  color: var(--accent-primary);
  text-shadow: 0 0 20px rgba(0, 255, 163, 0.5);
}

.logoText {
  letter-spacing: 0.1em;
}

.nav {
  display: flex;
  gap: var(--space-xl);
}

.navLink {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
  transition: color var(--transition-fast);
}

.navLink:hover {
  color: var(--accent-primary);
}

@media (max-width: 768px) {
  .nav { display: none; }
}
```

---

## COMPONENT: DropCard.tsx

```tsx
import styles from './DropCard.module.css';

interface Drop {
  id: string;
  name: string;
  description: string;
  type: 'token' | 'nft' | 'dapp' | 'contract';
  contractAddress: string;
  githubUrl: string;
  webappUrl?: string;
  deployedAt: string;
  trend: string;
}

export function DropCard({ drop }: { drop: Drop }) {
  const typeColors = {
    token: 'var(--accent-primary)',
    nft: 'var(--accent-secondary)',
    dapp: 'var(--accent-tertiary)',
    contract: '#ffaa00'
  };

  return (
    <article className={styles.card}>
      <div className={styles.header}>
        <span 
          className={styles.type} 
          style={{ color: typeColors[drop.type] }}
        >
          {drop.type.toUpperCase()}
        </span>
        <time className={styles.date}>
          {new Date(drop.deployedAt).toLocaleDateString()}
        </time>
      </div>
      
      <h3 className={styles.name}>{drop.name}</h3>
      <p className={styles.description}>{drop.description}</p>
      
      <div className={styles.trend}>
        <span className={styles.trendLabel}>Synthesized from:</span>
        <span className={styles.trendValue}>{drop.trend}</span>
      </div>
      
      <div className={styles.links}>
        <a 
          href={`https://basescan.org/address/${drop.contractAddress}`}
          target="_blank"
          className={styles.link}
        >
          <span>Contract</span>
          <span className={styles.arrow}>↗</span>
        </a>
        <a 
          href={drop.githubUrl}
          target="_blank"
          className={styles.link}
        >
          <span>GitHub</span>
          <span className={styles.arrow}>↗</span>
        </a>
        {drop.webappUrl && (
          <a 
            href={drop.webappUrl}
            target="_blank"
            className={`${styles.link} ${styles.primary}`}
          >
            <span>Launch App</span>
            <span className={styles.arrow}>↗</span>
          </a>
        )}
      </div>
    </article>
  );
}
```

### DropCard.module.css

```css
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
  transform: translateY(-4px);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-md);
}

.type {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.1em;
}

.date {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.name {
  font-size: 1.25rem;
  margin-bottom: var(--space-sm);
}

.description {
  color: var(--text-secondary);
  font-size: 0.875rem;
  line-height: 1.6;
  margin-bottom: var(--space-md);
}

.trend {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  padding: var(--space-md);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-lg);
}

.trendLabel {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.trendValue {
  font-family: var(--font-mono);
  font-size: 0.875rem;
  color: var(--accent-primary);
}

.links {
  display: flex;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-sm) var(--space-md);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.link:hover {
  color: var(--accent-primary);
  border-color: var(--accent-primary);
}

.link.primary {
  background: var(--accent-primary);
  color: var(--bg-primary);
  border-color: var(--accent-primary);
}

.link.primary:hover {
  box-shadow: 0 0 16px rgba(0, 255, 163, 0.4);
}

.arrow {
  font-size: 0.875rem;
}
```

---

## COMPONENT: SuggestionForm.tsx

```tsx
'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { SUGGESTIONS_ABI, SUGGESTIONS_ADDRESS } from '@/lib/contracts';
import styles from './SuggestionForm.module.css';

export function SuggestionForm() {
  const [content, setContent] = useState('');
  const [stake, setStake] = useState('0.001');
  
  const { address, isConnected } = useAccount();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    
    writeContract({
      address: SUGGESTIONS_ADDRESS,
      abi: SUGGESTIONS_ABI,
      functionName: 'submit',
      args: [content],
      value: parseEther(stake),
    });
  };

  if (!isConnected) {
    return (
      <div className={styles.notConnected}>
        <p>Connect your wallet to submit a suggestion</p>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className={styles.success}>
        <div className={styles.successIcon}>✓</div>
        <h3>Signal Injected</h3>
        <p>Your suggestion has been submitted. SYNTH will analyze it.</p>
        <button 
          className="btn btn-secondary" 
          onClick={() => { setContent(''); }}
        >
          Submit Another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.field}>
        <label className={styles.label}>Your Signal</label>
        <textarea
          className={`input ${styles.textarea}`}
          placeholder="Describe the trend, need, or product idea you want SYNTH to build..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={1000}
          rows={5}
        />
        <span className={styles.charCount}>{content.length}/1000</span>
      </div>
      
      <div className={styles.field}>
        <label className={styles.label}>Stake Amount (ETH)</label>
        <input
          type="number"
          className="input"
          value={stake}
          onChange={(e) => setStake(e.target.value)}
          min="0.001"
          step="0.001"
        />
        <p className={styles.hint}>
          Higher stakes = Higher priority. Minimum: 0.001 ETH. Returned after review.
        </p>
      </div>
      
      <button 
        type="submit" 
        className="btn btn-primary"
        disabled={isPending || isConfirming || !content.trim()}
      >
        {isPending ? 'Confirm in Wallet...' : isConfirming ? 'Processing...' : 'Inject Signal'}
      </button>
    </form>
  );
}
```

### SuggestionForm.module.css

```css
.form {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.textarea {
  resize: vertical;
  min-height: 120px;
}

.charCount {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-align: right;
}

.hint {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.notConnected {
  text-align: center;
  padding: var(--space-2xl);
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  border: 1px dashed var(--border-subtle);
}

.success {
  text-align: center;
  padding: var(--space-2xl);
}

.successIcon {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto var(--space-lg);
  font-size: 2rem;
  background: rgba(0, 255, 163, 0.15);
  color: var(--accent-primary);
  border-radius: 50%;
}
```

---

## COMPONENT: ConnectButton.tsx

```tsx
'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import styles from './ConnectButton.module.css';

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <button 
        className={styles.connected}
        onClick={() => disconnect()}
      >
        <span className={styles.dot} />
        <span className={styles.address}>
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
      </button>
    );
  }

  return (
    <button 
      className="btn btn-primary"
      onClick={() => connect({ connector: injected() })}
    >
      Connect
    </button>
  );
}
```

### ConnectButton.module.css

```css
.connected {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  font-family: var(--font-mono);
  font-size: 0.875rem;
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.connected:hover {
  border-color: var(--accent-tertiary);
}

.dot {
  width: 8px;
  height: 8px;
  background: var(--accent-primary);
  border-radius: 50%;
  box-shadow: 0 0 8px var(--accent-primary);
}

.address {
  color: var(--text-secondary);
}
```

---

## COMPONENT: Metrics.tsx

```tsx
import styles from './Metrics.module.css';

interface MetricsData {
  totalDrops: number;
  totalContracts: number;
  totalGasSpent: string;
  suggestionsPending: number;
}

export function Metrics({ data }: { data: MetricsData }) {
  const metrics = [
    { label: 'Total Drops', value: data.totalDrops, suffix: '' },
    { label: 'Contracts Deployed', value: data.totalContracts, suffix: '' },
    { label: 'Gas Spent', value: data.totalGasSpent, suffix: ' ETH' },
    { label: 'Pending Signals', value: data.suggestionsPending, suffix: '' },
  ];

  return (
    <div className={styles.grid}>
      {metrics.map((metric) => (
        <div key={metric.label} className={styles.card}>
          <span className={styles.value}>
            {metric.value}{metric.suffix}
          </span>
          <span className={styles.label}>{metric.label}</span>
        </div>
      ))}
    </div>
  );
}
```

### Metrics.module.css

```css
.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-md);
}

@media (max-width: 768px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.card {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  padding: var(--space-lg);
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  text-align: center;
}

.value {
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 700;
  color: var(--accent-primary);
  text-shadow: 0 0 20px rgba(0, 255, 163, 0.3);
}

.label {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
```

---

## WAGMI CONFIG (lib/wagmi.ts)

```tsx
import { http, createConfig } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

export const config = createConfig({
  chains: [base, baseSepolia],
  connectors: [
    injected(),
  ],
  transports: {
    [base.id]: http('https://mainnet.base.org'),
    [baseSepolia.id]: http('https://sepolia.base.org'),
  },
});
```

---

## CONTRACTS CONFIG (lib/contracts.ts)

```tsx
export const SUGGESTIONS_ADDRESS = process.env.NEXT_PUBLIC_SUGGESTIONS_ADDRESS as `0x${string}`;

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
```

---

## ROOT LAYOUT (app/layout.tsx)

```tsx
import type { Metadata } from 'next';
import { Providers } from './providers';
import { Header } from '@/components/Header';
import './globals.css';

export const metadata: Metadata = {
  title: 'SYNTH | Autonomous Onchain Synthesis',
  description: 'From noise to signal. Watch an AI agent build and deploy onchain products daily.',
  openGraph: {
    title: 'SYNTH',
    description: 'Autonomous Onchain Synthesis Engine',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Header />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
```

---

## PROVIDERS (app/providers.tsx)

```tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { config } from '@/lib/wagmi';

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

---

*Use these components exactly as shown. Match the styling to the design system in AGENTS.md.*
