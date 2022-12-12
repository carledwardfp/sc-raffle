import fs from "fs"
import {
  frontEndAbiFile,
  frontEndContractsFile,
} from "../helper-hardhat.config"
import { DeployFunction } from "hardhat-deploy/types"
import { ethers, network } from "hardhat"
import { Raffle } from "../typechain-types"

const updateUI: DeployFunction = async function () {
  if (process.env.UPDATE_FRONT_END) {
    console.log("Writing to front end...")
    await updateContractAddresses()
    await updateAbi()
    console.log("Front end written!")
  }
}

async function updateContractAddresses() {
  const raffle = await ethers.getContract("Raffle")
  const contractAddresses = JSON.parse(
    fs.readFileSync(frontEndContractsFile, "utf8")
  )
  contractAddresses[network.config.chainId!] = raffle.address
  fs.writeFileSync(frontEndContractsFile, JSON.stringify(contractAddresses))
}

async function updateAbi() {
  const raffle: Raffle = await ethers.getContract("Raffle")
  fs.writeFileSync(
    frontEndAbiFile,
    raffle.interface.format(ethers.utils.FormatTypes.json) as string
  )
}

export default updateUI
updateUI.tags = ["all", "frontend"]
