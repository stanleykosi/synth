// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title SynthERC1155
/// @notice Minimal ERC1155 template with owner-controlled minting
contract SynthERC1155 is ERC1155, Ownable {
    /// @notice Initialize the ERC1155 collection
    /// @param uri_ Base metadata URI
    /// @param owner_ Initial owner
    constructor(string memory uri_, address owner_) ERC1155(uri_) Ownable(owner_) {}

    /// @notice Mint tokens to a recipient
    /// @param to Recipient address
    /// @param id Token id
    /// @param amount Quantity to mint
    /// @param data Additional data
    function mint(address to, uint256 id, uint256 amount, bytes calldata data) external onlyOwner {
        _mint(to, id, amount, data);
    }

    /// @notice Mint tokens in batch
    /// @param to Recipient address
    /// @param ids Token ids
    /// @param amounts Quantities to mint
    /// @param data Additional data
    function mintBatch(address to, uint256[] calldata ids, uint256[] calldata amounts, bytes calldata data)
        external
        onlyOwner
    {
        _mintBatch(to, ids, amounts, data);
    }

    /// @notice Update base URI
    /// @param newUri New base URI
    function setURI(string calldata newUri) external onlyOwner {
        _setURI(newUri);
    }
}
