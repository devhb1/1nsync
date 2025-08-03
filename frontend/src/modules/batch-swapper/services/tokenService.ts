/**
 * Token Management Service
 * Fetches, filters, and manages top 200 quality tokens from each supported chain
 * Enhanced with real portfolio fetching and dynamic token support
 */

import { Address } from 'viem';
import { oneInchAPI } from './oneInchAPI';
import {
    SUPPORTED_CHAINS,
    SupportedChainId,
    ONEINCH_CONFIG,
    TOKEN_FILTER_CONFIG,
    NATIVE_TOKENS,
    getChainConfig,
    isChainSupported
} from '../utils/multi-chain-config';

// === TOKEN TYPES ===
export interface Token {
    address: Address;
    symbol: string;
    name: string;
    decimals: number;
    logoURI?: string;
    isNative?: boolean;
}

export interface TokenWithMetrics extends Token {
    marketCap?: number;
    volume24h?: number;
    price?: number;
    priceChange24h?: number;
    liquidity?: number;
    score: number;
    rank: number;
    chainId: SupportedChainId;
}

export interface ChainTokens {
    chainId: SupportedChainId;
    chainName: string;
    tokens: TokenWithMetrics[];
    totalTokens: number;
    filteredTokens: number;
    lastUpdated: string;
    cacheExpiry: string;
}

// Cache for storing fetched tokens
const tokenCache = new Map<number, TokenWithMetrics[]>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const cacheTimestamps = new Map<number, number>();

// === TOKEN SERVICE CLASS ===
export class TokenService {
    private static instance: TokenService;
    private tokenCache = new Map<SupportedChainId, ChainTokens>()
    private cacheExpiry = new Map<SupportedChainId, number>()
    private readonly CACHE_DURATION = 30 * 60 * 1000 // 30 minutes

    static getInstance(): TokenService {
        if (!TokenService.instance) {
            TokenService.instance = new TokenService()
        }
        return TokenService.instance
    }

    /**
     * Fetch top 200 quality tokens for a specific chain
     */
    async fetchTop200Tokens(chainId: SupportedChainId): Promise<ChainTokens> {
        console.log(`🔍 Fetching top 200 tokens for chain ${chainId}...`)

        // Check cache first
        if (this.isCacheValid(chainId)) {
            console.log(`📦 Using cached tokens for chain ${chainId}`)
            return this.tokenCache.get(chainId)!
        }

        try {
            // Fetch all tokens from 1inch
            const allTokens = await this.fetch1inchTokens(chainId)
            console.log(`📥 Fetched ${allTokens.length} tokens from 1inch for chain ${chainId}`)

            // Filter and score tokens
            const filteredTokens = this.filterAndScoreTokens(allTokens, chainId)
            console.log(`🔍 Filtered to ${filteredTokens.length} quality tokens`)

            // Sort by score and take top 200
            const top200 = filteredTokens
                .sort((a, b) => b.score - a.score)
                .slice(0, TOKEN_FILTER_CONFIG.maxTokensPerChain)
                .map((token, index) => ({ ...token, rank: index + 1 }))

            const chainTokens: ChainTokens = {
                chainId,
                chainName: getChainConfig(chainId).name,
                tokens: top200,
                totalTokens: allTokens.length,
                filteredTokens: filteredTokens.length,
                lastUpdated: new Date().toISOString(),
                cacheExpiry: new Date(Date.now() + this.CACHE_DURATION).toISOString(),
            }

            // Cache the results
            this.tokenCache.set(chainId, chainTokens)
            this.cacheExpiry.set(chainId, Date.now() + this.CACHE_DURATION)

            console.log(`✅ Successfully cached top ${top200.length} tokens for ${chainTokens.chainName}`)
            return chainTokens

        } catch (error) {
            console.error(`❌ Failed to fetch tokens for chain ${chainId}:`, error)

            // Return cached data if available, otherwise return empty result with native token
            if (this.tokenCache.has(chainId)) {
                console.log(`🔄 Returning stale cache for chain ${chainId}`)
                return this.tokenCache.get(chainId)!
            }

            return this.getEmptyChainTokens(chainId)
        }
    }

