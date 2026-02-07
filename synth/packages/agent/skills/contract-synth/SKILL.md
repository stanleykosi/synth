---
name: contract-synth
description: Generate secure contracts, tests, and deployment scripts.
---

# Skill: Contract Synth

## Purpose
Design **secure smart contracts** and deployment scripts for each drop.

## Procedure
1. Select the appropriate contract type (ERC20, ERC721, ERC1155, or custom) only if the drop is onchain.
2. Write minimal, secure contracts with NatSpec for public functions.
3. Provide Foundry deploy scripts in `contracts/script/`.
4. Keep contracts compatible with OpenZeppelin v5 and Solidity ^0.8.24.
5. Record addresses and tx hashes in `memory/drops.md`.

## Safety
- Use ReentrancyGuard on payable functions.
- Validate inputs thoroughly.
- Never expose private keys or secrets.

## Execution
The pipeline deploys from `packages/contracts`. The drop repo must still include clean, compilable contract code for transparency.
