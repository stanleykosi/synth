// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {SynthERC1155} from "../src/templates/SynthERC1155.sol";

contract DeployERC1155 is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        string memory uri = vm.envString("TOKEN_URI");
        address owner = vm.envAddress("TOKEN_HOLDER");

        vm.startBroadcast(deployerPrivateKey);
        SynthERC1155 nft = new SynthERC1155(uri, owner);
        console2.log("SynthERC1155 deployed to:", address(nft));
        vm.stopBroadcast();
    }
}
