import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { AggregatorContract__factory, AggregatorContract } from "../typechain-types";
import { ContractError, ContractEvents, EnergySource } from "./constants";

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
      it("the 'prosumerList' is correctly updated (same prosumer)", async function () {
        await iot1Contract.registerAgreement(agreement);
        await iot1Contract.registerAgreement({ ...agreement, value: 10 });
        expect(await contract.prosumerList(0)).to.equal(iot1Addr);
        expect(await contract.prosumerListLength()).to.equal(1);
      });
      it("the 'prosumerList' is correctly updated (different prosumers)", async function () {
        await iot1Contract.registerAgreement(agreement);
        await iot2Contract.registerAgreement({ ...agreement, value: 10 });
        expect(await contract.prosumerList(0)).to.equal(iot1Addr);
        expect(await contract.prosumerList(1)).to.equal(iot2Addr);
        expect(await contract.prosumerListLength()).to.equal(2);
      });
      it("the 'energyBalance' is correctly updated (same prosumer)", async function () {
        await iot1Contract.registerAgreement(agreement);
        await iot1Contract.registerAgreement({ ...agreement, value: 10 });
        expect(await contract.energyBalance()).to.equal(10);
      });
      it("the 'energyBalance' is correctly updated (different prosumers)", async function () {
        await iot1Contract.registerAgreement(agreement);
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
    describe("endFlexibilityRequest", function () {
      it("end the flexibility request and reward all the prosumers who participated (one prosumer)", async function () {
        await iot1Contract.registerAgreement(agreement);
        await contract.requestFlexibility(start, end, gridFlexibility);
        await contract.endFlexibilityRequest(start, [
          { flexibility: gridFlexibility, prosumer: iot1Addr },
        ]);
        expect(await contract.flexibilityResults(iot1Addr)).to.equal(gridFlexibility);
      });
      it("revert on unauthorized use with 'UnauthorizedAggregatorError(msg.sender)'", async function () {
        await expect(iot1Contract.endFlexibilityRequest(0, []))
          .to.be.revertedWithCustomError(contract, ContractError.UnauthorizedAggregatorError)
          .withArgs(iot1Addr);
      });
      it("revert on unauthorized use with 'FlexibilityRequestNotFoundError(expectedStart, actualStart)'", async function () {
        await expect(contract.endFlexibilityRequest(100, []))
          .to.be.revertedWithCustomError(contract, ContractError.FlexibilityRequestNotFoundError)
          .withArgs(0, 100);
      });
    });
    describe("provideFlexibilityFair", function () {
      it("notify the intention of providing the flexibility requested with him as the only prosumer", async function () {
        await iot1Contract.registerAgreement(agreement);
        await contract.requestFlexibility(start, end, gridFlexibility);
        await contract.endFlexibilityRequest(start, [
          { flexibility: gridFlexibility, prosumer: iot1Addr },
        ]);
        await iot1Contract.provideFlexibilityFair(start, gridFlexibility);
        expect((await contract.prosumers(iot1Addr)).balance.toNumber()).to.equal(
          gridFlexibility * agreement.flexibilityPrice
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

        await contract.endFlexibilityRequest(start, [
          { flexibility: iot1Flexibility, prosumer: iot1Addr },
          { flexibility: iot2Flexibility, prosumer: iot2Addr },
        ]);
        await iot1Contract.provideFlexibilityFair(start, iot1Flexibility);
        await iot2Contract.provideFlexibilityFair(start, iot2Flexibility);

        expect((await contract.prosumers(iot1Addr)).balance.toNumber()).to.equal(
          iot1Flexibility * agreement.flexibilityPrice
        );
        expect((await contract.prosumers(iot2Addr)).balance.toNumber()).to.equal(
          iot2Flexibility * iot2Agreement.flexibilityPrice
        );
      });
      it("notify the intention of providing the flexibility requested out of the expected margins (lower bound)", async function () {
        await iot1Contract.registerAgreement(agreement);
        await contract.requestFlexibility(start, end, gridFlexibility);
        let iotFlexibility = Math.floor(gridFlexibility * 0.9);
        await contract.endFlexibilityRequest(start, [
          { flexibility: iotFlexibility, prosumer: iot1Addr },
        ]);

        // In aggregator range, but out of expected value
        await expect(iot1Contract.provideFlexibilityFair(start, Math.floor(iotFlexibility * 0.9)))
          .to.emit(contract, ContractEvents.FlexibilityProvisioningError)
          .withArgs(
            start,
            iot1Addr,
            iotFlexibility,
            Math.floor(iotFlexibility * 0.9),
            gridFlexibility
          );
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
      expect([balance.toNumber(), idx.toNumber(), reputation]).to.have.ordered.members([0, 0, 0]);
    });
    it("selfDestruct: Contract is deleted", async function () {
      await contract.selfDestruct();
      await expect(contract.aggregator()).to.be.revertedWithoutReason();
    });
    it("selfDestruct: Only the aggregator can use this function", async function () {
      await expect(iot1Contract.selfDestruct())
        .to.be.revertedWithCustomError(contract, ContractError.UnauthorizedAggregatorError)
        .withArgs(iot1Addr);
    });
  });
});
