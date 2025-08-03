import { useQuery, useMutation } from '@tanstack/react-query';
import { Address } from 'viem';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { oneInchAPI } from '../services/oneInchAPI';
import {
    SwapRoute,
    OneInchQuoteParams,
    OneInchSwapParams,
    OneInchApproveAPIResponse,
    OneInchSwapAPIResponse,
    Token,
    SwapInstruction,
    OptimizationConfig
} from '../types';
import { formatUnits, parseUnits } from '../utils/calculations';
import { portfolioService } from '../services/portfolioService';

// Internal types for this hook's parameters (align with 1inch API but use Address)
interface SwapQuoteParamsInternal {
    fromTokenAddress: Address;
    toTokenAddress: Address;
    amount: string; // Amount as string for 1inch API
    slippage?: number;
    gasPrice?: string; // 'slow' | 'standard' | 'fast' | 'instant'
    protocols?: string;
    fee?: number;
    gasLimit?: number; // Not directly used in 1inch quote params, but useful for build
    connectorTokens?: string;
    complexityLevel?: number;
    mainRouteParts?: number;
    parts?: number;
}

interface UseSwapRoutesOptions {
    chainId?: number;
    enabled?: boolean;
    autoRefresh?: boolean;
    refreshInterval?: number;
}

// Helper to get Token object from address (using portfolio service or fallback)
const getTokenFromAddress = async (address: Address, chainId: number): Promise<Token> => {
    try {
        // Try to get token from portfolio service
        const tokens = await portfolioService.getAllSupportedTokens(chainId);
        const tokenData = Object.values(tokens).find(
            (token) => token.address?.toLowerCase() === address.toLowerCase()
        );

        if (tokenData) {
            return {
                address,
                symbol: tokenData.symbol || 'UNKNOWN',
                name: tokenData.name || 'Unknown Token',
                decimals: tokenData.decimals || 18,
                logoURI: tokenData.logoURI,
            };
        }
    } catch (error) {
        console.warn('Failed to fetch token from portfolio service:', error);
    }

    // Fallback to a generic token if not found
    return {
        address,
        symbol: address.slice(0, 6) + '...',
        name: `Unknown Token (${address.slice(0, 6)}...)`,
        decimals: 18, // Default to 18 decimals if unknown
    };
};

// 1inch Swap API service (refactored to call oneInchAPI)
const fetchSwapQuoteData = async (
    params: SwapQuoteParamsInternal,
    chainId: number
): Promise<SwapRoute> => {
    const quoteParams: OneInchQuoteParams = {
        src: params.fromTokenAddress,
        dst: params.toTokenAddress,
        amount: params.amount,
        // Map other params if 1inch quote API supports them
    };

    const data = await oneInchAPI.getQuote(quoteParams, chainId);

    const fromToken = await getTokenFromAddress(data.fromToken.address as Address, chainId);
    const toToken = await getTokenFromAddress(data.toToken.address as Address, chainId);

    const fromAmountBigInt = parseUnits(params.amount, fromToken.decimals);
    const toAmountBigInt = parseUnits(data.toTokenAmount, toToken.decimals);

    return {
        id: `${fromToken.symbol}-${toToken.symbol}-${Date.now()}`,
        fromToken,
        toToken,
        fromAmount: fromAmountBigInt,
        fromAmountFormatted: formatUnits(fromAmountBigInt, fromToken.decimals),
        toAmount: toAmountBigInt,
        toAmountFormatted: formatUnits(toAmountBigInt, toToken.decimals),
        gasEstimate: BigInt(data.estimatedGas || 0),
        priceImpact: parseFloat(String(data.priceImpact || 0)), // Convert to string then number
        protocols: data.protocols.flat().map((p: any) => p.name).filter(Boolean), // Convert to string array
        valueUSD: 0 // Will be calculated by optimization engine
    };
};

// Build swap transaction (refactored to call oneInchAPI)
const buildSwapTransactionData = async (
    params: SwapQuoteParamsInternal & { fromAddress: Address },
    chainId: number
): Promise<SwapRoute['tx']> => { // Return only the tx part
    const swapParams: OneInchSwapParams = {
        src: params.fromTokenAddress,
        dst: params.toTokenAddress,
        amount: params.amount,
        from: params.fromAddress,
        slippage: params.slippage || 1,
        protocols: params.protocols,
        // Remove gasPrice as it's not part of OneInchSwapParams
    };

    const data: OneInchSwapAPIResponse = await oneInchAPI.getSwap(swapParams, chainId);

    return {
        to: data.tx.to as Address,
        data: data.tx.data as `0x${string}`,
        value: BigInt(data.tx.value),
        gas: BigInt(data.tx.gas),
        gasPrice: BigInt(data.tx.gasPrice),
    };
};

