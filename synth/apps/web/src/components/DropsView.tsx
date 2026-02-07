'use client';

import { useMemo, useState } from 'react';
import { DropCard } from './DropCard';
import styles from './DropsView.module.css';

export interface DropItem {
  id: string;
  name: string;
  description: string;
  type: 'token' | 'nft' | 'dapp' | 'contract';
  contractAddress: string;
  contractType?: 'erc20' | 'erc721' | 'erc1155' | 'none';
  appMode?: 'onchain' | 'offchain';
  githubUrl: string;
  webappUrl?: string;
  explorerUrl?: string;
  network?: string;
  deployedAt: string;
  trend: string;
  trendSource?: string;
  trendScore?: number;
  txHash?: string;
  gasCostEth?: string;
}

type FilterType = 'all' | DropItem['type'];
type SortType = 'date' | 'score';

export function DropsView({ drops }: { drops: DropItem[] }) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('date');

  const filtered = useMemo(() => {
    const base = filter === 'all' ? drops : drops.filter((drop) => drop.type === filter);
    return [...base].sort((a, b) => {
      if (sort === 'score') {
        return (b.trendScore ?? 0) - (a.trendScore ?? 0);
      }
      return new Date(b.deployedAt).getTime() - new Date(a.deployedAt).getTime();
    });
  }, [drops, filter, sort]);

  return (
    <div>
      <div className={styles.controls}>
        <div className={styles.filters}>
          {(['all', 'token', 'nft', 'dapp', 'contract'] as FilterType[]).map((type) => (
            <button
              key={type}
              className={filter === type ? styles.filterActive : styles.filter}
              onClick={() => setFilter(type)}
            >
              {type === 'all' ? 'All' : type.toUpperCase()}
            </button>
          ))}
        </div>
        <div className={styles.sort}>
          <span>Sort by</span>
          <button
            className={sort === 'date' ? styles.filterActive : styles.filter}
            onClick={() => setSort('date')}
          >
            Date
          </button>
          <button
            className={sort === 'score' ? styles.filterActive : styles.filter}
            onClick={() => setSort('score')}
          >
            Score
          </button>
        </div>
      </div>

      <div className={styles.grid}>
        {filtered.map((drop) => (
          <DropCard key={drop.id} drop={drop} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className={styles.empty}>
          <p>No drops yet. Check back soon.</p>
        </div>
      )}
    </div>
  );
}
