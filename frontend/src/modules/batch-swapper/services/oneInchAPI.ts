// src/services/oneInchAPI.ts
import { Address } from 'viem';
import {
    OneInchBalanceAPIResponse,
    OneInchGasPriceAPIResponse,
    OneInchQuoteResponse, // Updated to match new type
    OneInchSwapAPIResponse,
    OneInchSwapParams,
    OneInchQuoteParams,
    OneInchApproveAPIResponse,
    OneInchTokenAPIResponse,
    OneInchTokenInfo,
    // Removed Fusion API types
} from '../types';
import { API_ENDPOINTS } from '../utils/multi-chain-config';

class OneInchAPI {
    private baseUrl = '/api/1inch';
    private apiBaseURL = '/api/1inch'; // Keep both for compatibility
    private isClient = typeof window !== 'undefined';
    private priceCache = new Map<string, { price: number; timestamp: number; source: string }>();
    private readonly CACHE_DURATION = 60 * 1000; // 1 minute cache

    private get headers() {
        return {
            'Content-Type': 'application/json',
        };
    }

    constructor() {
        // Initialize any needed configuration
    }

    // Helper to build dynamic URLs including chainId for Swap API
    private getSwapBaseURL(chainId: number): string {
        return `${this.apiBaseURL}/swap/v6.0/${chainId}`;
    }

    // Helper to build dynamic URLs including chainId for Balance API
    private getBalanceBaseURL(chainId: number): string {
        return `${this.apiBaseURL}/balance/v1.2/${chainId}`;
    }

