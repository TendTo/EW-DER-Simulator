// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IAggregatorContract.sol";

/**
 * @title Aggregator
 * @author TendTo
 * @notice Offers a real-time state of the balance of all the DER under this aggregator.
 */
contract AggregatorContract is IAggregatorContract {
    int256 public constant flexibilityMargin = 10;
    address public immutable aggregator;

    // Current state of the aggregator
    int256 public energyBalance;

    // Prosumers
    mapping(address => Agreement) public agreements;
    mapping(address => Prosumer) public prosumers;
    // TODO: could be an heap based on a function of reputation and price
    address[] public prosumerList;

    // Each time there is a flexibility request...
    FlexibilityRequest public flexibilityRequest;
    mapping(address => int256) public flexibilityResults;

    constructor() {
        aggregator = msg.sender;
    }

    modifier isAggregator() {
        if (msg.sender != aggregator) revert UnauthorizedAggregatorError(msg.sender);
        _;
    }

    modifier agreementExists(address _address) {
        if (agreements[_address].value == 0) revert AgreementDoesNotExistsError();
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

    function prosumerListLength() external view returns (uint256) {
        return prosumerList.length;
    }

    function registerAgreement(Agreement calldata _agreement)
        external
        agreementDoesNotExist(msg.sender)
    {
        if (_agreement.value == 0) revert ZeroValueError("value");
        // Just to make sure not to add the same address twice. This would be prevented by the modifier
        if (agreements[msg.sender].value == 0) {
            // Register the prosumer in the list of prosumers
            prosumers[msg.sender].idx = prosumerList.length;
            prosumerList.push(msg.sender);
        } else {
            energyBalance -= agreements[msg.sender].value;
        }
        // Set the agreement
        agreements[msg.sender] = _agreement;
        // Change the energy balance
        energyBalance += _agreement.value;

        emit RegisterAgreement(msg.sender, _agreement);
    }

    function reviseAgreement(Agreement calldata _agreement) external agreementExists(msg.sender) {
        if (_agreement.value == 0) revert ZeroValueError("value");
        emit ReviseAgreement(msg.sender, agreements[msg.sender], _agreement);

        // Update the energy balance, removing the old value and adding the new one
        energyBalance += _agreement.value - agreements[msg.sender].value;
        // Change the agreement 
        agreements[msg.sender] = _agreement;
    }

    function cancelAgreement() external agreementExists(msg.sender) {
        emit CancelAgreement(msg.sender, agreements[msg.sender]);

        // Remove the prosumer from the list of prosumers
        removeProsumerFromList(msg.sender);
        delete agreements[msg.sender];
        // Remove the agreement
        energyBalance -= agreements[msg.sender].value;
    }

    function requestFlexibility(
        uint256 _start,
        uint256 _end,
        int256 _gridFlexibility
    ) external isAggregator {
        emit RequestFlexibility(_start, _end, _gridFlexibility);

        // Create a FlexibilityRequest struct, so the parameters can be accessed by future requests
        flexibilityRequest = FlexibilityRequest(_start, _end, _gridFlexibility);
    }

    function endFlexibilityRequest(uint256 _start, FlexibilityResult[] calldata _results)
        external
        isAggregator
    {   
        // Check if the request is still valid
        if (flexibilityRequest.start != _start)
            revert FlexibilityRequestNotFoundError(flexibilityRequest.start, _start);

        // Store the results
        for (uint256 i = 0; i < _results.length; i++) {
            flexibilityResults[_results[i].prosumer] = _results[i].flexibility;
        }

        emit EndRequestFlexibility(
            flexibilityRequest.start,
            flexibilityRequest.end,
            flexibilityRequest.gridFlexibility
        );
    }

    function provideFlexibilityFair(uint256 _start, int256 _flexibility)
        external
        agreementExists(msg.sender)
    {
        if (_flexibility == 0) revert ZeroValueError("flexibility");
        if (flexibilityRequest.start != _start)
            revert FlexibilityRequestNotFoundError(flexibilityRequest.start, _start);

        // Each prosumer is expected to provide a flexibility proportional
        // to the value it normally provides.
        int256 reward = 0;
        int256 expectedValue = (flexibilityRequest.gridFlexibility * agreements[msg.sender].value) /
            energyBalance;
        int256 result = flexibilityResults[msg.sender];

        if (result == 0) {
            // An error has occurred in the provisioning process.
        } else if (_start != flexibilityRequest.start) {
            // The prosumer didn't request a reward for this flexibility request
        } else if (
            inErrorMargin(_flexibility, result, flexibilityMargin) &&
            inErrorMargin(_flexibility, expectedValue, flexibilityMargin)
        ) {
            // The prosumer will receive the reward
            reward = agreements[msg.sender].flexibilityPrice * result;
            emit FlexibilityProvisioningSuccess(
                flexibilityRequest.start,
                msg.sender,
                result,
                reward
            );
        } else {
            // The flexibility provided does not match the one requested
            // or the one actually provided
            emit FlexibilityProvisioningError(
                flexibilityRequest.start,
                msg.sender,
                result,
                _flexibility,
                expectedValue
            );
        }

        // Assign the reward to the prosumer and delete the result
        prosumers[msg.sender].balance += reward;
        delete flexibilityResults[msg.sender];
    }

    function rewardProduction() external {
        for (uint256 i = 0; i < prosumerList.length; i++) {
            int256 reward = agreements[prosumerList[i]].value *
                agreements[prosumerList[i]].valuePrice;
            emit RewardProduction(
                prosumerList[i],
                block.timestamp,
                agreements[prosumerList[i]].value,
                reward
            );
            prosumers[prosumerList[i]].balance += reward;
        }
    }

    /**
     * @dev For the sake of the simulation,
     * it will send some funds to any of the prosumers
     * whose address is in the list.
     */
    function sendFunds(address payable[] calldata iotAddr) external payable {
        // Value to send to each iot
        uint256 singleValue = msg.value / iotAddr.length;
        for (uint256 i = 0; i < iotAddr.length; i++) {
            iotAddr[i].transfer(singleValue);
        }
    }

    /**
     * @dev For the sake of the simulation,
     * it will reset the status of the contract.
     * All agreements will be deleted, as well as
     * the list of prosumers and any current flexibility
     * request.
     */
    function resetContract() external isAggregator {
        energyBalance = 0;
        for (uint256 i = 0; i < prosumerList.length; i++) {
            delete agreements[prosumerList[i]];
        }
        delete prosumerList;
        delete flexibilityRequest;
    }

    /**
     * @notice Check whether the difference between two values is below a certain percentage
     * @param value1 First value
     * @param value2 Second value
     * @param percentage The percentage of difference (0-100)
     * @return True if the difference is below the percentage provided
     */
    function inErrorMargin(
        int256 value1,
        int256 value2,
        int256 percentage
    ) internal pure returns (bool) {
        int256 diff = value1 > value2 ? value1 - value2 : value2 - value1;
        return (diff * 100) / value1 <= percentage;
    }

    function removeProsumerFromList(address _addr) internal {
        uint256 idx = prosumers[_addr].idx;
        uint256 len = prosumerList.length;
        if (idx >= len) return;
        if (len > 1) {
            prosumerList[idx] = prosumerList[len - 1];
            prosumers[prosumerList[idx]].idx = idx;
            prosumerList.pop();
        } else {
            prosumerList.pop();
        }
    }

    /**
     * @dev For the sake of the simulation,
     * the aggregator can destro the current implementation
     * of the contract, and replace it with a new one.
     */
    function selfDestruct() external isAggregator {
        selfdestruct(payable(aggregator));
    }
}
