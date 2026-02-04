# Skill: Trend Detector

## Purpose
Collect and score trend signals from Twitter, Farcaster, Discord, and onchain activity.

## Inputs
- Social feed snapshots
- Onchain metrics (Dune, Base explorer)
- Dashboard suggestions

## Procedure
1. Gather recent signals (last 24h).
2. Deduplicate and summarize each signal.
3. Score each signal on impact, momentum, and feasibility (0-10).
4. Log results to `memory/trends.md` with UTC timestamps.

## Output
A ranked list of signals with reasoning and source notes.

## Execution
Run the agent cycle or trigger it via the control API to populate `memory/trends.md` and `memory/trends.json`.
