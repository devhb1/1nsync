// src/types/index.ts - Clean MVP Types for 1inch Hackathon
import { Address } from 'viem';

// === CORE TOKEN TYPES ===
export interface Token {
    address: Address;
    symbol: string;
    name: string;
    decimals: number;
    logoURI?: string;
    chainId?: number;
    tags?: string[];
}

// === USER PORTFOLIO TYPES ===
export interface TokenBalance {
    token: Token;
    balance: bigint;
    balanceFormatted: string;
    priceUSD: number;
    valueUSD: number;
    percentage: number;
    // Legacy compatibility fields
    address?: Address;
    symbol?: string;
    name?: string;
    decimals?: number;
}

// Enhanced TokenBalance with all fields for components
export interface EnhancedTokenBalance extends TokenBalance {
    address: Address;
    symbol: string;
    name: string;
    decimals: number;
}

export interface PortfolioData {
    balances: TokenBalance[];
    totalValueUSD: number;
    chainId: number;
    lastUpdated: number;
}

// === PORTFOLIO ANALYSIS TYPES ===
export interface PortfolioAnalysis {
    balances: TokenBalance[];
    totalValue: number;
    totalValueUSD: number; // Add this for compatibility
    diversificationScore: number;
    riskScore: number;
    topHoldings: TokenBalance[];
    rebalanceRecommendations: string[];
    recommendations: string[];
    healthScore: number;
    allocation: Record<string, number>;
    lastAnalyzed: number;
    lastUpdated: number;
    tokenCount?: number; // Add this missing property
}

// === BATCH SWAP WORKFLOW TYPES ===
export interface AssetSelection {
    tokenAddress: Address;
    symbol: string;
    currentBalance: bigint;
    sellPercentage: number; // 0-100
    sellAmount: bigint;
    sellValueUSD: number;
}

export interface TargetAllocation {
    tokenAddress: Address;
    symbol: string;
    targetPercentage: number; // 0-100
    targetAmount: bigint;
    targetValueUSD: number;
}

// Enhanced AllocationTarget with additional fields for rebalancing
export interface AllocationTarget extends TargetAllocation {
    token: Token; // Keep token object
    percentage: number; // Add this for validation compatibility
    currentPercentage: number;
    difference: number;
    action: 'buy' | 'sell' | 'hold';
    amountRequired: bigint;
    amountRequiredFormatted: string;
}

export interface SwapInstruction {
    fromTokenAddress: Address;
    toTokenAddress: Address;
    amount: bigint;
    minAmountOut: bigint;
    valueUSD: number;
    priority?: number;
}

// === CONTRACT INTEGRATION TYPES ===
export interface ContractSwapParams {
    tokenIn: Address;
    tokenOut: Address;
    amountIn: bigint;
    minAmountOut: bigint;
    swapData: `0x${string}`; // 1inch calldata
}

export interface BatchSwapResult {
    tx: {
        to: Address;
        data: `0x${string}`;
        value: bigint;
        gas: bigint;
        gasPrice: bigint;
    };
    estimatedGas: bigint;
    estimatedGasSavings: bigint;
    swapCount: number;
    totalValueUSD: number;
}

// === WORKFLOW STATE TYPES ===
export type WorkflowStep = 'connect' | 'portfolio' | 'select' | 'allocate' | 'review' | 'execute';

export interface WorkflowState {
    currentStep: WorkflowStep;
    chainId: number;
    portfolio: PortfolioData | null;
    selectedAssets: AssetSelection[];
    targetAllocations: TargetAllocation[];
    swapInstructions: SwapInstruction[];
    batchResult: BatchSwapResult | null;
    isLoading: boolean;
    error: string | null;
}

// === EXECUTION TYPES ===
export interface ExecutionStep {
    id: string;
    type: 'approve' | 'batch_swap' | 'swap';
    status: 'pending' | 'executing' | 'completed' | 'failed';
    txHash?: string;
    error?: string;
    step?: number;
    action?: string; // Add for compatibility
}

export interface ApprovalNeeded {
    tokenAddress: Address;
    tokenSymbol: string;
    amount: bigint;
    currentAllowance: bigint;
}

// === GAS OPTIMIZATION TYPES ===
export interface GasEstimate {
    individualGas: bigint;
    batchGas: bigint;
    savings: bigint;
    savingsPercentage: number;
    savingsUSD: number;
}

export interface GasSavings {
    totalGasUsed: bigint;
    gasPrice: bigint;
    totalCostETH: number;
    totalCostUSD: number;
    individualGasTotal: bigint;
    batchGasTotal: bigint;
    absoluteSavings: bigint;
    percentageSavings: number;
    savingsUSD: number;
}

