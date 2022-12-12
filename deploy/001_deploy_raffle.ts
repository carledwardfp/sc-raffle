import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { verify } from "../utils/verify"
import {
  DEV_NETWORKS,
  FUND_AMOUNT,
  networkConfig,
} from "../helper-hardhat.config"
import { VRFCoordinatorV2Mock } from "../typechain-types"

const deployRaffle: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
) {
  const { getNamedAccounts, deployments, ethers, network } = hre
  const { deploy, log } = deployments
  const { deployer } = await getNamedAccounts()

  const isDev = DEV_NETWORKS.includes(network.name)

  let vrfCoordinatorV2Mock: VRFCoordinatorV2Mock
  let vrfCoordinatorAddress: string
  let subscriptionId: string

  if (isDev) {
    vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
    vrfCoordinatorAddress = vrfCoordinatorV2Mock.address

    const txResponse = await vrfCoordinatorV2Mock.createSubscription()
    const txReceipt = await txResponse.wait()
    subscriptionId = txReceipt.events?.[0]?.args?.subId || ""

    // Our mock makes it so we don't actually have to worry about sending fund
    await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT)
  } else {
    vrfCoordinatorAddress = networkConfig[network.name].vrfCoordinator!
    subscriptionId = networkConfig[network.name].subscriptionId!
  }

  /**
   * Args:
   *    address vrfCoordinatorV2
   *    uint256 entranceFee
   *    uint256 interval
   *    bytes32 keyHash
   *    uint64 subscriptionId
   *    uint32 callbackGasLimit
   */
  const args = [
    vrfCoordinatorAddress,
    subscriptionId,
    networkConfig[network.name].entranceFee,
    networkConfig[network.name].interval,
    networkConfig[network.name].keyHash,
    networkConfig[network.name].callbackGasLimit,
  ]

  log("\n----------------------------------------")
  const raffle = await deploy("Raffle", {
    from: deployer,
    args: args,
    log: true,
    waitConfirmations: networkConfig[network.name].blockConfirmations || 1,
  })
  log("----------------------------------------\n")

  // Ensure the Raffle contract is a valid consumer of the VRFCoordinatorV2Mock contract.
  if (isDev) {
    vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
    vrfCoordinatorV2Mock.addConsumer(subscriptionId, raffle.address)
  }

  if (network.name === "goerli" && process.env.ETHERSCAN_KEY) {
    log("\n----------------------------------------")
    await verify(raffle.address, args)
    log("----------------------------------------\n")
  }
}

export default deployRaffle
deployRaffle.tags = ["all", "raffle"]