    /**
     * Fetch tokens from 1inch API
     */
    private async fetch1inchTokens(chainId: SupportedChainId): Promise<Token[]> {
        const url = `${ONEINCH_CONFIG.baseUrl}/${ONEINCH_CONFIG.version}/${chainId}${ONEINCH_CONFIG.endpoints.tokens}`

        const response = await fetch(url, {
            headers: ONEINCH_CONFIG.headers,
        })

        if (!response.ok) {
            throw new Error(`1inch API error: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()

        // Convert 1inch token format to our format
        const tokens: Token[] = Object.entries(data.tokens || {}).map(([address, tokenData]: [string, any]) => ({
            address: address as Address,
            symbol: tokenData.symbol,
            name: tokenData.name,
            decimals: tokenData.decimals,
            logoURI: tokenData.logoURI,
            isNative: false,
        }))

        // Add native token
        const nativeToken = NATIVE_TOKENS[chainId]
        tokens.unshift(nativeToken)

        return tokens
    }

    /**
     * Filter and score tokens based on quality metrics
     */
    private filterAndScoreTokens(tokens: Token[], chainId: SupportedChainId): TokenWithMetrics[] {
        return tokens
            .filter(token => this.isQualityToken(token))
            .map(token => this.scoreToken(token, chainId))
            .filter(token => token.score > 0)
    }

    /**
     * Check if a token meets quality standards
     */
    private isQualityToken(token: Token): boolean {
        const { symbol, name } = token

        // Always include native tokens
        if (token.isNative) return true

        // Check if it's a known quality token
        if (TOKEN_FILTER_CONFIG.qualityTokens.has(symbol)) return true

        // Check if it's in the exclusion list
        if (TOKEN_FILTER_CONFIG.excludedTokens.has(symbol)) return false

        // Check symbol length
        if (symbol.length < TOKEN_FILTER_CONFIG.minSymbolLength ||
            symbol.length > TOKEN_FILTER_CONFIG.maxSymbolLength) return false

        // Check against exclude patterns
        for (const pattern of TOKEN_FILTER_CONFIG.excludePatterns) {
            if (pattern.test(symbol) || pattern.test(name)) return false
        }

        // Additional heuristics for spam detection
        if (this.isLikelySpam(token)) return false

        return true
    }

    /**
     * Additional spam detection heuristics
     */
    private isLikelySpam(token: Token): boolean {
        const { symbol, name } = token

        // Check for excessive emojis or special characters
        const emojiCount = (symbol.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu) || []).length
        if (emojiCount > 2) return true

        // Check for repetitive characters
        if (/(.)\1{3,}/.test(symbol)) return true

        // Check for common spam patterns
        const spamPatterns = [
            /\d+X/i,        // 100X, 1000X
            /TO THE MOON/i, // TO THE MOON
            /PUMP/i,        // PUMP
            /LAMBO/i,       // LAMBO
            /HODL/i,        // HODL
            /DIAMOND HANDS/i, // DIAMOND HANDS
        ]

        for (const pattern of spamPatterns) {
            if (pattern.test(name) || pattern.test(symbol)) return true
        }

        return false
    }

    /**
     * Score a token based on various quality metrics
     */
    private scoreToken(token: Token, chainId: SupportedChainId): TokenWithMetrics {
        let score = 0

        // Base score for being valid
        score += 10

        // Native token gets highest score
        if (token.isNative) {
            score += 1000
        }

        // Known quality tokens get high scores
        if (TOKEN_FILTER_CONFIG.qualityTokens.has(token.symbol)) {
            score += 500
        }

        // Score based on symbol characteristics
        if (token.symbol.length >= 3 && token.symbol.length <= 5) {
            score += 20 // Good symbol length
        }

        // Score based on name quality
        if (token.name && !token.name.includes('Token') && !token.name.includes('Coin')) {
            score += 10 // Has proper project name
        }

        // Deduct points for suspicious characteristics
        if (token.symbol.includes('2.0') || token.symbol.includes('V2')) {
            score -= 5 // Might be a fork
        }

        if (token.name && token.name.toLowerCase().includes('wrapped')) {
            score += 30 // Wrapped tokens are usually legitimate
        }

        return {
            ...token,
            score,
            rank: 0, // Will be set after sorting
            chainId,
        }
    }

    /**
     * Check if cache is still valid
     */
    private isCacheValid(chainId: SupportedChainId): boolean {
        const expiry = this.cacheExpiry.get(chainId)
        return expiry ? Date.now() < expiry : false
    }

    /**
     * Get empty result with just native token
     */
    private getEmptyChainTokens(chainId: SupportedChainId): ChainTokens {
        const nativeToken = NATIVE_TOKENS[chainId]
        const scoredNativeToken: TokenWithMetrics = {
            ...nativeToken,
            score: 1000,
            rank: 1,
            chainId,
        }

        return {
            chainId,
            chainName: getChainConfig(chainId).name,
            tokens: [scoredNativeToken],
            totalTokens: 1,
            filteredTokens: 1,
            lastUpdated: new Date().toISOString(),
            cacheExpiry: new Date(Date.now() + this.CACHE_DURATION).toISOString(),
        }
    }

    /**
     * Get tokens for all supported chains
     */
    async fetchAllChainTokens(): Promise<Record<SupportedChainId, ChainTokens>> {
        console.log('🌍 Fetching tokens for all supported chains...')

        const results: Record<SupportedChainId, ChainTokens> = {} as any

        await Promise.allSettled(
            Object.values(SUPPORTED_CHAINS).map(async (chainId: SupportedChainId) => {
                try {
                    results[chainId] = await this.fetchTop200Tokens(chainId)
                } catch (error) {
                    console.error(`Failed to fetch tokens for chain ${chainId}:`, error)
                    results[chainId] = this.getEmptyChainTokens(chainId)
                }
            })
        )

        console.log('✅ Completed fetching tokens for all chains')
        return results
    }

    /**
     * Search tokens across all chains
     */
    async searchTokens(query: string): Promise<TokenWithMetrics[]> {
        const allChainTokens = await this.fetchAllChainTokens()
        const results: TokenWithMetrics[] = []

        Object.values(allChainTokens).forEach(chainData => {
            const matches = chainData.tokens.filter(token =>
                token.symbol.toLowerCase().includes(query.toLowerCase()) ||
                token.name.toLowerCase().includes(query.toLowerCase()) ||
                token.address.toLowerCase() === query.toLowerCase()
            )
            results.push(...matches)
        })

        return results.sort((a, b) => b.score - a.score)
    }

    /**
     * Get cached tokens for a chain (non-async)
     */
    getCachedTokens(chainId: SupportedChainId): ChainTokens | null {
        return this.tokenCache.get(chainId) || null
    }

    /**
     * Clear cache for a specific chain
     */
    clearCache(chainId?: SupportedChainId): void {
        if (chainId) {
            this.tokenCache.delete(chainId)
            this.cacheExpiry.delete(chainId)
        } else {
            this.tokenCache.clear()
            this.cacheExpiry.clear()
        }
    }
}

// === SINGLETON INSTANCE ===
export const tokenService = TokenService.getInstance()

// === CONVENIENCE FUNCTIONS ===
export async function getTop200Tokens(chainId: SupportedChainId): Promise<ChainTokens> {
    return tokenService.fetchTop200Tokens(chainId)
}

export async function getAllChainTokens(): Promise<Record<SupportedChainId, ChainTokens>> {
    return tokenService.fetchAllChainTokens()
}

export async function searchTokens(query: string): Promise<TokenWithMetrics[]> {
    return tokenService.searchTokens(query)
}
