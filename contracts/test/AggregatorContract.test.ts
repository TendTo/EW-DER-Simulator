import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  AggregatorContract__factory,
  AggregatorContract,
} from "../typechain-types";
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

  describe("Agreement management functions", function () {
    const agreement = {
      energySource: EnergySource.Solar,
      flexibility: 1,
      flexibilityPrice: 1,
      value: 1,
      valuePrice: 1,
    };

    describe("registerAgreement", function () {
      it("add a new agreement", async function () {
        await iot1Contract.registerAgreement(agreement);
        const res = await contract.agreements(iot1Addr);
        expect(res.energySource).to.equal(agreement.energySource);
        expect(res.flexibility.toNumber()).to.equal(agreement.energySource);
        expect(res.flexibilityPrice.toNumber()).to.equal(
          agreement.energySource
        );
        expect(res.value.toNumber()).to.equal(agreement.energySource);
        expect(res.valuePrice.toNumber()).to.equal(agreement.valuePrice);
      });

      it("the 'prosumerList' is correctly updated", async function () {
        await iot1Contract.registerAgreement(agreement);
        await iot2Contract.registerAgreement(agreement);
        expect(await contract.prosumerList(0)).to.equal(iot1Addr);
        expect(await contract.prosumerList(1)).to.equal(iot2Addr);
      });

      it("revert on 0 value with 'ZeroValueError('value')'", async function () {
        const zeroValueAgreement = {
          ...agreement,
          value: 0,
        };
        expect(iot1Contract.registerAgreement(zeroValueAgreement))
          .to.revertedWithCustomError(contract, ContractError.ZeroValueError)
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
        expect((await contract.agreements(iot1Addr)).value.toNumber()).to.equal(
          newAgreement.value
        );
      });
      it("revert not existing agreement with 'AgreementDoesNotExistsError'", async function () {
        expect(
          iot1Contract.reviseAgreement(agreement)
        ).to.revertedWithCustomError(
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
        expect(iot1Contract.reviseAgreement(zeroValueAgreement))
          .to.revertedWithCustomError(contract, ContractError.ZeroValueError)
          .withArgs("value");
      });
    });

    describe("cancelAgreement", function () {
      it("cancel a previously registered agreement (one agreement existing)", async function () {
        await iot1Contract.registerAgreement(agreement);
        await iot1Contract.cancelAgreement();
        expect((await contract.agreements(iot1Addr)).value.toNumber()).to.equal(
          0
        );
        expect(contract.prosumerList(0)).to.be.revertedWithPanic();
      });
      it("cancel a previously registered agreement (more than one agreement existing, not last agreement)", async function () {
        await iot1Contract.registerAgreement(agreement);
        await iot2Contract.registerAgreement(agreement);
        await iot1Contract.cancelAgreement();
        expect((await contract.agreements(iot1Addr)).value.toNumber()).to.equal(
          0
        );
        expect(await contract.prosumerList(0)).to.equal(iot2Addr);
      });
      it("cancel a previously registered agreement (more than one agreement existing, last agreement)", async function () {
        await iot2Contract.registerAgreement(agreement);
        await iot1Contract.registerAgreement(agreement);
        await iot1Contract.cancelAgreement();
        expect((await contract.agreements(iot1Addr)).value.toNumber()).to.equal(
          0
        );
        expect(await contract.prosumerList(0)).to.equal(iot2Addr);
      });
      it("revert not existing agreement with 'AgreementDoesNotExistsError'", async function () {
        expect(iot1Contract.cancelAgreement()).to.revertedWithCustomError(
          contract,
          ContractError.AgreementDoesNotExistsError
        );
      });
    });
  });

  describe("Utility", function () {
    it("sendFunds: Each IoT device receives a share of the funds", async function () {
      const originalBalance = await accounts[1].getBalance();
      expect(iotAddresses.length).to.be.equal(10);
      await contract.sendFunds(iotAddresses, { value: 10 });

      const balance = await accounts[1].getBalance();
      expect(balance.sub(originalBalance).toString()).to.be.equal("1");
    });
  });
});
