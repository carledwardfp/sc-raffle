import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { expect } from "chai"
import { BigNumber } from "ethers"
import { ethers, network } from "hardhat"
import { DEV_NETWORKS, TEST_ENTRANCE_FEE } from "../../helper-hardhat.config"
import { Raffle } from "../../typechain-types"

DEV_NETWORKS.includes(network.name)
  ? describe.skip
  : describe("Raffle (Staging)", function () {
      let raffle: Raffle
      let deployer: SignerWithAddress
      let entranceFee: BigNumber

      beforeEach(async function () {
        const signers = await ethers.getSigners()
        deployer = signers[0]
        raffle = await ethers.getContract("Raffle", deployer)
        entranceFee = await raffle.getEntranceFee()
      })

      describe("fulfillRandomWords", function () {
        it("works with live Chainlink Keepers and Chainlink VRF, we get a random winner", async function () {
          const startingTimeStamp = await raffle.getLatestTimestamp()

          await new Promise<void>(async function (resolve, reject) {
            console.log("\t\tListening to `WinnerPicked`...")
            raffle.once("WinnerPicked", async function () {
              console.log("\t\tWinner picked!")
              try {
                const raffleState = await raffle.getRaffleState()
                const endingTimeStamp = await raffle.getLatestTimestamp()
                const recentWinner = await raffle.getRecentWinner()
                const winnerBalance = await deployer.getBalance()

                await expect(raffle.getPlayer(0)).to.be.reverted
                expect(endingTimeStamp).to.be.greaterThan(startingTimeStamp)
                expect(raffleState).to.equal(0)
                expect(recentWinner).to.equal(deployer.address)
                expect(winnerBalance).to.equal(
                  winnerStartingBalance.add(entranceFee)
                )

                resolve()
              } catch (error) {
                console.log(error)
                reject(error)
              }
            })

            const tx = await raffle.enterRaffle({
              value: TEST_ENTRANCE_FEE,
            })
            await tx.wait(1)
            console.log("\t\tWaiting...")
            const winnerStartingBalance = await deployer.getBalance()
          })
        })
      })
    })