    // makeRequest helper modified to accept full URL
    private async makeRequest<T>(fullUrl: string, method: 'GET' | 'POST' = 'GET', body?: any): Promise<T> {
        const options: RequestInit = {
            method,
            headers: this.headers,
        };

        if (body && method === 'POST') {
            options.body = JSON.stringify(body);
        } else if (body && method === 'GET') {
            // For GET requests, append body (which are params) to URL search params
            const urlObj = new URL(fullUrl, window.location.origin);
            Object.entries(body).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    if (Array.isArray(value)) {
                        urlObj.searchParams.append(key, value.join(','));
                    } else {
                        urlObj.searchParams.append(key, value.toString());
                    }
                }
            });
            fullUrl = urlObj.toString();
        }

        const response = await fetch(fullUrl, options);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error(`1inch API error for ${fullUrl}:`, errorData);
            throw new Error(
                `1inch API error: ${response.status} ${response.statusText}. ${errorData.message || errorData.description || errorData.error || 'Unknown error'}`
            );
        }

        return response.json();
    }

    /**
     * Get supported tokens
     * @param chainId The ID of the blockchain network.
     */
    async getTokens(chainId: number): Promise<{ tokens: Record<Address, OneInchTokenInfo> }> {
        const data = await this.makeRequest(`${this.getSwapBaseURL(chainId)}/tokens`);
        return data as { tokens: Record<Address, OneInchTokenInfo> };
    }

    /**
     * Get wallet token balances using the correct 1inch Balance API
     * @param walletAddress The user's wallet address.
     * @param chainId The ID of the blockchain network.
     */
    async getBalances(walletAddress: Address, chainId: number): Promise<OneInchBalanceAPIResponse> {
        try {
            console.log(`Fetching balances for ${walletAddress} on chain ${chainId}`);
            const data = await this.makeRequest(
                `${this.getBalanceBaseURL(chainId)}/balances/${walletAddress}`
            );
            console.log(`Balance data received:`, data);
            return (data || {}) as OneInchBalanceAPIResponse;
        } catch (error) {
            console.error('Failed to fetch balances:', error);
            // Return empty balances on error instead of throwing
            return {} as OneInchBalanceAPIResponse;
        }
    }

    /**
     * Get specific token balances using POST method
     * @param walletAddress The user's wallet address.
     * @param chainId The ID of the blockchain network.
     * @param tokenAddresses Array of token addresses to query.
     */
    async getCustomTokenBalances(walletAddress: Address, chainId: number, tokenAddresses: Address[]): Promise<Record<string, string>> {
        try {
            console.log(`Fetching custom token balances for ${walletAddress}:`, tokenAddresses);
            const data = await this.makeRequest(
                `${this.getBalanceBaseURL(chainId)}/balances/${walletAddress}`,
                'POST',
                { tokens: tokenAddresses }
            );
            console.log(`Custom balance data received:`, data);
            return data as Record<string, string>;
        } catch (error) {
            console.error('Failed to fetch custom token balances:', error);
            return {};
        }
    }

    /**
     * Get major tokens for a specific chain (for price reference)
     */
    private getMajorTokensForChain(chainId: number): Address[] {
        const majorTokens: Record<number, Address[]> = {
            1: [ // Ethereum
                '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', // ETH
                '0xA0b86a33E6D6346CcFb0Fe2f9bF2c8a9bE0F5b7a', // USDC
                '0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI
                '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT
                '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'  // WBTC
            ],
            8453: [ // Base
                '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', // ETH
                '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
                '0x4200000000000000000000000000000000000006', // WETH
                '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA'  // USDbC
            ],
            42161: [ // Arbitrum
                '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', // ETH
                '0xaf88d065e77c8cc2239327c5edb3a432268e5831', // USDC
                '0x82af49447d8a07e3bd95bd0d56f35241523fbab1', // WETH
                '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'  // DAI
            ],
            10: [ // Optimism
                '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', // ETH
                '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', // USDC
                '0x4200000000000000000000000000000000000006', // WETH
                '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'  // DAI
            ]
        };
        return majorTokens[chainId] || [];
    }

    /**
     * Get fallback price for known tokens when API fails
     * Enhanced with more comprehensive token coverage
     */
    private getFallbackPrice(symbol: string, chainId: number): number {
        const fallbackPrices: Record<string, number> = {
            // Major cryptocurrencies
            'ETH': 3500,
            'WETH': 3500,
            'BTC': 65000,
            'WBTC': 65000,
            'cbBTC': 65000,

            // Stablecoins
            'USDC': 1.00,
            'USDT': 1.00,
            'DAI': 1.00,
            'USDbC': 1.00,
            'USDC.e': 1.00,
            'FRAX': 1.00,
            'LUSD': 1.00,
            'sUSD': 1.00,
            'BUSD': 1.00,

            // ETH derivatives
            'stETH': 3500,
            'wstETH': 3750,
            'rETH': 3600,
            'cbETH': 3550,
            'sETH2': 3500,
            'ankrETH': 3500,

            // Popular DeFi tokens
            'UNI': 8,
            'AAVE': 300,
            'COMP': 60,
            'MKR': 2500,
            'SNX': 3,
            'CRV': 0.4,
            'BAL': 3.5,
            'SUSHI': 1.2,
            '1INCH': 0.4,
            'YFI': 8000,

            // Layer 2 tokens
            'MATIC': 0.6,
            'OP': 2.5,
            'ARB': 1.1,

            // Other popular tokens
            'LINK': 15,
            'GRT': 0.25,
            'LDO': 2.8,
            'RPL': 45,
            'FXS': 8,
            'CVX': 4.5,

            // Chain-specific tokens
            ...(chainId === 8453 ? {
                // Base specific
                'BALD': 0.0001,
                'BRETT': 0.15,
                'DEGEN': 0.01,
                'TOSHI': 0.0001,
                'BASED': 0.001,
            } : {}),

            ...(chainId === 42161 ? {
                // Arbitrum specific
                'GMX': 45,
                'GLP': 1.05,
                'MAGIC': 1.2,
                'DPX': 35,
                'JONES': 8,
                'GRAIL': 150,
                'PLS': 0.25,
            } : {}),

            ...(chainId === 10 ? {
                // Optimism specific
                'VELO': 0.08,
                'THALES': 0.6,
                'SNX': 3,
                'KWENTA': 45,
            } : {})
        };

        // Try exact match first
        if (fallbackPrices[symbol]) {
            return fallbackPrices[symbol];
        }

        // Try case insensitive match
        const lowerSymbol = symbol.toLowerCase();
        const matchingKey = Object.keys(fallbackPrices).find(key =>
            key.toLowerCase() === lowerSymbol
        );

        if (matchingKey) {
            return fallbackPrices[matchingKey];
        }

        return 0;
    }

    /**
     * Check cache for price data to reduce API calls
     */
    private getCachedPrice(symbol: string, chainId: number): number | null {
        const cacheKey = `${symbol}-${chainId}`;
        const cached = this.priceCache.get(cacheKey);

        if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
            console.log(`📋 Using cached price for ${symbol}: $${cached.price} [${cached.source}]`);
            return cached.price;
        }

        return null;
    }

    /**
     * Cache price data for future use
     */
    private setCachedPrice(symbol: string, chainId: number, price: number, source: string): void {
        const cacheKey = `${symbol}-${chainId}`;
        this.priceCache.set(cacheKey, {
            price,
            timestamp: Date.now(),
            source
        });
    }

    /**
     * Fetch price from CoinGecko as ultimate fallback
     * This is a last resort when 1inch API doesn't have the token
     */
    private async getCoinGeckoPrice(symbol: string): Promise<number> {
        try {
            // Simple CoinGecko API call (no API key needed for basic usage)
            const response = await fetch(
                `https://api.coingecko.com/api/v3/simple/price?ids=${symbol.toLowerCase()}&vs_currencies=usd`,
                {
                    headers: { 'Accept': 'application/json' },
                    // Add timeout and error handling
                    signal: AbortSignal.timeout(5000) // 5 second timeout
                }
            );

            if (response.ok) {
                const data = await response.json();
                const price = data[symbol.toLowerCase()]?.usd;
                if (price && typeof price === 'number') {
                    console.log(`🦎 CoinGecko price for ${symbol}: $${price}`);
                    return price;
                }
            }
        } catch (error) {
            console.warn(`CoinGecko API failed for ${symbol}:`, error);
        }
        return 0;
    }

    /**
     * Clean 1inch-only approach for portfolio fetching
     * Step 1: Load tokens, Step 2: Get balances, Step 3: Fetch prices in batches
     */
    async getUserPortfolio(walletAddress: Address, chainId: number): Promise<{
        tokens: Array<{
            address: Address;
            symbol: string;
            name: string;
            decimals: number;
            logoURI?: string;
            balance: string;
            balanceFormatted: string;
            usdPrice: number;
            usdValue: number;
            percentage: number;
        }>;
        totalUsdValue: number;
        lastUpdated: string;
        priceDataSource: string;
    }> {
        console.log(`🔍 Fetching complete portfolio for ${walletAddress} on chain ${chainId}`);

        try {
            // Step 1: Get all available tokens from 1inch
            console.log('📚 Step 1: Loading all available tokens...');
            const tokensResponse = await this.getTokens(chainId);
            const availableTokens = Object.keys(tokensResponse.tokens);
            console.log(`📚 Found ${availableTokens.length} available tokens on chain ${chainId}`);

            // Step 2: Get user's token balances for ALL available tokens
            console.log('💰 Step 2: Checking user balances...');
            const customBalances = await this.getCustomTokenBalances(
                walletAddress,
                chainId,
                availableTokens as Address[]
            );

            // Filter tokens that user actually owns
            const tokensWithBalances = availableTokens.filter(address => {
                const balance = customBalances[address];
                return balance && balance !== '0';
            });

            console.log(`🎯 Found ${tokensWithBalances.length} tokens with balances:`, tokensWithBalances.slice(0, 5));

            if (tokensWithBalances.length === 0) {
                return {
                    tokens: [],
                    totalUsdValue: 0,
                    lastUpdated: new Date().toISOString(),
                    priceDataSource: '1inch API - no tokens found'
                };
            }

            // Step 3: Fetch prices for user's tokens in batches from 1inch
            console.log('💸 Step 3: Fetching prices in batches from 1inch API...');
            const priceData = await this.fetchPricesInBatches(chainId, tokensWithBalances as Address[]);
            console.log(`💸 Got prices for ${Object.keys(priceData).length} tokens from 1inch`);

            // Step 4: Build portfolio with price data
            const portfolioTokens = tokensWithBalances.map(address => {
                const tokenMetadata = tokensResponse.tokens[address as Address];
                const balance = customBalances[address];
                const price = priceData[address as Address] || priceData[address.toLowerCase() as Address] || '0';

                if (!tokenMetadata) {
                    console.warn(`No metadata found for token ${address}`);
                    return null;
                }

                // Convert balance to human readable format
                const balanceInWei = BigInt(balance);
                const decimals = tokenMetadata.decimals || 18;
                const divisor = BigInt(10 ** decimals);
                const humanBalance = Number(balanceInWei) / Number(divisor);

                // Parse USD price from 1inch
                const usdPrice = parseFloat(price);
                const usdValue = humanBalance * usdPrice;

                console.log(`✅ ${tokenMetadata.symbol}: ${humanBalance.toFixed(6)} @ $${usdPrice} = $${usdValue.toFixed(2)}`);

                return {
                    address: address as Address,
                    symbol: tokenMetadata.symbol,
                    name: tokenMetadata.name,
                    decimals: tokenMetadata.decimals,
                    logoURI: tokenMetadata.logoURI,
                    balance,
                    balanceFormatted: humanBalance.toFixed(6),
                    usdPrice,
                    usdValue,
                    percentage: 0 // Will be calculated after total
                };
            }).filter(Boolean) as any[];

            // Calculate total USD value and percentages
            const totalUsdValue = portfolioTokens.reduce((sum, token) => sum + token.usdValue, 0);

            // Update percentages
            portfolioTokens.forEach(token => {
                token.percentage = totalUsdValue > 0 ? (token.usdValue / totalUsdValue) * 100 : 0;
            });

            // Sort by USD value (highest first)
            portfolioTokens.sort((a, b) => b.usdValue - a.usdValue);

            console.log(`💰 Portfolio Summary:`);
            console.log(`  - Total tokens with balances: ${portfolioTokens.length}`);
            console.log(`  - Tokens with prices: ${portfolioTokens.filter(t => t.usdPrice > 0).length}`);
            console.log(`  - Total value: $${totalUsdValue.toFixed(2)}`);

            return {
                tokens: portfolioTokens,
                totalUsdValue,
                lastUpdated: new Date().toISOString(),
                priceDataSource: '1inch Price API'
            };

        } catch (error) {
            console.error('❌ Failed to fetch user portfolio:', error);
            throw error;
        }
    }

    /**
     * Fetch prices in batches to respect 1inch API limits
     * Clean batch processing with proper error handling
     */
    private async fetchPricesInBatches(chainId: number, tokenAddresses: Address[]): Promise<Record<Address, string>> {
        const batchSize = 50; // 1inch API recommended batch size
        const allPrices: Record<Address, string> = {};

        console.log(`💸 Starting batch price fetch for ${tokenAddresses.length} tokens (${Math.ceil(tokenAddresses.length / batchSize)} batches)`);

        for (let i = 0; i < tokenAddresses.length; i += batchSize) {
            const batch = tokenAddresses.slice(i, i + batchSize);
            const batchNumber = Math.floor(i / batchSize) + 1;
            const totalBatches = Math.ceil(tokenAddresses.length / batchSize);

            console.log(`💸 Fetching batch ${batchNumber}/${totalBatches}: ${batch.length} tokens`);

            try {
                const batchPrices = await this.getPrices(chainId, batch);
                Object.assign(allPrices, batchPrices);

                console.log(`✅ Batch ${batchNumber} complete: ${Object.keys(batchPrices).length} prices received`);

                // Small delay between batches to be respectful to 1inch API
                if (i + batchSize < tokenAddresses.length) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            } catch (error) {
                console.warn(`⚠️ Batch ${batchNumber} failed:`, error);
                // Continue with other batches even if one fails
            }
        }

        console.log(`✅ Batch price fetch complete: ${Object.keys(allPrices).length} total prices collected`);
        return allPrices;
    }

    /**
     * Manual price refresh method for user-triggered updates
     * This gives users full control over when to fetch latest prices
     */
    async refreshPricesForTokens(chainId: number, tokenAddresses: Address[]): Promise<Record<Address, string>> {
        console.log(`🔄 Manual price refresh requested for ${tokenAddresses.length} tokens on chain ${chainId}`);
        return this.fetchPricesInBatches(chainId, tokenAddresses);
    }

    /**
     * Get comprehensive portfolio data including all tokens
     * This method fetches complete portfolio information
     */
    async getCompletePortfolio(walletAddress: Address, chainId: number): Promise<{
        balances: OneInchBalanceAPIResponse;
        topTokens: Record<Address, any>;
        customBalances: Record<string, string>;
        prices: Record<Address, { price: string; priceUSD: string; symbol: string; decimals: number; timestamp: number; confidence: number; }>;
    }> {
        try {
            // First, get all available tokens for the chain
            const tokensResponse = await this.getTokens(chainId);

            // Get basic balances
            const balances = await this.getBalances(walletAddress, chainId);

            // Get top 200 token addresses for comprehensive checking
            const topTokenAddresses = Object.keys(tokensResponse.tokens).slice(0, 200) as Address[];

            // Get custom token balances for major tokens
            const customBalances = await this.getCustomTokenBalances(walletAddress, chainId, topTokenAddresses);

            // Get token addresses that have balances for price fetching
            const tokensWithBalances: Address[] = [];

            // Add tokens from basic balances
            console.log('Processing basic balances:', Object.keys(balances));
            Object.entries(balances).forEach(([address, balanceData]) => {
                console.log(`Balance for ${address}:`, balanceData);
                if (balanceData && balanceData.balance && balanceData.balance !== '0') {
                    tokensWithBalances.push(address as Address);
                    console.log(`Added ${address} to tokens with balances`);
                }
            });

            // Add tokens from custom balances
            console.log('Processing custom balances:', Object.keys(customBalances));
            Object.entries(customBalances).forEach(([address, balance]) => {
                console.log(`Custom balance for ${address}: ${balance}`);
                if (balance && balance !== '0' && !tokensWithBalances.includes(address as Address)) {
                    tokensWithBalances.push(address as Address);
                    console.log(`Added ${address} to tokens with balances from custom`);
                }
            });

            console.log('Final tokens with balances:', tokensWithBalances);

            // Get prices for tokens with balances (if any)
            let prices = {};
            if (tokensWithBalances.length > 0) {
                try {
                    console.log('Fetching prices for tokens with balances:', tokensWithBalances);
                    prices = await this.getPrices(chainId, tokensWithBalances);
                    console.log('Price data received:', prices);
                    console.log('Price data keys:', Object.keys(prices));
                    console.log('Price data sample:', Object.entries(prices).slice(0, 3));
                } catch (priceError) {
                    console.warn('Failed to fetch token prices, will use fallback:', priceError);
                    // Continue without prices rather than failing the entire portfolio fetch
                }
            } else {
                console.log('No tokens with balances found, skipping price fetch');
            }

            return {
                balances,
                topTokens: tokensResponse.tokens,
                customBalances,
                prices
            };
        } catch (error) {
            console.error('Failed to fetch complete portfolio:', error);
            return {
                balances: {} as OneInchBalanceAPIResponse,
                topTokens: {},
                customBalances: {},
                prices: {}
            };
        }
    }

    /**
     * Get token prices in USD
     * @param chainId The ID of the blockchain network.
     * @param tokenAddresses Optional: Specific token addresses to query.
     * @param currency The currency to get prices in (e.g., 'USD').
     */
    async getPrices(
        chainId: number,
        tokenAddresses?: Address[],
        currency: string = 'USD'
    ): Promise<Record<Address, string>> {
        try {
            const params: Record<string, any> = { currency: currency.toLowerCase() };
            if (tokenAddresses && tokenAddresses.length > 0) {
                params.tokens = tokenAddresses.join(',');
                console.log(`Fetching prices for ${tokenAddresses.length} tokens:`, tokenAddresses.slice(0, 5));
            }

            // Correct price API URL structure for 1inch
            const priceUrl = `${this.apiBaseURL}/price/v1.1/${chainId}`;
            console.log('Price API URL:', priceUrl);
            console.log('Price API params:', params);

            const result = await this.makeRequest(priceUrl, 'GET', params);
            console.log('Raw price API response:', result);

            return result as Record<Address, string>;
        } catch (error) {
            console.error('Price API error:', error);
            throw error;
        }
    }

    /**
     * Get swap quote (no transaction)
     * @param params The quote parameters.
     * @param chainId The ID of the blockchain network.
     */
    async getQuote(params: OneInchQuoteParams, chainId: number): Promise<OneInchQuoteResponse> {
        // Use our API route that has proper authentication
        const url = `/api/1inch/quote`;
        const searchParams = new URLSearchParams({
            chainId: chainId.toString(),
            src: params.src,
            dst: params.dst,
            amount: params.amount,
            ...(params.includeGas && { includeGas: 'true' }),
            ...(params.includeProtocols && { includeProtocols: 'true' }),
            ...(params.includeTokensInfo && { includeTokensInfo: 'true' })
        });

        const response = await fetch(`${url}?${searchParams}`);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Quote API error: ${response.status} ${errorData.error || 'Unknown error'}`);
        }
        return response.json();
    }

    /**
     * Get swap transaction data  
     * @param params The swap parameters.
     * @param chainId The ID of the blockchain network.
     */
    async getSwap(params: OneInchSwapParams, chainId: number): Promise<OneInchSwapAPIResponse> {
        // Use our API route that has proper authentication
        const url = `/api/1inch/swap`;
        const searchParams = new URLSearchParams({
            chainId: chainId.toString(),
            src: params.src,
            dst: params.dst,
            amount: params.amount,
            from: params.from,
            slippage: params.slippage?.toString() || '1',
            ...(params.receiver && { receiver: params.receiver }),
            ...(params.disableEstimate && { disableEstimate: 'true' }),
            ...(params.allowPartialFill === false && { allowPartialFill: 'false' })
        });

        const response = await fetch(`${url}?${searchParams}`);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Swap API error: ${response.status} ${errorData.error || 'Unknown error'}`);
        }
        return response.json();
    }

    /**
     * Get approval transaction data for token spending
     * @param tokenAddress The address of the token to approve.
     * @param chainId The ID of the blockchain network.
     * @param amount Optional: The amount to approve.
     */
    async getApproveTransaction(tokenAddress: Address, chainId: number, amount?: string): Promise<OneInchApproveAPIResponse> {
        const params: Record<string, any> = { tokenAddress };
        if (amount) params.amount = amount;
        return this.makeRequest(`${this.getSwapBaseURL(chainId)}${API_ENDPOINTS.APPROVE}`, 'GET', params);
    }

    /**
     * Get spender address for approvals (the 1inch router address)
     * @param chainId The ID of the blockchain network.
     */
    async getSpender(chainId: number): Promise<{ address: Address }> {
        const data = await this.makeRequest(`${this.getSwapBaseURL(chainId)}${API_ENDPOINTS.APPROVE}/spender`);
        return { address: (data as any).address as Address }; // Fixed: Added type assertion
    }

    /**
     * Get current token allowance
     * @param tokenAddress The token address.
     * @param walletAddress The owner's wallet address.
     * @param spenderAddress The spender's address (e.g., 1inch router).
     * @param chainId The ID of the blockchain network.
     */
    async getAllowance(
        tokenAddress: Address,
        walletAddress: Address,
        spenderAddress: Address,
        chainId: number
    ): Promise<{ allowance: string }> {
        const params = { tokenAddress, walletAddress, spenderAddress };
        return this.makeRequest(`${this.getSwapBaseURL(chainId)}${API_ENDPOINTS.APPROVE}/allowance`, 'GET', params);
    }

    /**
     * Get current gas prices
     * @param chainId The ID of the blockchain network. Defaults to mainnet (1).
     */
    async getGasPrice(chainId: number = 1): Promise<OneInchGasPriceAPIResponse> {
        const data = await this.makeRequest(`${this.apiBaseURL}${API_ENDPOINTS.GAS_PRICE}/${chainId}`);
        return data as OneInchGasPriceAPIResponse;
    }
}

// Create singleton instance
export const oneInchAPI = new OneInchAPI();