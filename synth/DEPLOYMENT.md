# SYNTH Production Deployment Guide

Last updated: 2026-02-05

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
- `SUGGESTIONS_OWNER_PRIVATE_KEY`

Required only if you want posting:
- `TWITTER_API_KEY`
- `TWITTER_API_SECRET`
- `TWITTER_ACCESS_TOKEN`
- `TWITTER_ACCESS_SECRET`
- `NEYNAR_SIGNER_UUID`

Optional:
- `BASESCAN_API_KEY` (only needed for contract verification)
- `GITHUB_ORG` (only if you want repos created under an org; omit for personal accounts)
- `VERCEL_TEAM_ID` (only for Vercel Team accounts)
- `DUNE_API_KEY` (only if you want Dune data)
- `BRAVE_API_KEY` (recommended for OpenClaw web_search enrichment)
- `GRAPH_ENDPOINT` and `GRAPH_QUERY` (only if you want The Graph signals)

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

### Step 6: Install Node + pnpm

First, check what Node you already have:

```
node -v
```

If the version is **20 or higher**, keep it. If it is below 20, install a current LTS:

```
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

Then install pnpm via corepack:

```
sudo corepack enable
sudo corepack prepare pnpm@9.15.1 --activate
```

If you see a permission error, run:

```
sudo ln -s "$(command -v node)" /usr/bin/node || true
sudo corepack prepare pnpm@9.15.1 --activate
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

### Step 2: Point OpenClaw to the SYNTH workspace

We now run OpenClaw directly from the repo workspace so skills and memory stay in sync.
No copy is required if you set the workspace path to `/home/ubuntu/synth/synth/packages/agent` (see JSON below).

If you prefer the default OpenClaw workspace, you can still copy:

```
cd ~/synth/synth
cp -r packages/agent/* ~/.openclaw/workspace/
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
BRAVE_API_KEY=
OPENROUTER_API_KEY=
GRAPH_ENDPOINT=
GRAPH_QUERY=
OPENCLAW_GATEWAY_URL=http://127.0.0.1:18789
OPENCLAW_GATEWAY_TOKEN=
OPENCLAW_WORKSPACE_DIR=/home/ubuntu/synth/synth/packages/agent
OPENCLAW_CLI_PATH=openclaw
OPENCLAW_AGENT_ID=synth
OPENCLAW_AGENT_TIMEOUT=180
OPENCLAW_SESSION_MODE=stateless
SYNTH_LLM_MODEL=openrouter/moonshotai/kimi-k2.5
SYNTH_LLM_MAX_TOKENS=200000
SYNTH_CODEGEN_MODE=llm
SYNTH_CODEGEN_MAX_TOKENS=3500
SUGGESTIONS_OWNER_PRIVATE_KEY=
SYNTH_MONITOR_ENABLED=true
SYNTH_MONITOR_INTERVAL_MS=300000
SYNTH_MONITOR_STALE_HOURS=36
SYNTH_MONITOR_STUCK_MINUTES=120
SYNTH_MONITOR_QUEUE_THRESHOLD=3
SYNTH_MONITOR_COOLDOWN_MINUTES=60
SYNTH_ALERT_WEBHOOK_URL=
BASESCAN_API_KEY=
DEPLOYER_PRIVATE_KEY=
DEPLOYER_ADDRESS=
BASE_RPC=https://mainnet.base.org
BASE_SEPOLIA_RPC=https://sepolia.base.org
SUGGESTIONS_ADDRESS=
SUGGESTIONS_CHAIN_ID=84532
TOKEN_URI=
ADMIN_SECRET=
SYNTH_ENABLE_SCHEDULER=true
SYNTH_ENABLE_TREND_SCHEDULER=true
SYNTH_TREND_COLLECT_CRON=0 */1 * * *
SYNTH_TREND_POST_CRON=0 */3 * * *
SYNTH_TREND_POOL_MAX_PER_RUN=25
SYNTH_BUILD_TREND_LOOKBACK_HOURS=12
SYNTH_TREND_POST_LOOKBACK_HOURS=12
SYNTH_TREND_POST_MAX_SIGNALS=6
SYNTH_TREND_POST_COOLDOWN_MINUTES=150
SYNTH_REPO_UNIQUE=true
SYNTH_VERCEL_DEPLOY_RETRIES=2
SYNTH_VERCEL_POLL_INTERVAL_MS=5000
SYNTH_VERCEL_POLL_TIMEOUT_MS=600000
CORS_ORIGIN=https://synth.xyz
```

