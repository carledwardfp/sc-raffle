import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { expect } from "chai"
import { BigNumber } from "ethers"
import { deployments, ethers, network } from "hardhat"
import { DEV_NETWORKS, TEST_ENTRANCE_FEE } from "../../helper-hardhat.config"
import { Raffle, VRFCoordinatorV2Mock } from "../../typechain-types"

!DEV_NETWORKS.includes(network.name)
  ? describe.skip
  : describe("Raffle (Unit)", function () {
      let raffle: Raffle
      let vrfCoordinatorV2Mock: VRFCoordinatorV2Mock
      let accounts: SignerWithAddress[]
      let player: SignerWithAddress
      let interval: BigNumber

      beforeEach(async function () {
        const signers = await ethers.getSigners()
        accounts = signers
        player = signers[1]
        await deployments.fixture(["all"])
        raffle = await ethers.getContract("Raffle")
        raffle = raffle.connect(player)
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        interval = await raffle.getInterval()
      })

      async function mockTimePassed() {
        // for a documentation of the methods below, go here: https://hardhat.org/hardhat-network/reference
        await network.provider.send("evm_increaseTime", [
          interval.toNumber() + 1,
        ])
      }

      async function mockMine() {
        // for a documentation of the methods below, go here: https://hardhat.org/hardhat-network/reference
        await network.provider.request({ method: "evm_mine", params: [] })
      }

      describe("contructor", function () {
        it("should correctly set the initial values", async function () {
          const contractEntranceFee = await raffle.getEntranceFee()
          const raffleState = await raffle.getRaffleState()
          expect(contractEntranceFee).to.equal(TEST_ENTRANCE_FEE)
          expect(raffleState).to.equal(0) // 0 = "OPEN"
        })
      })

      describe("enterRaffle", function () {
        it("should fail if value is less than the set fee", async function () {
          await expect(raffle.enterRaffle()).to.be.revertedWithCustomError(
            raffle,
            "Raffle__NotEnoughETHSent"
          )
        })
        it("should fail if value is the raffle state is not open", async function () {
          await raffle.enterRaffle({ value: TEST_ENTRANCE_FEE })
          await mockTimePassed()
          await mockMine()
          await raffle.performUpkeep([])

          await expect(
            raffle.enterRaffle({ value: TEST_ENTRANCE_FEE })
          ).to.be.revertedWithCustomError(raffle, "Raffle__NotOpen")
        })
        it("should add the new player to the storage players list", async function () {
          await raffle.enterRaffle({ value: TEST_ENTRANCE_FEE })
          const newPlayer = await raffle.getPlayer("0")
          expect(newPlayer).to.equal(player.address)
        })
        it("should emit the NewPlayer event", async function () {
          await expect(
            raffle.enterRaffle({ value: TEST_ENTRANCE_FEE })
          ).to.emit(raffle, "NewPlayer")
        })
      })

      describe("checkUpkeep", function () {
        it("returns false if people haven't sent any ETH", async function () {
          await mockTimePassed()
          await mockMine()

          const { upkeepNeeded } = await raffle.checkUpkeep("0x")
          expect(upkeepNeeded).to.be.false
        })
        it("returns false if raffle isn't open", async function () {
          await raffle.enterRaffle({ value: TEST_ENTRANCE_FEE })
          await mockTimePassed()
          await mockMine()
          await raffle.performUpkeep([])

          const { upkeepNeeded } = await raffle.checkUpkeep("0x")
          expect(upkeepNeeded).to.be.false
          const raffleState = await raffle.getRaffleState()
          expect(raffleState).to.equal(1)
        })
        it("returns false if enough time hasn't passed", async function () {
          await raffle.enterRaffle({ value: TEST_ENTRANCE_FEE })

          const { upkeepNeeded } = await raffle.checkUpkeep("0x")
          expect(upkeepNeeded).to.be.false
        })
        it("returns true if enough time has passed, has players, eth, and is open", async function () {
          await raffle.enterRaffle({ value: TEST_ENTRANCE_FEE })
          await mockTimePassed()
          await mockMine()

          const { upkeepNeeded } = await raffle.checkUpkeep("0x")
          expect(upkeepNeeded).to.be.true
        })
      })

      describe("performUpkeep", function () {
        it("reverts if checkup is false: No ETH", async function () {
          await mockTimePassed()
          await mockMine()

          await expect(
            raffle.performUpkeep("0x")
          ).to.be.revertedWithCustomError(raffle, "Raffle__UpkeepNotNeeded")
        })
        it("reverts if checkup is false: Raffle not open", async function () {
          await raffle.enterRaffle({ value: TEST_ENTRANCE_FEE })
          await mockTimePassed()
          await mockMine()
          await raffle.performUpkeep([])

          await expect(
            raffle.performUpkeep("0x")
          ).to.be.revertedWithCustomError(raffle, "Raffle__UpkeepNotNeeded")
        })
        it("reverts if checkup is false: Not enough time has passed", async function () {
          await raffle.enterRaffle({ value: TEST_ENTRANCE_FEE })

          await expect(
            raffle.performUpkeep("0x")
          ).to.be.revertedWithCustomError(raffle, "Raffle__UpkeepNotNeeded")
        })
        it("can only run if checkupkeep is true", async function () {
          await raffle.enterRaffle({ value: TEST_ENTRANCE_FEE })
          await mockTimePassed()
          await mockMine()

          const tx = await raffle.performUpkeep("0x")
          expect(Boolean(tx)).to.be.true
        })
        it("updates the raffle state and emits a requestId", async function () {
          await raffle.enterRaffle({ value: TEST_ENTRANCE_FEE })
          await mockTimePassed()
          await mockMine()

          await expect(raffle.performUpkeep("0x")).to.emit(
            raffle,
            "RequestedRaffleWinner"
          )
        })
      })

      describe("fulfillRandomWords", function () {
        it("can only be called after performupkeep", async function () {
          await expect(
            vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)
          ).to.be.revertedWith("nonexistent request")
          await expect(
            vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.address)
          ).to.be.revertedWith("nonexistent request")
        })

        it("picks a winner, resets, and sends money", async function () {
          await new Promise<void>(async function (resolve, reject) {
            raffle.once("WinnerPicked", async function () {
              try {
                const raffleState = await raffle.getRaffleState()
                const endingTimeStamp = await raffle.getLatestTimestamp()
                const recentWinner = await raffle.getRecentWinner()
                const winnerBalance = await accounts[2].getBalance()

                await expect(raffle.getPlayer(0)).to.be.reverted
                expect(endingTimeStamp).to.be.greaterThan(startingTimeStamp)
                expect(raffleState).to.equal(0)
                expect(winnerBalance).to.equal(
                  startingBalances[recentWinner].add(
                    TEST_ENTRANCE_FEE.mul(1 + additionalPlayers)
                  )
                )

                resolve()
              } catch (e) {
                reject(e)
              }
            })

            await raffle.enterRaffle({ value: TEST_ENTRANCE_FEE })

            const additionalPlayers = 3
            const playerIndex = 2
            for (
              let i = playerIndex;
              i < playerIndex + additionalPlayers;
              i++
            ) {
              raffle = raffle.connect(accounts[i])
              await raffle.enterRaffle({ value: TEST_ENTRANCE_FEE })
            }

            let startingBalances: { [key: string]: BigNumber } = {}
            for (let i = 1; i < playerIndex + additionalPlayers; i++) {
              startingBalances[accounts[playerIndex].address] = await accounts[
                playerIndex
              ].getBalance()
            }

            const startingTimeStamp = await raffle.getLatestTimestamp()
            await mockTimePassed()
            await mockMine()
            const tx = await raffle.performUpkeep("0x")
            const txReceipt = await tx.wait(1)
            await vrfCoordinatorV2Mock.fulfillRandomWords(
              txReceipt!.events![1].args!.requestId,
              raffle.address
            )
          })
        })
      })
    })
