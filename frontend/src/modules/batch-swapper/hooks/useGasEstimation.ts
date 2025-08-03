import { useQuery } from '@tanstack/react-query';
import { Address } from 'viem';
import { oneInchAPI } from '../services/oneInchAPI'; // Import centralized API service
import { GasPrice, OneInchGasPriceAPIResponse } from '../types'; //
import { parseUnits, formatEther } from '../utils/calculations'; //

// Local types for this hook, derived from external ones
interface SwapParamsForGasEstimation { // Rename to avoid conflict with global SwapQuoteParams
    fromTokenAddress: Address;
    toTokenAddress: Address;
    amount: string; // Amount as string for 1inch API call
    fromAddress: Address;
    slippage: number;
}

interface GasEstimationDetails {
    gasLimit: bigint; // Changed to bigint
    gasLimitFormatted: string; // Human-readable
    gasPrice: GasPrice;
    totalCostETH: { // Changed to ETH from 'totalCost' for clarity
        slow: string;
        standard: string;
        fast: string;
        instant: string;
    };
    totalCostUSD: {
        slow: string;
        standard: string;
        fast: string;
        instant: string;
    };
    estimatedTime: {
        slow: string;
        standard: string;
        fast: string;
        instant: string;
    };
}

interface SwapGasEstimateComparison {
    individual: GasEstimationDetails;
    batch: GasEstimationDetails;
    savings: {
        gas: bigint; // Changed to bigint
        percentage: number; // Changed to number
        usd: number; // Changed to number
    };
}

interface UseGasEstimationOptions {
    chainId?: number;
    enabled?: boolean;
    refetchInterval?: number;
}

// 1inch Gas Price API service (now calls oneInchAPI)
const fetchGasPriceData = async (chainId: number): Promise<GasPrice> => {
    const data: OneInchGasPriceAPIResponse = await oneInchAPI.getGasPrice(chainId); // Fixed: Added chainId parameter

    // Convert string gas prices to BigInt
    const standardGwei = Number(data.standard) / 1e9; // For currentGasPriceGwei

    return {
        slow: BigInt(data.slow), //
        standard: BigInt(data.standard), //
        fast: BigInt(data.fast), //
        instant: BigInt(data.instant), //
        currentGasPriceGwei: Number(data.standard) / 1e9, //
        estimatedTime: {
            slow: 300,
            standard: 180,
            fast: 60
        }
    };
};

// Estimate gas for a single swap (now calls oneInchAPI)
const estimateSwapGasLimit = async (
    swapParams: SwapParamsForGasEstimation,
    chainId: number
): Promise<bigint> => {
    try {
        const data = await oneInchAPI.getSwap({ // Using getSwap with disableEstimate true for gas limit
            src: swapParams.fromTokenAddress,
            dst: swapParams.toTokenAddress,
            amount: swapParams.amount,
            from: swapParams.fromAddress,
            slippage: swapParams.slippage,
            disableEstimate: false, // Request 1inch to provide gas estimate directly
        }, chainId); // Fixed: Added chainId parameter
        return BigInt(data.tx.gas); // Return gas as BigInt
    } catch (error) {
        console.error(`Failed to estimate swap gas for ${swapParams.fromTokenAddress} -> ${swapParams.toTokenAddress}:`, error); //
        throw new Error(`Failed to estimate swap gas: ${error instanceof Error ? error.message : 'Unknown error'}`); //
    }
};

// Calculate total cost in different units
const calculateGasCosts = (
    gasLimit: bigint, // Changed to bigint
    gasPrice: GasPrice,
    ethPriceUSD: number = 3000 // Assuming ETH price for USD conversion
) => {
    const calculateCost = (limit: bigint, price: bigint) => limit * price; //

    const costsETH = { //
        slow: formatEther(calculateCost(gasLimit, gasPrice.slow)), //
        standard: formatEther(calculateCost(gasLimit, gasPrice.standard)), //
        fast: formatEther(calculateCost(gasLimit, gasPrice.fast)), //
        instant: formatEther(calculateCost(gasLimit, gasPrice.instant)), //
    };

    const costsUSD = { //
        slow: (parseFloat(costsETH.slow) * ethPriceUSD).toFixed(4), //
        standard: (parseFloat(costsETH.standard) * ethPriceUSD).toFixed(4), //
        fast: (parseFloat(costsETH.fast) * ethPriceUSD).toFixed(4), //
        instant: (parseFloat(costsETH.instant) * ethPriceUSD).toFixed(4), //
    };

    return { costsETH, costsUSD }; //
};

// Hook for current gas prices
export const useGasPrice = (options: UseGasEstimationOptions = {}) => { //
    const {
        chainId = 1,
        enabled = true,
        refetchInterval = 15_000, // 15 seconds
    } = options;

    const queryResult = useQuery({
        queryKey: ['gasPrice', chainId], //
        queryFn: () => fetchGasPriceData(chainId), //
        enabled, //
        staleTime: 10_000, // 10 seconds
        refetchInterval, //
        retry: 3, //
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), //
    });

    return {
        gasPrice: queryResult.data, //
        isLoading: queryResult.isLoading, //
        isError: queryResult.isError, //
        error: queryResult.error, //
        refetch: queryResult.refetch, //
    };
};

