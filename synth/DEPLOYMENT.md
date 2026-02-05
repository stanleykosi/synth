# SYNTH Production Deployment Guide

Last updated: 2026-02-04

This guide is written for someone who is not technical. Every step is small, calm, and explicit.

## What You Are Deploying

1. Web app on Vercel.
2. Admin app on Vercel.
3. OpenClaw agent on a VPS.
4. Onchain suggestions contract on Base (after testnet).

## The Big Picture (In Plain English)

- The web app shows drops and trends.
- The admin app lets you control the agent.
- The agent runs on a VPS and does the real work (trend detection, scoring, deployments, and posting).
- The contract makes suggestions onchain, which prevents spam and creates a transparent queue.

## Part 1: Accounts and Keys (Do Once)

### Step 1: Create accounts

You need these accounts:

1. GitHub
2. Vercel
3. VPS provider
4. Domain registrar
5. Twitter/X developer account
6. Neynar account (Farcaster)
7. Basescan
8. Dune (optional)

### Step 2: Buy a domain

Buy a domain such as `synth.xyz`.

### Step 3: Create a wallet

On your computer:

```
cast wallet new
```

Save the private key securely.

### Step 4: Fund the wallet

Add ETH on Base mainnet. Keep at least $10.

### Step 5: Collect API keys

You will need these values. Keep them safe.

Required for this setup:
- `NEYNAR_API_KEY`
- `GITHUB_TOKEN`
- `VERCEL_TOKEN`
- `ADMIN_SECRET`

Required only if you want posting:
- `TWITTER_API_KEY`
- `TWITTER_API_SECRET`
- `TWITTER_ACCESS_TOKEN`
- `TWITTER_ACCESS_SECRET`
- `NEYNAR_SIGNER_UUID`
- `DISCORD_BOT_TOKEN`
- `DISCORD_LAUNCH_CHANNEL_ID`

Optional:
- `BASESCAN_API_KEY` (only needed for contract verification)
- `GITHUB_ORG` (only if you want repos created under an org; omit for personal accounts)
- `VERCEL_TEAM_ID` (only for Vercel Team accounts)
- `DUNE_API_KEY` (only if you want Dune data)

## Part 2: Deploy Web + Admin on Vercel

### Step 1: Push code to GitHub

From your local machine:

```
cd synth
git init
git add .
git commit -m "Initial SYNTH deployment"
git remote add origin https://github.com/<org>/synth.git
git push -u origin main
```

### Step 2: Create the Web app on Vercel

1. Log into Vercel.
2. Click “New Project”.
3. Select the `synth` repo.
4. Set Root Directory to `apps/web`.
5. Add environment variables.

```
NEXT_PUBLIC_SUGGESTIONS_ADDRESS=<deployed-contract-address>
NEXT_PUBLIC_CHAIN_ID=8453
NEXT_PUBLIC_API_URL=https://synth.xyz
ADMIN_SECRET=<generate-random-32-char-string>
AGENT_API_URL=https://agent.synth.xyz
```

6. Click Deploy.

### Step 3: Create the Admin app on Vercel

1. Create a second project in Vercel.
2. Select the same `synth` repo.
3. Set Root Directory to `apps/admin`.
4. Add environment variables.

```
ADMIN_SECRET=<same-as-above>
AGENT_API_URL=https://agent.synth.xyz
```

5. Click Deploy.

### Step 4: Add your domain

1. Add your main domain to the Web project.
2. Add `admin.yourdomain` to the Admin project.
3. Update DNS records as Vercel shows.

## Part 3: Set Up the VPS for the Agent

### Step 1: Create the VPS

Create an Ubuntu 22.04 server. Copy the IP address.

### Step 2: Connect to the VPS

```
ssh root@YOUR_SERVER_IP
```

### Step 3: Create a user

```
adduser synth
usermod -aG sudo synth
su - synth
```

### Step 4: Basic security

