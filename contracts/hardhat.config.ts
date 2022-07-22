import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";

dotenv.config();

const VOLTA_NODE_URL = process.env.VOLTA_NODE_URL ?? "http://localhost:8545";
const VOLTA_SK = process.env.VOLTA_SK ?? "";

const config: HardhatUserConfig = {
  solidity: "0.8.9",
  networks: {
    localhost: {
      url: "http://127.0.0.1:7545",
    },
    volta: {
      url: VOLTA_NODE_URL,
      accounts: VOLTA_SK ? [VOLTA_SK] : [],
    },
  },
};

export default config;
