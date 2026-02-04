# Skill: Contract Synth

## Purpose
Design and deploy smart contracts based on selected trends.

## Procedure
1. Select the appropriate template (ERC20, ERC721, ERC1155, or custom).
2. Write minimal, secure contracts with NatSpec for public functions.
3. Write Foundry tests to cover critical paths.
4. Deploy to Base Sepolia and verify.
5. If tests pass, deploy to Base mainnet and verify.
6. Record addresses and tx hashes in `memory/drops.md`.

## Safety
- Use ReentrancyGuard on payable functions.
- Validate inputs thoroughly.
- Never expose private keys or secrets.

## Execution
Use the agent cycle to run Foundry tests, deploy to Base Sepolia, and optionally mainnet when enabled.
