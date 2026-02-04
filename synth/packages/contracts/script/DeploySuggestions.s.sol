// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {SynthSuggestions} from "../src/SynthSuggestions.sol";

contract DeploySuggestions is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        SynthSuggestions suggestions = new SynthSuggestions();

        console2.log("SynthSuggestions deployed to:", address(suggestions));

        vm.stopBroadcast();
    }
}
