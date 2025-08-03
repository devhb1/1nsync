import { useQuery } from '@tanstack/react-query';
import { useAccount, useBalance, useReadContracts } from 'wagmi';
import { Address, erc20Abi } from 'viem';
import { oneInchAPI } from '../services/oneInchAPI';
import { TokenBalance, PortfolioAnalysis, Token, OneInchBalanceResponse } from '../types';
import { calculatePortfolioPercentages, calculateTotalPortfolioValue, parseUnits, formatUnits, formatEther } from '../utils/calculations';
import { POPULAR_TOKENS, getTokenBySymbol, getTokensForChain } from '../utils/constants';

interface UseWalletBalancesOptions {
    chainId?: number;
    includeNative?: boolean;
    minUSDValue?: number;
    enabled?: boolean;
}

// Enhanced function to fetch comprehensive token balances
const fetchComprehensiveBalances = async (
    address: Address,
    chainId: number,
    includeNative: boolean
): Promise<TokenBalance[]> => {
    const tokenBalances: TokenBalance[] = [];

    try {
        console.log(`Fetching comprehensive balances for ${address} on chain ${chainId}`);

        // Get complete portfolio data from 1inch
        const portfolioData = await oneInchAPI.getCompletePortfolio(address, chainId);
        console.log('Portfolio data received:', portfolioData);

        // Process native ETH balance first
        if (includeNative) {
            const allTokens = await getTokensForChain(chainId);
            const nativeToken = allTokens.find((t: any) => t.isNative);
            if (nativeToken) {
                // Native balance will be handled by useBalance hook
                tokenBalances.push({
                    token: {
                        address: nativeToken.address as `0x${string}`,
                        symbol: nativeToken.symbol,
                        name: nativeToken.name,
                        decimals: nativeToken.decimals,
                        logoURI: nativeToken.logoURI
                    },
                    balance: 0n, // Will be filled by useBalance
                    balanceFormatted: '0',
                    priceUSD: 0,
                    valueUSD: 0,
                    percentage: 0,
                });
            }
        }

        // Process balances from the complete portfolio
        const allBalances = { ...portfolioData.balances, ...portfolioData.customBalances };
        console.log('Combined balances:', allBalances);

        // Get token information for all tokens with balances
        const tokenAddresses = Object.keys(allBalances);
        console.log('Found token addresses with balances:', tokenAddresses);

        for (const tokenAddress of tokenAddresses) {
            const balance = allBalances[tokenAddress];
            const tokenInfo = portfolioData.topTokens[tokenAddress as Address];

            // Handle both string balance and object balance formats
            const balanceValue = typeof balance === 'string' ? balance :
                typeof balance === 'object' && balance?.balance ? balance.balance : '0';

            if (balanceValue && BigInt(balanceValue) > 0n && tokenInfo) {
                // Skip native token as it's handled separately
                if (tokenAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' ||
                    tokenAddress.toLowerCase() === '0x0000000000000000000000000000000000000000') {
                    continue;
                }

                const formattedBalance = formatUnits(BigInt(balanceValue), tokenInfo.decimals);

                console.log(`Adding token: ${tokenInfo.symbol} with balance ${formattedBalance}`);

                tokenBalances.push({
                    token: {
                        address: tokenAddress as Address,
                        symbol: tokenInfo.symbol,
                        name: tokenInfo.name,
                        decimals: tokenInfo.decimals,
                        logoURI: tokenInfo.logoURI
                    },
                    balance: BigInt(balanceValue),
                    balanceFormatted: formattedBalance,
                    priceUSD: 0, // Will be filled by price fetching
                    valueUSD: 0,
                    percentage: 0,
                });
            }
        }

        // If no tokens found from 1inch, try fallback with popular tokens
        if (tokenBalances.length <= 1) { // Only native token
            console.log('Falling back to popular tokens check');
            const popularTokens = await getTokensForChain(chainId);
            const nonNativeTokens = popularTokens.filter((t: any) => !t.isNative);
            const tokenAddressesToCheck = nonNativeTokens.slice(0, 50).map((t: any) => t.address); // Check top 50

            try {
                const fallbackBalances = await oneInchAPI.getCustomTokenBalances(address, chainId, tokenAddressesToCheck);
                console.log('Fallback balances:', fallbackBalances);

                for (const [tokenAddress, balance] of Object.entries(fallbackBalances)) {
                    if (balance && BigInt(balance) > 0n) {
                        const tokenInfo = nonNativeTokens.find((t: any) => t.address.toLowerCase() === tokenAddress.toLowerCase());
                        if (tokenInfo) {
                            const formattedBalance = formatUnits(BigInt(balance), tokenInfo.decimals);

                            tokenBalances.push({
                                token: {
                                    address: tokenInfo.address as `0x${string}`,
                                    symbol: tokenInfo.symbol,
                                    name: tokenInfo.name,
                                    decimals: tokenInfo.decimals,
                                    logoURI: tokenInfo.logoURI
                                },
                                address: tokenInfo.address as `0x${string}`,
                                symbol: tokenInfo.symbol,
                                name: tokenInfo.name,
                                decimals: tokenInfo.decimals,
                                balance: BigInt(balance),
                                balanceFormatted: formattedBalance,
                                priceUSD: 0,
                                valueUSD: 0,
                                percentage: 0,
                            });
                        }
                    }
                }
            } catch (fallbackError) {
                console.error('Fallback balance fetching failed:', fallbackError);
            }
        }

        console.log(`Final token balances found: ${tokenBalances.length}`, tokenBalances);
        return tokenBalances;

    } catch (error) {
        console.error('Failed to fetch comprehensive balances:', error);

        // Ultimate fallback - return just the native token
        try {
            const allTokens = await getTokensForChain(chainId);
            const nativeToken = allTokens.find((t: any) => t.isNative);
            if (nativeToken && includeNative) {
                return [{
                    token: {
                        address: nativeToken.address as `0x${string}`,
                        symbol: nativeToken.symbol,
                        name: nativeToken.name,
                        decimals: nativeToken.decimals,
                        logoURI: nativeToken.logoURI
                    },
                    address: nativeToken.address as `0x${string}`,
                    symbol: nativeToken.symbol,
                    name: nativeToken.name,
                    decimals: nativeToken.decimals,
                    balance: 0n,
                    balanceFormatted: '0',
                    priceUSD: 0,
                    valueUSD: 0,
                    percentage: 0,
                }];
            }
        } catch (fallbackError) {
            console.error('Fallback token fetch failed:', fallbackError);
        }

        return [];
    }
};

// Enhanced wallet balance fetching that uses comprehensive balance fetching
const fetchWalletBalancesData = async (
    address: Address,
    chainId: number,
    includeNative: boolean
): Promise<{ balances: TokenBalance[]; totalUSD: number; lastUpdated: number }> => {
    try {
        console.log('Fetching comprehensive wallet balances for address:', address, 'chainId:', chainId);

        // Use the enhanced comprehensive balance fetching
        const tokenBalances = await fetchComprehensiveBalances(address, chainId, includeNative);

        // TODO: Add price fetching here for USD values
        // For now, keeping the structure but without USD prices
        const totalUSD = tokenBalances.reduce((sum, token) => sum + token.valueUSD, 0);

        console.log('Total portfolio value:', totalUSD, 'USD');
        console.log('Found tokens:', tokenBalances.map(t => `${t.symbol}: ${t.balanceFormatted}`));

        return {
            balances: tokenBalances,
            totalUSD,
            lastUpdated: Date.now(),
        };
    } catch (error) {
        console.error('Error fetching wallet balances:', error);

        // Return empty balances on error instead of throwing
        return {
            balances: [],
            totalUSD: 0,
            lastUpdated: Date.now(),
        };
    }
};

// Custom hook
export const useWalletBalances = (options: UseWalletBalancesOptions = {}) => {
    const { address, isConnected } = useAccount(); //
    const {
        chainId = 1,
        includeNative = true,
        minUSDValue = 0.01,
        enabled = true,
    } = options;

    const queryResult = useQuery({
        queryKey: ['walletBalances', address, chainId, includeNative],
        queryFn: () => fetchWalletBalancesData(address!, chainId, includeNative),
        enabled: enabled && isConnected && !!address,
        staleTime: 30_000, // 30 seconds
        refetchInterval: 60_000, // 1 minute
        retry: 3, //
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), //
    });

    // Filter balances by minimum USD value
    const filteredBalances = queryResult.data?.balances.filter(
        (token: TokenBalance) => token.valueUSD >= minUSDValue // Fixed: Added type annotation
    ) || [];

    // Calculate portfolio analysis
    const totalValueUSD = calculateTotalPortfolioValue(filteredBalances); //

    // Add percentage to each balance
    const balancesWithAllocation: TokenBalance[] = filteredBalances.map(balance => ({
        ...balance,
        percentage: totalValueUSD > 0 ? (balance.valueUSD / totalValueUSD) * 100 : 0
    })); //

    const portfolioAnalysis: PortfolioAnalysis = { //
        totalValue: totalValueUSD, // Use totalValue instead
        totalValueUSD, //
        balances: balancesWithAllocation, //
        diversificationScore: 0, // Will be calculated in page.tsx if needed, or by optimizationEngine
        riskScore: 0,
        topHoldings: balancesWithAllocation.slice(0, 5),
        rebalanceRecommendations: [],
        recommendations: [],
        healthScore: 0,
        allocation: {},
        lastAnalyzed: Date.now(),
        lastUpdated: queryResult.data?.lastUpdated || Date.now(), // Fixed: Now properly references lastUpdated
    };

    return {
        portfolioAnalysis, // Return the full analysis object
        balances: balancesWithAllocation, // Keep balances separate for convenience
        totalValueUSD,
        isLoading: queryResult.isLoading, //
        isError: queryResult.isError, //
        error: queryResult.error, //
        refetch: queryResult.refetch, //
        isFetching: queryResult.isFetching, //
    };
};

// Additional utility hook for specific tokens (remains largely the same, but uses new balance types)
export const useTokenBalance = (tokenAddress: Address) => { //
    const { balances, isLoading, isError } = useWalletBalances(); //

    const tokenBalance = balances.find( //
        (token) => (token.token?.address || token.address)?.toLowerCase() === tokenAddress.toLowerCase() //
    );

    return {
        balance: tokenBalance?.balance || 0n, //
        balanceFormatted: tokenBalance?.balanceFormatted || '0',
        balanceUSD: tokenBalance?.valueUSD || 0, //
        token: tokenBalance, //
        hasBalance: !!tokenBalance && tokenBalance.balance > 0n, //
        isLoading, //
        isError, //
    };
};