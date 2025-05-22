// scripts/deploy.js
const { ethers } = require("hardhat");

async function main() {
  console.log("Đang deploy UniswapDEX...");

  // Lấy địa chỉ của Uniswap V3 contracts từ config hoặc hardcode
  // Đây là địa chỉ trên mainnet, cần thay đổi nếu deploy trên mạng khác
  const swapRouterAddress = "0x25Ee4204f8711CFbF4303faE9A3e8fe89d44a15b";
  const nonfungiblePositionManagerAddress =
    "0x1a130c8A834125A7d6e31E8F77d4D9326BFee81c";
  const factoryAddress = "0x46Fce548519591a89d13292cfB6B2887ec8d810a";

  // Lấy contract factory
  const UniswapDEX = await ethers.getContractFactory("UniswapDEX");

  // Deploy contract với các tham số khởi tạo
  const uniswapDEX = await UniswapDEX.deploy(
    swapRouterAddress,
    nonfungiblePositionManagerAddress,
    factoryAddress
  );

  // Đợi transaction được confirm
  await uniswapDEX.waitForDeployment();
  const contractAddress = await uniswapDEX.getAddress();
  console.log("UniswapDEX deployed to:", contractAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
