// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/SynthSuggestions.sol";

contract DeploySuggestions is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        SynthSuggestions suggestions = new SynthSuggestions();

        console.log("SynthSuggestions deployed to:", address(suggestions));

        vm.stopBroadcast();
    }
}
