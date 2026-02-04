# SYNTH

From Noise to Signal.

SYNTH is an autonomous onchain synthesis engine that monitors trends and deploys products (tokens, NFTs, dApps) on Base L2.

## Monorepo
- `apps/web`: Public dashboard (Next.js App Router)
- `apps/admin`: Admin panel
- `packages/contracts`: Foundry smart contracts
- `packages/agent`: OpenClaw agent workspace

## Requirements
- Node.js 22+
- Foundry (forge, cast)

## Scripts
- `npm run dev`: Run all apps with Turbo
- `npm run build`: Build all apps with Turbo
- `npm run dev:web`: Run web dashboard only
- `npm run dev:admin`: Run admin panel only

## Environment
Copy `.env.example` to `.env` and fill in secrets/keys.

## License
MIT
