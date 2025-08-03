/**
 * Portfolio Service - Real Portfolio Management using 1inch API
 * Fetches and manages user's complete portfolio across all supported tokens
 */

import { Address } from 'viem';
import { oneInchAPI } from './oneInchAPI';
import { formatUnits } from '../utils/calculations';
import { PORTFOLIO_CONFIG } from '../utils/multi-chain-config';

// === TYPES ===
export interface PortfolioToken {
    address: Address;
    symbol: string;
    name: string;
    decimals: number;
    logoURI?: string;
    balance: bigint;
    balanceFormatted: string;
    balanceUSD?: number;
    priceUSD?: number;
    priceChange24h?: number;
    isNative?: boolean;
}

export interface UserPortfolio {
    address: Address;
    chainId: number;
    chainName: string;
    tokens: PortfolioToken[];
    totalValueUSD: number;
    tokenCount: number;
    lastUpdated: number;
    hasBalances: boolean;
    priceDataSource?: string; // Track where price data came from
}

export interface PortfolioSummary {
    totalValueUSD: number;
    tokenCount: number;
    topTokens: PortfolioToken[];
    recentlyUpdated: boolean;
}

// === PORTFOLIO SERVICE ===
export class PortfolioService {
    private static instance: PortfolioService;
    private portfolioCache = new Map<string, UserPortfolio>();
    private tokenCache = new Map<string, Record<Address, any>>();

    public static getInstance(): PortfolioService {
        if (!PortfolioService.instance) {
            PortfolioService.instance = new PortfolioService();
        }
        return PortfolioService.instance;
    }

    /**
     * Get complete user portfolio using clean 1inch-only approach
     * This now uses the simplified oneInchAPI.getUserPortfolio method
     */
    async getUserPortfolio(
        userAddress: Address,
        chainId: number
    ): Promise<UserPortfolio> {
        const cacheKey = `${userAddress}-${chainId}`;
        const cached = this.portfolioCache.get(cacheKey);

        // Return cached if recent
        if (cached && Date.now() - cached.lastUpdated < PORTFOLIO_CONFIG.cacheTimeout) {
            return cached;
        }

        try {
            console.log(`📊 Using clean 1inch-only portfolio fetch for ${userAddress} on chain ${chainId}`);

            // Use our new clean 1inch-only implementation
            const portfolioData = await oneInchAPI.getUserPortfolio(userAddress, chainId);

            // Convert to our internal format
            const portfolioTokens: PortfolioToken[] = portfolioData.tokens.map(token => ({
                address: token.address,
                symbol: token.symbol,
                name: token.name,
                decimals: token.decimals,
                logoURI: token.logoURI,
                balance: BigInt(token.balance),
                balanceFormatted: token.balanceFormatted,
                balanceUSD: token.usdValue,
                priceUSD: token.usdPrice,
                isNative: token.address.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
            }));

            const portfolio: UserPortfolio = {
                address: userAddress,
                chainId,
                chainName: this.getChainName(chainId),
                tokens: portfolioTokens.slice(0, PORTFOLIO_CONFIG.maxTokensToShow),
                totalValueUSD: portfolioData.totalUsdValue,
                tokenCount: portfolioTokens.length,
                lastUpdated: Date.now(),
                hasBalances: portfolioTokens.length > 0,
                priceDataSource: portfolioData.priceDataSource // Track data source
            };

            // Cache the result
            this.portfolioCache.set(cacheKey, portfolio);

            console.log(`✅ Clean portfolio loaded: ${portfolio.tokenCount} tokens, $${portfolio.totalValueUSD.toFixed(2)} total value [${portfolioData.priceDataSource}]`);

            return portfolio;

        } catch (error) {
            console.error('❌ Failed to fetch user portfolio:', error);

            // Return empty portfolio on error
            return {
                address: userAddress,
                chainId,
                chainName: this.getChainName(chainId),
                tokens: [],
                totalValueUSD: 0,
                tokenCount: 0,
                lastUpdated: Date.now(),
                hasBalances: false
            };
        }
    }

    /**
     * Get all supported tokens for a chain (no filtering)
     */
    async getAllSupportedTokens(chainId: number): Promise<Record<Address, any>> {
        const cacheKey = `tokens-${chainId}`;
        const cached = this.tokenCache.get(cacheKey);

        if (cached) {
            return cached;
        }

        try {
            const { tokens } = await oneInchAPI.getTokens(chainId);
            this.tokenCache.set(cacheKey, tokens);
            return tokens;
        } catch (error) {
            console.error('Failed to fetch supported tokens:', error);
            return {};
        }
    }

    /**
     * Find token by symbol or address
     */
    async findToken(
        searchTerm: string,
        chainId: number
    ): Promise<PortfolioToken | null> {
        const tokens = await this.getAllSupportedTokens(chainId);

        // Search by address first
        const byAddress = tokens[searchTerm as Address];
        if (byAddress) {
            return {
                address: searchTerm as Address,
                symbol: byAddress.symbol,
                name: byAddress.name,
                decimals: byAddress.decimals,
                logoURI: byAddress.logoURI,
                balance: 0n,
                balanceFormatted: '0',
                isNative: searchTerm.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
            };
        }

        // Search by symbol
        const bySymbol = Object.entries(tokens).find(([_, token]) =>
            token.symbol?.toLowerCase() === searchTerm.toLowerCase()
        );

        if (bySymbol) {
            const [address, token] = bySymbol;
            return {
                address: address as Address,
                symbol: token.symbol,
                name: token.name,
                decimals: token.decimals,
                logoURI: token.logoURI,
                balance: 0n,
                balanceFormatted: '0',
                isNative: address.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
            };
        }

        return null;
    }

    /**
     * Get portfolio summary
     */
    getPortfolioSummary(portfolio: UserPortfolio): PortfolioSummary {
        return {
            totalValueUSD: portfolio.totalValueUSD,
            tokenCount: portfolio.tokenCount,
            topTokens: portfolio.tokens.slice(0, 5),
            recentlyUpdated: Date.now() - portfolio.lastUpdated < 60000 // 1 minute
        };
    }

    /**
     * Clear cache for a specific user/chain or all
     */
    clearCache(userAddress?: Address, chainId?: number) {
        if (userAddress && chainId) {
            this.portfolioCache.delete(`${userAddress}-${chainId}`);
        } else {
            this.portfolioCache.clear();
            this.tokenCache.clear();
        }
    }

    private getChainName(chainId: number): string {
        const chainNames: Record<number, string> = {
            1: 'Ethereum',
            8453: 'Base',
            42161: 'Arbitrum',
            10: 'Optimism',
            137: 'Polygon'
        };
        return chainNames[chainId] || `Chain ${chainId}`;
    }
}

// Export singleton instance
export const portfolioService = PortfolioService.getInstance();