Note: Twitter API keys are only needed for posting. This setup runs without X/Twitter scraping by default and uses RSS/web sources instead.

Note: `web_search` enrichment is strongest with a Brave API key. If you skip it, SYNTH still uses RSS + Farcaster + Dune and will continue to operate.

Note: `OPENROUTER_API_KEY` powers the LLM decision gate, admin chat, and fallback if the OpenClaw agent loop fails. OpenClaw expects model refs as `provider/model`, so `openrouter/moonshotai/kimi-k2.5` is correct. 

### Step 3.1: Configure OpenClaw Agent Loop + Native Skills

SYNTH now uses the **full OpenClaw agent loop** (not `llm-task`). This gives you native tool use, skill execution, and session memory.  
OpenClaw loads skills in this order: `<workspace>/skills` → `~/.openclaw/skills` → bundled → `skills.load.extraDirs`.  
We set the workspace to the SYNTH agent folder so your skills and memory are native and live.

Edit `~/.openclaw/openclaw.json` and add:

```json
{
  "gateway": {
    "mode": "local",
    "auth": {
      "mode": "token",
      "token": "REPLACE_WITH_RANDOM_TOKEN"
    }
  },
  "agents": {
    "defaults": {
      "workspace": "/home/ubuntu/synth/synth/packages/agent",
      "model": { "primary": "openrouter/moonshotai/kimi-k2.5" }
    },
    "list": [
      {
        "id": "synth",
        "workspace": "/home/ubuntu/synth/synth/packages/agent",
        "tools": { "allow": ["web_search", "web_fetch", "skills"] }
      }
    ]
  },
  "skills": {
    "load": {
      "extraDirs": ["/home/ubuntu/synth/synth/packages/agent/skills"],
      "watch": true,
      "watchDebounceMs": 250
    }
  },
  "tools": {
    "web": {
      "search": {
        "enabled": false
      },
      "fetch": { "enabled": true }
    }
  }
}
```

Generate a token:

```
openssl rand -hex 32
```

Put the same value into:

- `~/.openclaw/openclaw.json` → `gateway.auth.token`
- `~/.openclaw/.env` → `OPENCLAW_GATEWAY_TOKEN`

OpenRouter auth (one time):

```
openclaw models auth paste-token --provider openrouter
```

Test the agent loop:

```
openclaw agent --agent synth --message "Reply JSON {\"ok\":true}" --json
```

### Step 3.2 (Optional): Enable web_search

OpenClaw `web_search` needs a provider key (Brave or Perplexity). If you don’t have one, keep search disabled and SYNTH will still run on RSS + Farcaster + Dune.

To enable web_search later:

```
openclaw configure --section web
```

### Step 4: Configure the agent targets

Edit `synth/packages/agent/agent.config.json`:

- If you want X/Twitter signals later, set `twitter.enabled` to `true` and choose `twitter.mode` (`browser` or `api`).
- If you do NOT want X/Twitter, keep `twitter.enabled` as `false` and leave `twitter.queries` empty.
- Configure web/RSS sources in `web.sources` (Base Mirror, Ethereum Blog, Coinbase Blog, CoinDesk, and Farcaster RSS are included by default).
- Configure deep research in `research` (how many signals to enrich).
- Configure the LLM decision gate in `decision` (min score/confidence thresholds).
- Add Farcaster channels in `farcaster.channels`.
- Add Dune query IDs in `dune.queryIds` (Base activity + bridge flow queries are included by default).
- Keep `autoDeployMainnet` false until you are ready.

### Step 4.1: (Optional) X/Twitter browser login

Only required if you enable `twitter.enabled=true` with `twitter.mode="browser"`.

### Step 5: Start the agent API

```
cd /home/synth/synth
pnpm --filter @synth/agent run server
```

This starts the agent API on port `8787`.

### Step 5.1: Connect GitHub to Vercel (required for auto webapp deploys)

The agent creates a GitHub repo and then asks Vercel to link it. Vercel requires a GitHub login connection.

1. Go to Vercel → **Account Settings** → **Git Integration**
2. Connect your GitHub account
3. Create/confirm a **Vercel Access Token**
4. If you use an org, set `GITHUB_ORG`. If you use a personal account, leave it empty.

If you skip this, the cycle still deploys contracts but webapp deployment will be skipped.

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

