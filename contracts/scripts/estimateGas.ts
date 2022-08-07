import { ethers } from "hardhat";
import { AggregatorContract } from "../typechain-types";

async function main() {
  const contractFactory = await ethers.getContractFactory("AggregatorContract");
  const contract = await contractFactory.deploy({ maxPriorityFeePerGas: 7 });

  const values = {
    sendFunds1: await sendFunds(contract, 1),
    endFlexibilityRequest1: await endFlexibilityRequest(contract, 1),
    sendFunds10: await sendFunds(contract, 10),
    endFlexibilityRequest10: await endFlexibilityRequest(contract, 10),
    sendFunds100: await sendFunds(contract, 100),
    endFlexibilityRequest100: await endFlexibilityRequest(contract, 100),
    sendFunds500: await sendFunds(contract, 500),
    endFlexibilityRequest500: await endFlexibilityRequest(contract, 500),
    sendFunds1000: await sendFunds(contract, 1000),
    endFlexibilityRequest1000: await endFlexibilityRequest(contract, 1000),
  };
  console.table(values);
}

async function endFlexibilityRequest(contract: AggregatorContract, n: number) {
  const res = await contract.estimateGas.endFlexibilityRequest(0, getEndFlexibilityResults(n));
  return { total: res.toString(), perItem: res.div(n).toString() };
}

async function sendFunds(contract: AggregatorContract, n: number) {
  const res = await contract.estimateGas.sendFunds(getAddressList(n, 0));
  return { total: res.toString(), perItem: res.div(n).toString() };
}

function getAddressList(n: number, max: number = 100000000) {
  const res = [];
  for (let i = 1; i < n + 1; i++) {
    if (i > max) {
      res.push(`0x${max.toString().padStart(40, "0")}`);
    } else {
      res.push(`0x${i.toString().padStart(40, "0")}`);
    }
  }
  return res;
}

function getEndFlexibilityResults(n: number) {
  const res = getAddressList(n);
  return res.map((addr, i) => ({
    flexibility: i,
    prosumer: addr,
  }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
