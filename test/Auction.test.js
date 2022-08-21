require("@nomiclabs/hardhat-waffle");
const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { string } = require("hardhat/internal/core/params/argumentTypes");
const { constants, expectRevert, } = require('@openzeppelin/test-helpers');
const { parseJsonText } = require("typescript");
const { parseEther, parseBytes32String } = require("ethers/lib/utils");
const { parse } = require("typechain");


const toWei = (value) => ethers.utils.parseEther(value.toString());
const fromWei = (value) =>
  ethers.utils.formatEther(
    typeof value === "string" ? value : value.toString()
  );

async function mineNBlocks(n) {
    for (let index = 0; index < n; index++) {
      await ethers.provider.send('evm_mine');
    }
  }

describe("Auction", () => {
    let owner;
    let user1;
    let user2;
    let auction;
    let latestBlock;
  
    beforeEach(async () => {
        [owner, user1, user2] = await ethers.getSigners();
        latestBlock = await hre.ethers.provider.getBlock("latest");

        const Auction = await ethers.getContractFactory("Auction");
        auction = await Auction.deploy(
            owner.address,
            parseInt(latestBlock.number) + 100,
            parseInt(latestBlock.number) + 200,
            "Test ipfs",
            toWei(100));
        await auction.deployed();
      });

      it("is deployed", async () => {
        expect(await auction.deployed()).to.equal(auction);
        expect(await auction._startBlock()).to.equal(parseInt(latestBlock.number) + 100,);
        expect(await auction._endBlock()).to.equal(parseInt(latestBlock.number) + 200,);
        expect(await auction._maxPrice()).to.equal(toWei(100));
        expect(await auction._ipfsHash()).to.equal("Test ipfs");
      });

      it("not deployed because owner address == 0", async () => {
        const Auction = await ethers.getContractFactory("Auction");
        await expect(Auction.deploy(
            constants.ZERO_ADDRESS,
            parseInt(latestBlock.number) + 100,
            parseInt(latestBlock.number) + 200,
            "Test ipfs",
            100
            )).to.be.revertedWith("Check owner address!");
      });

      describe("place bid reverted exception (modifier)", () => {
        it("auction not start yet", async () => {
            await expect(auction
            .connect(user1)
            .placeBid({ value: toWei(1) })
            ).to.be.revertedWith("Auction not start yet!");
        });

        it("owner can't place a bid", async () => {
            await mineNBlocks(latestBlock.number + 100);
            await expect(auction
            .connect(owner)
            .placeBid({ value: toWei(1) })
            ).to.be.revertedWith("Owner can't bid!");
        });

        it("auction canceled", async () => {
            await mineNBlocks(parseInt(await auction._startBlock()) - (await hre.ethers.provider.getBlock("latest")).number);

            await auction.connect(owner).cancelAuction();

            await expect(auction
            .connect(user1)
            .placeBid()
            ).to.be.revertedWith("Auction is canceled!");
        });

        it("auction ended", async () => {
            await mineNBlocks(latestBlock.number + 300);

            await expect(auction
            .connect(user1)
            .placeBid({ value: toWei(1) })
            ).to.be.revertedWith("Auction is ended!");
        });

        it("cancel auction can only owner", async () => {
            await mineNBlocks(parseInt(await auction._startBlock()) - (await hre.ethers.provider.getBlock("latest")).number);

            await expect(auction
            .connect(user1)
            .cancelAuction()
            ).to.be.revertedWith("Only for owner!");
        });

        it("cancel auction only before end", async () => {
            await mineNBlocks(parseInt(await auction._endBlock()) - (await hre.ethers.provider.getBlock("latest")).number);

            await expect(auction
            .connect(owner)
            .cancelAuction()
            ).to.be.revertedWith("Auction is ended!");
        });

        it("cancel auction only not canceled auction", async () => {
            await mineNBlocks(parseInt(await auction._startBlock()) - (await hre.ethers.provider.getBlock("latest")).number);

            auction.connect(owner).cancelAuction();

            await expect(auction
            .connect(owner)
            .cancelAuction()
            ).to.be.revertedWith("Auction is canceled!");
        });
    })

    describe("main logic placeBid func", () => {
        it("place bid > 0", async () => {
            await mineNBlocks(parseInt(await auction._startBlock()) - (await hre.ethers.provider.getBlock("latest")).number);

            await expect(auction
            .connect(user1)
            .placeBid({ value: toWei(0) })
            ).to.be.revertedWith("The new bid must not be equal to 0!");
        });

        it("place new bid", async () => {
            await mineNBlocks(parseInt(await auction._startBlock()) - (await hre.ethers.provider.getBlock("latest")).number);

            await auction
            .connect(user1)
            .placeBid({ value: toWei(1) });

            expect(await auction._highestBidder()).to.equal(user1.address);

            await auction
            .connect(user1)
            .placeBid({ value: toWei(100) });

            expect(parseInt(await auction.getHighestBid())).to.equal(parseInt(toWei(101)));
        });

        it("new bid > old max bid", async () => {
            // console.log(parseInt(await auction._startBlock()));
            // console.log(parseInt(await auction._endBlock()));
            // console.log((await hre.ethers.provider.getBlock("latest")).number);

            await mineNBlocks(parseInt(await auction._startBlock()) - (await hre.ethers.provider.getBlock("latest")).number);

            await auction
            .connect(user1)
            .placeBid({ value: toWei(1) });
            await expect(auction
            .connect(user2)
            .placeBid({ value: toWei(1) })
            ).to.be.revertedWith("The new bid must be greater than the previous highest bid!");
        });

        it("auction ended when place bid == maxPrice owner", async () => {
            // console.log(parseInt(await auction._startBlock()));
            // console.log(parseInt(await auction._endBlock()));
            // console.log((await hre.ethers.provider.getBlock("latest")).number);

            await mineNBlocks(parseInt(await auction._startBlock()) - (await hre.ethers.provider.getBlock("latest")).number);

            await auction
            .connect(user1)
            .placeBid({ value: toWei(100) });
            await expect(auction
            .connect(user2)
            .placeBid({ value: toWei(1) })
            ).to.be.revertedWith("Auction is ended!");
        });
    })

    describe("main logic withdraw func", () => {
        it("withdraw only after cancel or end auction", async () => {
            await mineNBlocks(parseInt(await auction._startBlock()) - (await hre.ethers.provider.getBlock("latest")).number);

            await auction.connect(user1).placeBid({ value: toWei(1) });

            await expect(auction.connect(user1).withdraw()).to.be.revertedWith("Auction not ended and not canceled!");
        });

        it("nothing to withdraw if the user made the maximum bid", async () => {
            await mineNBlocks(parseInt(await auction._startBlock()) - (await hre.ethers.provider.getBlock("latest")).number);

            await auction.connect(user1).placeBid({ value: toWei(100) });
            
            await mineNBlocks(parseInt(await auction._endBlock()) - (await hre.ethers.provider.getBlock("latest")).number + 1);

            await expect(auction.connect(user1).withdraw()).to.be.revertedWith("You have nothing to withdraw!");
        });

        it("withdraw only maxBid - maxPrice", async () => {
            let startBalance = parseInt(await user1.getBalance());
            await mineNBlocks(parseInt(await auction._startBlock()) - (await hre.ethers.provider.getBlock("latest")).number);

            const tx1 = await auction.connect(user1).placeBid({ value: toWei(99) });
            const tx2 = await auction.connect(user1).placeBid({ value: toWei(100) });

            const receipt1 = await tx1.wait()
            const gasSpent1 = receipt1.gasUsed.mul(receipt1.effectiveGasPrice)
            const receipt2 = await tx2.wait()
            const gasSpent2 = receipt2.gasUsed.mul(receipt2.effectiveGasPrice)
            
            await mineNBlocks(parseInt(await auction._endBlock()) - (await hre.ethers.provider.getBlock("latest")).number + 1);

            const tx3 = await auction.connect(user1).withdraw();
            const receipt3 = await tx3.wait()
            const gasSpent3 = receipt3.gasUsed.mul(receipt3.effectiveGasPrice)

            expect(parseInt(await user1.getBalance())).to.eq(startBalance - (parseInt(toWei(100)) + parseInt(gasSpent1) + parseInt(gasSpent2) + parseInt(gasSpent3)));
        });

        it("withdraw your bid - gasSpent", async () => {
            let startBalance = parseInt(await user1.getBalance());
            await mineNBlocks(parseInt(await auction._startBlock()) - (await hre.ethers.provider.getBlock("latest")).number);

            const tx1 = await auction.connect(user1).placeBid({ value: toWei(99) });
            const receipt1 = await tx1.wait()
            const gasSpent1 = receipt1.gasUsed.mul(receipt1.effectiveGasPrice)

            await auction.connect(user2).placeBid({ value: toWei(100) });
            
            await mineNBlocks(parseInt(await auction._endBlock()) - (await hre.ethers.provider.getBlock("latest")).number + 1);

            const tx2 = await auction.connect(user1).withdraw();
            const receipt2 = await tx2.wait()
            const gasSpent2 = receipt2.gasUsed.mul(receipt2.effectiveGasPrice)

            expect(parseInt(await user1.getBalance())).to.eq(startBalance - (parseInt(gasSpent1) + parseInt(gasSpent2)));
        });

        it("try second times withdraw your bid", async () => {
            await mineNBlocks(parseInt(await auction._startBlock()) - (await hre.ethers.provider.getBlock("latest")).number);

            await auction.connect(user1).placeBid({ value: toWei(99) });
            await auction.connect(user2).placeBid({ value: toWei(100) });
            
            await mineNBlocks(parseInt(await auction._endBlock()) - (await hre.ethers.provider.getBlock("latest")).number + 1);
            await auction.connect(user1).withdraw();

            await expect(auction.connect(user2).withdraw()).to.be.revertedWith("You have nothing to withdraw!");
            await expect(auction.connect(user1).withdraw()).to.be.revertedWith("You have nothing to withdraw!");
        });

        it("withdraw owner maxBid", async () => {
            let startBalance = parseInt(await owner.getBalance());
            await mineNBlocks(parseInt(await auction._startBlock()) - (await hre.ethers.provider.getBlock("latest")).number);

            await auction.connect(user1).placeBid({ value: toWei(99) });
            await auction.connect(user2).placeBid({ value: toWei(100) });
            
            await mineNBlocks(parseInt(await auction._endBlock()) - (await hre.ethers.provider.getBlock("latest")).number + 1);

            const tx = await auction.connect(owner).withdraw();
            const receipt = await tx.wait()
            const gasSpent = receipt.gasUsed.mul(receipt.effectiveGasPrice)

            expect(parseInt(await owner.getBalance())).to.eq(startBalance + parseInt(toWei(100) - parseInt(gasSpent)));
        });


    })

    describe("main logic acceptMaxBid", () => {
        it("acceptMaxBid only for owner", async () => {
            await expect(auction.connect(user1).acceptMaxBid()).to.be.revertedWith("Only for owner!");
        });

        it("acceptMaxBid owner and stop auction", async () => {
            let startBalance = parseInt(await owner.getBalance());
            await mineNBlocks(parseInt(await auction._startBlock()) - (await hre.ethers.provider.getBlock("latest")).number);

            await auction.connect(user1).placeBid({ value: toWei(99) });
            
            await auction.connect(owner).acceptMaxBid();

            await expect(auction.connect(user2).placeBid()).to.be.revertedWith("Auction is ended!");
            await expect(auction.connect(user1).withdraw()).to.be.revertedWith("You have nothing to withdraw!");
            await expect(auction.connect(owner).withdraw()).to.be.revertedWith("You have nothing to withdraw!");
        });

    })
})