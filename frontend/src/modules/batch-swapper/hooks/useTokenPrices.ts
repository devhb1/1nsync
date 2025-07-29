import { useQuery } from '@tanstack/react-query';
import { Address } from 'viem';

// Types
interface TokenPrice {
    address: Address;
    symbol: string;
    price: string;
    priceUSD: string;
    timestamp: number;
    confidence: number;
}

interface PriceHistoryPoint {
    timestamp: number;
    price: string;
    volume24h?: string;
}

interface TokenPricesResponse {
    prices: Record<string, TokenPrice>;
    lastUpdated: number;
}

interface UseTokenPricesOptions {
    chainId?: number;
    currency?: 'USD' | 'ETH' | 'BTC';
    enabled?: boolean;
    refetchInterval?: number;
}

interface UsePriceHistoryOptions {
    chainId?: number;
    period?: '1h' | '24h' | '7d' | '30d';
    points?: number;
    enabled?: boolean;
}

// 1inch Price API service
const fetchTokenPrices = async (
    tokenAddresses: Address[],
    chainId: number = 1,
    currency: string = 'USD'
): Promise<TokenPricesResponse> => {
    if (tokenAddresses.length === 0) {
        return { prices: {}, lastUpdated: Date.now() };
    }

    const baseUrl = 'https://api.1inch.dev/price/v1.1';
    const addresses = tokenAddresses.join(',');

    const params = new URLSearchParams({
        tokens: addresses,
        currency: currency.toLowerCase(),
    });

    const response = await fetch(`${baseUrl}/${chainId}?${params}`, {
        headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_1INCH_API_KEY}`,
            'Accept': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch token prices: ${response.statusText}`);
    }

    const data = await response.json();

    // Transform response to our format
    const prices: Record<string, TokenPrice> = {};

    Object.entries(data).forEach(([address, priceData]: [string, any]) => {
        prices[address.toLowerCase()] = {
            address: address as Address,
            symbol: priceData.symbol || 'UNKNOWN',
            price: priceData.price || '0',
            priceUSD: priceData.priceUSD || priceData.price || '0',
            timestamp: priceData.timestamp || Date.now(),
            confidence: priceData.confidence || 1,
        };
    });

    return {
        prices,
        lastUpdated: Date.now(),
    };
};

// Fetch price history for a single token
const fetchPriceHistory = async (
    tokenAddress: Address,
    chainId: number = 1,
    period: string = '24h',
    points: number = 24
): Promise<PriceHistoryPoint[]> => {
    const baseUrl = 'https://api.1inch.dev/price/v1.1';

    const params = new URLSearchParams({
        period,
        points: points.toString(),
    });

    const response = await fetch(
        `${baseUrl}/${chainId}/history/${tokenAddress}?${params}`,
        {
            headers: {
                'Authorization': `Bearer ${process.env.NEXT_PUBLIC_1INCH_API_KEY}`,
                'Accept': 'application/json',
            },
        }
    );

    if (!response.ok) {
        throw new Error(`Failed to fetch price history: ${response.statusText}`);
    }

    const data = await response.json();

    return data.history || [];
};

// Main hook for multiple token prices
export const useTokenPrices = (
    tokenAddresses: Address[],
    options: UseTokenPricesOptions = {}
) => {
    const {
        chainId = 1,
        currency = 'USD',
        enabled = true,
        refetchInterval = 30_000, // 30 seconds
    } = options;

    const queryResult = useQuery({
        queryKey: ['tokenPrices', tokenAddresses, chainId, currency],
        queryFn: () => fetchTokenPrices(tokenAddresses, chainId, currency),
        enabled: enabled && tokenAddresses.length > 0,
        staleTime: 15_000, // 15 seconds
        refetchInterval,
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    });

    // Helper to get price for specific token
    const getTokenPrice = (tokenAddress: Address): TokenPrice | undefined => {
        return queryResult.data?.prices[tokenAddress.toLowerCase()];
    };

    // Helper to get USD value for token amount
    const calculateUSDValue = (tokenAddress: Address, amount: string): string => {
        const price = getTokenPrice(tokenAddress);
        if (!price) return '0';

        const numericAmount = parseFloat(amount);
        const numericPrice = parseFloat(price.priceUSD);

        return (numericAmount * numericPrice).toString();
    };

    // Calculate total portfolio value
    const calculatePortfolioValue = (holdings: Array<{ address: Address; amount: string }>): string => {
        return holdings.reduce((total, holding) => {
            const usdValue = parseFloat(calculateUSDValue(holding.address, holding.amount));
            return total + usdValue;
        }, 0).toString();
    };

    return {
        prices: queryResult.data?.prices || {},
        lastUpdated: queryResult.data?.lastUpdated,
        isLoading: queryResult.isLoading,
        isError: queryResult.isError,
        error: queryResult.error,
        refetch: queryResult.refetch,
        isFetching: queryResult.isFetching,
        // Helper functions
        getTokenPrice,
        calculateUSDValue,
        calculatePortfolioValue,
    };
};

// Hook for single token price
export const useTokenPrice = (
    tokenAddress: Address,
    options: UseTokenPricesOptions = {}
) => {
    const result = useTokenPrices([tokenAddress], options);

    const tokenPrice = result.getTokenPrice(tokenAddress);

    return {
        price: tokenPrice?.price || '0',
        priceUSD: tokenPrice?.priceUSD || '0',
        symbol: tokenPrice?.symbol || 'UNKNOWN',
        timestamp: tokenPrice?.timestamp,
        confidence: tokenPrice?.confidence || 0,
        isLoading: result.isLoading,
        isError: result.isError,
        error: result.error,
        refetch: result.refetch,
    };
};

// Hook for price history
export const usePriceHistory = (
    tokenAddress: Address,
    options: UsePriceHistoryOptions = {}
) => {
    const {
        chainId = 1,
        period = '24h',
        points = 24,
        enabled = true,
    } = options;

    const queryResult = useQuery({
        queryKey: ['priceHistory', tokenAddress, chainId, period, points],
        queryFn: () => fetchPriceHistory(tokenAddress, chainId, period, points),
        enabled: enabled && !!tokenAddress,
        staleTime: 60_000, // 1 minute
        refetchInterval: 120_000, // 2 minutes
        retry: 2,
    });

    // Calculate price change percentage
    const priceChange = queryResult.data && queryResult.data.length >= 2 ? {
        absolute: parseFloat(queryResult.data[queryResult.data.length - 1].price) -
            parseFloat(queryResult.data[0].price),
        percentage: ((parseFloat(queryResult.data[queryResult.data.length - 1].price) -
            parseFloat(queryResult.data[0].price)) /
            parseFloat(queryResult.data[0].price)) * 100,
    } : null;

    return {
        history: queryResult.data || [],
        priceChange,
        isLoading: queryResult.isLoading,
        isError: queryResult.isError,
        error: queryResult.error,
        refetch: queryResult.refetch,
    };
};