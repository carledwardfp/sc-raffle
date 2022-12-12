import { BigNumber } from "ethers"
import { ethers } from "hardhat"

export const DEV_NETWORKS = ["localhost", "hardhat"]

// Raffle constructor args
export const TEST_ENTRANCE_FEE = ethers.utils.parseEther("0.01")
export const TEST_INTERVAL = 5 // 5 seconds
export const TEST_KEY_HASH = ethers.utils.formatBytes32String("")
export const TEST_SUBSCRIPTION_ID = "0"
export const TEST_CALLBACK_GAS_LIMIT = 500_000

export const FUND_AMOUNT = "1000000000000000000000"

// 0.25 LINK per request
export const BASE_FEE = ethers.utils.parseEther("0.25")

// calcultaed based on gas price of the chain
// like link per gas
export const GAS_PRICE_LINK = 1e9

export interface networkConfigItem {
  vrfCoordinator?: string
  subscriptionId?: string
  blockConfirmations?: number
  entranceFee: BigNumber
  interval: number
  keyHash: string
  callbackGasLimit: number
}

export interface networkConfigInfo {
  [key: string]: networkConfigItem
}

export const networkConfig: networkConfigInfo = {
  localhost: {
    callbackGasLimit: TEST_CALLBACK_GAS_LIMIT,
    entranceFee: TEST_ENTRANCE_FEE,
    interval: TEST_INTERVAL,
    keyHash: TEST_KEY_HASH,
  },
  hardhat: {
    callbackGasLimit: TEST_CALLBACK_GAS_LIMIT,
    entranceFee: TEST_ENTRANCE_FEE,
    interval: TEST_INTERVAL,
    keyHash: TEST_KEY_HASH,
  },
  goerli: {
    blockConfirmations: 6,
    callbackGasLimit: 500_000,
    entranceFee: ethers.utils.parseEther("0.01"),
    interval: 3_600, // 1 hour
    // https://vrf.chain.link/
    subscriptionId: "7324",
    vrfCoordinator: "0x2ca8e0c643bde4c2e08ab1fa0da3401adad7734d",
    keyHash:
      "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
  },
}

export const frontEndAbiFile = process.env.FRONT_END_ABI_FILE || ""
export const frontEndContractsFile = process.env.FRONT_END_CONTRACTS_FILE || ""
