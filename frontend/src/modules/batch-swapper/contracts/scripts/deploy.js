const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * BatchSwapperV2 Professional Deployment Script
 * 
 * A standardized deployment script for multi-chain deployment of BatchSwapperV2 contract.
 * Supports deployment to Ethereum, Base, Optimism, and Arbitrum networks.
 * 
 * Features:
 * - Network validation and configuration
 * - Automated contract deployment
 * - ABI extraction and management
 * - Deployment info persistence
 * - Gas estimation and optimization
 * - Professional logging and error handling
 */

// Network configurations with latest 1inch Aggregation Router V6 addresses
const SUPPORTED_NETWORKS = {
  1: {
    name: "Ethereum Mainnet",
    router: "0x111111125421cA6dc452d289314280a0f8842A65",
    explorer: "https://etherscan.io",
    currency: "ETH",
    confirmations: 2
  },
  8453: {
    name: "Base",
    router: "0x111111125421cA6dc452d289314280a0f8842A65",
    explorer: "https://basescan.org",
    currency: "ETH",
    confirmations: 1
  },
  10: {
    name: "Optimism",
    router: "0x111111125421cA6dc452d289314280a0f8842A65",
    explorer: "https://optimistic.etherscan.io",
    currency: "ETH",
    confirmations: 1
  },
  42161: {
    name: "Arbitrum One",
    router: "0x111111125421cA6dc452d289314280a0f8842A65",
    explorer: "https://arbiscan.io",
    currency: "ETH",
    confirmations: 1
  }
};

/**
 * Validate deployment environment and network
 */
async function validateEnvironment() {
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  
  if (!SUPPORTED_NETWORKS[chainId]) {
    throw new Error(`Unsupported network: ${chainId}. Supported networks: ${Object.keys(SUPPORTED_NETWORKS).join(", ")}`);
  }
  
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  
  console.log(`Network: ${SUPPORTED_NETWORKS[chainId].name} (${chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${ethers.formatEther(balance)} ${SUPPORTED_NETWORKS[chainId].currency}`);
  
  if (balance < ethers.parseEther("0.01")) {
    console.warn(`⚠️  Low balance detected. Ensure sufficient ${SUPPORTED_NETWORKS[chainId].currency} for deployment.`);
  }
  
  return { chainId, deployer, network: SUPPORTED_NETWORKS[chainId] };
}

/**
 * Deploy BatchSwapperV2 contract
 */
async function deployContract(chainId, deployer, networkConfig) {
  console.log(`\n📦 Deploying BatchSwapperV2 to ${networkConfig.name}...`);
  console.log(`🔗 Using 1inch Router: ${networkConfig.router}`);
  
  // Get contract factory
  const BatchSwapperV2 = await ethers.getContractFactory("BatchSwapperV2", deployer);
  
  // Estimate gas for deployment
  const deployTx = BatchSwapperV2.getDeployTransaction(networkConfig.router);
  const gasEstimate = await ethers.provider.estimateGas(deployTx);
  const gasPrice = await ethers.provider.getFeeData();
  
  console.log(`⛽ Estimated gas: ${gasEstimate.toString()}`);
  console.log(`💰 Estimated cost: ${ethers.formatEther(gasEstimate * gasPrice.gasPrice)} ${networkConfig.currency}`);
  
  // Deploy contract
  const contract = await BatchSwapperV2.deploy(networkConfig.router);
  const deploymentTx = contract.deploymentTransaction();
  
  console.log(`📝 Deployment transaction: ${deploymentTx.hash}`);
  console.log(`⏳ Waiting for ${networkConfig.confirmations} confirmations...`);
  
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();
  
  // Wait for additional confirmations
  await deploymentTx.wait(networkConfig.confirmations);
  
  console.log(`✅ Contract deployed: ${contractAddress}`);
  
  return { contract, contractAddress, deploymentTx };
}

/**
 * Verify contract deployment and extract metadata
 */
async function verifyDeployment(contract, chainId, networkConfig) {
  console.log(`\n🔍 Verifying contract deployment...`);
  
  try {
    const version = await contract.VERSION();
    const router = await contract.oneInchRouter();
    const maxSwaps = await contract.MAX_SWAPS_PER_BATCH();
    const owner = await contract.owner();
    
    console.log(`✅ Contract verification successful:`);
    console.log(`   Version: ${version}`);
    console.log(`   Router: ${router}`);
    console.log(`   Max Swaps: ${maxSwaps}`);
    console.log(`   Owner: ${owner}`);
    
    return { version, router, maxSwaps, owner };
  } catch (error) {
    console.error(`❌ Contract verification failed:`, error.message);
    throw error;
  }
}

/**
 * Extract and save contract ABI
 */
