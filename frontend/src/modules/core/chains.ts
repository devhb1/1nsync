/**
 * Multi-chain configuration for 1nsync
 * Contains all chain-specific data including contract addresses, 1inch routers, and RPC endpoints
 */

export interface ChainConfig {
    name: string;
    chainId: number;
    rpcUrl: string;
    explorer: string;
    nativeSymbol: string;
    logo: string;
    // 1inch Router Address (AggregationRouterV6)
    oneInchRouter: `0x${string}`;
    // Our deployed batch swapper contract address
    batchSwapperContract?: `0x${string}`;
    // Additional chain-specific settings
    isTestnet?: boolean;
    blockTime?: number; // in seconds
}

// 1inch Router Addresses (AggregationRouterV6) - Latest version
// Source: https://docs.1inch.io/docs/aggregation-protocol/smart-contract
export const ONEINCH_ROUTER_ADDRESSES = {
    ethereum: '0x111111125421cA6dc452d289314280a0f8842A65' as const,
    base: '0x111111125421cA6dc452d289314280a0f8842A65' as const,
    arbitrum: '0x111111125421cA6dc452d289314280a0f8842A65' as const,
    optimism: '0x111111125421cA6dc452d289314280a0f8842A65' as const,
} as const;

// Main chain configurations
export const CHAINS: Record<string, ChainConfig> = {
    base: {
        name: 'Base',
        chainId: 8453,
        rpcUrl: 'https://mainnet.base.org',
        explorer: 'https://basescan.org',
        nativeSymbol: 'ETH',
        logo: '🔵',
        oneInchRouter: ONEINCH_ROUTER_ADDRESSES.base,
        batchSwapperContract: '0xf84DA33B69Fb92F28997B1aB9Ad755d4E4E14D06', // Deployed on Base
        blockTime: 2,
    },
    arbitrum: {
        name: 'Arbitrum',
        chainId: 42161,
        rpcUrl: 'https://arb1.arbitrum.io/rpc',
        explorer: 'https://arbiscan.io',
        nativeSymbol: 'ETH',
        logo: '🔷',
        oneInchRouter: ONEINCH_ROUTER_ADDRESSES.arbitrum,
        batchSwapperContract: '0x5821173b323022dFc1549Be1a6Dee657997Ec5Db', // Deployed on Arbitrum
        blockTime: 1,
    },
    optimism: {
        name: 'Optimism',
        chainId: 10,
        rpcUrl: 'https://mainnet.optimism.io',
        explorer: 'https://optimistic.etherscan.io',
        nativeSymbol: 'ETH',
        logo: '🔴',
        oneInchRouter: ONEINCH_ROUTER_ADDRESSES.optimism,
        batchSwapperContract: '0x5821173b323022dFc1549Be1a6Dee657997Ec5Db', // Deployed on Optimism
        blockTime: 2,
    },
    ethereum: {
        name: 'Ethereum',
        chainId: 1,
        rpcUrl: 'https://eth.llamarpc.com',
        explorer: 'https://etherscan.io',
        nativeSymbol: 'ETH',
        logo: '⚪',
        oneInchRouter: ONEINCH_ROUTER_ADDRESSES.ethereum,
        // TODO: Deploy contract and update address (if needed)
        batchSwapperContract: undefined, // Will be set after deployment
        blockTime: 12,
    },
} as const;

// Currently supported chains for batch swapper
export const SUPPORTED_CHAINS = ['base', 'arbitrum', 'optimism'] as const;
export type SupportedChain = typeof SUPPORTED_CHAINS[number];

// Helper functions
export const getChainConfig = (chainId: number): ChainConfig | undefined => {
    return Object.values(CHAINS).find(chain => chain.chainId === chainId);
};

export const getChainByKey = (key: string): ChainConfig | undefined => {
    return CHAINS[key];
};

export const getSupportedChains = (): ChainConfig[] => {
    return SUPPORTED_CHAINS.map(key => CHAINS[key]).filter(Boolean);
};

export const isChainSupported = (chainId: number): boolean => {
    const chain = getChainConfig(chainId);
    return !!chain && !!chain.batchSwapperContract;
};

// Default chain (Base)
export const DEFAULT_CHAIN = 'base' as const;
export const DEFAULT_CHAIN_ID = CHAINS[DEFAULT_CHAIN].chainId;
