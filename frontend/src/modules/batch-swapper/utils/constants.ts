/**
 * BatchSwapper Constants - Dynamic Token Support
 * 
 * @deprecated Most of these constants are deprecated in favor of dynamic 1inch API integration
 * This file exists only for backwards compatibility and will be removed in future versions
 */

import { SUPPORTED_CHAINS } from './multi-chain-config';
import { portfolioService } from '../services/portfolioService';

// === TOKEN INTERFACES ===
export interface Token {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    logoURI?: string;
    isNative?: boolean;
}

// === DEPRECATED CONSTANTS ===
/**
 * @deprecated - Use portfolioService.getAllSupportedTokens() instead
 * This constant is kept for backwards compatibility but should not be used
 * All token management now goes through dynamic 1inch API integration
 */
export const POPULAR_TOKENS = {
    [SUPPORTED_CHAINS.ETHEREUM]: [],
    [SUPPORTED_CHAINS.BASE]: [],
    [SUPPORTED_CHAINS.ARBITRUM]: [],
    [SUPPORTED_CHAINS.OPTIMISM]: [],
} as const;

// === CORE CONSTANTS ===
export const NATIVE_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as const;

// === GAS CONSTANTS ===
export const GAS_ESTIMATES = {
    SIMPLE_SWAP: 150000,
    BATCH_SWAP: 250000,
    COMPLEX_BATCH: 400000,
    MAX_GAS_LIMIT: 1000000,
} as const;

// === DISPLAY CONSTANTS ===
export const MINIMUM_VALUES = {
    DISPLAY_USD: 0.01,
    SWAP_USD: 1.00,
    GAS_RESERVE_ETH: 0.001,
} as const;

// === HELPER FUNCTIONS ===
/**
 * Get native token representation for any chain
 */
export const getNativeToken = (chainId: number): Token => {
    return {
        address: NATIVE_TOKEN_ADDRESS,
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        isNative: true,
        logoURI: 'https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png'
    };
};

/**
 * @deprecated - Use portfolioService.searchTokens() instead
 * Get token by symbol for a specific chain
 */
export const getTokenBySymbol = async (chainId: number, symbol: string): Promise<Token | null> => {
    try {
        const tokens = await portfolioService.getAllSupportedTokens(chainId);
        const tokenArray = Object.values(tokens);
        return tokenArray.find(token => token.symbol?.toLowerCase() === symbol.toLowerCase()) || null;
    } catch (error) {
        console.warn('Failed to search for token:', error);
        return null;
    }
};

/**
 * @deprecated - Use getNativeToken() instead
 * Get native token for a specific chain
 */
export const getNativeTokenForChain = (chainId: number): Token => {
    return getNativeToken(chainId);
};

/**
 * @deprecated - Use portfolioService.getAllSupportedTokens() instead
 * Get all tokens for a chain
 */
export const getTokensForChain = async (chainId: number): Promise<Token[]> => {
    try {
        const tokens = await portfolioService.getAllSupportedTokens(chainId);
        return Object.values(tokens);
    } catch (error) {
        console.warn('Failed to fetch tokens for chain:', error);
        return [getNativeToken(chainId)];
    }
};
