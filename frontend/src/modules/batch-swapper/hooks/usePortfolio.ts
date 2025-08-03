/**
 * Portfolio Hook - Clean React hook for portfolio management
 * Uses the real 1inch portfolio service
 */

import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { Address } from 'viem';
import { portfolioService, UserPortfolio, PortfolioToken } from '../services/portfolioService';

interface UsePortfolioOptions {
    chainId?: number;
    enabled?: boolean;
    refetchInterval?: number;
}

interface UsePortfolioReturn {
    portfolio: UserPortfolio | null;
    tokens: PortfolioToken[];
    totalValueUSD: number;
    tokenCount: number;
    hasBalances: boolean;
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    refetch: () => void;
    isFetching: boolean;
}

/**
 * Main portfolio hook - fetches complete user portfolio using 1inch API
 */
export const usePortfolio = (options: UsePortfolioOptions = {}): UsePortfolioReturn => {
    const { address, isConnected } = useAccount();
    const {
        chainId = 8453, // Default to Base
        enabled = true,
        refetchInterval = 30000, // 30 seconds
    } = options;

    const queryResult = useQuery({
        queryKey: ['portfolio', address, chainId],
        queryFn: () => portfolioService.getUserPortfolio(address!, chainId),
        enabled: enabled && isConnected && !!address,
        staleTime: 15000, // 15 seconds
        refetchInterval,
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    });

    const portfolio = queryResult.data || null;

    return {
        portfolio,
        tokens: portfolio?.tokens || [],
        totalValueUSD: portfolio?.totalValueUSD || 0,
        tokenCount: portfolio?.tokenCount || 0,
        hasBalances: portfolio?.hasBalances || false,
        isLoading: queryResult.isLoading,
        isError: queryResult.isError,
        error: queryResult.error,
        refetch: queryResult.refetch,
        isFetching: queryResult.isFetching,
    };
};

/**
 * Hook to search for tokens across all supported tokens
 */
export const useTokenSearch = (searchTerm: string, chainId: number = 8453) => {
    return useQuery({
        queryKey: ['tokenSearch', searchTerm, chainId],
        queryFn: () => portfolioService.findToken(searchTerm, chainId),
        enabled: searchTerm.length > 1, // Only search with 2+ characters
        staleTime: 300000, // 5 minutes (token data doesn't change often)
    });
};

/**
 * Hook to get all supported tokens for a chain
 */
export const useSupportedTokens = (chainId: number = 8453) => {
    return useQuery({
        queryKey: ['supportedTokens', chainId],
        queryFn: () => portfolioService.getAllSupportedTokens(chainId),
        staleTime: 300000, // 5 minutes
        retry: 1,
    });
};

/**
 * Hook for a specific token balance
 */
export const useTokenBalance = (tokenAddress: Address, chainId: number = 8453) => {
    const { tokens } = usePortfolio({ chainId });

    const tokenBalance = tokens.find(
        token => token.address.toLowerCase() === tokenAddress.toLowerCase()
    );

    return {
        token: tokenBalance || null,
        balance: tokenBalance?.balance || 0n,
        balanceFormatted: tokenBalance?.balanceFormatted || '0',
        balanceUSD: tokenBalance?.balanceUSD || 0,
        hasBalance: !!tokenBalance && tokenBalance.balance > 0n,
    };
};
