import { ethers } from "hardhat";
import { IoT } from "./iot";

async function main() {
  const signers = await ethers.getSigners();
  console.log(signers.map((a) => new IoT(a)));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
