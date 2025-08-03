// src/services/optimizationEngine.ts
import { oneInchAPI } from './oneInchAPI';
import { BatchSwapperContractService } from './BatchSwapperContractService'; // NEW import
import {
    TokenBalance,
    AllocationTarget,
    OptimizationResult,
    SwapRoute,
    ExecutionStep,
    SwapInstruction,
    OptimizationConfig,
    OneInchSwapParams,
    Token,
    BatchContractResult, // NEW import
} from '../types';
import { parseUnits, formatUnits, formatEther, calculateGasSavings as calculateGasSavingsUtil, calculatePriceImpact } from '../utils/calculations';
import { Address } from 'viem';

export class OptimizationEngine {
    private readonly config: OptimizationConfig;

    constructor(config: Partial<OptimizationConfig> = {}) {
        this.config = {
            maxSlippage: 1,
            minSwapValueUSD: 1,
            maxPriceImpact: 5,
            ...config
        };
    }

    /**
     * Main optimization function (for SIMULATION and initial planning)
     * This will NOT generate the final contract transaction data.
     * @param currentBalances The user's current token balances.
     * @param targetAllocation The desired target portfolio allocation.
     * @param userAddress The user's wallet address.
     * @param chainId The ID of the blockchain network.
     * @returns An OptimizationResult object with simulated gas savings.
     */
    async optimizePortfolioRebalancing(
        currentBalances: TokenBalance[],
        targetAllocation: AllocationTarget[],
        userAddress: Address,
        chainId: number
    ): Promise<OptimizationResult> {
        try {
            console.log('Starting portfolio optimization (simulation phase)...');

            const swapInstructions = this.calculateRequiredSwaps(currentBalances, targetAllocation);

            if (swapInstructions.length === 0) {
                return {
                    individualSwaps: [],
                    batchSwap: {} as SwapRoute, // Empty placeholder
                    totalGasIndividual: 0n,
                    totalGasBatch: 0n,
                    gasSavings: { absolute: 0n, percentage: 0, savingsUSD: 0 },
                    executionSteps: [],
                    estimatedTime: 0,
                    priceImpact: 0,
                    recommendation: 'individual'
                };
            }

            console.log(`Generated ${swapInstructions.length} swap instructions`);

            // Generate individual swap routes (for comparison)
            const individualRoutes = await this.generateIndividualRoutes(swapInstructions, userAddress, chainId);
            const totalGasIndividual = individualRoutes.reduce((sum, r) => sum + r.gasEstimate, 0n);

            // Generate SIMULATED batch route (no actual tx data yet)
            const batchRoute = this.generateSimulatedBatchRoute(swapInstructions, totalGasIndividual); // Fixed: Pass correct parameter

            // Calculate gas savings based on simulation
            const gasSavings = calculateGasSavingsUtil(totalGasIndividual, batchRoute.gasEstimate);

            // Generate execution steps (conceptual steps for UI)
            const executionSteps = this.generateExecutionSteps(swapInstructions, batchRoute.isBatch || false);

            // Calculate additional metrics
            const estimatedTime = this.calculateEstimatedTime(individualRoutes);
            const priceImpact = this.calculateAveragePriceImpact(individualRoutes);

            const result: OptimizationResult = {
                individualSwaps: individualRoutes,
                batchSwap: batchRoute, // This batchSwap has simulated gas, NO tx data
                totalGasIndividual,
                totalGasBatch: batchRoute.gasEstimate,
                gasSavings: {
                    absolute: gasSavings.absolute,
                    percentage: gasSavings.percentage,
                    savingsUSD: 0, // USD calculation will be done in GasSavingsDisplay
                },
                executionSteps,
                estimatedTime,
                priceImpact,
                recommendation: gasSavings.percentage >= 10 ? 'batch' : 'individual'
            };

            console.log('Optimization simulation completed:', result);
            return result;

        } catch (error) {
            console.error('Optimization failed:', error);
            throw error;
        }
    }

