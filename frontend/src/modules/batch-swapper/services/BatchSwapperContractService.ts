// src/services/BatchSwapperContractService.ts
import {
    Address,
    createPublicClient,
    http,
    encodeFunctionData,
    PublicClient,
    WalletClient,
    Chain,
    parseUnits,
    formatUnits,
    getContract,
} from 'viem';
import {
    CONTRACT_ADDRESSES,
    BatchSwapperV2ABI,
    ONEINCH_CONFIG,
    getAllSupportedChains,
    getContractAddress,
    getRouterAddress,
    getNativeTokenForChain,
    SupportedChainId
} from '../utils';
import {
    SwapInstruction,
    OptimizationConfig,
    ContractSwapParams,
    BatchSwapResult, // Changed from BatchContractResult
    SwapRoute,
} from '../types';
import { oneInchAPI } from './oneInchAPI';
import { POPULAR_TOKENS } from '../utils/constants';

// Define a minimal ERC20 ABI for allowance checks
const ERC20_ABI = [
    {
        "constant": true,
        "inputs": [
            { "name": "owner", "type": "address" },
            { "name": "spender", "type": "address" }
        ],
        "name": "allowance",
        "outputs": [{ "name": "", "type": "uint256" }],
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            { "name": "spender", "type": "address" },
            { "name": "amount", "type": "uint256" }
        ],
        "name": "approve",
        "outputs": [{ "name": "", "type": "bool" }],
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "decimals",
        "outputs": [{ "name": "", "type": "uint8" }],
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [{ "name": "account", "type": "address" }],
        "name": "balanceOf",
        "outputs": [{ "name": "", "type": "uint256" }],
        "type": "function"
    }
] as const;

// Type definition for network config with index signature
type NetworkConfig = {
    [chainId: number]: {
        name: string;
        rpcUrl: string;
        blockExplorer: string;
        nativeCurrency: string;
    };
};

export class BatchSwapperContractService {
    private publicClient: PublicClient;
    private chainId: number;
    private contractAddress: Address | undefined;
    private oneInchRouter: Address | undefined;

    constructor(chainId: number) {
        this.chainId = chainId;
        this.contractAddress = getContractAddress(chainId as SupportedChainId);
        this.oneInchRouter = getRouterAddress(chainId as SupportedChainId);

        if (!this.contractAddress) {
            throw new Error(`BatchSwapper contract not deployed on chain ${chainId}`);
        }

        if (!this.oneInchRouter) {
            throw new Error(`1inch router not configured for chain ${chainId}`);
        }

        // Use supported chains to get network config
        const supportedChainIds = getAllSupportedChains();

        if (!supportedChainIds.includes(chainId as SupportedChainId)) {
            throw new Error(`Chain ${chainId} is not supported`);
        }

        // For now, use a simple RPC mapping - can be enhanced later
        const rpcUrls: Record<number, string> = {
            1: 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY',
            8453: 'https://mainnet.base.org',
            42161: 'https://arb1.arbitrum.io/rpc',
            10: 'https://mainnet.optimism.io'
        };

        const rpcUrl = rpcUrls[chainId];
        if (!rpcUrl) {
            throw new Error(`RPC URL not configured for chain ${chainId}`);
        }

        this.publicClient = createPublicClient({
            chain: {
                id: chainId,
                name: `Chain ${chainId}`,
                rpcUrls: { default: { http: [rpcUrl] } },
                nativeCurrency: {
                    name: 'ETH',
                    symbol: 'ETH',
                    decimals: 18,
                },
            } as Chain,
            transport: http(rpcUrl),
        });
    }

    /**
     * Checks if the batch swapper contract is available on the current chain.
     */
    isContractAvailable(): boolean {
        return !!(this.contractAddress && this.oneInchRouter);
    }

    /**
     * Get contract instance for read operations
     */
    private getContractInstance() {
        if (!this.contractAddress) {
            throw new Error('Contract address not available');
        }

        return getContract({
            address: this.contractAddress,
            abi: BatchSwapperV2ABI,
            client: this.publicClient,
        });
    }

