// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IAggregatorContract {
    enum EnergySource {
        Battery,
        Solar,
        Wind,
        Hydro,
        Biomass,
        Nuclear,
        Other
    }

    error AgreementAlreadyExistsError();
    error AgreementDoesNotExistsError();
    error ZeroValueError(string valueName);
    error UnauthorizedAggregatorError(address a);
    error FlexibilityError(int256 expected, int256 actual);
    error FlexibilityRequestNotFoundError(uint256 expected, uint256 actual);

    struct Agreement {
        int256 value;
        int256 flexibility;
        int256 valuePrice;
        int256 flexibilityPrice;
        EnergySource energySource;
    }
    struct Prosumer {
        int256 balance;
        uint8 reputation;
        uint256 idx;
    }
    struct FlexibilityRequest {
        uint256 start;
        uint256 end;
        int256 gridFlexibility;
    }
    struct FlexibilityResult {
        address prosumer;
        int256 flexibility;
    }
    struct FlexibilitRewardRequest {
        uint256 start;
        int256 flexibility;
        int256 reward;
    }

    event RegisterAgreement(address indexed prosumer, Agreement agreement);
    event ReviseAgreement(address indexed prosumer, Agreement oldAgreement, Agreement newAgreement);
    event CancelAgreement(address indexed prosumer, Agreement agreement);

    event RequestFlexibility(uint256 indexed start, uint256 indexed stop, int256 gridFlexibility);
    event EndRequestFlexibility(
        uint256 indexed start,
        uint256 indexed stop,
        int256 gridFlexibility
    );

    event FlexibilityProvisioningSuccess(
        uint256 indexed start,
        address indexed prosumer,
        int256 flexibility,
        int256 reward
    );
    event FlexibilityProvisioningError(
        uint256 indexed start,
        address indexed prosumer,
        int256 flexibilityFromAggregator,
        int256 flexibilityFromProsumer,
        int256 expectedFlexibility
    );
    event RewardProduction(
        address indexed prosumer,
        uint256 indexed timestamp,
        int256 value,
        int256 reward
    );

    function registerAgreement(Agreement calldata _agreement) external;

    function reviseAgreement(Agreement calldata _agreement) external;

    function cancelAgreement() external;

    function requestFlexibility(
        uint256 _start,
        uint256 _end,
        int256 _flexibility
    ) external;

    function provideFlexibilityFair(uint256 _start, int256 _flexibility) external;

    function endFlexibilityRequest(uint256 _start, FlexibilityResult[] calldata _results) external;

    function rewardProduction() external;

    function sendFunds(address payable[] calldata iotAddr) external payable;
}
