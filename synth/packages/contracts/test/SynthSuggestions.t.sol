// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {SynthSuggestions} from "../src/SynthSuggestions.sol";

contract SynthSuggestionsTest is Test {
    SynthSuggestions private suggestions;
    address private owner;
    address private alice;
    address private bob;

    function setUp() public {
        owner = vm.addr(1);
        alice = vm.addr(2);
        bob = vm.addr(3);

        vm.prank(owner);
        suggestions = new SynthSuggestions(owner);
    }

    function testSubmitStoresSuggestion() public {
        vm.deal(alice, 1 ether);

        vm.prank(alice);
        suggestions.submit{value: 0.01 ether}("build a base tools hub");

        assertEq(suggestions.totalSuggestions(), 1);

        SynthSuggestions.Suggestion memory s = suggestions.getSuggestion(0);
        assertEq(s.id, 0);
        assertEq(s.submitter, alice);
        assertEq(s.stake, 0.01 ether);
        assertEq(s.reviewed, false);
        assertEq(s.built, false);
        assertEq(keccak256(bytes(s.content)), keccak256(bytes("build a base tools hub")));

        uint256[] memory userIds = suggestions.getUserSuggestions(alice);
        assertEq(userIds.length, 1);
        assertEq(userIds[0], 0);
    }

    function testSubmitRevertsOnInsufficientStake() public {
        vm.deal(alice, 1 ether);

        vm.prank(alice);
        vm.expectRevert("Insufficient stake");
        suggestions.submit{value: 0.0005 ether}("too low");
    }

    function testSubmitRevertsOnEmptyContent() public {
        vm.deal(alice, 1 ether);

        vm.prank(alice);
        vm.expectRevert("Invalid content length");
        suggestions.submit{value: 0.01 ether}("");
    }

    function testSubmitRevertsOnTooLongContent() public {
        vm.deal(alice, 1 ether);
        string memory content = _makeString(1001);

        vm.prank(alice);
        vm.expectRevert("Invalid content length");
        suggestions.submit{value: 0.01 ether}(content);
    }

    function testMarkReviewedReturnsStake() public {
        vm.deal(alice, 1 ether);

        vm.prank(alice);
        suggestions.submit{value: 0.02 ether}("ship an nft mint");

        uint256 beforeBalance = alice.balance;

        vm.prank(owner);
        suggestions.markReviewed(0, true);

        SynthSuggestions.Suggestion memory s = suggestions.getSuggestion(0);
        assertEq(s.reviewed, true);
        assertEq(s.built, true);
        assertEq(s.stake, 0);

        assertEq(alice.balance, beforeBalance + 0.02 ether);
    }

    function testMarkReviewedOnlyOwner() public {
        vm.deal(alice, 1 ether);

        vm.prank(alice);
        suggestions.submit{value: 0.01 ether}("signal");

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        suggestions.markReviewed(0, false);
    }

    function testMarkReviewedRevertsIfAlreadyReviewed() public {
        vm.deal(alice, 1 ether);

        vm.prank(alice);
        suggestions.submit{value: 0.01 ether}("signal");

        vm.prank(owner);
        suggestions.markReviewed(0, false);

        vm.prank(owner);
        vm.expectRevert("Already reviewed");
        suggestions.markReviewed(0, false);
    }

    function testGetSuggestionRevertsOnInvalidId() public {
        vm.expectRevert("Invalid suggestion");
        suggestions.getSuggestion(1);
    }

    function testGetTopSuggestionsSortedByStake() public {
        vm.deal(alice, 1 ether);
        vm.deal(bob, 1 ether);

        vm.prank(alice);
        suggestions.submit{value: 0.01 ether}("low stake");
        vm.prank(bob);
        suggestions.submit{value: 0.05 ether}("high stake");
        vm.prank(alice);
        suggestions.submit{value: 0.02 ether}("mid stake");

        vm.prank(owner);
        suggestions.markReviewed(0, false);

        SynthSuggestions.Suggestion[] memory top = suggestions.getTopSuggestions(10);
        assertEq(top.length, 2);
        assertEq(top[0].stake, 0.05 ether);
        assertEq(top[1].stake, 0.02 ether);
    }

    function testEmergencyWithdrawOnlyOwner() public {
        vm.deal(address(suggestions), 1 ether);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        suggestions.emergencyWithdraw();
    }

    function testEmergencyWithdrawTransfersBalance() public {
        vm.deal(address(suggestions), 1 ether);
        uint256 beforeBalance = owner.balance;

        vm.prank(owner);
        suggestions.emergencyWithdraw();

        assertEq(owner.balance, beforeBalance + 1 ether);
        assertEq(address(suggestions).balance, 0);
    }

    function _makeString(uint256 length) private pure returns (string memory) {
        bytes memory data = new bytes(length);
        for (uint256 i = 0; i < length; i++) {
            data[i] = "a";
        }
        return string(data);
    }
}