    /**
     * Checks which tokens need approval for the Batch Swapper contract.
     */
    async checkApprovalsNeeded(
        ownerAddress: Address,
        tokenAddresses: Address[],
        amounts: bigint[]
    ): Promise<{ address: Address; amount: bigint; currentAllowance: bigint }[]> {
        if (!this.contractAddress) {
            throw new Error('Batch Swapper contract not initialized.');
        }

        const approvalsNeeded: { address: Address; amount: bigint; currentAllowance: bigint }[] = [];

        for (let i = 0; i < tokenAddresses.length; i++) {
            const tokenAddress = tokenAddresses[i];
            const requiredAmount = amounts[i];

            // Skip native token (ETH) as it doesn't require approval
            const nativeToken = getNativeTokenForChain(this.chainId);
            if (nativeToken && tokenAddress.toLowerCase() === nativeToken.address.toLowerCase()) {
                continue;
            }

            try {
                // Read allowance from ERC20 contract
                const allowance = await this.publicClient.readContract({
                    address: tokenAddress,
                    abi: ERC20_ABI,
                    functionName: 'allowance',
                    args: [ownerAddress, this.contractAddress],
                });

                const allowanceBigInt = BigInt((allowance as bigint).toString());
                if (allowanceBigInt < requiredAmount) {
                    approvalsNeeded.push({
                        address: tokenAddress,
                        amount: requiredAmount,
                        currentAllowance: allowanceBigInt
                    });
                }
            } catch (error) {
                console.error(`Error checking allowance for ${tokenAddress}:`, error);
                // If we can't check allowance, assume approval is needed
                approvalsNeeded.push({
                    address: tokenAddress,
                    amount: requiredAmount,
                    currentAllowance: 0n
                });
            }
        }
        return approvalsNeeded;
    }

