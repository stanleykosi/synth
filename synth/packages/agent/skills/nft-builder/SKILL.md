---
name: nft-builder
description: Produce NFT launch content, mint details, and documentation.
---

# NFT Builder Skill

## Goal
Generate **NFT contract code + launch docs** for a SYNTH drop repo.

## Required Files
- `contracts/src/<CollectionName>.sol` (ERC721 or ERC1155)
- `contracts/script/DeployERC721.s.sol` or `DeployERC1155.s.sol`
- Optional: `contracts/README.md` with deploy + mint notes

## Requirements
- Solidity `^0.8.24`, OpenZeppelin v5 imports.
- Owner-controlled minting.
- Support token URI or base URI config.
- NatSpec for public functions.
- No placeholders or `__TOKEN__` tags.

## Output Expectations
- Collection narrative + mint mechanics summary.
- Contract address + explorer link.
- Metadata/URI guidance.
- Clear local dev + deploy steps.

## Tone
Concise, technical, and user-friendly.
