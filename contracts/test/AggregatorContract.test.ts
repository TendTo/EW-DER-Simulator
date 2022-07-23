import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { AggregatorContract__factory, AggregatorContract } from "../typechain-types";
import { ContractError, EnergySource } from "./constants";

describe("AggregatorContract", function () {
  let contractFactory: AggregatorContract__factory;
  let contract: AggregatorContract,
    iot1Contract: AggregatorContract,
    iot2Contract: AggregatorContract;
  let accounts: SignerWithAddress[], iotAccounts: SignerWithAddress[];
  let aggregator: SignerWithAddress;
  let iotAddresses: string[];
  let iot1Addr: string, iot2Addr: string;

  before(async function () {
    accounts = await ethers.getSigners();
    aggregator = accounts[0];
    iotAccounts = accounts.slice(1, 11);
    iotAddresses = accounts.slice(1, 11).map((a) => a.address);
    [iot1Addr, iot2Addr] = iotAddresses.slice(0, 2);
    contractFactory = await ethers.getContractFactory("AggregatorContract");
  });

  beforeEach(async function () {
    contract = await contractFactory.deploy();
    iot1Contract = contract.connect(iotAccounts[0]);
    iot2Contract = contract.connect(iotAccounts[1]);
  });

  describe("Agreement", function () {
    const agreement = {
      energySource: EnergySource.Solar,
      flexibility: 25,
      flexibilityPrice: 2,
      value: 100,
      valuePrice: 1,
    };

    describe("registerAgreement", function () {
      it("add a new agreement", async function () {
        await iot1Contract.registerAgreement(agreement);
        const res = await contract.agreements(iot1Addr);
        expect(res.energySource).to.equal(agreement.energySource);
        expect(res.flexibility.toNumber()).to.equal(agreement.flexibility);
        expect(res.flexibilityPrice.toNumber()).to.equal(agreement.flexibilityPrice);
        expect(res.value.toNumber()).to.equal(agreement.value);
        expect(res.valuePrice.toNumber()).to.equal(agreement.valuePrice);
      });
      it("the 'prosumerList' is correctly updated", async function () {
        await iot1Contract.registerAgreement(agreement);
        await iot2Contract.registerAgreement(agreement);
        expect(await contract.prosumerList(0)).to.equal(iot1Addr);
        expect(await contract.prosumerList(1)).to.equal(iot2Addr);
      });
      it("the 'energyBalance' is correctly updated", async function () {
        await iot1Contract.registerAgreement(agreement);
        expect(await contract.energyBalance()).to.equal(agreement.value);
        await iot2Contract.registerAgreement({ ...agreement, value: 10 });
        expect(await contract.energyBalance()).to.equal(agreement.value + 10);
      });
      it("revert on 0 value with 'ZeroValueError('value')'", async function () {
        const zeroValueAgreement = {
          ...agreement,
          value: 0,
        };
        await expect(iot1Contract.registerAgreement(zeroValueAgreement))
          .to.be.revertedWithCustomError(contract, ContractError.ZeroValueError)
          .withArgs("value");
      });
    });

    describe("reviseAgreement", function () {
      it("revise an already existing agreement", async function () {
        const newAgreement = {
          ...agreement,
          value: 2,
        };
        await iot1Contract.registerAgreement(agreement);
        await iot1Contract.reviseAgreement(newAgreement);
        expect((await contract.agreements(iot1Addr)).value.toNumber()).to.equal(newAgreement.value);
      });
      it("the 'energyBalance' is correctly updated", async function () {
        const newAgreement = {
          ...agreement,
          value: 2,
        };
        await iot1Contract.registerAgreement(agreement);
        expect(await contract.energyBalance()).to.equal(agreement.value);
        await iot1Contract.reviseAgreement(newAgreement);
        expect(await contract.energyBalance()).to.equal(newAgreement.value);
      });
      it("revert not existing agreement with 'AgreementDoesNotExistsError'", async function () {
        await expect(iot1Contract.reviseAgreement(agreement)).to.be.revertedWithCustomError(
          contract,
          ContractError.AgreementDoesNotExistsError
        );
      });
      it("revert on 0 value with 'ZeroValueError('value')'", async function () {
        const zeroValueAgreement = {
          ...agreement,
          value: 0,
        };
        await iot1Contract.registerAgreement(agreement);
        await expect(iot1Contract.reviseAgreement(zeroValueAgreement))
          .to.be.revertedWithCustomError(contract, ContractError.ZeroValueError)
          .withArgs("value");
      });
    });

    describe("cancelAgreement", function () {
      it("cancel a previously registered agreement (one agreement existing)", async function () {
        await iot1Contract.registerAgreement(agreement);
        await iot1Contract.cancelAgreement();
        expect((await contract.agreements(iot1Addr)).value.toNumber()).to.equal(0);
        await expect(contract.prosumerList(0)).to.be.revertedWithoutReason();
      });
      it("cancel a previously registered agreement (more than one agreement existing, not last agreement)", async function () {
        await iot1Contract.registerAgreement(agreement);
        await iot2Contract.registerAgreement(agreement);
        await iot1Contract.cancelAgreement();
        expect((await contract.agreements(iot1Addr)).value.toNumber()).to.equal(0);
        expect(await contract.prosumerList(0)).to.equal(iot2Addr);
      });
      it("cancel a previously registered agreement (more than one agreement existing, last agreement)", async function () {
        await iot2Contract.registerAgreement(agreement);
        await iot1Contract.registerAgreement(agreement);
        await iot1Contract.cancelAgreement();
        expect((await contract.agreements(iot1Addr)).value.toNumber()).to.equal(0);
        expect(await contract.prosumerList(0)).to.equal(iot2Addr);
      });
      it("the 'energyBalance' is correctly updated", async function () {
        await iot1Contract.registerAgreement(agreement);
        expect(await contract.energyBalance()).to.equal(agreement.value);
        await iot1Contract.cancelAgreement();
        expect(await contract.energyBalance()).to.equal(0);
      });
      it("revert on not existing agreement with 'AgreementDoesNotExistsError'", async function () {
        await expect(iot1Contract.cancelAgreement()).to.be.revertedWithCustomError(
          contract,
          ContractError.AgreementDoesNotExistsError
        );
      });
    });
  });

  describe("Flexibility", function () {
    const agreement = {
      energySource: EnergySource.Solar,
      flexibility: 25,
      flexibilityPrice: 2,
      value: 100,
      valuePrice: 1,
    };
    const start = 1,
      end = 2,
      gridFlexibility = 20;
    describe("requestFlexibility", function () {
      it("create a new flexibility request", async function () {
        await contract.requestFlexibility(start, end, gridFlexibility);
        const request = await contract.flexibilityRequest();
        expect(request.start.toNumber()).to.equal(start);
        expect(request.end.toNumber()).to.equal(end);
        expect(request.gridFlexibility.toNumber()).to.equal(gridFlexibility);
      });
      it("revert on unauthorized use with 'UnauthorizedAggregatorError(msg.sender)'", async function () {
        await expect(iot1Contract.requestFlexibility(start, end, gridFlexibility))
          .to.be.revertedWithCustomError(contract, ContractError.UnauthorizedAggregatorError)
          .withArgs(iot1Addr);
      });
    });
    describe("provideFlexibilityFair", function () {
      it("notify the intention of providing the flexibility requested with him as the only prosumer", async function () {
        await iot1Contract.registerAgreement(agreement);
        await contract.requestFlexibility(start, end, gridFlexibility);
        const iotFlexibility = gridFlexibility;
        await iot1Contract.provideFlexibilityFair(start, iotFlexibility);
        const pendingReward = await contract.pendingRewards(iot1Addr);
        expect(pendingReward.start.toNumber()).to.equal(start);
        expect(pendingReward.flexibility.toNumber()).to.equal(iotFlexibility);
        expect(pendingReward.reward.toNumber()).to.equal(
          iotFlexibility * agreement.flexibilityPrice
        );
      });
      it("notify the intention of providing the flexibility requested with multiple prosumers", async function () {
        const iot2Agreement = {
          ...agreement,
          value: 50,
          flexibility: 13,
        };
        await iot1Contract.registerAgreement(agreement);
        await iot2Contract.registerAgreement(iot2Agreement);
        await contract.requestFlexibility(start, end, gridFlexibility);

        const energyBalance = (await contract.energyBalance()).toNumber();
        const iot1Flexibility = Math.floor((gridFlexibility * agreement.value) / energyBalance);
        const iot2Flexibility = Math.floor((gridFlexibility * iot2Agreement.value) / energyBalance);
        await iot1Contract.provideFlexibilityFair(start, iot1Flexibility);
        await iot2Contract.provideFlexibilityFair(start, iot2Flexibility);

        const pendingReward1 = await contract.pendingRewards(iot1Addr);
        expect(pendingReward1.flexibility.toNumber()).to.equal(iot1Flexibility);
        expect(pendingReward1.reward.toNumber()).to.equal(
          iot1Flexibility * agreement.flexibilityPrice
        );
        const pendingReward2 = await contract.pendingRewards(iot2Addr);
        expect(pendingReward2.flexibility.toNumber()).to.equal(iot2Flexibility);
        expect(pendingReward2.reward.toNumber()).to.equal(
          iot2Flexibility * iot2Agreement.flexibilityPrice
        );
      });
      it("notify the intention of providing the flexibility requested with within the margins", async function () {
        await iot1Contract.registerAgreement(agreement);
        await contract.requestFlexibility(start, end, gridFlexibility);

        let iotFlexibility = Math.floor(gridFlexibility * 0.9);
        await iot1Contract.provideFlexibilityFair(start, iotFlexibility);
        let pendingReward = await contract.pendingRewards(iot1Addr);
        expect(pendingReward.flexibility.toNumber()).to.equal(iotFlexibility);

        iotFlexibility = Math.floor(gridFlexibility * 1.1);
        await iot1Contract.provideFlexibilityFair(start, iotFlexibility);
        pendingReward = await contract.pendingRewards(iot1Addr);
        expect(pendingReward.flexibility.toNumber()).to.equal(iotFlexibility);

        let invalidIotFlexibility = Math.floor(gridFlexibility * 1.2);
        await expect(iot1Contract.provideFlexibilityFair(start, invalidIotFlexibility))
          .to.be.revertedWithCustomError(contract, ContractError.FlexibilityError)
          .withArgs(gridFlexibility, invalidIotFlexibility);
        pendingReward = await contract.pendingRewards(iot1Addr);
        expect(pendingReward.flexibility.toNumber()).to.equal(iotFlexibility);

        invalidIotFlexibility = Math.floor(gridFlexibility * 0.8);
        await expect(iot1Contract.provideFlexibilityFair(start, invalidIotFlexibility))
          .to.be.revertedWithCustomError(contract, ContractError.FlexibilityError)
          .withArgs(gridFlexibility, invalidIotFlexibility);
        pendingReward = await contract.pendingRewards(iot1Addr);
        expect(pendingReward.flexibility.toNumber()).to.equal(iotFlexibility);
      });
      it("revert on 0 value with 'ZeroValueError('flexibility')'", async function () {
        await iot1Contract.registerAgreement(agreement);
        await contract.requestFlexibility(start, end, gridFlexibility);
        await expect(iot1Contract.provideFlexibilityFair(start, 0))
          .to.be.revertedWithCustomError(contract, ContractError.ZeroValueError)
          .withArgs("flexibility");
      });
      it("revert on not existing agreement with 'AgreementDoesNotExistsError'", async function () {
        await contract.requestFlexibility(start, end, gridFlexibility);
        await expect(iot1Contract.provideFlexibilityFair(start, 0)).to.be.revertedWithCustomError(
          contract,
          ContractError.AgreementDoesNotExistsError
        );
      });
      it("revert on not existing flexibility request with 'FlexibilityRequestNotFoundError(expectedStart, actualStart)'", async function () {
        await iot1Contract.registerAgreement(agreement);
        await expect(iot1Contract.provideFlexibilityFair(start, 1))
          .to.be.revertedWithCustomError(contract, ContractError.FlexibilityRequestNotFoundError)
          .withArgs(0, start);
      });
      it("revert on to different flexibility provided with 'FlexibilityError(expectedValue, actualValue)'", async function () {
        await iot1Contract.registerAgreement(agreement);
        await iot2Contract.registerAgreement(agreement);
        await contract.requestFlexibility(start, end, gridFlexibility);
        await expect(iot1Contract.provideFlexibilityFair(start, gridFlexibility))
          .to.be.revertedWithCustomError(contract, ContractError.FlexibilityError)
          .withArgs(Math.floor(gridFlexibility / 2), gridFlexibility);
      });
    });
    describe("endFlexibilityRequest", function () {
      it("end the flexibility request and reward all the prosumers who participated (one prosumer)", async function () {
        await iot1Contract.registerAgreement(agreement);
        await contract.requestFlexibility(start, end, gridFlexibility);
        await iot1Contract.provideFlexibilityFair(start, gridFlexibility);
        await contract.endFlexibilityRequest([
          { flexibility: gridFlexibility, prosumer: iot1Addr },
        ]);
        expect((await contract.prosumers(iot1Addr)).balance).to.equal(
          agreement.flexibilityPrice * gridFlexibility
        );
      });
      it("revert on unauthorized use with 'UnauthorizedAggregatorError(msg.sender)'", async function () {
        await expect(iot1Contract.endFlexibilityRequest([]))
          .to.be.revertedWithCustomError(contract, ContractError.UnauthorizedAggregatorError)
          .withArgs(iot1Addr);
      });
    });
  });

  describe("Utility", function () {
    it("sendFunds: Each IoT device receives a share of the funds", async function () {
      const funds = 100;
      const originalBalance = await accounts[1].getBalance();
      await contract.sendFunds(iotAddresses, {
        value: funds * iotAddresses.length,
      });

      const balance = await accounts[1].getBalance();
      expect(balance.sub(originalBalance).toNumber()).to.be.equal(funds);
    });
    it("resetContract: All properties are resetted", async function () {
      const agreement = {
        energySource: EnergySource.Solar,
        flexibility: 25,
        flexibilityPrice: 2,
        value: 100,
        valuePrice: 1,
      };
      await iot1Contract.registerAgreement(agreement);
      await contract.requestFlexibility(1, 2, 3);

      await contract.resetContract();
      const { balance, idx, reputation } = await contract.prosumers(iot1Addr);
      const { reward, start, flexibility } = await contract.pendingRewards(iot1Addr);
      expect([
        balance.toNumber(),
        idx.toNumber(),
        reputation,
        reward.toNumber(),
        start.toNumber(),
        flexibility.toNumber(),
      ]).to.have.ordered.members([0, 0, 0, 0, 0, 0]);
    });
  });
});
