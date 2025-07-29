import { useQuery } from '@tanstack/react-query';
import { Address } from 'viem';

// Types
interface GasPrice {
    slow: string;
    standard: string;
    fast: string;
    instant: string;
    baseFee?: string;
    maxPriorityFee?: string;
}

interface GasEstimation {
    gasLimit: string;
    gasPrice: GasPrice;
    totalCost: {
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

interface SwapGasEstimate {
    individual: GasEstimation;
    batch: GasEstimation;
    savings: {
        gas: string;
        percentage: string;
        usd: string;
    };
}

interface UseGasEstimationOptions {
    chainId?: number;
    enabled?: boolean;
    refetchInterval?: number;
}

interface SwapParams {
    fromToken: Address;
    toToken: Address;
    amount: string;
    fromAddress: Address;
    slippage: number;
}

// 1inch Gas Price API service
const fetchGasPrice = async (chainId: number = 1): Promise<GasPrice> => {
    const baseUrl = 'https://api.1inch.dev/gas-price/v1.4';

    const response = await fetch(`${baseUrl}/${chainId}`, {
        headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_1INCH_API_KEY}`,
            'Accept': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch gas prices: ${response.statusText}`);
    }

    const data = await response.json();

    return {
        slow: data.slow || data.safeLow || '20000000000',
        standard: data.standard || data.average || '25000000000',
        fast: data.fast || '30000000000',
        instant: data.instant || data.fastest || '35000000000',
        baseFee: data.baseFee,
        maxPriorityFee: data.maxPriorityFee,
    };
};

// Estimate gas for a single swap
const estimateSwapGas = async (
    swapParams: SwapParams,
    chainId: number = 1
): Promise<string> => {
    const baseUrl = 'https://api.1inch.dev/swap/v6.0';

    const params = new URLSearchParams({
        src: swapParams.fromToken,
        dst: swapParams.toToken,
        amount: swapParams.amount,
        from: swapParams.fromAddress,
        slippage: swapParams.slippage.toString(),
        gasPrice: 'fast', // Use fast gas price for estimation
        estimateGas: 'true',
    });

    const response = await fetch(`${baseUrl}/${chainId}/swap?${params}`, {
        headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_1INCH_API_KEY}`,
            'Accept': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to estimate swap gas: ${response.statusText}`);
    }

    const data = await response.json();
    return data.tx?.gas || '200000'; // Default fallback
};

// Calculate total cost in different units
const calculateGasCosts = (
    gasLimit: string,
    gasPrice: GasPrice,
    ethPriceUSD: number = 3000
) => {
    const limit = BigInt(gasLimit);

    const costs = {
        slow: (limit * BigInt(gasPrice.slow)).toString(),
        standard: (limit * BigInt(gasPrice.standard)).toString(),
        fast: (limit * BigInt(gasPrice.fast)).toString(),
        instant: (limit * BigInt(gasPrice.instant)).toString(),
    };

    const costsUSD = {
        slow: ((Number(costs.slow) / 1e18) * ethPriceUSD).toFixed(4),
        standard: ((Number(costs.standard) / 1e18) * ethPriceUSD).toFixed(4),
        fast: ((Number(costs.fast) / 1e18) * ethPriceUSD).toFixed(4),
        instant: ((Number(costs.instant) / 1e18) * ethPriceUSD).toFixed(4),
    };

    return { costs, costsUSD };
};

// Hook for current gas prices
export const useGasPrice = (options: UseGasEstimationOptions = {}) => {
    const {
        chainId = 1,
        enabled = true,
        refetchInterval = 15_000, // 15 seconds
    } = options;

    const queryResult = useQuery({
        queryKey: ['gasPrice', chainId],
        queryFn: () => fetchGasPrice(chainId),
        enabled,
        staleTime: 10_000, // 10 seconds
        refetchInterval,
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    });

    return {
        gasPrice: queryResult.data,
        isLoading: queryResult.isLoading,
        isError: queryResult.isError,
        error: queryResult.error,
        refetch: queryResult.refetch,
    };
};

// Hook for swap gas estimation
export const useSwapGasEstimation = (
    swapParams: SwapParams | null,
    options: UseGasEstimationOptions = {}
) => {
    const { chainId = 1, enabled = true } = options;
    const { gasPrice } = useGasPrice({ chainId });

    const queryResult = useQuery({
        queryKey: ['swapGasEstimation', swapParams, chainId],
        queryFn: async (): Promise<GasEstimation> => {
            if (!swapParams || !gasPrice) {
                throw new Error('Missing swap parameters or gas price');
            }

            const gasLimit = await estimateSwapGas(swapParams, chainId);
            const { costs, costsUSD } = calculateGasCosts(gasLimit, gasPrice);

            return {
                gasLimit,
                gasPrice,
                totalCost: costs,
                totalCostUSD: costsUSD,
                estimatedTime: {
                    slow: '5-10 min',
                    standard: '2-5 min',
                    fast: '1-2 min',
                    instant: '< 1 min',
                },
            };
        },
        enabled: enabled && !!swapParams && !!gasPrice,
        staleTime: 30_000, // 30 seconds
        retry: 2,
    });

    return {
        estimation: queryResult.data,
        isLoading: queryResult.isLoading,
        isError: queryResult.isError,
        error: queryResult.error,
        refetch: queryResult.refetch,
    };
};

