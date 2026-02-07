---
name: token-builder
description: Produce token launch content, specs, and documentation.
---

# Token Builder Skill

## Goal
Generate **token contract code + launch docs** for a SYNTH drop repo.

## Required Files
- `contracts/src/<TokenName>.sol` (ERC20, OpenZeppelin v5)
- `contracts/script/DeployToken.s.sol`
- Optional: `contracts/README.md` with deploy steps

## Requirements
- Solidity `^0.8.24`, OpenZeppelin v5 imports.
- Owner-controlled minting + fixed initial supply.
- NatSpec for public functions.
- No placeholders or `__TOKEN__` tags.

## Output Expectations
- Clear token utility and use case.
- Token specs summary (symbol, supply, decimals).
- Contract address + explorer link.
- Safety/verification note (testnet before mainnet).

## Tone
Concise, professional, crypto-native without hype.
