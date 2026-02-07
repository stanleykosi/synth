---
name: trend-detector
description: Collect and score trend signals from social, onchain, and suggestions.
---

# Skill: Trend Detector

## Purpose
Collect and score trend signals from web/RSS, Farcaster, Dune/onchain data, and user suggestions.

## Inputs
- Web/RSS headlines and summaries
- Farcaster channel snapshots
- Onchain metrics (Dune, Base explorer)
- Dashboard suggestions + stakes
- web_search evidence to validate each signal

## Procedure
1. Gather recent signals (last 24h), prioritize newest.
2. Deduplicate and summarize each signal.
3. Enrich top signals with web_search evidence.
4. Score each signal on impact, momentum, and feasibility (0-10).
5. Log results to `memory/trends.md` with UTC timestamps.

## Output
A ranked list of signals with reasoning and source notes.

## Execution
Run the agent cycle or trigger it via the control API to populate `memory/trends.md` and `memory/trends.json`.
