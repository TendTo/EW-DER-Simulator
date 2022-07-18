import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.9",
  networks: {
    localhost: {
      url: "http://127.0.0.1:7545",
    },
  },
};

export default config;
