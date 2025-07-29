import { useQuery, useMutation } from '@tanstack/react-query';
import { Address } from 'viem';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';

// Types
interface SwapRoute {
    fromToken: {
        address: Address;
        symbol: string;
        decimals: number;
        amount: string;
    };
    toToken: {
        address: Address;
        symbol: string;
        decimals: number;
        amount: string;
    };
    protocols: Protocol[];
    estimatedGas: string;
    estimatedGasUSD: string;
    priceImpact: string;
    slippage: string;
    route: RouteStep[];
}

interface Protocol {
    name: string;
    part: number;
    fromTokenAddress: Address;
    toTokenAddress: Address;
}

interface RouteStep {
    name: string;
    part: number;
    fromTokenAddress: Address;
    toTokenAddress: Address;
    toTokenAmount: string;
}

interface SwapTransaction {
    to: Address;
    data: string;
    value: string;
    gas: string;
    gasPrice: string;
}

interface SwapQuoteParams {
    fromTokenAddress: Address;
    toTokenAddress: Address;
    amount: string;
    slippage?: number;
    gasPrice?: 'slow' | 'standard' | 'fast' | 'instant';
    protocols?: string;
    fee?: number;
    gasLimit?: number;
    connectorTokens?: string;
    complexityLevel?: number;
    mainRouteParts?: number;
    parts?: number;
}

interface BatchSwapParams {
    swaps: SwapQuoteParams[];
    gasPrice?: 'slow' | 'standard' | 'fast' | 'instant';
    slippage?: number;
}

interface UseSwapRoutesOptions {
    chainId?: number;
    enabled?: boolean;
    autoRefresh?: boolean;
    refreshInterval?: number;
}

// 1inch Swap API service
const fetchSwapQuote = async (
    params: SwapQuoteParams,
    chainId: number = 1
): Promise<SwapRoute> => {
    const baseUrl = 'https://api.1inch.dev/swap/v6.0';

    const queryParams = new URLSearchParams({
        src: params.fromTokenAddress,
        dst: params.toTokenAddress,
        amount: params.amount,
        includeTokensInfo: 'true',
        includeProtocols: 'true',
        includeGasInfo: 'true',
        ...(params.slippage && { slippage: params.slippage.toString() }),
        ...(params.gasPrice && { gasPrice: params.gasPrice }),
        ...(params.protocols && { protocols: params.protocols }),
        ...(params.fee && { fee: params.fee.toString() }),
        ...(params.gasLimit && { gasLimit: params.gasLimit.toString() }),
        ...(params.connectorTokens && { connectorTokens: params.connectorTokens }),
        ...(params.complexityLevel && { complexityLevel: params.complexityLevel.toString() }),
        ...(params.mainRouteParts && { mainRouteParts: params.mainRouteParts.toString() }),
        ...(params.parts && { parts: params.parts.toString() }),
    });

    const response = await fetch(`${baseUrl}/${chainId}/quote?${queryParams}`, {
        headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_1INCH_API_KEY}`,
            'Accept': 'application/json',
        },
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.description || `Failed to fetch swap quote: ${response.statusText}`);
    }

    const data = await response.json();

    return {
        fromToken: {
            address: data.fromToken.address,
            symbol: data.fromToken.symbol,
            decimals: data.fromToken.decimals,
            amount: params.amount,
        },
        toToken: {
            address: data.toToken.address,
            symbol: data.toToken.symbol,
            decimals: data.toToken.decimals,
            amount: data.toAmount,
        },
        protocols: data.protocols || [],
        estimatedGas: data.estimatedGas || '0',
        estimatedGasUSD: data.estimatedGasUSD || '0',
        priceImpact: data.priceImpact || '0',
        slippage: params.slippage?.toString() || '1',
        route: data.route || [],
    };
};

// Build swap transaction
const buildSwapTransaction = async (
    params: SwapQuoteParams & { fromAddress: Address },
    chainId: number = 1
): Promise<SwapTransaction> => {
    const baseUrl = 'https://api.1inch.dev/swap/v6.0';

    const queryParams = new URLSearchParams({
        src: params.fromTokenAddress,
        dst: params.toTokenAddress,
        amount: params.amount,
        from: params.fromAddress,
        slippage: (params.slippage || 1).toString(),
        ...(params.gasPrice && { gasPrice: params.gasPrice }),
        ...(params.protocols && { protocols: params.protocols }),
        ...(params.fee && { fee: params.fee.toString() }),
        ...(params.gasLimit && { gasLimit: params.gasLimit.toString() }),
    });

    const response = await fetch(`${baseUrl}/${chainId}/swap?${queryParams}`, {
        headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_1INCH_API_KEY}`,
            'Accept': 'application/json',
        },
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.description || `Failed to build swap transaction: ${response.statusText}`);
    }

    const data = await response.json();

    return {
        to: data.tx.to,
        data: data.tx.data,
        value: data.tx.value,
        gas: data.tx.gas,
        gasPrice: data.tx.gasPrice,
    };
};

// Check token allowance
const checkAllowance = async (
    tokenAddress: Address,
    ownerAddress: Address,
    spenderAddress: Address,
    chainId: number = 1
): Promise<string> => {
    const baseUrl = 'https://api.1inch.dev/swap/v6.0';

    const response = await fetch(
        `${baseUrl}/${chainId}/approve/allowance?tokenAddress=${tokenAddress}&walletAddress=${ownerAddress}`,
        {
            headers: {
                'Authorization': `Bearer ${process.env.NEXT_PUBLIC_1INCH_API_KEY}`,
                'Accept': 'application/json',
            },
        }
    );

    if (!response.ok) {
        throw new Error(`Failed to check allowance: ${response.statusText}`);
    }

    const data = await response.json();
    return data.allowance || '0';
};

