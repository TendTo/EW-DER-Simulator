import { ethers } from "hardhat";

async function main() {
  const contractFactory = await ethers.getContractFactory("AggregatorContract");
  const contract = await contractFactory.deploy();
  await contract.deployed();

  console.log("AggregatorContract deployed to:", contract.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
