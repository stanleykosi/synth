'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId, useSwitchChain } from 'wagmi';
import { parseEther } from 'viem';
import { SUGGESTIONS_ABI, SUGGESTIONS_ADDRESS } from '@/lib/contracts';
import styles from './SuggestionForm.module.css';

export function SuggestionForm() {
  const [content, setContent] = useState('');
  const [stake, setStake] = useState('0.001');

  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const requiredChainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? '8453');
  const isCorrectChain = chainId === requiredChainId;
  const isAddressValid = typeof SUGGESTIONS_ADDRESS === 'string' && SUGGESTIONS_ADDRESS.startsWith('0x') && SUGGESTIONS_ADDRESS.length === 42;

  const handleSubmit = (e: React.FormEvent) => {
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

  if (!isAddressValid) {
    return (
      <div className={styles.notConnected}>
        <p>Contract address not configured.</p>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className={styles.notConnected}>
        <p>Connect your wallet to submit a suggestion</p>
      </div>
    );
  }

  if (!isCorrectChain) {
    return (
      <div className={styles.notConnected}>
        <p>Wrong network. Switch to chain ID {requiredChainId} to submit a suggestion.</p>
        <button
          className="btn btn-primary mt-sm"
          onClick={() => switchChain({ chainId: requiredChainId })}
        >
          Switch Network
        </button>
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
