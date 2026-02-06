// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {SynthERC721} from "../src/templates/SynthERC721.sol";

contract DeployERC721 is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        string memory name = vm.envString("TOKEN_NAME");
        string memory symbol = vm.envString("TOKEN_SYMBOL");
        address owner = vm.envAddress("TOKEN_HOLDER");

        vm.startBroadcast(deployerPrivateKey);
        SynthERC721 nft = new SynthERC721(name, symbol, owner);
        console2.log("SynthERC721 deployed to:", address(nft));
        vm.stopBroadcast();
    }
}