    /**
     * Helper to get Token object from address (fallback for unknown tokens)
     */
    private getTokenFromAddress(address: Address): Token {
        // Return a generic token since POPULAR_TOKENS is now empty (using portfolioService instead)
        return {
            address,
            symbol: address.slice(0, 8) + '...',
            name: `Token ${address.slice(0, 8)}...`,
            decimals: 18, // Default to 18 decimals
        };
    }

    /**
     * Calculate which swaps are needed to reach target allocation
     */
    private calculateRequiredSwaps(
        currentBalances: TokenBalance[],
        targetAllocation: AllocationTarget[]
    ): SwapInstruction[] {
        const totalValue = currentBalances.reduce((sum, balance) => sum + balance.valueUSD, 0);
        const swapInstructions: SwapInstruction[] = [];

        const deficits: Array<{ token: Token; amountUSD: number; priority: number }> = [];
        const surpluses: Array<{ token: Token; amountUSD: number; balance: TokenBalance }> = [];

        targetAllocation.forEach((allocation, index) => {
            const currentBalance = currentBalances.find(b =>
                b.token.address.toLowerCase() === allocation.token.address.toLowerCase()
            );

            const targetValueUSD = totalValue * (allocation.targetPercentage / 100);
            const currentValueUSD = currentBalance?.valueUSD || 0;
            const difference = targetValueUSD - currentValueUSD;

            if (Math.abs(difference) > this.config.minSwapValueUSD) {
                if (difference > 0) {
                    deficits.push({
                        token: allocation.token,
                        amountUSD: difference,
                        priority: index // Use index as priority since AllocationTarget doesn't have priority
                    });
                } else if (currentBalance) {
                    surpluses.push({
                        token: currentBalance.token,
                        amountUSD: Math.abs(difference),
                        balance: currentBalance
                    });
                }
            }
        });

        deficits.sort((a, b) => b.priority - a.priority);
        surpluses.sort((a, b) => b.amountUSD - a.amountUSD);

        for (const deficit of deficits) {
            let remainingDeficitUSD = deficit.amountUSD;

            for (const surplus of surpluses) {
                if (remainingDeficitUSD <= 0 || surplus.amountUSD <= 0) continue;

                const swapAmountUSD = Math.min(remainingDeficitUSD, surplus.amountUSD);

                if (swapAmountUSD > this.config.minSwapValueUSD) {
                    const fromTokenAmountBigInt = this.convertUSDToTokenAmount(swapAmountUSD, surplus.balance);
                    if (fromTokenAmountBigInt > 0n) {
                        swapInstructions.push({
                            fromTokenAddress: surplus.token.address,
                            toTokenAddress: deficit.token.address,
                            amount: fromTokenAmountBigInt,
                            valueUSD: swapAmountUSD,
                            priority: deficit.priority,
                            minAmountOut: 0n // Will be calculated based on slippage during execution
                        });

                        remainingDeficitUSD -= swapAmountUSD;
                        surplus.amountUSD -= swapAmountUSD;
                    }
                }
            }
        }

        return swapInstructions.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    }

    /**
     * Convert USD value to token amount
     */
    private convertUSDToTokenAmount(valueUSD: number, tokenBalance: TokenBalance): bigint {
        if (tokenBalance.valueUSD <= 0 || tokenBalance.balance === 0n) return BigInt(0);

        const ratio = valueUSD / tokenBalance.valueUSD;
        const tokenAmount = Number(tokenBalance.balanceFormatted) * ratio;

        return parseUnits(tokenAmount.toFixed(tokenBalance.token.decimals), tokenBalance.token.decimals);
    }