async function extractABI() {
  console.log(`\n📋 Extracting contract ABI...`);
  
  const artifactPath = path.join(__dirname, "../artifacts/contracts/BatchSwapperV2.sol/BatchSwapperV2.json");
  const abiDir = path.join(__dirname, "../artifacts/abis");
  const abiPath = path.join(abiDir, "BatchSwapperV2.json");
  
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Contract artifact not found: ${artifactPath}`);
  }
  
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  
  // Ensure ABI directory exists
  if (!fs.existsSync(abiDir)) {
    fs.mkdirSync(abiDir, { recursive: true });
  }
  
  // Save ABI
  fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2));
  
  console.log(`✅ ABI extracted: ${abiPath}`);
  console.log(`📊 ABI contains ${artifact.abi.length} functions and events`);
  
  return { abi: artifact.abi, abiPath };
}

/**
 * Save deployment information
 */
async function saveDeploymentInfo(deploymentData) {
  console.log(`\n💾 Saving deployment information...`);
  
  const { chainId, contractAddress, networkConfig, deployer, deploymentTx, contractMetadata } = deploymentData;
  
  const deploymentInfo = {
    contract: "BatchSwapperV2",
    version: contractMetadata.version,
    address: contractAddress,
    network: {
      name: networkConfig.name,
      chainId: chainId,
      router: networkConfig.router,
      explorer: networkConfig.explorer
    },
    deployment: {
      deployer: deployer.address,
      owner: contractMetadata.owner,
      txHash: deploymentTx.hash,
      blockNumber: deploymentTx.blockNumber,
      gasUsed: deploymentTx.gasUsed?.toString(),
      timestamp: new Date().toISOString()
    },
    verification: {
      explorerUrl: `${networkConfig.explorer}/address/${contractAddress}`,
      maxSwapsPerBatch: contractMetadata.maxSwaps.toString(),
      routerAddress: contractMetadata.router
    }
  };
  
  // Save to deployments directory
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const deploymentFile = path.join(deploymentsDir, `${networkConfig.name.toLowerCase().replace(/\s+/g, '-')}-${chainId}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  
  console.log(`✅ Deployment info saved: ${deploymentFile}`);
  
  return deploymentInfo;
}

/**
 * Main deployment function
 */
async function main() {
  console.log("🚀 BatchSwapperV2 Professional Deployment");
  console.log("=========================================");
  
  try {
    // Step 1: Validate environment
    console.log("🔍 Step 1: Environment Validation");
    const { chainId, deployer, network } = await validateEnvironment();
    
    // Step 2: Deploy contract
    console.log("🔨 Step 2: Contract Deployment");
    const { contract, contractAddress, deploymentTx } = await deployContract(chainId, deployer, network);
    
    // Step 3: Verify deployment
    console.log("✅ Step 3: Deployment Verification");
    const contractMetadata = await verifyDeployment(contract, chainId, network);
    
    // Step 4: Extract ABI
    console.log("📋 Step 4: ABI Extraction");
    const { abiPath } = await extractABI();
    
    // Step 5: Save deployment info
    console.log("💾 Step 5: Deployment Documentation");
    const deploymentInfo = await saveDeploymentInfo({
      chainId,
      contractAddress,
      networkConfig: network,
      deployer,
      deploymentTx,
      contractMetadata
    });
    
    // Step 6: Summary
    console.log("\n🎉 Deployment Summary");
    console.log("=====================");
    console.log(`✅ Network: ${network.name} (${chainId})`);
    console.log(`✅ Contract: ${contractAddress}`);
    console.log(`✅ Version: ${contractMetadata.version}`);
    console.log(`✅ Explorer: ${network.explorer}/address/${contractAddress}`);
    console.log(`✅ ABI: ${abiPath}`);
    console.log(`✅ Deployment Info: deployments/${network.name.toLowerCase().replace(/\s+/g, '-')}-${chainId}.json`);
    
    return deploymentInfo;
    
  } catch (error) {
    console.error("\n❌ Deployment Failed");
    console.error("==================");
    console.error(`Error: ${error.message}`);
    
    if (error.code) {
      console.error(`Code: ${error.code}`);
    }
    
    if (error.transaction) {
      console.error(`Transaction: ${error.transaction.hash}`);
    }
    
    process.exit(1);
  }
}

// Execute deployment
if (require.main === module) {
  main()
    .then((deploymentInfo) => {
      console.log("\n🎊 Deployment completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Fatal error:", error.message);
      process.exit(1);
    });
}

module.exports = {
  main,
  SUPPORTED_NETWORKS,
  validateEnvironment,
  deployContract,
  verifyDeployment,
  extractABI,
  saveDeploymentInfo
};