// Hook for swap gas estimation
export const useSwapGasEstimation = (
    swapParams: SwapParamsForGasEstimation | null,
    options: UseGasEstimationOptions = {}
) => {
    const { chainId = 1, enabled = true } = options;
    const { gasPrice } = useGasPrice({ chainId }); //

    const queryResult = useQuery({
        queryKey: ['swapGasEstimation', swapParams, chainId], //
        queryFn: async (): Promise<GasEstimationDetails> => { //
            if (!swapParams || !gasPrice) { //
                throw new Error('Missing swap parameters or gas price'); //
            }

            const gasLimit = await estimateSwapGasLimit(swapParams, chainId); //
            const { costsETH, costsUSD } = calculateGasCosts(gasLimit, gasPrice); //

            return {
                gasLimit, //
                gasLimitFormatted: gasLimit.toString(), // Simplified for now
                gasPrice, //
                totalCostETH: costsETH, //
                totalCostUSD: costsUSD, //
                estimatedTime: { //
                    slow: '5-10 min', //
                    standard: '2-5 min', //
                    fast: '1-2 min', //
                    instant: '< 1 min', //
                },
            };
        },
        enabled: enabled && !!swapParams && !!gasPrice, //
        staleTime: 30_000, // 30 seconds
        retry: 2, //
    });

    return {
        estimation: queryResult.data, //
        isLoading: queryResult.isLoading, //
        isError: queryResult.isError, //
        error: queryResult.error, //
        refetch: queryResult.refetch, //
    };
};

// Hook for batch vs individual swap comparison
export const useBatchSwapGasComparison = (
    individualSwapParams: SwapParamsForGasEstimation[], // Changed type
    batchSwapParams: SwapParamsForGasEstimation | null, // Changed type
    options: UseGasEstimationOptions = {}
) => {
    const { chainId = 1, enabled = true } = options;
    const { gasPrice } = useGasPrice({ chainId }); //

    const queryResult = useQuery({
        queryKey: ['batchSwapGasComparison', individualSwapParams, batchSwapParams, chainId], //
        queryFn: async (): Promise<SwapGasEstimateComparison> => { //
            if (!gasPrice || !batchSwapParams || individualSwapParams.length === 0) { //
                throw new Error('Missing required parameters for gas comparison'); //
            }

            // Estimate gas for individual swaps
            const individualGasEstimates = await Promise.all( //
                individualSwapParams.map(swap => estimateSwapGasLimit(swap, chainId)) //
            );

            const totalIndividualGas = individualGasEstimates //
                .reduce((sum, gas) => sum + gas, BigInt(0)); //

            // Estimate gas for batch swap
            const batchGas = await estimateSwapGasLimit(batchSwapParams, chainId); //

            // Calculate costs for both approaches
            const individualCosts = calculateGasCosts(totalIndividualGas, gasPrice); //
            const batchCosts = calculateGasCosts(batchGas, gasPrice); //

            // Calculate savings
            const gasSavingsAbsolute = totalIndividualGas - batchGas; //
            const savingsPercentage = totalIndividualGas > 0n ? Number(gasSavingsAbsolute * 10000n / totalIndividualGas) / 100 : 0; //
            const usdSavings = ( //
                parseFloat(individualCosts.costsUSD.standard) - //
                parseFloat(batchCosts.costsUSD.standard) //
            );

            return { //
                individual: { //
                    gasLimit: totalIndividualGas, //
                    gasLimitFormatted: totalIndividualGas.toString(), //
                    gasPrice, //
                    totalCostETH: individualCosts.costsETH, //
                    totalCostUSD: individualCosts.costsUSD, //
                    estimatedTime: { //
                        slow: `${individualSwapParams.length * 5}-${individualSwapParams.length * 10} min`, //
                        standard: `${individualSwapParams.length * 2}-${individualSwapParams.length * 5} min`, //
                        fast: `${individualSwapParams.length * 1}-${individualSwapParams.length * 2} min`, //
                        instant: `< ${individualSwapParams.length} min`, //
                    },
                },
                batch: { //
                    gasLimit: batchGas, //
                    gasLimitFormatted: batchGas.toString(), //
                    gasPrice, //
                    totalCostETH: batchCosts.costsETH, //
                    totalCostUSD: batchCosts.costsUSD, //
                    estimatedTime: { //
                        slow: '5-10 min', //
                        standard: '2-5 min', //
                        fast: '1-2 min', //
                        instant: '< 1 min', //
                    },
                },
                savings: { //
                    gas: gasSavingsAbsolute, //
                    percentage: parseFloat(savingsPercentage.toFixed(2)), //
                    usd: parseFloat(usdSavings.toFixed(4)), //
                },
            };
        },
        enabled: enabled && !!gasPrice && !!batchSwapParams && individualSwapParams.length > 0, //
        staleTime: 30_000, // 30 seconds
        retry: 2, //
    });

    return {
        comparison: queryResult.data, //
        isLoading: queryResult.isLoading, //
        isError: queryResult.isError, //
        error: queryResult.error, //
        refetch: queryResult.refetch, //
    };
};

// Utility hook for gas optimization recommendations
export const useGasOptimizationTips = () => { //
    const { gasPrice } = useGasPrice(); //

    const getOptimizationTips = () => { //
        if (!gasPrice) return []; //

        const tips = []; //
        const standardGwei = gasPrice.currentGasPriceGwei; //

        if (standardGwei > 50) { //
            tips.push({ //
                type: 'high-gas', //
                message: 'Gas prices are high. Consider waiting or using slow gas price.', //
                severity: 'warning', //
            });
        }

        if (standardGwei < 20) { //
            tips.push({ //
                type: 'low-gas', //
                message: 'Gas prices are low. Good time for transactions!', //
                severity: 'success', //
            });
        }

        tips.push({ //
            type: 'batch', //
            message: 'Consider batching multiple swaps to save gas.', //
            severity: 'info', //
        });

        return tips; //
    };

    return {
        tips: getOptimizationTips(), //
        currentGasLevel: gasPrice ? (gasPrice.currentGasPriceGwei > 50 ? 'high' : 'normal') : 'unknown', //
    };
};