    /**
     * Generate individual swap routes for comparison (using 1inch /swap API)
     */
    private async generateIndividualRoutes(
        swapInstructions: SwapInstruction[],
        userAddress: Address,
        chainId: number
    ): Promise<SwapRoute[]> {
        const routes: SwapRoute[] = [];

        for (const instruction of swapInstructions) {
            try {
                const fromToken = this.getTokenFromAddress(instruction.fromTokenAddress);
                const toToken = this.getTokenFromAddress(instruction.toTokenAddress);

                const params: OneInchSwapParams = {
                    src: instruction.fromTokenAddress,
                    dst: instruction.toTokenAddress,
                    amount: instruction.amount.toString(),
                    from: userAddress,
                    slippage: this.config.maxSlippage,
                    disableEstimate: false,
                };

                const swapData = await oneInchAPI.getSwap(params, chainId);

                const fromAmountBigInt = instruction.amount;
                const toAmountBigInt = parseUnits(swapData.toTokenAmount, toToken.decimals);

                routes.push({
                    id: `${instruction.fromTokenAddress}-${instruction.toTokenAddress}-${Date.now()}`,
                    fromToken,
                    toToken,
                    fromAmount: fromAmountBigInt,
                    fromAmountFormatted: formatUnits(fromAmountBigInt, fromToken.decimals),
                    toAmount: toAmountBigInt,
                    toAmountFormatted: formatUnits(toAmountBigInt, toToken.decimals),
                    gasEstimate: BigInt(swapData.tx.gas),
                    priceImpact: typeof swapData.priceImpact === 'string' ? parseFloat(swapData.priceImpact) : (swapData.priceImpact || 0),
                    protocols: swapData.protocols.flat().map((p: any) => p.name || 'Unknown'),
                    valueUSD: instruction.valueUSD
                });

            } catch (error) {
                console.warn(`Failed to generate route for ${this.getTokenSymbol(instruction.fromTokenAddress)} -> ${this.getTokenSymbol(instruction.toTokenAddress)}:`, error);
            }
        }

        return routes;
    }

    /**
     * Generate a SIMULATED batch route for display purposes.
     * This does NOT interact with a smart contract for actual transaction data.
     */
    private generateSimulatedBatchRoute(
        swapInstructions: SwapInstruction[],
        totalIndividualGas: bigint
    ): SwapRoute {
        if (swapInstructions.length === 0) {
            return {
                id: 'simulated-empty-batch',
                fromToken: {} as Token, toToken: {} as Token,
                fromAmount: 0n, fromAmountFormatted: '0',
                toAmount: 0n, toAmountFormatted: '0',
                gasEstimate: 0n,
                priceImpact: 0, protocols: [], valueUSD: 0,
                isBatch: true,
            };
        }

        let simulatedOptimizedGas: bigint;
        if (totalIndividualGas > 0n) {
            simulatedOptimizedGas = (totalIndividualGas * 70n) / 100n; // 30% savings
        } else {
            simulatedOptimizedGas = BigInt(200000); // A reasonable minimum gas limit
        }

        simulatedOptimizedGas = simulatedOptimizedGas > 0n ? simulatedOptimizedGas : BigInt(100000);

        const primarySwapInstruction = swapInstructions.reduce((largest, current) =>
            current.valueUSD > largest.valueUSD ? current : largest
        );
        const primaryFromToken = this.getTokenFromAddress(primarySwapInstruction.fromTokenAddress);
        const primaryToToken = this.getTokenFromAddress(primarySwapInstruction.toTokenAddress);

        return {
            id: 'simulated-batch-optimized',
            fromToken: primaryFromToken,
            toToken: primaryToToken,
            fromAmount: primarySwapInstruction.amount,
            fromAmountFormatted: formatUnits(primarySwapInstruction.amount, primaryFromToken.decimals),
            toAmount: 0n,
            toAmountFormatted: '0',
            priceImpact: 0,
            protocols: [],
            gasEstimate: simulatedOptimizedGas, // Fixed: Changed from estimatedGas to gasEstimate
            valueUSD: primarySwapInstruction.valueUSD,
            isBatch: true
        };
    }

