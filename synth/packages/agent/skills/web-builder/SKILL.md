---
name: web-builder
description: Generate and deploy Next.js webapps for SYNTH drops.
---

# Skill: Web Builder

## Purpose
Generate a **production-ready Next.js 16 dapp** for each drop.

## Required Files
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/globals.css`
- (optional) `src/components/*` for layout reuse

## Requirements
- Next.js 16 App Router, TypeScript, vanilla CSS (no Tailwind).
- Dark mode, mint accents, glassmorphism, bold typography.
- Onchain read panel using viem (owner, symbol, supply, URI, etc).
- If dropType is `nft` or `contract`, include an **owner mint UI** with wallet connect.
- No placeholders or `__TOKEN__` style tags.
- Mobile responsive.

## Output Expectations
- A novel, visually strong UI per drop.
- Uses real data from the chain (RPC + contract address).
- If a wallet is connected, show the account and allow mint for owner.

## Execution
The agent writes code files directly into the drop repo. Vercel deploy is automatic.
