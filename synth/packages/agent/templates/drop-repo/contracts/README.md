# Contracts for __DROP_NAME__

This folder includes the Foundry project used to deploy the drop.

## Files

- `src/` contains ERC20, ERC721, and ERC1155 templates.
- `script/` contains deployment scripts for each type.
- `foundry.toml` and `.env.example` provide config.

## Quick start (example)

```bash
forge install OpenZeppelin/openzeppelin-contracts
forge build

# Deploy to Base Sepolia
forge script script/DeployToken.s.sol:DeployToken \
  --rpc-url $BASE_SEPOLIA_RPC \
  --broadcast \
  --verify
```

Update `.env` with `TOKEN_NAME`, `TOKEN_SYMBOL`, and deployer key before running.