    /**
     * Prepares the transaction data for a batch swap on the custom smart contract.
     */
    async prepareBatchSwap(
        swapInstructions: SwapInstruction[],
        userAddress: Address,
        config: OptimizationConfig
    ): Promise<BatchSwapResult> {
        if (!this.contractAddress) {
            throw new Error('Batch Swapper contract not initialized.');
        }
        if (swapInstructions.length === 0) {
            throw new Error('No swap instructions provided for batch swap.');
        }

        const contractSwapParams: ContractSwapParams[] = [];
        let totalIndividualGas = 0n;
        let totalEthValue = 0n;

        // Process each swap instruction
        for (const instruction of swapInstructions) {
            try {
                // Get 1inch swap data for each individual swap
                // CRITICAL FIX: Use contract address as 'from' since tokens will be in contract
                const oneInchSwapParams = {
                    src: instruction.fromTokenAddress,
                    dst: instruction.toTokenAddress,
                    amount: instruction.amount.toString(),
                    from: this.contractAddress, // ✅ Fixed: Contract performs the swap
                    slippage: config.maxSlippage,
                    disableEstimate: false,
                };

                const swapData = await oneInchAPI.getSwap(oneInchSwapParams, this.chainId);

                // Add individual gas for comparison
                totalIndividualGas += BigInt(swapData.tx.gas);

                // Get token info for calculations
                const tokensInfo = await oneInchAPI.getTokens(this.chainId);
                const toTokenInfo = tokensInfo.tokens[swapData.toToken.address as Address];
                const toTokenDecimals = toTokenInfo?.decimals || 18;

                // Calculate expected amount out and apply slippage
                // Ensure slippage is in basis points (e.g., 1% = 100 basis points)
                const slippageBasisPoints = config.maxSlippage * 100; // Convert percentage to basis points
                const expectedAmountOut = parseUnits(swapData.toTokenAmount, toTokenDecimals);
                const slippageMultiplier = BigInt(10000 - slippageBasisPoints);
                const minAmountOut = (expectedAmountOut * slippageMultiplier) / 10000n;

                contractSwapParams.push({
                    tokenIn: swapData.fromToken.address as Address,
                    tokenOut: swapData.toToken.address as Address,
                    amountIn: parseUnits(swapData.fromTokenAmount, swapData.fromToken.decimals),
                    minAmountOut: minAmountOut,
                    swapData: swapData.tx.data as `0x${string}`,
                });

                // Accumulate ETH value if needed
                if (swapData.tx.value && BigInt(swapData.tx.value) > 0n) {
                    totalEthValue += BigInt(swapData.tx.value);
                }

            } catch (error) {
                console.error(`Failed to get 1inch swap data:`, error);
                throw new Error(`Failed to prepare swap for batch: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }

        // Encode the function call for batchSwap
        const encodedCallData = encodeFunctionData({
            abi: BatchSwapperV2ABI,
            functionName: 'batchSwap',
            args: [contractSwapParams as readonly any[], userAddress],
        });

        // Estimate gas for the batch swap
        let estimatedBatchGas = 0n;
        try {
            estimatedBatchGas = await this.publicClient.estimateContractGas({
                account: userAddress,
                address: this.contractAddress,
                abi: BatchSwapperV2ABI,
                functionName: 'batchSwap',
                args: [contractSwapParams as readonly any[], userAddress],
                value: totalEthValue,
            });
            // Add 20% buffer
            estimatedBatchGas = (estimatedBatchGas * 120n) / 100n;
        } catch (error) {
            console.error('Failed to estimate gas for batchSwap:', error);
            // More realistic fallback estimate
            const baseGas = 21000n; // Base transaction cost
            const approvalGas = 45000n; // Average approval cost per token (if needed)
            const swapGasPerItem = 120000n; // More realistic per-swap gas in batch
            const batchOverhead = 30000n; // Contract overhead

            // Estimate assuming 25% of tokens need approval
            const estimatedApprovalGas = (BigInt(swapInstructions.length) * approvalGas) / 4n;

            estimatedBatchGas = baseGas + batchOverhead +
                (BigInt(swapInstructions.length) * swapGasPerItem) +
                estimatedApprovalGas;

            console.log(`Using fallback gas estimate: ${estimatedBatchGas.toString()} for ${swapInstructions.length} swaps`);
        } const gasSavings = totalIndividualGas > estimatedBatchGas ?
            totalIndividualGas - estimatedBatchGas : 0n;

        // Calculate total value USD for the batch
        const totalValueUSD = swapInstructions.reduce((sum, instruction) => sum + instruction.valueUSD, 0);

        const tx: SwapRoute['tx'] = {
            to: this.contractAddress,
            data: encodedCallData,
            value: totalEthValue,
            gas: estimatedBatchGas,
            gasPrice: 0n, // Will be set by wallet
        };

        return {
            tx,
            estimatedGas: estimatedBatchGas,
            estimatedGasSavings: gasSavings,
            swapCount: swapInstructions.length,
            totalValueUSD, // Added missing property
        };
    }

    /**
     * Get contract information
     */
    async getContractInfo(): Promise<{
        address: Address;
        oneInchRouter: Address;
        platformFee: bigint;
        feeRecipient: Address;
        version: string;
    }> {
        if (!this.contractAddress) {
            throw new Error('Contract not available');
        }

        const contract = this.getContractInstance();

        try {
            // Try to get contract info with timeout and retry logic
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Contract call timeout')), 5000)
            );

            // Get basic contract info - only what's definitely available
            const contractPromise = Promise.all([
                contract.read.oneInchRouter(),
                // Removed platformFee() as it's not in the ABI
                // contract.read.feeRecipient(), // Also check if this exists
                // contract.read.VERSION(), // Also check if this exists
            ]);

            const [oneInchRouter] = await Promise.race([
                contractPromise,
                timeoutPromise
            ]) as [Address];

            return {
                address: this.contractAddress,
                oneInchRouter: oneInchRouter,
                platformFee: BigInt(0), // Default to 0 since function doesn't exist
                feeRecipient: '0x0000000000000000000000000000000000000000' as Address,
                version: 'v2.0.0',
            };
        } catch (error: any) {
            console.warn('Error getting contract info (this is non-critical):', error);

            // If it's a rate limit error, provide fallback data
            if (error?.details?.code === -32016 || error?.message?.includes('rate limit')) {
                return {
                    address: this.contractAddress,
                    oneInchRouter: '0x111111254eeb25477b68fb85ed929f73a960582' as Address, // 1inch router fallback
                    platformFee: BigInt(30), // 0.3% fallback
                    feeRecipient: '0x0000000000000000000000000000000000000000' as Address,
                    version: 'v1.0.0',
                };
            }

            throw new Error('Failed to get contract information');
        }
    }

    /**
     * Estimate gas savings for batch vs individual swaps
     */
    estimateGasSavings(individualGasTotal: bigint, swapCount: number): bigint {
        // Base gas for a transaction
        const baseGas = 21000n;

        // Estimated gas per swap in batch (much lower than individual)
        const gasPerBatchSwap = 80000n;

        // Estimated batch overhead
        const batchOverhead = 50000n;

        const estimatedBatchGas = baseGas + batchOverhead + (gasPerBatchSwap * BigInt(swapCount));

        return individualGasTotal > estimatedBatchGas ?
            individualGasTotal - estimatedBatchGas : 0n;
    }
}