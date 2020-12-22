// SPDX-License-Identifier: MIT
pragma solidity ^0.6.12;

contract Lottery {
    enum State {IDLE, BETTING}
    State public currentState = State.IDLE;
    address payable[] public players;
    uint256 public betCount; // count # of required participants in lottery round
    uint256 public betSize; // amount of ether that each participate needs to send to participate in the lottery
    uint256 public houseFee;
    address public admin;

    constructor(uint256 fee) public {
        require((fee > 1 && fee < 100), "fee should be between 1 to 99");
        houseFee = fee;
        admin = msg.sender;
    }

    // count:   # of participants required to distribute the winning
    // size:    pot size that each participant needs to send
    // only 1 bet at a time
    function createBet(uint256 count, uint256 size)
        external
        payable
        inState(State.IDLE)
        onlyAdmin()
    {
        betCount = count;
        betSize = size;
        currentState = State.BETTING;
    }

    function bet() external payable inState(State.BETTING) {
        require(msg.value == betSize, "can only bet exactly the bet size");
        players.push(msg.sender);
        if (players.length == betCount) {
            // 1. Pick a winner
            uint winner = _randomModulo(betCount);
            // 2. Send the money to the winner
            players[winner].transfer((betSize * betCount) * (100 - houseFee) / 100);
            // 3. Change state to IDLE
            currentState = State.IDLE;
            // 4. Data cleanup
            delete players;
        }
    }

    // Allow admin to cancel an ongoing bet
    function cancel() external inState(State.BETTING) onlyAdmin() {
        for (uint i = 0; i < players.length; i++) {
            // reimburse players
            players[i].transfer(betSize);
        }
        delete players;
        currentState = State.IDLE;
    }

    // modulo is upper band for the random number
    function _randomModulo(uint256 modulo) internal view returns (uint) {
        // keccak256 accepts only 1 parameter, so we encode inputs, and keccak256 returns bytes32
        return uint(keccak256(abi.encodePacked(block.timestamp, block.difficulty))) % modulo;
        
    }

    modifier inState(State state) {
        require(currentState == state, "current state does not allow this");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "only admin");
        _;
    }
}