// === REBALANCING STRATEGY TYPES ===
export interface RebalanceStrategy {
    id: string;
    name: string;
    description: string;
    allocations: Record<Address, number>; // token address -> percentage
    riskLevel: 'conservative' | 'moderate' | 'aggressive';
    category: 'equal-weight' | 'market-cap' | 'custom';
}

// === OPTIMIZATION RESULT TYPES ===
export interface OptimizationResult {
    individualSwaps: SwapRoute[];
    batchSwap: SwapRoute | null;
    totalGasIndividual: bigint;
    totalGasBatch: bigint;
    swapInstructions?: SwapInstruction[]; // Add this for compatibility
    gasSavings: {
        absolute: bigint;
        percentage: number;
        savingsUSD: number;
    };
    executionSteps: ExecutionStep[];
    estimatedTime: number; // seconds
    priceImpact: number; // percentage
    recommendation: 'batch' | 'individual';
}

export interface GasPrice {
    slow: bigint;
    standard: bigint;
    fast: bigint;
    instant: bigint;
    currentGasPriceGwei: number;
    estimatedTime: {
        slow: number;
        standard: number;
        fast: number;
    };
}

export interface OptimizationConfig {
    maxSlippage: number; // Percentage (e.g., 1 for 1%)
    minSwapValueUSD: number;
    maxPriceImpact: number;
    maxGasPrice?: bigint;
}

// === 1INCH API TYPES ===
export interface OneInchQuoteParams {
    src: Address;
    dst: Address;
    amount: string;
    includeGas?: boolean;
    includeProtocols?: boolean;
    includeTokensInfo?: boolean;
}

export interface OneInchSwapParams {
    src: Address;
    dst: Address;
    amount: string;
    from: Address;
    slippage?: number;
    protocols?: string;
    disableEstimate?: boolean;
    allowPartialFill?: boolean;
    receiver?: Address;
}

export interface OneInchQuoteResponse {
    fromToken: {
        address: string;
        symbol: string;
        name: string;
        decimals: number;
    };
    toToken: {
        address: string;
        symbol: string;
        name: string;
        decimals: number;
    };
    fromTokenAmount: string;
    toTokenAmount: string;
    protocols: string[];
    estimatedGas?: number;
    priceImpact?: number;
}

export interface OneInchSwapResponse {
    fromToken: {
        address: string;
        symbol: string;
        name: string;
        decimals: number;
    };
    toToken: {
        address: string;
        symbol: string;
        name: string;
        decimals: number;
    };
    fromTokenAmount: string;
    toTokenAmount: string;
    tx: {
        from: string;
        to: string;
        data: string;
        value: string;
        gas: number;
        gasPrice: string;
    };
    protocols: string[];
}

export interface OneInchTokenResponse {
    tokens: Record<Address, {
        address: string;
        symbol: string;
        name: string;
        decimals: number;
        logoURI?: string;
        tags?: string[];
    }>;
}

export interface OneInchBalanceResponse {
    [tokenAddress: string]: {
        balance: string;
        name: string;
        symbol: string;
        decimals: number;
        price?: string;
        logoURI?: string;
    };
}

// API Response Wrapper Types
export interface OneInchBalanceAPIResponse {
    [tokenAddress: string]: {
        balance: string;
    };
}

export interface OneInchGasPriceAPIResponse {
    instant: string;
    fast: string;
    standard: string;
    slow: string;
}

export interface OneInchSwapAPIResponse extends OneInchSwapResponse {
    priceImpact?: number; // Add this missing property
}

export interface OneInchApproveAPIResponse {
    data: string;
    gasPrice: string;
    to: string;
    value: string;
}

export interface OneInchTokenAPIResponse {
    tokens: Record<Address, {
        address: string;
        symbol: string;
        name: string;
        decimals: number;
        logoURI?: string;
        tags?: string[];
    }>;
}

// Individual token response interface 
export interface OneInchTokenInfo {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    logoURI?: string;
    tags?: string[];
}

// DEX Protocol Type
export type DEXProtocol = string;

// === ERROR TYPES ===
export class BatchSwapperError extends Error {
    constructor(
        message: string,
        public code: string,
        public details?: Record<string, unknown>
    ) {
        super(message);
        this.name = 'BatchSwapperError';
    }
}

// === LEGACY COMPATIBILITY (DEPRECATED) ===
export interface SwapRoute {
    id: string;
    fromToken: Token;
    toToken: Token;
    fromAmount: bigint;
    toAmount: bigint;
    gasEstimate: bigint;
    priceImpact: number;
    protocols: string[];
    isBatch?: boolean;
    fromAmountFormatted?: string;
    toAmountFormatted?: string; // Add this
    valueUSD?: number;
    tx?: {
        to: Address;
        data: `0x${string}`;
        value: bigint;
        gasPrice: bigint;
        gas: bigint;
    };
}

// Backward compatibility aliases
export type BatchContractResult = BatchSwapResult;