    /**
     * NEW METHOD: Builds the actual batch swap transaction data for the custom smart contract.
     * This is called ONLY when the user clicks "Execute".
     * @param swapInstructions The detailed instructions for the swaps.
     * @param userAddress The user's wallet address.
     * @param chainId The ID of the blockchain network.
     * @returns A BatchContractResult containing the transaction object and estimated gas savings.
     */
    async buildContractBatchSwap(
        swapInstructions: SwapInstruction[],
        userAddress: Address,
        chainId: number
    ): Promise<BatchContractResult> {
        // Dynamically import BatchSwapperContractService to avoid circular dependency
        // if BatchSwapperContractService also imports OptimizationEngine.
        // Or ensure BatchSwapperContractService doesn't import OptimizationEngine.
        const { BatchSwapperContractService } = await import('./BatchSwapperContractService');
        const contractService = new BatchSwapperContractService(chainId);

        return await contractService.prepareBatchSwap(
            swapInstructions,
            userAddress,
            this.config // Pass optimization config to contract service
        );
    }

    /**
     * Generate execution steps for UI display
     */
    private generateExecutionSteps(swapInstructions: SwapInstruction[], isBatch: boolean): ExecutionStep[] {
        const steps: ExecutionStep[] = [];
        let stepCounter = 1;

        // Approvals (conceptual, actual approvals will be checked by BatchSwapperContractService)
        const tokensToApprove = new Set<Address>();
        swapInstructions.forEach(inst => {
            // Use a generic native token check (address starting with 0x0000...)
            const isNativeToken = inst.fromTokenAddress.toLowerCase().startsWith('0x0000000000000000000000000000000000000000');
            if (!isNativeToken) { // Check for non-native token
                tokensToApprove.add(inst.fromTokenAddress);
            }
        });

        Array.from(tokensToApprove).forEach((tokenAddress) => {
            steps.push({
                id: `approve-${tokenAddress}`,
                step: stepCounter++,
                type: 'approve',
                action: `Approve ${this.getTokenSymbol(tokenAddress)} for batch swapper`,
                status: 'pending',
            });
        });

        // Main swap step
        if (isBatch) {
            steps.push({
                id: 'execute-batch-swap',
                step: stepCounter++,
                type: 'batch_swap',
                action: `Execute optimized batch swap`,
                status: 'pending',
            });
        } else {
            swapInstructions.forEach((instruction) => {
                steps.push({
                    id: `execute-swap-${instruction.fromTokenAddress}-${instruction.toTokenAddress}`,
                    step: stepCounter++,
                    type: 'swap',
                    action: `Swap ${this.formatValueUSD(instruction.valueUSD)} from ${this.getTokenSymbol(instruction.fromTokenAddress)} to ${this.getTokenSymbol(instruction.toTokenAddress)}`,
                    status: 'pending',
                });
            });
        }
        return steps;
    }

    /**
     * Calculate estimated execution time
     */
    private calculateEstimatedTime(routes: SwapRoute[]): number {
        const transactionCount = routes.length > 0 ? (routes[0].isBatch ? 1 : routes.length) : 0;
        const approvalCount = new Set(routes.map(r => r.fromToken.address).filter(addr =>
            !addr.toLowerCase().startsWith('0x0000000000000000000000000000000000000000')
        )).size;

        const avgTimePerTx = 20; // seconds

        return (transactionCount + approvalCount) * avgTimePerTx;
    }

    /**
     * Calculate average price impact across routes
     */
    private calculateAveragePriceImpact(routes: SwapRoute[]): number {
        if (routes.length === 0) return 0;

        const totalImpact = routes.reduce((sum, route) => {
            return sum + route.priceImpact;
        }, 0);

        return totalImpact / routes.length;
    }

    // Helper methods
    private formatValueUSD(value: number): string {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    }

    private getTokenSymbol(address: Address): string {
        // Return shortened address since POPULAR_TOKENS is now empty (using portfolioService instead)
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }
}

// Export singleton instance
export const optimizationEngine = new OptimizationEngine();