// Check token allowance (refactored to call oneInchAPI)
const checkAllowanceData = async (
    tokenAddress: Address,
    ownerAddress: Address,
    chainId: number
): Promise<bigint> => {
    const spenderData = await oneInchAPI.getSpender(chainId);
    const allowanceData = await oneInchAPI.getAllowance(tokenAddress, ownerAddress, spenderData.address, chainId);
    return BigInt(allowanceData.allowance || '0');
};

// Get approval transaction (refactored to call oneInchAPI)
const getApprovalTransactionData = async (
    tokenAddress: Address,
    chainId: number,
    amount?: string
): Promise<SwapRoute['tx']> => { // Return only tx part
    const data: OneInchApproveAPIResponse = await oneInchAPI.getApproveTransaction(tokenAddress, chainId, amount);

    return {
        to: data.to as Address,
        data: data.data as `0x${string}`,
        value: BigInt(data.value || '0'),
        // Use a default gas limit since API doesn't provide gas
        gas: BigInt('50000'), // Default gas limit for approval transactions
        gasPrice: BigInt(data.gasPrice || '0'),
    };
};

// Main hook for single swap quotes
export const useSwapRoute = (
    params: SwapQuoteParamsInternal | null,
    options: UseSwapRoutesOptions = {}
) => {
    const {
        chainId = 1,
        enabled = true,
        autoRefresh = false,
        refreshInterval = 30_000,
    } = options;

    const queryResult = useQuery({
        queryKey: ['swapRoute', params, chainId],
        queryFn: () => fetchSwapQuoteData(params!, chainId),
        enabled: enabled && !!params,
        staleTime: autoRefresh ? 15_000 : 60_000,
        refetchInterval: autoRefresh ? refreshInterval : false,
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    });

    return {
        route: queryResult.data,
        isLoading: queryResult.isLoading,
        isError: queryResult.isError,
        error: queryResult.error,
        refetch: queryResult.refetch,
        isFetching: queryResult.isFetching,
    };
};

// Hook for multiple swap routes (for batch comparison)
export const useMultipleSwapRoutes = (
    swapParams: SwapQuoteParamsInternal[],
    options: UseSwapRoutesOptions = {}
) => {
    const {
        chainId = 1,
        enabled = true,
        autoRefresh = false,
        refreshInterval = 30_000,
    } = options;

    const queryResult = useQuery({
        queryKey: ['multipleSwapRoutes', swapParams, chainId],
        queryFn: async () => {
            const routes = await Promise.allSettled(
                swapParams.map(params => fetchSwapQuoteData(params, chainId))
            );

            return routes.map((result, index) => ({
                params: swapParams[index],
                route: result.status === 'fulfilled' ? result.value : null,
                error: result.status === 'rejected' ? result.reason : null,
            }));
        },
        enabled: enabled && swapParams.length > 0,
        staleTime: autoRefresh ? 15_000 : 60_000,
        refetchInterval: autoRefresh ? refreshInterval : false,
        retry: 1,
    });

    // Calculate total gas and costs
    const totalEstimation = queryResult.data?.reduce(
        (acc, item) => {
            if (item.route) {
                acc.totalGas = acc.totalGas + item.route.gasEstimate;
                acc.totalPriceImpact = Math.max(acc.totalPriceImpact, item.route.priceImpact);
            }
            return acc;
        },
        { totalGas: 0n, totalPriceImpact: 0 } // Initialize totalGas as BigInt
    );

    return {
        routes: queryResult.data || [],
        totalEstimation: { // Map BigInt to string for direct usage outside if needed
            totalGas: totalEstimation?.totalGas.toString() || '0',
            totalPriceImpact: totalEstimation?.totalPriceImpact || 0
        },
        isLoading: queryResult.isLoading,
        isError: queryResult.isError,
        error: queryResult.error,
        refetch: queryResult.refetch,
    };
};

// Hook for token allowance checking
export const useTokenAllowance = (
    tokenAddress: Address | null,
    options: UseSwapRoutesOptions = {}
) => {
    const { address } = useAccount();
    const { chainId = 1, enabled = true } = options;

    const queryResult = useQuery({
        queryKey: ['tokenAllowance', tokenAddress, address, chainId],
        queryFn: () => checkAllowanceData(tokenAddress!, address!, chainId),
        enabled: enabled && !!tokenAddress && !!address,
        staleTime: 30_000,
        retry: 2,
    });

    const hasInsufficientAllowance = (requiredAmount: bigint): boolean => {
        if (!queryResult.data) return true;
        return queryResult.data < requiredAmount;
    };

    return {
        allowance: queryResult.data || 0n,
        hasInsufficientAllowance,
        isLoading: queryResult.isLoading,
        isError: queryResult.isError,
        error: queryResult.error,
        refetch: queryResult.refetch,
    };
};

