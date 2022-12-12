import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import {
  BASE_FEE,
  DEV_NETWORKS,
  GAS_PRICE_LINK,
} from "../helper-hardhat.config"
const deployMocks: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
) {
  // @ts-ignore
  const { getNamedAccounts, deployments, network } = hre
  const { deploy, log } = deployments
  const { deployer } = await getNamedAccounts()

  const isDev = DEV_NETWORKS.includes(network.name)

  if (isDev) {
    log("\n----------------------------------------")
    log("🛠️ Local network detected...")
    const args = [BASE_FEE, GAS_PRICE_LINK]
    await deploy("VRFCoordinatorV2Mock", {
      from: deployer,
      log: true,
      args: args,
    })
    log("✅ Mocks deployed")
    log("----------------------------------------\n")
  }
}

export default deployMocks
deployMocks.tags = ["all", "mocks"]
