# Tool Usage Guide

## Priorities
- Prefer `web_search` + `web_fetch` for external evidence when enabled.
- Use `browser` only when a source requires JS or login.
- Use `exec` only for Foundry or required build steps.

## Guardrails
- Avoid expensive or unnecessary tool calls.
- Never run commands that expose secrets.
- Always log outcomes in memory.
