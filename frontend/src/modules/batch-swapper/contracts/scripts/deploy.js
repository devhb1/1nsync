const hre = require("hardhat");

async function main() {
    // Access ethers through the 'hre' object
    const { chainId } = await hre.ethers.provider.getNetwork();
    console.log(`Deploying to network with Chain ID: ${chainId}`);

    // Get the contract factory for BatchSwapper.
    const BatchSwapper = await hre.ethers.getContractFactory("BatchSwapper");

    // Get the deployer's wallet address.
    const [deployer] = await hre.ethers.getSigners();
    console.log(`Deploying contracts with the account: ${deployer.address}`);

    // --- IMPORTANT: 1inch Router Address ---
    let oneInchRouterAddress;

    switch (Number(chainId)) {
        case 1: // Ethereum Mainnet
            oneInchRouterAddress = "0x111111125421cA6dc452d289314280a0f8842A65";
            break;
        case 137: // Polygon
            oneInchRouterAddress = "0x111111125421cA6dc452d289314280a0f8842A65";
            break;
        case 42161: // Arbitrum
            oneInchRouterAddress = "0x111111125421cA6dc452d289314280a0f8842A65";
            break;
        case 11155111: // Sepolia Testnet
            oneInchRouterAddress = "0x111111125421cA6dc452d289314280a0f8842A65";
            break;
        case 8453: // Base
            oneInchRouterAddress = "0x111111125421cA6dc452d289314280a0f8842A65";
            break;
        case 10: // Optimism
            oneInchRouterAddress = "0x111111125421cA6dc452d289314280a0f8842A65";
            break;
        default:
            console.warn(`No specific 1inch router address found for chain ID ${chainId}. Using a default.`);
            oneInchRouterAddress = "0x111111125421cA6dc452d289314280a0f8842A65";
    }

    // --- Fee Recipient Address ---
    const feeRecipientAddress = deployer.address;

    console.log(`Using 1inch Router: ${oneInchRouterAddress}`);
    console.log(`Using Fee Recipient: ${feeRecipientAddress}`);

    // Deploy the BatchSwapper contract
    const batchSwapper = await BatchSwapper.deploy(
        oneInchRouterAddress,
        feeRecipientAddress
    );

    // Wait for deployment
    await batchSwapper.waitForDeployment();

    // Get the contract address
    const contractAddress = await batchSwapper.getAddress();

    console.log(`
===================================================================
BatchSwapper deployed to: ${contractAddress}
Chain ID: ${chainId}
===================================================================

*** IMPORTANT NEXT STEPS FOR FRONTEND INTEGRATION ***

1.  UPDATE CONTRACT ADDRESS:
    Copy the address above and paste it into:
    'batch-swapper/utils/contractAddresses.ts'
    under the 'CONTRACT_ADDRESSES' object for chainId: ${chainId}.

    Example:
    export const CONTRACT_ADDRESSES: Record<number, { BATCH_SWAPPER: Address }> = {
        // ... other chains
        ${chainId}: { BATCH_SWAPPER: '${contractAddress}' as Address },
        // ...
    };

2.  UPDATE CONTRACT ABI (IF CONTRACT CHANGED):
    If you modified 'BatchSwapper.sol' (added/removed functions/events),
    you need to update the 'BATCH_SWAPPER_ABI' in:
    'batch-swapper/utils/contractAddresses.ts'

    To get the latest ABI:
    a. Run: 'npx hardhat compile' (in your 'contracts' directory)
    b. Open: 'batch-swapper/contracts/artifacts/contracts/BatchSwapper.sol/BatchSwapper.json'
    c. Copy the entire 'abi' array from this JSON file.
    d. Paste it into the 'BATCH_SWAPPER_ABI' constant in 'batch-swapper/utils/contractAddresses.ts'.
       Ensure it ends with 'as const;' for Viem/Wagmi type inference.

===================================================================
`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});