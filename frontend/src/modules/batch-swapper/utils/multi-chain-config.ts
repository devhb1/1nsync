/**
 * Multi-Chain Token Management Service
 * Integrated configuration for consistent multi-chain support
 */

import { Address } from 'viem'
import { CHAINS, SUPPORTED_CHAINS as CORE_SUPPORTED_CHAINS, type SupportedChain } from '@/modules/core/chains'

// === CHAIN INTEGRATION ===
// Map core chains to batch swapper chain IDs
export const SUPPORTED_CHAINS = {
    ETHEREUM: 1,
    BASE: 8453,
    ARBITRUM: 42161,
    OPTIMISM: 10,
} as const

export type SupportedChainId = typeof SUPPORTED_CHAINS[keyof typeof SUPPORTED_CHAINS]

// === CHAIN CONFIGURATIONS ===
// Use core chain config as source of truth
export const CHAIN_CONFIG = {
    [SUPPORTED_CHAINS.ETHEREUM]: {
        name: CHAINS.ethereum.name,
        symbol: CHAINS.ethereum.nativeSymbol,
        rpcUrl: CHAINS.ethereum.rpcUrl,
        blockExplorer: CHAINS.ethereum.explorer,
        oneInchSupported: true,
        batchSwapperDeployed: !!CHAINS.ethereum.batchSwapperContract,
    },
    [SUPPORTED_CHAINS.BASE]: {
        name: CHAINS.base.name,
        symbol: CHAINS.base.nativeSymbol,
        rpcUrl: CHAINS.base.rpcUrl,
        blockExplorer: CHAINS.base.explorer,
        oneInchSupported: true,
        batchSwapperDeployed: !!CHAINS.base.batchSwapperContract,
    },
    [SUPPORTED_CHAINS.ARBITRUM]: {
        name: CHAINS.arbitrum.name,
        symbol: CHAINS.arbitrum.nativeSymbol,
        rpcUrl: CHAINS.arbitrum.rpcUrl,
        blockExplorer: CHAINS.arbitrum.explorer,
        oneInchSupported: true,
        batchSwapperDeployed: !!CHAINS.arbitrum.batchSwapperContract,
    },
    [SUPPORTED_CHAINS.OPTIMISM]: {
        name: CHAINS.optimism.name,
        symbol: CHAINS.optimism.nativeSymbol,
        rpcUrl: CHAINS.optimism.rpcUrl,
        blockExplorer: CHAINS.optimism.explorer,
        oneInchSupported: true,
        batchSwapperDeployed: !!CHAINS.optimism.batchSwapperContract,
    },
} as const

// === CONTRACT ADDRESSES ===
// Use addresses from core chain configuration
export const CONTRACT_ADDRESSES = {
    batchSwapper: {
        [SUPPORTED_CHAINS.ETHEREUM]: (CHAINS.ethereum.batchSwapperContract || '0x0000000000000000000000000000000000000000') as Address,
        [SUPPORTED_CHAINS.BASE]: CHAINS.base.batchSwapperContract as Address,
        [SUPPORTED_CHAINS.ARBITRUM]: CHAINS.arbitrum.batchSwapperContract as Address,
        [SUPPORTED_CHAINS.OPTIMISM]: CHAINS.optimism.batchSwapperContract as Address,
    },
    oneInchRouter: {
        [SUPPORTED_CHAINS.ETHEREUM]: CHAINS.ethereum.oneInchRouter as Address,
        [SUPPORTED_CHAINS.BASE]: CHAINS.base.oneInchRouter as Address,
        [SUPPORTED_CHAINS.ARBITRUM]: CHAINS.arbitrum.oneInchRouter as Address,
        [SUPPORTED_CHAINS.OPTIMISM]: CHAINS.optimism.oneInchRouter as Address,
    },
} as const

