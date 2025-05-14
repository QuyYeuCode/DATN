const { ethers } = require("hardhat");

async function main() {
  // Lấy provider và signer
  const [deployer] = await ethers.getSigners();

  // Lấy contract factory
  const SimpleStorage = await ethers.getContractFactory("SimpleStorage");

  // Triển khai contract
  console.log("Đang triển khai SimpleStorage...");
  const deployment = await SimpleStorage.deploy();
  await deployment.waitForDeployment();
  const contractAddress = await deployment.getAddress();
  console.log("SimpleStorage đã được triển khai tới địa chỉ:", contractAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
