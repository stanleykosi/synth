// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title SynthERC20
/// @notice Minimal ERC20 template for SYNTH deployments
contract SynthERC20 is ERC20, ERC20Burnable, Ownable {
    uint8 private _decimals;

    /// @notice Create a new ERC20 with custom decimals and initial supply
    /// @param name_ Token name
    /// @param symbol_ Token symbol
    /// @param decimals_ Token decimals
    /// @param initialSupply_ Initial supply in whole tokens
    /// @param initialHolder_ Recipient of the initial supply
    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        uint256 initialSupply_,
        address initialHolder_
    ) ERC20(name_, symbol_) Ownable(initialHolder_) {
        _decimals = decimals_;
        _mint(initialHolder_, initialSupply_ * 10 ** decimals_);
    }

    /// @notice Returns token decimals
    function decimals() public view override returns (uint8) {
        return _decimals;
    }
}
