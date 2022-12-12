// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/AutomationCompatible.sol";

error Raffle__NotEnoughETHSent();
error Raffle__AlreadyPlayed();
error Raffle__TransferFailed();
error Raffle__NotOpen();
error Raffle__UpkeepNotNeeded(uint256 balance, uint256 numPlayers, uint256 raffleState);

/**
 * @title Raffle Contract
 * @author Carl Edward
 * @notice This contract is for creating decentralized raffle
 * @dev This implements Chainlink VRF V2 and Chainlink Automation
 */
contract Raffle is VRFConsumerBaseV2, AutomationCompatibleInterface {
    enum RaffleState {
        OPEN,
        CALCULATING
    }

    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    uint256 private immutable i_entranceFee;
    bytes32 private immutable i_keyHash;
    uint32 private immutable i_callbackGasLimit;
    uint64 private immutable i_subscriptionId;
    uint256 private immutable i_interval;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    address private s_recentWinner;
    address payable[] private s_players;
    uint256 private s_lastTimestamp;
    mapping(address => bool) private s_addressToPlayed;
    RaffleState private s_raffleState;

    event NewPlayer(address indexed player);
    event RequestedRaffleWinner(uint256 indexed requestId);
    event WinnerPicked(address indexed winner);

    constructor(
        address vrfCoordinatorV2,
        uint64 subscriptionId,
        uint256 entranceFee,
        uint256 interval,
        bytes32 keyHash,
        uint32 callbackGasLimit
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_subscriptionId = subscriptionId;
        i_entranceFee = entranceFee;
        i_interval = interval;
        i_keyHash = keyHash;
        i_callbackGasLimit = callbackGasLimit;
        s_raffleState = RaffleState.OPEN;
        s_lastTimestamp = block.timestamp;
    }

    function enterRaffle() public payable {
        if (msg.value < i_entranceFee) {
            revert Raffle__NotEnoughETHSent();
        }
        if (s_raffleState != RaffleState.OPEN) {
            revert Raffle__NotOpen();
        }
        if (s_addressToPlayed[msg.sender]) {
            revert Raffle__AlreadyPlayed();
        }
        s_players.push(payable(msg.sender));
        s_addressToPlayed[msg.sender] = true;
        emit NewPlayer(msg.sender);
    }

    /**
     * @notice This function will determine whether or not we will request random words
     * @dev We return an empty string for performData as we dont need it for performUpkeep
     */
    function checkUpkeep(
        bytes memory /* checkData */
    ) public view override returns (bool upkeepNeeded, bytes memory /* performData */) {
        bool isOpen = s_raffleState == RaffleState.OPEN;
        bool timePassed = (block.timestamp - s_lastTimestamp) > i_interval;
        bool hasEnoughPlayers = s_players.length > 1;
        bool hasBalance = address(this).balance > 0;
        upkeepNeeded = isOpen && timePassed && hasEnoughPlayers && hasBalance;
        return (upkeepNeeded, "");
    }

    /**
     * @notice This function will request the random words from the VRF Coordinator
     */
    function performUpkeep(bytes calldata /* performData */) external override {
        (bool upkeepNeeded, ) = checkUpkeep("");
        if (!upkeepNeeded) {
            revert Raffle__UpkeepNotNeeded(address(this).balance, s_players.length, uint256(s_raffleState));
        }
        s_raffleState = RaffleState.CALCULATING;
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_keyHash,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
        emit RequestedRaffleWinner(requestId);
    }

    function fulfillRandomWords(uint256 /* requestId */, uint256[] memory randomWords) internal override {
        uint256 indexOfWinner = randomWords[0] % s_players.length;
        address payable recentWinner = s_players[indexOfWinner];
        s_recentWinner = recentWinner;
        s_raffleState = RaffleState.OPEN;
        // reset mapping
        uint256 playersLength = s_players.length;
        for (uint256 i = 0; i < playersLength; ) {
            address funder = s_players[i];
            s_addressToPlayed[funder] = false;
            unchecked {
                i++;
            }
        }
        s_players = new address payable[](0);
        s_lastTimestamp = block.timestamp;
        (bool success, ) = recentWinner.call{value: address(this).balance}("");
        if (!success) {
            revert Raffle__TransferFailed();
        }
        emit WinnerPicked(s_recentWinner);
    }

    function getEntranceFee() public view returns (uint256) {
        return i_entranceFee;
    }

    function getInterval() public view returns (uint256) {
        return i_interval;
    }

    function getPlayer(uint256 index) public view returns (address) {
        return s_players[index];
    }

    function getNumberOfPlayers() public view returns (uint256) {
        return s_players.length;
    }

    function getRecentWinner() public view returns (address) {
        return s_recentWinner;
    }

    function getRaffleState() public view returns (RaffleState) {
        return s_raffleState;
    }

    function getLatestTimestamp() public view returns (uint256) {
        return s_lastTimestamp;
    }

    function getNumWords() public pure returns (uint256) {
        return NUM_WORDS;
    }

    function getRequestConfirmations() public pure returns (uint256) {
        return REQUEST_CONFIRMATIONS;
    }
}
