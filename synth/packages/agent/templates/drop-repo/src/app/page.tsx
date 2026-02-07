'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPublicClient, http, formatUnits, createWalletClient, custom } from 'viem';
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

const erc721MintAbi = [
  {
    name: 'mint',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'tokenUri', type: 'string' }
    ],
    outputs: [{ type: 'uint256' }]
  }
] as const;

const erc1155MintAbi = [
  {
    name: 'mint',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'id', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
      { name: 'data', type: 'bytes' }
    ],
    outputs: []
  }
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
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletError, setWalletError] = useState('');
  const [minting, setMinting] = useState(false);
  const [mintStatus, setMintStatus] = useState('');
  const [mintTo, setMintTo] = useState('');
  const [tokenUri, setTokenUri] = useState('');
  const [tokenId, setTokenId] = useState('0');
  const [tokenAmount, setTokenAmount] = useState('1');

  const isOwner = useMemo(() => {
    if (!walletAddress || !onchain?.owner) return false;
    return walletAddress.toLowerCase() === onchain.owner.toLowerCase();
  }, [walletAddress, onchain?.owner]);

  const getWalletClient = () => {
    if (typeof window === 'undefined') return null;
    const ethereum = (window as unknown as { ethereum?: unknown }).ethereum;
    if (!ethereum) return null;
    return createWalletClient({
      chain,
      transport: custom(ethereum)
    });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(CONTRACT_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  const connectWallet = async () => {
    setWalletError('');
    const walletClient = getWalletClient();
    if (!walletClient) {
      setWalletError('No injected wallet detected.');
      return;
    }
    try {
      const addresses = await walletClient.requestAddresses();
      const address = addresses[0];
      if (address) {
        setWalletAddress(address);
        setMintTo((prev) => prev || address);
      }
    } catch {
      setWalletError('Wallet connection rejected.');
    }
  };

  const handleMint = async () => {
    setWalletError('');
    setMintStatus('');
    const walletClient = getWalletClient();
    if (!walletClient || !walletAddress) {
      setWalletError('Connect your wallet first.');
      return;
    }
    if (!isOwner) {
      setWalletError('Only the contract owner can mint.');
      return;
    }
    const to = (mintTo || walletAddress) as `0x${string}`;
    setMinting(true);
    try {
      if (DROP_TYPE === 'nft') {
        if (!tokenUri.trim()) {
          setWalletError('Token URI is required for minting.');
          setMinting(false);
          return;
        }
        await walletClient.writeContract({
          address: CONTRACT_ADDRESS,
          abi: erc721MintAbi,
          functionName: 'mint',
          args: [to, tokenUri.trim()],
          account: walletAddress as `0x${string}`
        });
        setMintStatus('Mint submitted for ERC721.');
      }
      if (DROP_TYPE === 'contract') {
        const id = BigInt(tokenId || '0');
        const amount = BigInt(tokenAmount || '1');
        await walletClient.writeContract({
          address: CONTRACT_ADDRESS,
          abi: erc1155MintAbi,
          functionName: 'mint',
          args: [to, id, amount, '0x'],
          account: walletAddress as `0x${string}`
        });
        setMintStatus('Mint submitted for ERC1155.');
      }
    } catch {
      setWalletError('Mint failed. Check wallet and network.');
    } finally {
      setMinting(false);
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

  useEffect(() => {
    if (walletAddress && !mintTo) {
      setMintTo(walletAddress);
    }
  }, [walletAddress, mintTo]);

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
        <div className="card">
          <div className="card-row">
            <h2>Wallet</h2>
            <button className="btn ghost" onClick={connectWallet} type="button">
              {walletAddress ? 'Connected' : 'Connect'}
            </button>
          </div>
          {walletAddress ? (
            <p className="mono">Connected: {walletAddress}</p>
          ) : (
            <p className="muted">Connect a wallet to unlock write actions.</p>
          )}
          {walletError && <p className="error">{walletError}</p>}
          {(DROP_TYPE === 'nft' || DROP_TYPE === 'contract') && (
            <div className="mint-panel">
              <h3>Owner Mint</h3>
              {!isOwner && <p className="muted">Only the contract owner can mint.</p>}
              <label className="field">
                <span>Recipient</span>
                <input
                  className="input"
                  value={mintTo}
                  onChange={(event) => setMintTo(event.target.value)}
                  placeholder="0x..."
                />
              </label>
              {DROP_TYPE === 'nft' && (
                <label className="field">
                  <span>Token URI</span>
                  <input
                    className="input"
                    value={tokenUri}
                    onChange={(event) => setTokenUri(event.target.value)}
                    placeholder="ipfs://..."
                  />
                </label>
              )}
              {DROP_TYPE === 'contract' && (
                <div className="mint-row">
                  <label className="field">
                    <span>Token ID</span>
                    <input
                      className="input"
                      value={tokenId}
                      onChange={(event) => setTokenId(event.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>Amount</span>
                    <input
                      className="input"
                      value={tokenAmount}
                      onChange={(event) => setTokenAmount(event.target.value)}
                    />
                  </label>
                </div>
              )}
              <button
                className="btn primary"
                onClick={handleMint}
                disabled={!walletAddress || !isOwner || minting}
                type="button"
              >
                {minting ? 'Minting...' : 'Mint'}
              </button>
              {mintStatus && <p className="muted">{mintStatus}</p>}
            </div>
          )}
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
