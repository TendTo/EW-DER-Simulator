// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IAggregatorContract.sol";

/**
 * @title Aggregator
 * @author TendTo
 * @notice Offers a real-time state of the balance of all the DER under this aggregator.
 */
contract AggregatorContract is IAggregatorContract {
    address public immutable aggregator;
    int256 constant flexibilityMargin = 10;

    // Current state of the aggregator
    int256 public energyBalance;

    // Prosumers
    mapping(address => Agreement) public agreements;
    mapping(address => Prosumer) public prosumers;
    // TODO: could be an heap based on a function of reputation and price
    address[] public prosumerList;

    // Each time there is a flexibility request...
    FlexibilityRequest public flexibilityRequest;
    PendingReward[] public pendingRewards;

    constructor() {
        aggregator = msg.sender;
    }

    modifier isAggregator() {
        if (msg.sender != aggregator)
            revert UnauthorizedAggregatorError(msg.sender);
        _;
    }

    modifier agreementExists(address _address) {
        if (agreements[_address].value == 0)
            revert AgreementDoesNotExistsError();
        _;
    }

    /**
     * @dev For the sake of the simulation,
     * this check will be ignored. This means that
     * each prosumer can register a new agreement
     * at any time without any restrictions.
     */
    modifier agreementDoesNotExist(address _address) {
        // if (agreements[_address].value != 0)
        //     revert AgreementAlreadyExistsError();
        _;
    }

    function registerAgreement(Agreement calldata _agreement)
        external
        agreementDoesNotExist(msg.sender)
    {
        if (_agreement.value == 0) revert ZeroValueError("value");
        agreements[msg.sender] = _agreement;
        prosumers[msg.sender].idx = prosumerList.length;
        prosumerList.push(msg.sender);
        energyBalance += _agreement.value;

        emit RegisterAgreement(msg.sender, _agreement);
    }

    function reviseAgreement(Agreement calldata _agreement)
        external
        agreementExists(msg.sender)
    {
        if (_agreement.value == 0) revert ZeroValueError("value");

        emit ReviseAgreement(msg.sender, agreements[msg.sender], _agreement);
        energyBalance += _agreement.value - agreements[msg.sender].value;
        agreements[msg.sender] = _agreement;
    }

    function cancelAgreement() external agreementExists(msg.sender) {
        emit CancelAgreement(msg.sender, agreements[msg.sender]);

        uint256 idx = prosumers[msg.sender].idx;
        uint256 len = prosumerList.length;
        if (len > 1) {
            prosumerList[idx] = prosumerList[len - 1];
            prosumers[prosumerList[idx]].idx = idx;
            prosumerList.pop();
        } else {
            prosumerList.pop();
        }
        energyBalance -= agreements[msg.sender].value;
        delete agreements[msg.sender];
    }

    function requestFlexibility(int256 _flexibility, uint8 _duration)
        external
        isAggregator
    {
        emit RequestFlexibility(_flexibility, block.timestamp, _duration);
        flexibilityRequest = FlexibilityRequest(
            _flexibility,
            block.timestamp,
            _duration
        );
    }

    function provideFlexibility(int256 _flexibility) external {
        if (_flexibility == 0) revert ZeroValueError("flexibility");
        // TODO: should be .positiveFlexibility?
        int256 expectedValue = (flexibilityRequest.flexibility *
            agreements[msg.sender].value) /
            energyBalance /
            10;
        int256 errorMargin = expectedValue / 10;
        int256 diff = _flexibility > expectedValue
            ? _flexibility - expectedValue
            : expectedValue - _flexibility;
        // Margin of error is 10% of the flexibility requested.
        // TODO: reputation based on accuracy?
        if (diff > errorMargin)
            revert FlexibilityError(expectedValue, _flexibility);
        emit ProvideFlexibility(msg.sender, _flexibility, block.timestamp);
        int256 reward = _flexibility * agreements[msg.sender].flexibilityPrice;
        for (uint256 i = 0; i < pendingRewards.length; i++) {
            if (pendingRewards[i].prosumer == msg.sender) {
                pendingRewards[i].reward = reward;
                return;
            }
        }
        pendingRewards.push(PendingReward(msg.sender, reward));
    }

    function rewardFlexibility() external {
        for (uint256 i = 0; i < pendingRewards.length; i++) {
            emit RewardFlexibility(
                pendingRewards[i].prosumer,
                pendingRewards[i].reward,
                block.timestamp
            );
            prosumers[pendingRewards[i].prosumer].balance += pendingRewards[i]
                .reward;
        }
        delete pendingRewards;
    }

    function rewardProduction() external {
        for (uint256 i = 0; i < prosumerList.length; i++) {
            int256 reward = agreements[prosumerList[i]].value *
                agreements[prosumerList[i]].valuePrice;
            emit RewardValue(prosumerList[i], reward, block.timestamp);
            prosumers[prosumerList[i]].balance += reward;
        }
    }

    /**
     * @dev For the sake of the simulation,
     * it will send some funds to any of the prosumers
     * whose address is in the list.
     */
    function sendFunds(address payable[] calldata iotAddr) external payable {
        uint256 singleValue = msg.value / iotAddr.length;
        for (uint256 i = 0; i < iotAddr.length; i++) {
            iotAddr[i].transfer(singleValue);
        }
    }
}
