// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title SynthERC721
/// @notice Minimal ERC721 template with owner-controlled minting
contract SynthERC721 is ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;

    /// @notice Initialize the ERC721 collection
    /// @param name_ Token name
    /// @param symbol_ Token symbol
    /// @param owner_ Initial owner
    constructor(string memory name_, string memory symbol_, address owner_)
        ERC721(name_, symbol_)
        Ownable(owner_)
    {}

    /// @notice Mint a new token to a recipient with a token URI
    /// @param to Recipient address
    /// @param tokenUri Token metadata URI
    /// @return tokenId The minted token id
    function mint(address to, string calldata tokenUri) external onlyOwner returns (uint256 tokenId) {
        tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenUri);
    }

    /// @notice Returns the next token id that will be minted
    function nextTokenId() external view returns (uint256) {
        return _nextTokenId;
    }
}
