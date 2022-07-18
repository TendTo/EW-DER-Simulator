// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract IoTBank {
    function sendFunds(address payable[] calldata iotAddr) external payable {
        uint256 singleValue = msg.value / iotAddr.length;
        for (uint256 i = 0; i < iotAddr.length; i++) {
            iotAddr[i].transfer(singleValue);
        }
    }
}
