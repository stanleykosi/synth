// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/templates/SynthERC20.sol";

contract DeployToken is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        string memory name = vm.envString("TOKEN_NAME");
        string memory symbol = vm.envString("TOKEN_SYMBOL");
        uint8 decimals = uint8(vm.envUint("TOKEN_DECIMALS"));
        uint256 supply = vm.envUint("TOKEN_SUPPLY");
        address holder = vm.envAddress("TOKEN_HOLDER");

        vm.startBroadcast(deployerPrivateKey);

        SynthERC20 token = new SynthERC20(name, symbol, decimals, supply, holder);

        console.log("SynthERC20 deployed to:", address(token));

        vm.stopBroadcast();
    }
}