// Hook for executing swaps
export const useExecuteSwap = () => {
    const { address } = useAccount();
    const { data: walletClient } = useWalletClient();
    const publicClient = usePublicClient();

    const approvalMutation = useMutation({
        mutationFn: async ({
            tokenAddress,
            amount,
            chainId = 1,
        }: {
            tokenAddress: Address;
            amount?: string;
            chainId?: number;
        }) => {
            if (!walletClient || !address) {
                throw new Error('Wallet not connected');
            }

            const approvalTx = await getApprovalTransactionData(tokenAddress, chainId, amount);

            if (!approvalTx) {
                throw new Error('Failed to get approval transaction data');
            }

            const hash = await walletClient.sendTransaction({
                account: address,
                to: approvalTx.to,
                data: approvalTx.data,
                value: approvalTx.value,
                gas: approvalTx.gas,
                gasPrice: approvalTx.gasPrice,
            });

            // Wait for confirmation
            if (publicClient) {
                await publicClient.waitForTransactionReceipt({ hash });
            }

            return hash;
        },
    });

    const swapMutation = useMutation({
        mutationFn: async ({
            params,
            chainId = 1,
        }: {
            params: SwapQuoteParamsInternal;
            chainId?: number;
        }) => {
            if (!walletClient || !address) {
                throw new Error('Wallet not connected');
            }

            const swapTx = await buildSwapTransactionData(
                { ...params, fromAddress: address },
                chainId
            );

            if (!swapTx) {
                throw new Error('Failed to get swap transaction data');
            }

            const hash = await walletClient.sendTransaction({
                account: address,
                to: swapTx.to,
                data: swapTx.data,
                value: swapTx.value,
                gas: swapTx.gas,
                gasPrice: swapTx.gasPrice,
            });

            // Wait for confirmation
            if (publicClient) {
                await publicClient.waitForTransactionReceipt({ hash });
            }

            return hash;
        },
    });

    return {
        approveToken: approvalMutation.mutateAsync,
        executeSwap: swapMutation.mutateAsync,
        isApproving: approvalMutation.isPending,
        isSwapping: swapMutation.isPending,
        approvalError: approvalMutation.error,
        swapError: swapMutation.error,
    };
};

// Hook for batch swap optimization (remains mostly simulation-based as per your original plan)
export const useBatchSwapOptimization = (
    individualSwapInstructions: SwapInstruction[],
    optimizationConfig: OptimizationConfig,
    userAddress: Address,
    options: UseSwapRoutesOptions = {}
) => {
    const { chainId = 1, enabled = true } = options;

    const individualQuoteParams: SwapQuoteParamsInternal[] = individualSwapInstructions.map(instr => ({
        fromTokenAddress: instr.fromTokenAddress,
        toTokenAddress: instr.toTokenAddress,
        amount: instr.amount.toString(),
        slippage: optimizationConfig.maxSlippage,
    }));

    const { routes: individualRoutes, isLoading: loadingIndividual } = useMultipleSwapRoutes(
        individualQuoteParams,
        { ...options, enabled }
    );

    const batchOptimization = useQuery({
        queryKey: ['batchSwapOptimization', individualSwapInstructions, chainId],
        queryFn: async () => {
            const validRoutes = individualRoutes.filter(r => r.route && !r.error).map(r => r.route!);
            if (validRoutes.length === 0) return null;

            const totalGasIndividual = validRoutes.reduce(
                (sum, r) => sum + r.gasEstimate,
                0n
            );

            // Simulate batch execution based on the largest individual swap for gas estimation
            const largestSwapRoute = validRoutes.reduce((largest, current) =>
                (current.valueUSD || 0) > (largest.valueUSD || 0) ? current : largest
            );
            const simulatedBatchGas = BigInt(Math.floor(Number(largestSwapRoute.gasEstimate) * 0.65));

            const gasSaved = totalGasIndividual - simulatedBatchGas;
            const savingsPercentage = totalGasIndividual > 0n ? Number(gasSaved * 10000n / totalGasIndividual) / 100 : 0;

            return {
                canOptimize: validRoutes.length > 1,
                individualGas: totalGasIndividual.toString(),
                batchGas: simulatedBatchGas.toString(),
                gasSaved: gasSaved.toString(),
                savingsPercentage,
                recommendedAction: savingsPercentage > 10 ? 'batch' : 'individual',
                routes: validRoutes,
            };
        },
        enabled: enabled && individualRoutes.length > 0 && !loadingIndividual,
        staleTime: 60_000,
    });

    return {
        optimization: batchOptimization.data,
        individualRoutes,
        isLoading: loadingIndividual || batchOptimization.isLoading,
        isError: batchOptimization.isError,
        error: batchOptimization.error,
        refetch: batchOptimization.refetch,
    };
};