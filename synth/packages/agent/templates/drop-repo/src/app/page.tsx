'use client';

import { useEffect, useState } from 'react';
import { createPublicClient, http, formatUnits } from 'viem';
import { base, baseSepolia } from 'viem/chains';

const CONTRACT_ADDRESS = '__CONTRACT_ADDRESS__' as `0x${string}`;
const EXPLORER_URL = '__EXPLORER_URL__';
const NETWORK = '__NETWORK__';
const DROP_TYPE = '__DROP_TYPE__';
const RPC_URL = '__RPC_URL__';
const CHAIN_ID = Number('__CHAIN_ID__');

const chain = CHAIN_ID === base.id ? base : baseSepolia;
const client = createPublicClient({
  chain,
  transport: http(RPC_URL)
});

const ownerAbi = [
  { name: 'owner', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] }
] as const;

const erc20Abi = [
  { name: 'name', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { name: 'symbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { name: 'totalSupply', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] }
] as const;

const erc721Abi = [
  { name: 'name', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { name: 'symbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { name: 'nextTokenId', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] }
] as const;

const erc1155Abi = [
  { name: 'uri', type: 'function', stateMutability: 'view', inputs: [{ type: 'uint256' }], outputs: [{ type: 'string' }] }
] as const;

interface OnchainData {
  owner?: string;
  name?: string;
  symbol?: string;
  totalSupply?: string;
  nextTokenId?: string;
  uri?: string;
}

async function readSafe<T>(fn: () => Promise<T>): Promise<T | undefined> {
  try {
    return await fn();
  } catch {
    return undefined;
  }
}

export default function Home() {
  const [copied, setCopied] = useState(false);
  const [onchain, setOnchain] = useState<OnchainData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(CONTRACT_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  const loadOnchain = async () => {
    setLoading(true);
    setError('');
    const data: OnchainData = {};
    data.owner = await readSafe(() => client.readContract({
      address: CONTRACT_ADDRESS,
      abi: ownerAbi,
      functionName: 'owner'
    }));

    if (DROP_TYPE === 'token' || DROP_TYPE === 'dapp') {
      const name = await readSafe(() => client.readContract({ address: CONTRACT_ADDRESS, abi: erc20Abi, functionName: 'name' }));
      const symbol = await readSafe(() => client.readContract({ address: CONTRACT_ADDRESS, abi: erc20Abi, functionName: 'symbol' }));
      const decimals = await readSafe(() => client.readContract({ address: CONTRACT_ADDRESS, abi: erc20Abi, functionName: 'decimals' }));
      const totalSupply = await readSafe(() => client.readContract({ address: CONTRACT_ADDRESS, abi: erc20Abi, functionName: 'totalSupply' }));
      data.name = name;
      data.symbol = symbol;
      if (totalSupply !== undefined) {
        data.totalSupply = decimals !== undefined
          ? formatUnits(totalSupply, decimals)
          : totalSupply.toString();
      }
    } else if (DROP_TYPE === 'nft') {
      const name = await readSafe(() => client.readContract({ address: CONTRACT_ADDRESS, abi: erc721Abi, functionName: 'name' }));
      const symbol = await readSafe(() => client.readContract({ address: CONTRACT_ADDRESS, abi: erc721Abi, functionName: 'symbol' }));
      const nextTokenId = await readSafe(() => client.readContract({ address: CONTRACT_ADDRESS, abi: erc721Abi, functionName: 'nextTokenId' }));
      data.name = name;
      data.symbol = symbol;
      if (nextTokenId !== undefined) {
        data.nextTokenId = nextTokenId.toString();
      }
    } else if (DROP_TYPE === 'contract') {
      const uri = await readSafe(() => client.readContract({ address: CONTRACT_ADDRESS, abi: erc1155Abi, functionName: 'uri', args: [0n] }));
      data.uri = uri;
    }

    setOnchain(data);
    if (!data.owner && !data.name && !data.symbol && !data.totalSupply && !data.nextTokenId && !data.uri) {
      setError('Unable to read contract details. Check RPC or contract type.');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadOnchain().catch(() => null);
  }, []);

  return (
    <main className="page">
      <header className="hero glass">
        <span className="pill">__DROP_TYPE__</span>
        <h1>__DROP_NAME__</h1>
        <p className="tagline">__TAGLINE__</p>
        <p className="hero-copy">__HERO__</p>
        <div className="cta-row">
          <a className="btn primary" href={EXPLORER_URL} target="_blank" rel="noreferrer">
            View on Basescan
          </a>
          <button className="btn ghost" onClick={handleCopy} type="button">
            {copied ? 'Copied' : 'Copy Address'}
          </button>
        </div>
      </header>

      <section className="card">
        <h2>About</h2>
        <p>__ABOUT__</p>
        <div className="cta-row">
          <a className="btn ghost" href="__REPO_URL__" target="_blank" rel="noreferrer">
            View Repo
          </a>
          {('__WEBAPP_URL__' && '__WEBAPP_URL__'.length > 0) ? (
            <a className="btn ghost" href="__WEBAPP_URL__" target="_blank" rel="noreferrer">
              Live App
            </a>
          ) : null}
        </div>
      </section>

      <section className="grid">
        <div className="card">
          <h2>Contract Snapshot</h2>
          <p>Network: <strong>{NETWORK}</strong></p>
          <p>Chain: <strong>__CHAIN__</strong></p>
          <p>Symbol: <strong>__SYMBOL__</strong></p>
          <p className="mono">{CONTRACT_ADDRESS}</p>
        </div>
        <div className="card">
          <h2>Core Features</h2>
          <ul className="feature-list">
            __FEATURES_HTML__
          </ul>
        </div>
        <div className="card">
          <div className="card-row">
            <h2>Onchain Read</h2>
            <button className="btn ghost" onClick={loadOnchain} type="button" disabled={loading}>
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
          {error && <p className="error">{error}</p>}
          <div className="stat-grid">
            {onchain?.owner && (
              <div className="stat">
                <span>Owner</span>
                <strong className="mono">{onchain.owner}</strong>
              </div>
            )}
            {onchain?.name && (
              <div className="stat">
                <span>Name</span>
                <strong>{onchain.name}</strong>
              </div>
            )}
            {onchain?.symbol && (
              <div className="stat">
                <span>Symbol</span>
                <strong>{onchain.symbol}</strong>
              </div>
            )}
            {onchain?.totalSupply && (
              <div className="stat">
                <span>Total supply</span>
                <strong>{onchain.totalSupply}</strong>
              </div>
            )}
            {onchain?.nextTokenId && (
              <div className="stat">
                <span>Next token id</span>
                <strong>{onchain.nextTokenId}</strong>
              </div>
            )}
            {onchain?.uri && (
              <div className="stat">
                <span>Token URI (id 0)</span>
                <strong className="mono">{onchain.uri}</strong>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="story">
        <h2>Why this drop exists</h2>
        <p>__DESCRIPTION__</p>
        <p className="rationale">__RATIONALE__</p>
      </section>

      <footer className="footer">
        <span>SYNTH • From Noise to Signal</span>
        <span>__CTA__</span>
      </footer>
    </main>
  );
}