// Get approval transaction
const getApprovalTransaction = async (
    tokenAddress: Address,
    amount?: string,
    chainId: number = 1
): Promise<SwapTransaction> => {
    const baseUrl = 'https://api.1inch.dev/swap/v6.0';

    const params = new URLSearchParams({
        tokenAddress,
        ...(amount && { amount }),
    });

    const response = await fetch(`${baseUrl}/${chainId}/approve/transaction?${params}`, {
        headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_1INCH_API_KEY}`,
            'Accept': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to get approval transaction: ${response.statusText}`);
    }

    const data = await response.json();

    return {
        to: data.to,
        data: data.data,
        value: data.value || '0',
        gas: data.gas,
        gasPrice: data.gasPrice,
    };
};

// Main hook for swap quotes
export const useSwapRoute = (
    params: SwapQuoteParams | null,
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
        queryFn: () => fetchSwapQuote(params!, chainId),
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
    swapParams: SwapQuoteParams[],
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
                swapParams.map(params => fetchSwapQuote(params, chainId))
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
                acc.totalGas = (BigInt(acc.totalGas) + BigInt(item.route.estimatedGas)).toString();
                acc.totalGasUSD = (parseFloat(acc.totalGasUSD) + parseFloat(item.route.estimatedGasUSD)).toString();
                acc.totalPriceImpact = Math.max(acc.totalPriceImpact, parseFloat(item.route.priceImpact));
            }
            return acc;
        },
        { totalGas: '0', totalGasUSD: '0', totalPriceImpact: 0 }
    );

    return {
        routes: queryResult.data || [],
        totalEstimation,
        isLoading: queryResult.isLoading,
        isError: queryResult.isError,
        error: queryResult.error,
        refetch: queryResult.refetch,
    };
};

// Hook for token allowance checking
export const useTokenAllowance = (
    tokenAddress: Address | null,
    spenderAddress: Address | null,
    options: UseSwapRoutesOptions = {}
) => {
    const { address } = useAccount();
    const { chainId = 1, enabled = true } = options;

    const queryResult = useQuery({
        queryKey: ['tokenAllowance', tokenAddress, address, spenderAddress, chainId],
        queryFn: () => checkAllowance(tokenAddress!, address!, spenderAddress!, chainId),
        enabled: enabled && !!tokenAddress && !!address && !!spenderAddress,
        staleTime: 30_000,
        retry: 2,
    });

    const hasInsufficientAllowance = (requiredAmount: string): boolean => {
        if (!queryResult.data) return true;
        return BigInt(queryResult.data) < BigInt(requiredAmount);
    };

    return {
        allowance: queryResult.data || '0',
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

            const approvalTx = await getApprovalTransaction(tokenAddress, amount, chainId);

            const hash = await walletClient.sendTransaction({
                account: address,
                to: approvalTx.to,
                data: approvalTx.data as `0x${string}`,
                value: BigInt(approvalTx.value),
                gas: BigInt(approvalTx.gas),
                gasPrice: BigInt(approvalTx.gasPrice),
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
            params: SwapQuoteParams;
            chainId?: number;
        }) => {
            if (!walletClient || !address) {
                throw new Error('Wallet not connected');
            }

            const swapTx = await buildSwapTransaction(
                { ...params, fromAddress: address },
                chainId
            );

            const hash = await walletClient.sendTransaction({
                account: address,
                to: swapTx.to,
                data: swapTx.data as `0x${string}`,
                value: BigInt(swapTx.value),
                gas: BigInt(swapTx.gas),
                gasPrice: BigInt(swapTx.gasPrice),
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

// Hook for batch swap optimization
export const useBatchSwapOptimization = (
    individualSwaps: SwapQuoteParams[],
    options: UseSwapRoutesOptions = {}
) => {
    const { chainId = 1, enabled = true } = options;

    // Get individual routes
    const { routes: individualRoutes, isLoading: loadingIndividual } = useMultipleSwapRoutes(
        individualSwaps,
        { ...options, enabled }
    );

    // TODO: Implement actual batch swap logic when 1inch supports it
    // For now, we'll simulate batch optimization by analyzing individual swaps
    const batchOptimization = useQuery({
        queryKey: ['batchSwapOptimization', individualSwaps, chainId],
        queryFn: async () => {
            // This would integrate with 1inch batch swap functionality when available
            // For now, return optimization suggestions based on individual routes

            const validRoutes = individualRoutes.filter(r => r.route && !r.error);
            if (validRoutes.length === 0) return null;

            const totalGas = validRoutes.reduce(
                (sum, r) => sum + BigInt(r.route!.estimatedGas),
                BigInt(0)
            );

            // Simulate 20-30% gas savings for batch execution
            const estimatedBatchGas = (totalGas * BigInt(75)) / BigInt(100); // 25% savings
            const gasSaved = totalGas - estimatedBatchGas;
            const savingsPercentage = Number(gasSaved * BigInt(10000) / totalGas) / 100;

            return {
                canOptimize: validRoutes.length > 1,
                individualGas: totalGas.toString(),
                batchGas: estimatedBatchGas.toString(),
                gasSaved: gasSaved.toString(),
                savingsPercentage,
                recommendedAction: savingsPercentage > 10 ? 'batch' : 'individual',
                routes: validRoutes.map(r => r.route!),
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