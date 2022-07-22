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
        int256 flexibility;
        uint256 timestamp;
        uint256 duration;
    }
    struct PendingReward {
        address prosumer;
        int256 reward;
    }

    event RegisterAgreement(address indexed prosumer, Agreement agreement);
    event ReviseAgreement(
        address indexed prosumer,
        Agreement oldAgreement,
        Agreement newAgreement
    );
    event CancelAgreement(address indexed prosumer, Agreement agreement);

    event RequestFlexibility(
        int256 flexibility,
        uint256 indexed timestamp,
        uint8 duration
    );
    event ProvideFlexibility(
        address indexed prosumer,
        int256 flexibility,
        uint256 indexed timestamp
    );
    event RewardFlexibility(
        address indexed prosumer,
        int256 reward,
        uint256 indexed timestamp
    );

    event RewardValue(
        address indexed prosumer,
        int256 reward,
        uint256 indexed timestamp
    );

    function registerAgreement(Agreement calldata _agreement) external;

    function reviseAgreement(Agreement calldata _agreement) external;

    function cancelAgreement() external;

    function requestFlexibility(int256 _flexibility, uint8 _duration) external;

    function provideFlexibility(int256 _flexibility) external;

    function rewardFlexibility() external;

    function rewardProduction() external;

    function sendFunds(address payable[] calldata iotAddr) external payable;
}
