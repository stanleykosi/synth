---
name: web-builder
description: Generate and deploy Next.js webapps for SYNTH drops.
---

# Skill: Web Builder

## Purpose
Generate a **production-ready Next.js 16 app** for each drop (dapp or offchain webapp).

## Required Files
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/globals.css`
- (optional) `src/components/*` for layout reuse

## Requirements
- Next.js 16 App Router, TypeScript, vanilla CSS (no Tailwind).
- Dark mode, mint accents, glassmorphism, bold typography.
- If appMode is `onchain`, include wallet connect + onchain read panel (owner, symbol, supply, URI, etc).
- If appMode is `offchain`, build a clean standalone webapp that uses web_search + RSS + Dune insights.
- If dropType is `nft` or `contract` and appMode is `onchain`, include an **owner mint UI**.
- No placeholders or `__TOKEN__` style tags.
- Mobile responsive, accessible, and visually bold.

## Output Expectations
- A novel, visually strong UI per drop with meaningful sections.
- Onchain: uses real RPC reads + wallet actions.
- Offchain: uses real signal data and clear insight cards.
- If a wallet is connected, show the account and allow mint for owner (when applicable).

## Execution
The agent writes code files directly into the drop repo. Vercel deploy is automatic.
