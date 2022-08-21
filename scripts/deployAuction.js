async function main() {
    const [deployer] = await ethers.getSigners();
  
    const toWei = (value) => ethers.utils.parseEther(value.toString());
    console.log("Deploying contracts with the account: ", deployer.address);
  
    latestBlock = await hre.ethers.provider.getBlock("latest");
    const Auction = await ethers.getContractFactory("Auction");
    const auction = await Auction.deploy(
        deployer.address,
        parseInt(latestBlock.number) + 1000,
        parseInt(latestBlock.number) + 200000,
        "Test ipfs",
        toWei(100));
  
    console.log("Auction address: ", auction.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });