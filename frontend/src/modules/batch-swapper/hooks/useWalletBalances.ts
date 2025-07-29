import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { Address } from 'viem';

// Types
interface TokenBalance {
    address: Address;
    symbol: string;
    name: string;
    decimals: number;
    balance: string;
    balanceUSD: string;
    price: string;
    logoURI?: string;
}

interface WalletBalancesResponse {
    balances: TokenBalance[];
    totalUSD: string;
    lastUpdated: number;
}

interface UseWalletBalancesOptions {
    chainId?: number;
    includeNative?: boolean;
    minUSDValue?: number;
    enabled?: boolean;
}

// 1inch Wallet API service
const fetchWalletBalances = async (
    address: Address,
    chainId: number = 1,
    includeNative: boolean = true
): Promise<WalletBalancesResponse> => {
    const baseUrl = 'https://api.1inch.dev/balance/v1.2';

    const params = new URLSearchParams({
        addresses: address,
        ...(includeNative && { 'include-native': 'true' })
    });

    const response = await fetch(`${baseUrl}/${chainId}/balances?${params}`, {
        headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_1INCH_API_KEY}`,
            'Accept': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch wallet balances: ${response.statusText}`);
    }

    const data = await response.json();

    // Transform 1inch API response to our format
    const balances: TokenBalance[] = Object.entries(data[address.toLowerCase()] || {}).map(
        ([tokenAddress, tokenData]: [string, any]) => ({
            address: tokenAddress as Address,
            symbol: tokenData.symbol || 'UNKNOWN',
            name: tokenData.name || 'Unknown Token',
            decimals: tokenData.decimals || 18,
            balance: tokenData.balance || '0',
            balanceUSD: tokenData.balanceUSD || '0',
            price: tokenData.price || '0',
            logoURI: tokenData.logoURI,
        })
    );

    const totalUSD = balances.reduce(
        (sum, token) => sum + parseFloat(token.balanceUSD || '0'),
        0
    ).toString();

    return {
        balances,
        totalUSD,
        lastUpdated: Date.now(),
    };
};

// Custom hook
export const useWalletBalances = (options: UseWalletBalancesOptions = {}) => {
    const { address, isConnected } = useAccount();
    const {
        chainId = 1,
        includeNative = true,
        minUSDValue = 0.01,
        enabled = true,
    } = options;

    const queryResult = useQuery({
        queryKey: ['walletBalances', address, chainId, includeNative],
        queryFn: () => fetchWalletBalances(address!, chainId, includeNative),
        enabled: enabled && isConnected && !!address,
        staleTime: 30_000, // 30 seconds
        refetchInterval: 60_000, // 1 minute
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    });

    // Filter balances by minimum USD value
    const filteredBalances = queryResult.data?.balances.filter(
        (token) => parseFloat(token.balanceUSD || '0') >= minUSDValue
    ) || [];

    // Calculate portfolio allocation percentages
    const portfolioAllocation = filteredBalances.map((token) => ({
        ...token,
        allocationPercentage: queryResult.data?.totalUSD
            ? (parseFloat(token.balanceUSD) / parseFloat(queryResult.data.totalUSD)) * 100
            : 0,
    }));

    return {
        balances: filteredBalances,
        portfolioAllocation,
        totalUSD: queryResult.data?.totalUSD || '0',
        lastUpdated: queryResult.data?.lastUpdated,
        isLoading: queryResult.isLoading,
        isError: queryResult.isError,
        error: queryResult.error,
        refetch: queryResult.refetch,
        isFetching: queryResult.isFetching,
    };
};

// Additional utility hook for specific tokens
export const useTokenBalance = (tokenAddress: Address) => {
    const { balances, isLoading, isError } = useWalletBalances();

    const tokenBalance = balances.find(
        (token) => token.address.toLowerCase() === tokenAddress.toLowerCase()
    );

    return {
        balance: tokenBalance?.balance || '0',
        balanceUSD: tokenBalance?.balanceUSD || '0',
        token: tokenBalance,
        hasBalance: !!tokenBalance && parseFloat(tokenBalance.balance) > 0,
        isLoading,
        isError,
    };
};