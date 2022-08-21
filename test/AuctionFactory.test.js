require("@nomiclabs/hardhat-waffle");
const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { string } = require("hardhat/internal/core/params/argumentTypes");

describe("FactoryAuction", () => {
    let owner;
    let factory;
  
    beforeEach(async () => {
      [owner] = await ethers.getSigners();
  
      const Factory = await ethers.getContractFactory("FactoryAuction");
      factory = await Factory.deploy();
      await factory.deployed();
    });

    it("is deployed", async () => {
        expect(await factory.deployed()).to.equal(factory);
      });

      describe("createAuction", () => {
        it("deploys an auction", async () => {
            var latestBlock = await hre.ethers.provider.getBlock("latest");
            
            await factory.createAuction(
                parseInt(latestBlock.number) + 100,
                parseInt(latestBlock.number) + 200,
                "Test ipfs",
                100
                );

            expect(await factory.amountAllAuctions()).to.equal(1);

            await factory.createAuction(
                parseInt(latestBlock.number) + 100,
                parseInt(latestBlock.number) + 200,
                "Test ipfs",
                100
                );

            expect(await factory.amountAllAuctions()).to.equal(2);
        });

        it("StartBlock must be <= EndBlock", async () => {
            var latestBlock = await hre.ethers.provider.getBlock("latest");

            await expect(factory.createAuction(
                parseInt(latestBlock.number) + 1,
                parseInt(latestBlock.number),
                "Test ipfs",
                100
                )).to.be.revertedWith("StartBlock <= EndBlock!");
        });

        it("StartBlock must be > block.number", async () => {
            var latestBlock = await hre.ethers.provider.getBlock("latest");

            await expect(factory.createAuction(
                parseInt(latestBlock.number),
                parseInt(latestBlock.number) + 200,
                "Test ipfs",
                100
                )).to.be.revertedWith("Auction can't start in the past! Check StartBlock!");
        });

        it("MaxPrice must be > 0", async () => {
            var latestBlock = await hre.ethers.provider.getBlock("latest");

            await expect(factory.createAuction(
                parseInt(latestBlock.number) + 100,
                parseInt(latestBlock.number) + 200,
                "Test ipfs",
                0
                )).to.be.revertedWith("You can't create auction with maxProca equal 0!");
        });
    })
})