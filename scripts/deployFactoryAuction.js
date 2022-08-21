async function main() {
    const [deployer] = await ethers.getSigners();
  
    console.log("Deploying contracts with the account:", deployer.address);
  
    const Factory = await ethers.getContractFactory("FactoryAuction");
    const factory = await Factory.deploy(); //({ gasLimit: 3000000, gasPrice: 200000000000})
  
    console.log("Factory address: ", factory.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });

