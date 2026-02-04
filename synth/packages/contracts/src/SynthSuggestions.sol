// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title SynthSuggestions
/// @notice Collects and ranks onchain suggestions by stake
contract SynthSuggestions is Ownable, ReentrancyGuard {
    uint256 public constant MIN_STAKE = 0.001 ether;

    struct Suggestion {
        uint256 id;
        address submitter;
        string content;
        uint256 stake;
        uint256 timestamp;
        bool reviewed;
        bool built;
    }

    Suggestion[] public suggestions;
    mapping(address => uint256[]) public userSuggestions;

    event SuggestionSubmitted(uint256 indexed id, address indexed submitter, uint256 stake);
    event SuggestionReviewed(uint256 indexed id, bool built);
    event StakeReturned(uint256 indexed id, address indexed submitter, uint256 amount);

    /// @notice Initializes the contract with the deployer as owner
    constructor() Ownable(msg.sender) {}

    /// @notice Submit a suggestion with a minimum stake
    /// @param content The suggestion content (1-1000 chars)
    function submit(string calldata content) external payable nonReentrant {
        require(msg.value >= MIN_STAKE, "Insufficient stake");
        require(bytes(content).length > 0 && bytes(content).length <= 1000, "Invalid content length");

        uint256 id = suggestions.length;
        suggestions.push(
            Suggestion({
                id: id,
                submitter: msg.sender,
                content: content,
                stake: msg.value,
                timestamp: block.timestamp,
                reviewed: false,
                built: false
            })
        );

        userSuggestions[msg.sender].push(id);
        emit SuggestionSubmitted(id, msg.sender, msg.value);
    }

    /// @notice Mark a suggestion as reviewed and return the staked amount
    /// @param id The suggestion id
    /// @param wasBuilt Whether the suggestion was built
    function markReviewed(uint256 id, bool wasBuilt) external onlyOwner nonReentrant {
        require(id < suggestions.length, "Invalid suggestion");
        Suggestion storage s = suggestions[id];
        require(!s.reviewed, "Already reviewed");

        s.reviewed = true;
        s.built = wasBuilt;

        uint256 amount = s.stake;
        s.stake = 0;

        (bool success, ) = payable(s.submitter).call{value: amount}("");
        require(success, "Transfer failed");

        emit SuggestionReviewed(id, wasBuilt);
        emit StakeReturned(id, s.submitter, amount);
    }

    /// @notice Fetch a suggestion by id
    /// @param id The suggestion id
    /// @return The suggestion struct
    function getSuggestion(uint256 id) external view returns (Suggestion memory) {
        require(id < suggestions.length, "Invalid suggestion");
        return suggestions[id];
    }

    /// @notice Return top pending suggestions by stake
    /// @param limit Max results
    /// @return Array of suggestions
    function getTopSuggestions(uint256 limit) external view returns (Suggestion[] memory) {
        uint256 pending = 0;
        for (uint256 i = 0; i < suggestions.length; i++) {
            if (!suggestions[i].reviewed) pending++;
        }

        uint256 count = pending < limit ? pending : limit;
        Suggestion[] memory result = new Suggestion[](count);

        uint256[] memory indices = new uint256[](pending);
        uint256 idx = 0;
        for (uint256 i = 0; i < suggestions.length; i++) {
            if (!suggestions[i].reviewed) {
                indices[idx++] = i;
            }
        }

        for (uint256 i = 0; i < indices.length; i++) {
            for (uint256 j = i + 1; j < indices.length; j++) {
                if (suggestions[indices[j]].stake > suggestions[indices[i]].stake) {
                    uint256 temp = indices[i];
                    indices[i] = indices[j];
                    indices[j] = temp;
                }
            }
        }

        for (uint256 i = 0; i < count; i++) {
            result[i] = suggestions[indices[i]];
        }

        return result;
    }

    /// @notice Total number of suggestions
    /// @return Total suggestions
    function totalSuggestions() external view returns (uint256) {
        return suggestions.length;
    }

    /// @notice Suggestion ids submitted by a user
    /// @param user The submitter address
    /// @return Array of suggestion ids
    function getUserSuggestions(address user) external view returns (uint256[] memory) {
        return userSuggestions[user];
    }

    /// @notice Withdraw contract balance in emergency
    function emergencyWithdraw() external onlyOwner {
        (bool success, ) = payable(owner()).call{value: address(this).balance}("");
        require(success, "Transfer failed");
    }
}
