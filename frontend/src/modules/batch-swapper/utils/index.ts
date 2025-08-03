/**
 * BatchSwapper Utils - Clean Organization
 * Organized exports for the batch swapper module with dynamic 1inch integration
 */

// === CORE CONFIGURATION ===
export * from './multi-chain-config'

// === CONTRACT UTILITIES ===
export * from './contract-utils'

// === FORMATTING UTILITIES ===
export * from './formatting'

// === CALCULATION UTILITIES ===
export {
    formatUnits,
    parseUnits,
    formatCurrency,
    formatPercentage,
    formatGas,
    formatEther,
    validateAllocationPercentages,
    calculatePriceImpact,
    calculateGasSavings,
    weiToGwei,
    gweiToWei,
    formatTokenBalance,
    calculateAllocationPercentage,
    formatLargeNumber,
    calculatePortfolioPercentages,
    calculateTotalPortfolioValue,
} from './calculations'

export type { AllocationValidation } from './calculations'

// === MULTI-CHAIN CONFIGURATION EXPORTS ===
export {
    // Chain configuration
    SUPPORTED_CHAINS,
    CHAIN_CONFIG,
    CONTRACT_ADDRESSES,
    ONEINCH_CONFIG,
    NATIVE_TOKENS,

    // Utility functions
    isChainSupported,
    getChainConfig,
    getDeploymentInfo,
    getContractAddress,
    getRouterAddress,
    isDeployedOnChain,
    isBatchSwapperDeployed,
    getAllSupportedChains,
    getSupportedChains,
    getNativeToken,
    filterQualityTokens,
    getDeployedChains,

    // Configuration objects
    TOKEN_FILTER_CONFIG,
    PORTFOLIO_CONFIG,
    PRIMARY_DEPLOYMENT,
    API_ENDPOINTS,
} from './multi-chain-config'

export type {
    SupportedChainId,
    Token as MultiChainToken
} from './multi-chain-config'

// === BACKWARD COMPATIBILITY CONSTANTS ===
export {
    POPULAR_TOKENS,
    NATIVE_TOKEN_ADDRESS,
    GAS_ESTIMATES,
    MINIMUM_VALUES,
    getNativeTokenForChain,
    getTokensForChain,
} from './constants'

// Remove duplicate Token export - use types from main types file
// export type { Token } from './constants'

// === BACKWARD COMPATIBILITY ALIASES ===
export {
    POPULAR_TOKENS as SUPPORTED_TOKENS,
} from './constants'

// === CONTRACT ABI ===
export { default as BatchSwapperV2ABI } from './BatchSwapperV2.json'

// === RE-EXPORTS FOR CONVENIENCE ===
export type { ContractSwapParams } from '../types'

// === LEGACY ALIASES ===
export {
    CONTRACT_ADDRESSES as BATCH_SWAPPER_ADDRESSES,
    ONEINCH_CONFIG as ONEINCH_ROUTER_ADDRESSES,
    getAllSupportedChains as NETWORK_CONFIG,
} from './multi-chain-config'