```
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### Step 5: Install tools

```
sudo apt update
sudo apt install -y git curl build-essential nginx
```

### Step 6: Install Node 22 + pnpm

```
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
corepack enable
corepack prepare pnpm@9.15.1 --activate
```

### Step 7: Install Foundry

```
curl -L https://foundry.paradigm.xyz | bash
source ~/.bashrc
foundryup
```

### Step 8: Clone the repo

```
git clone https://github.com/<org>/synth.git
cd synth
pnpm install
```

## Part 4: Configure OpenClaw Agent

### Step 1: Install OpenClaw CLI

```
pnpm add -g openclaw
openclaw setup
```

### Step 2: Copy SYNTH agent workspace

```
cp -r /home/synth/synth/packages/agent/* ~/.openclaw/workspace/
```

### Step 3: Create the agent environment file

Create `~/.openclaw/.env` and add:

```
NEYNAR_API_KEY=
NEYNAR_SIGNER_UUID=
GITHUB_TOKEN=
GITHUB_ORG=
VERCEL_TOKEN=
VERCEL_TEAM_ID=
DUNE_API_KEY=
OPENCLAW_GATEWAY_URL=http://127.0.0.1:18789
OPENCLAW_GATEWAY_TOKEN=
DISCORD_BOT_TOKEN=
DISCORD_LAUNCH_CHANNEL_ID=
BASESCAN_API_KEY=
DEPLOYER_PRIVATE_KEY=
DEPLOYER_ADDRESS=
BASE_RPC=https://mainnet.base.org
BASE_SEPOLIA_RPC=https://sepolia.base.org
SUGGESTIONS_ADDRESS=
TOKEN_URI=
ADMIN_SECRET=
SYNTH_ENABLE_SCHEDULER=true
CORS_ORIGIN=https://synth.xyz
```

Note: Twitter API keys are only needed for posting. The Twitter signal source supports a browser mode, so your keys are not used for scraping when `twitter.mode` is set to `browser`.

### Step 4: Configure the agent targets

Edit `synth/packages/agent/agent.config.json`:

- For browser-based Twitter signals, set `twitter.enabled` to `true`.
- For browser-based Twitter signals, set `twitter.mode` to `browser`.
- For browser-based Twitter signals, keep `twitter.browserProfile` as `openclaw` (managed browser).
- For browser-based Twitter signals, keep `twitter.browserTarget` as `host`.
- For API-based Twitter signals, set `twitter.enabled` to `true`.
- For API-based Twitter signals, set `twitter.mode` to `api`.
- For API-based Twitter signals, add keywords in `twitter.queries`.
- Add Farcaster channels in `farcaster.channels`.
- Add Discord channel IDs in `discord.channelIds`.
- Add Dune query IDs in `dune.queryIds`.
- Keep `autoDeployMainnet` false until you are ready.

### Step 4.1: Log in to X/Twitter in the OpenClaw browser (browser mode only)

This is required for reliable scraping.

```
openclaw browser start
openclaw browser open https://x.com
```

Log in manually in the OpenClaw-managed browser window. Do not enter credentials into any automated prompts.

### Step 5: Start the agent API

```
cd /home/synth/synth
pnpm --filter @synth/agent run server
```

This starts the agent API on port `8787`.

### Step 6: Make the agent start on boot

```
sudo tee /etc/systemd/system/synth-agent.service >/dev/null <<'EOF_SYS'
[Unit]
Description=SYNTH Agent
After=network.target

[Service]
WorkingDirectory=/home/synth/synth
Environment=SYNTH_AGENT_DIR=/home/synth/synth/packages/agent
Environment=SYNTH_ENV_PATH=/home/synth/.openclaw/.env
ExecStart=/usr/bin/pnpm --filter @synth/agent run server
Restart=always
User=synth

[Install]
WantedBy=multi-user.target
EOF_SYS
```

```
sudo systemctl daemon-reload
sudo systemctl enable --now synth-agent
```

## Part 5: Expose the Agent API to Vercel

Vercel needs to reach the agent via HTTPS. We will use Nginx.

### Step 1: Create Nginx config

```
sudo tee /etc/nginx/sites-available/agent >/dev/null <<'EOF_SYS'
server {
  listen 80;
  server_name agent.synth.xyz;

  location / {
    proxy_pass http://127.0.0.1:8787;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
EOF_SYS
```

### Step 2: Enable the site

```
sudo ln -s /etc/nginx/sites-available/agent /etc/nginx/sites-enabled/agent
sudo nginx -t
sudo systemctl reload nginx
```

### Step 3: Add HTTPS

```
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d agent.synth.xyz
```

## Part 6: Connect Social Platforms

### Twitter/X

1. Create a Twitter app with read/write permission.
2. Copy the API keys into `~/.openclaw/.env`.

### Farcaster

1. Create a Neynar account.
2. Generate `NEYNAR_API_KEY`.
3. Create a signer and copy `NEYNAR_SIGNER_UUID`.
4. Put both in `~/.openclaw/.env`.

### Discord

1. Create a Discord bot.
2. Enable Message Content Intent.
3. Invite the bot to your server.
4. Put the bot token in `~/.openclaw/.env`.
5. Add the channel ID to `DISCORD_LAUNCH_CHANNEL_ID`.

## Part 7: Deploy the Suggestions Contract (Manual)

### Step 1: Create env file

Create `packages/contracts/.env`:

```
DEPLOYER_PRIVATE_KEY=
DEPLOYER_ADDRESS=
BASE_RPC=https://mainnet.base.org
BASE_SEPOLIA_RPC=https://sepolia.base.org
BASESCAN_API_KEY=
```

### Step 2: Deploy to Base Sepolia

```
cd packages/contracts
forge script script/DeploySuggestions.s.sol:DeploySuggestions \
  --rpc-url $BASE_SEPOLIA_RPC \
  --broadcast \
  --verify
```

### Step 3: Test on Sepolia

1. Open `https://synth.xyz`.
2. Submit a suggestion.
3. Verify it appears.

### Step 4: Deploy to Base mainnet

```
forge script script/DeploySuggestions.s.sol:DeploySuggestions \
  --rpc-url $BASE_RPC \
  --broadcast \
  --verify
```

### Step 5: Update Vercel env

Update `NEXT_PUBLIC_SUGGESTIONS_ADDRESS` in Vercel and redeploy the web app.

## Part 8: Daily Operations

1. Check the agent status:

```
curl https://agent.synth.xyz/api/status
```

2. Trigger a manual run:

```
curl -X POST https://agent.synth.xyz/api/control \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: <ADMIN_SECRET>" \
  -d '{"action":"run"}'
```

3. Pause the agent:

```
curl -X POST https://agent.synth.xyz/api/control \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: <ADMIN_SECRET>" \
  -d '{"action":"pause"}'
```

4. Resume the agent:

```
curl -X POST https://agent.synth.xyz/api/control \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: <ADMIN_SECRET>" \
  -d '{"action":"resume"}'
```

## Part 9: Go Live Checklist

1. Web app deployed on Vercel.
2. Admin app deployed on Vercel.
3. Agent running on VPS and reachable at `https://agent.synth.xyz`.
4. API keys in `~/.openclaw/.env`.
5. Sepolia contract deployed and tested.
6. Mainnet contract deployed.
7. `NEXT_PUBLIC_SUGGESTIONS_ADDRESS` updated in Vercel.
8. Admin can pause/resume and run the agent.

## Notes for Safety

- Leave `autoDeployMainnet` set to `false` until you are confident.
- Keep your deployer key private and never commit it.
- Only run one production deploy per day.
