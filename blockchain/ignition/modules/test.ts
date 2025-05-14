import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
dotenv.config();

// If using Hardhat Ignition module approach
const DeployContract = buildModule("MainModule", (m) => {
  const deployer = m.getAccount(0);

  // Assuming your constructor takes two parameters, e.g., (address _param1, uint256 _param2)
  const limitorder = m.contract(
    "LimitOrderWithYield",
    [
      "0xYourFirstParameter", // Replace with actual first parameter
      123456, // Replace with actual second parameter
    ],
    { from: deployer }
  );

  return {
    limitorder,
  };
});

export default DeployContract;

// If using traditional Hardhat script approach
// Note: You should choose either this approach OR the Ignition module approach above
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const LimitOrderWithYield = await ethers.getContractFactory(
    "LimitOrderWithYield"
  );

  // Pass your two constructor parameters here
  const limitorder = await LimitOrderWithYield.deploy(
    "0xYourFirstParameter", // Replace with actual first parameter
    "123456" // Replace with actual second parameter
  );

  await limitorder.waitForDeployment();
  console.log(
    "LimitOrderWithYield deployed to:",
    await limitorder.getAddress()
  );
}

// Remove this if you're using the Ignition module approach only
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
