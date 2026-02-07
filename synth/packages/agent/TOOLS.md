# Tool Usage Guide

## Priorities
- Prefer `web_search` + `web_fetch` for external evidence when enabled.
- Use `browser` only when a source requires JS or login.
- Use `exec` only for Foundry or required build steps.
- Keep outputs structured and JSON‑safe.
- If `web_search` is unavailable, fall back to RSS + Dune + Farcaster signals.

## Guardrails
- Avoid expensive or unnecessary tool calls.
- Never run commands that expose secrets.
- Always log outcomes in memory.
