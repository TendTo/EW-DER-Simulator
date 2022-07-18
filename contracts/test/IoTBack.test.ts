import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { IoTBank__factory, IoTBank } from "../typechain-types";

describe("IoTBank", function () {
  let contractFactory: IoTBank__factory;
  let contract: IoTBank;
  let accounts: SignerWithAddress[];
  let iotAddresses: string[];

  before(async function () {
    accounts = await ethers.getSigners();
    iotAddresses = accounts.slice(1, 11).map((a) => a.address);
    contractFactory = await ethers.getContractFactory("IoTBank");
  });

  beforeEach(async function () {
    contract = await contractFactory.deploy();
  });

  describe("sendFunds", function () {
    it("Each IoT device receives a share of the funds", async function () {
      const originalBalance = await accounts[1].getBalance();
      expect(iotAddresses.length).to.be.equal(10);
      await contract.sendFunds(iotAddresses, { value: 10 });
      const balance = await accounts[1].getBalance();
      console.log(originalBalance.toString());
      console.log(balance.toString());
      expect(originalBalance.eq(balance)).to.be.false;
      expect(originalBalance.xor(balance).toString()).to.be.equal("1");
    });
  });
});