### Step 4: Verify the Agent API

```
curl http://127.0.0.1:8787/health
curl http://127.0.0.1:8787/status
curl http://127.0.0.1:8787/trends
```

If you prefer the versioned paths, use `/api/health`, `/api/status`, and `/api/trends`.

### Step 5: Enable Admin Chat + Skills

The admin UI now includes:

- **Chat** (admin-only) to talk to SYNTH via OpenClaw LLM.
- **Skills** editor to update `SKILL.md` files live.

Ensure these env vars exist:

```
ADMIN_SECRET=...
OPENCLAW_WORKSPACE_DIR=/home/ubuntu/synth/synth/packages/agent
OPENCLAW_SESSION_MODE=stateless
```

Then in the Admin UI:
- `/chat` to talk to the agent
- `/skills` to edit skills and sync to OpenClaw workspace
- `/` (dashboard) to pause/resume runs, clear drops, or reset memory
  - Use **Clear Chat** inside `/chat` to wipe chat history

Skills updates are read on every chat request and every cycle run, so no restart is needed.

## Part 6: Connect Social Platforms

### Twitter/X

1. Create a Twitter app with read/write permission.
2. Copy the API keys into `~/.openclaw/.env`.

### Farcaster

1. Create a Neynar account.
2. Generate `NEYNAR_API_KEY`.
3. Create a signer and copy `NEYNAR_SIGNER_UUID`.
4. Put both in `~/.openclaw/.env`.

## Part 7: Deploy the Suggestions Contract (Manual)

### Step 1: Create env file

Create `packages/contracts/.env`:

```
DEPLOYER_PRIVATE_KEY=
DEPLOYER_ADDRESS=
SUGGESTIONS_OWNER=
BASE_RPC=https://mainnet.base.org
BASE_SEPOLIA_RPC=https://sepolia.base.org
BASESCAN_API_KEY=
```

Set `SUGGESTIONS_OWNER` to the wallet address that should own the Suggestions contract (usually your admin wallet).
If you already deployed an older version, redeploy to set the correct owner.

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
  -d '{"action":"run","force":true}'
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

---

# If You Already Have OpenClaw on VPS + Vercel Deployed

Follow this exact checklist to finish production readiness.

## Step 1: Pull the Latest Code

```
cd ~/synth/synth
git pull
pnpm install
```

## Step 2: Refresh the OpenClaw Workspace

If your OpenClaw workspace is set to the repo path (`/home/ubuntu/synth/synth/packages/agent`), no copy is needed.
If you kept the default `~/.openclaw/workspace`, copy the files:

```
cp -r ~/synth/synth/packages/agent/* ~/.openclaw/workspace/
```

This ensures `SOUL.md`, `USER.md`, `TOOLS.md`, and new skills are in the workspace.

## Step 3: Web Search Tools (Optional)

OpenClaw `web_search` requires a provider key. If you **do not** have Perplexity or Brave keys, keep search disabled:

```json
{
  "tools": {
    "web": {
      "search": { "enabled": false },
      "fetch": { "enabled": true }
    }
  }
}
```

If you later add a key, set `enabled: true` and configure your provider.

Restart the gateway:

```
systemctl --user restart openclaw-gateway.service
openclaw status
```

## Step 4: Restart the Agent

```
sudo systemctl restart synth-agent
sudo systemctl status synth-agent --no-pager
```

## Step 5: Verify Health

```
curl https://agent.synthclaw.xyz/health
curl https://agent.synthclaw.xyz/status
```

## Step 6: Run One Manual Cycle

```
cd ~/synth/synth
pnpm --filter @synth/agent run cycle
```

Confirm logs show:
- decision created
- repo created
- Sepolia deployment success
- social post generated (if keys present)

## Step 7: Deploy Suggestions Contract (Still Pending)

```
cd ~/synth/synth/packages/contracts
forge script script/DeploySuggestions.s.sol:DeploySuggestions \
  --rpc-url $BASE_SEPOLIA_RPC \
  --broadcast \
  --verify
```

Then update Vercel Web app env:

```
NEXT_PUBLIC_SUGGESTIONS_ADDRESS=<sepolia address>
```

## Step 8: When Ready, Deploy Suggestions to Mainnet

```
forge script script/DeploySuggestions.s.sol:DeploySuggestions \
  --rpc-url $BASE_RPC \
  --broadcast \
  --verify
```

Update Vercel Web env again with the mainnet address and redeploy.
