import { HardhatUserConfig } from "hardhat/config"

import "@nomicfoundation/hardhat-toolbox"
import "@nomiclabs/hardhat-etherscan"
import "@nomiclabs/hardhat-waffle"
import "@nomiclabs/hardhat-ethers"
import "@nomicfoundation/hardhat-chai-matchers"
import "@typechain/hardhat"

import "hardhat-contract-sizer"
import "hardhat-gas-reporter"
import "hardhat-deploy"
import "solidity-coverage"
import "dotenv/config"

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || ""
const GOERLI_PRIVATE_KEY = process.env.GOERLI_PRIVATE_KEY || ""
const ETHERSCAN_KEY = process.env.ETHERSCAN_KEY || ""
const COINMARKETCAP_KEY = process.env.COINMARKETCAP_KEY || ""

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.17",
      },
      {
        version: "0.8.4",
      },
    ],
  },
  defaultNetwork: "hardhat",
  networks: {
    goerli: {
      url: `https://eth-goerli.alchemyapi.io/v2/${ALCHEMY_API_KEY}`,
      accounts: [GOERLI_PRIVATE_KEY],
      chainId: 5,
    },
    localhost: {
      url: `http://localhost:8545/`,
      chainId: 31337,
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_KEY,
  },
  gasReporter: {
    enabled: true,
    outputFile: "gas-report.txt",
    noColors: true,
    currency: "USD",
    // coinmarketcap: COINMARKETCAP_KEY,
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
    user: {
      default: 1,
    },
  },
  mocha: {
    timeout: 500_000, // 300 seconds
  },
}

export default config