// === 1INCH API CONFIGURATION ===
export const ONEINCH_CONFIG = {
    baseUrl: 'https://api.1inch.dev',
    version: 'v6.0',
    headers: {
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_ONEINCH_API_KEY}`,
        'Content-Type': 'application/json',
    },
    endpoints: {
        tokens: '/tokens',
        prices: '/price/v1.1',
        swap: '/swap',
        quote: '/quote',
        approve: '/approve/transaction',
        gasPrice: '/gas-price',
    },
} as const

// === API ENDPOINTS (for backward compatibility) ===
export const API_ENDPOINTS = {
    TOKENS: '/tokens',
    PRICES: '/price/v1.1',
    SWAP: '/swap',
    QUOTE: '/quote',
    APPROVE: '/approve/transaction',
    GAS_PRICE: '/gas-price',
} as const

// === TOKEN FILTERING CONFIGURATION ===
export const TOKEN_FILTER_CONFIG = {
    // Minimum market cap (in USD) to be considered
    minMarketCap: 1000000, // $1M

    // Minimum daily volume (in USD) to be considered
    minDailyVolume: 100000, // $100K

    // Maximum tokens per chain
    maxTokensPerChain: 200,

    // Known quality projects (always include if available)
    qualityTokens: new Set([
        'WETH', 'USDC', 'USDT', 'DAI', 'WBTC', 'UNI', 'LINK', 'AAVE', 'CRV', 'COMP',
        'SUSHI', 'YFI', 'SNX', 'MKR', 'GRT', 'LDO', 'RPL', 'FRAX', 'LUSD', 'FXS',
        'cbETH', 'rETH', 'stETH', 'wstETH', 'USDC.e', 'WETH.e', 'ARB', 'OP'
    ]),

    // Known memecoins and low-quality tokens to exclude
    excludedTokens: new Set([
        'SHIB', 'DOGE', 'PEPE', 'FLOKI', 'SAFEMOON', 'ELONMUSK', 'BABYDOGE',
        'KISHU', 'HOGE', 'AKITA', 'LEASH', 'BONE', 'RYOSHI'
    ]),

    // Exclude tokens with these patterns in name/symbol
    excludePatterns: [
        /\d+DOGE/i, // Number variations of DOGE
        /\d+INU/i,  // Number variations of INU
        /SAFE\w*/i, // SAFE tokens
        /BABY\w*/i, // BABY tokens
        /MOON\w*/i, // MOON tokens
        /ROCKET/i,  // ROCKET tokens
        /ELON/i,    // ELON tokens
        /MARS/i,    // MARS tokens
    ],

    // Minimum symbol length (exclude very short symbols that are often spam)
    minSymbolLength: 2,

    // Maximum symbol length (exclude very long symbols that are often spam)
    maxSymbolLength: 10,
}

// === NATIVE TOKENS FOR EACH CHAIN ===
export const NATIVE_TOKENS = {
    [SUPPORTED_CHAINS.ETHEREUM]: {
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        chainId: SUPPORTED_CHAINS.ETHEREUM,
        logoURI: 'https://wallet-api-production.s3.amazonaws.com/uploads/tokens/eth_288.png',
    },
    [SUPPORTED_CHAINS.BASE]: {
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        chainId: SUPPORTED_CHAINS.BASE,
        logoURI: 'https://wallet-api-production.s3.amazonaws.com/uploads/tokens/eth_288.png',
    },
    [SUPPORTED_CHAINS.ARBITRUM]: {
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        chainId: SUPPORTED_CHAINS.ARBITRUM,
        logoURI: 'https://wallet-api-production.s3.amazonaws.com/uploads/tokens/eth_288.png',
    },
    [SUPPORTED_CHAINS.OPTIMISM]: {
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        chainId: SUPPORTED_CHAINS.OPTIMISM,
        logoURI: 'https://wallet-api-production.s3.amazonaws.com/uploads/tokens/eth_288.png',
    },
} as const

// === CHAIN UTILITY FUNCTIONS ===

/**
 * Check if a chain is supported
 */
export const isChainSupported = (chainId: number): chainId is SupportedChainId => {
    return Object.values(SUPPORTED_CHAINS).includes(chainId as SupportedChainId);
};

/**
 * Get chain configuration for a specific chain
 */
export const getChainConfig = (chainId: SupportedChainId) => {
    if (!isChainSupported(chainId)) {
        throw new Error(`Chain ${chainId} is not supported`);
    }
    return CHAIN_CONFIG[chainId];
};

/**
 * Get deployment info for a specific chain
 */
export const getDeploymentInfo = (chainId: SupportedChainId) => {
    const config = getChainConfig(chainId);
    return {
        chainId,
        chainName: config.name,
        nativeSymbol: config.symbol,
        batchSwapperAddress: CONTRACT_ADDRESSES.batchSwapper[chainId],
        routerAddress: CONTRACT_ADDRESSES.oneInchRouter[chainId],
        blockExplorer: config.blockExplorer,
        version: '2.0.0',
        deployedAt: '2025-08-01',
        status: config.batchSwapperDeployed ? 'PRODUCTION_READY' : 'NOT_DEPLOYED',
    } as const;
};

/**
 * Get contract address for a specific chain
 */
export const getContractAddress = (chainId: SupportedChainId): Address => {
    return CONTRACT_ADDRESSES.batchSwapper[chainId];
};

/**
 * Get 1inch router address for a specific chain
 */
export const getRouterAddress = (chainId: SupportedChainId): Address => {
    return CONTRACT_ADDRESSES.oneInchRouter[chainId];
};

/**
 * Check if batch swapper is deployed on a chain
 */
export const isDeployedOnChain = (chainId: SupportedChainId): boolean => {
    const address = CONTRACT_ADDRESSES.batchSwapper[chainId];
    return address !== '0x0000000000000000000000000000000000000000';
};

// === PRIMARY DEPLOYMENT (BACKWARD COMPATIBILITY) ===
// This will be the default chain (Base) for backward compatibility
export const PRIMARY_DEPLOYMENT = getDeploymentInfo(SUPPORTED_CHAINS.BASE);

// === TOKEN MANAGEMENT ===

/**
 * Token interface for all chains
 */
export interface Token {
    symbol: string;
    name: string;
    address: string;
    decimals: number;
    chainId: SupportedChainId;
    logoURI?: string;
    priceUsd?: number;
    volume24h?: number;
    marketCap?: number;
}

/**
 * Get native token for a specific chain
 */
export const getNativeToken = (chainId: SupportedChainId): Token => {
    if (!isChainSupported(chainId)) {
        throw new Error(`Chain ${chainId} is not supported`);
    }
    return NATIVE_TOKENS[chainId];
};

/**
 * Filter tokens based on quality criteria
 */
export const filterQualityTokens = (tokens: Token[]): Token[] => {
    return tokens.filter(token => {
        // Include quality tokens
        if (TOKEN_FILTER_CONFIG.qualityTokens.has(token.symbol)) {
            return true;
        }

        // Exclude known bad tokens
        if (TOKEN_FILTER_CONFIG.excludedTokens.has(token.symbol)) {
            return false;
        }

        // Check symbol length
        if (token.symbol.length < TOKEN_FILTER_CONFIG.minSymbolLength ||
            token.symbol.length > TOKEN_FILTER_CONFIG.maxSymbolLength) {
            return false;
        }

        // Check exclude patterns
        for (const pattern of TOKEN_FILTER_CONFIG.excludePatterns) {
            if (pattern.test(token.symbol) || pattern.test(token.name)) {
                return false;
            }
        }

        // Check market cap and volume if available
        if (token.marketCap && token.marketCap < TOKEN_FILTER_CONFIG.minMarketCap) {
            return false;
        }

        if (token.volume24h && token.volume24h < TOKEN_FILTER_CONFIG.minDailyVolume) {
            return false;
        }

        return true;
    });
};

/**
 * Get all supported chain IDs
 */
export const getAllSupportedChains = (): SupportedChainId[] => {
    return Object.values(SUPPORTED_CHAINS);
};

/**
 * Get all supported chain IDs (alias for backward compatibility)
 */
export const getSupportedChains = (): SupportedChainId[] => {
    return getAllSupportedChains();
};

/**
 * Get all deployed chains (where batch swapper is deployed)
 */
export const getDeployedChains = (): SupportedChainId[] => {
    return getAllSupportedChains().filter(chainId => isDeployedOnChain(chainId));
};

/**
 * Check if batch swapper is deployed on a specific chain (alias for isDeployedOnChain)
 */
export const isBatchSwapperDeployed = (chainId: SupportedChainId): boolean => {
    return isDeployedOnChain(chainId);
};

/**
 * Portfolio configuration for balance fetching
 */
export const PORTFOLIO_CONFIG = {
    // Cache settings
    cacheTimeout: 2 * 60 * 1000, // 2 minutes
    maxRetries: 3,
    retryDelay: 1000, // 1 second

    // Filtering settings
    minBalanceThreshold: 0.01, // Minimum USD value to show
    maxTokensToShow: 50,

    // API settings
    batchSize: 10,
    requestTimeout: 30000, // 30 seconds
} as const;