// Hook for batch vs individual swap comparison
export const useBatchSwapGasComparison = (
    individualSwaps: SwapParams[],
    batchSwapParams: SwapParams | null,
    options: UseGasEstimationOptions = {}
) => {
    const { chainId = 1, enabled = true } = options;
    const { gasPrice } = useGasPrice({ chainId });

    const queryResult = useQuery({
        queryKey: ['batchSwapGasComparison', individualSwaps, batchSwapParams, chainId],
        queryFn: async (): Promise<SwapGasEstimate> => {
            if (!gasPrice || !batchSwapParams || individualSwaps.length === 0) {
                throw new Error('Missing required parameters');
            }

            // Estimate gas for individual swaps
            const individualGasEstimates = await Promise.all(
                individualSwaps.map(swap => estimateSwapGas(swap, chainId))
            );

            const totalIndividualGas = individualGasEstimates
                .reduce((sum, gas) => sum + BigInt(gas), BigInt(0))
                .toString();

            // Estimate gas for batch swap
            const batchGas = await estimateSwapGas(batchSwapParams, chainId);

            // Calculate costs for both approaches
            const individualCosts = calculateGasCosts(totalIndividualGas, gasPrice);
            const batchCosts = calculateGasCosts(batchGas, gasPrice);

            // Calculate savings
            const gasSavings = BigInt(totalIndividualGas) - BigInt(batchGas);
            const savingsPercentage = Number(gasSavings * BigInt(10000) / BigInt(totalIndividualGas)) / 100;
            const usdSavings = (
                parseFloat(individualCosts.costsUSD.standard) -
                parseFloat(batchCosts.costsUSD.standard)
            ).toFixed(4);

            return {
                individual: {
                    gasLimit: totalIndividualGas,
                    gasPrice,
                    totalCost: individualCosts.costs,
                    totalCostUSD: individualCosts.costsUSD,
                    estimatedTime: {
                        slow: `${individualSwaps.length * 5}-${individualSwaps.length * 10} min`,
                        standard: `${individualSwaps.length * 2}-${individualSwaps.length * 5} min`,
                        fast: `${individualSwaps.length * 1}-${individualSwaps.length * 2} min`,
                        instant: `< ${individualSwaps.length} min`,
                    },
                },
                batch: {
                    gasLimit: batchGas,
                    gasPrice,
                    totalCost: batchCosts.costs,
                    totalCostUSD: batchCosts.costsUSD,
                    estimatedTime: {
                        slow: '5-10 min',
                        standard: '2-5 min',
                        fast: '1-2 min',
                        instant: '< 1 min',
                    },
                },
                savings: {
                    gas: gasSavings.toString(),
                    percentage: savingsPercentage.toFixed(2),
                    usd: usdSavings,
                },
            };
        },
        enabled: enabled && !!gasPrice && !!batchSwapParams && individualSwaps.length > 0,
        staleTime: 30_000, // 30 seconds
        retry: 2,
    });

    return {
        comparison: queryResult.data,
        isLoading: queryResult.isLoading,
        isError: queryResult.isError,
        error: queryResult.error,
        refetch: queryResult.refetch,
    };
};

// Utility hook for gas optimization recommendations
export const useGasOptimizationTips = () => {
    const { gasPrice } = useGasPrice();

    const getOptimizationTips = () => {
        if (!gasPrice) return [];

        const tips = [];
        const standardGwei = Number(gasPrice.standard) / 1e9;

        if (standardGwei > 50) {
            tips.push({
                type: 'high-gas',
                message: 'Gas prices are high. Consider waiting or using slow gas price.',
                severity: 'warning',
            });
        }

        if (standardGwei < 20) {
            tips.push({
                type: 'low-gas',
                message: 'Gas prices are low. Good time for transactions!',
                severity: 'success',
            });
        }

        tips.push({
            type: 'batch',
            message: 'Consider batching multiple swaps to save gas.',
            severity: 'info',
        });

        return tips;
    };

    return {
        tips: getOptimizationTips(),
        currentGasLevel: gasPrice ? (Number(gasPrice.standard) / 1e9 > 50 ? 'high' : 'normal') : 'unknown',
    };
};