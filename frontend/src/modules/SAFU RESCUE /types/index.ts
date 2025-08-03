// SAFU RESCUE Types - MVP Emergency Wallet Rescue Type Definitions
import { Address } from 'viem';

// === CORE RESCUE TYPES ===

export interface RescuableAsset {
    token: {
        address: Address;
        symbol: string;
        name: string;
        decimals: number;
        logoURI?: string;
    };
    balance: bigint;
    balanceFormatted: string;
    valueUSD: number;
    priceUSD: number;
    isNative: boolean;
    priority: number; // Higher value = higher priority for rescue
    canSwap: boolean; // Whether this token can be swapped via 1inch
}

// === EXECUTION STATE TYPES ===

export type RescueExecutionState =
    | 'IDLE'
    | 'DISCOVERING_ASSETS'
    | 'APPROVING_TOKENS'
    | 'EXECUTING_SWAPS'
    | 'TRANSFERRING_ETH'
    | 'COMPLETED'
    | 'FAILED'
    | 'CANCELLED';

export interface RescueProgress {
    state: RescueExecutionState;
    currentStep: number;
    totalSteps: number;
    message: string;
    progress: number; // 0-100
    details?: {
        assetsDiscovered?: number;
        tokensApproved?: number;
        totalTokens?: number;
        swapsCompleted?: number;
        totalSwaps?: number;
        ethAccumulated?: bigint;
        lastTxHash?: string;
        errorMessage?: string;
    };
}

export interface RescueTransaction {
    hash: string;
    type: 'SWAP' | 'TRANSFER' | 'APPROVAL';
    fromToken?: Address;
    toToken?: Address;
    amount?: bigint;
    gasUsed?: bigint;
    status: 'PENDING' | 'SUCCESS' | 'FAILED';
    timestamp: number;
    errorMessage?: string;
}

// === RESCUE RESULT TYPES ===

export interface RescueResult {
    success: boolean;
    totalValueRescued: number; // USD
    totalETHRescued: bigint;
    totalGasSpent: number; // USD
    efficiency: number; // Percentage of value successfully rescued
    transactions: RescueTransaction[];
    failedAssets: RescuableAsset[];
    executionTimeSeconds: number;
    finalSafeWalletBalance: bigint;
}

export interface EmergencyRescueConfig {
    // Chain settings
    chainId: number;
    userAddress: Address;

    // Gas settings for emergency situations
    maxGasPriceGwei: number;
    gasLimitMultiplier: number; // Multiply estimated gas by this factor

    // Slippage settings for emergency
    emergencySlippageTolerance: number; // Higher tolerance for emergencies

    // Asset filtering
    minValueUSDToRescue: number; // Only rescue assets worth more than this
    maxAssetsToProcess: number; // Limit for gas optimization

    // Execution settings
    timeoutMinutes: number;
    retryAttempts: number;
    parallelSwaps: boolean; // Whether to batch swaps

    // Safety settings
    reserveETHForGas: bigint; // Keep this much ETH for gas costs
    validateAddresses: boolean;
}

// === HOOK RETURN TYPES ===

export interface UseEmergencyRescueReturn {
    // State
    rescuableAssets: RescuableAsset[];
    progress: RescueProgress;
    transactions: RescueTransaction[];

    // Actions
    discoverAssets: () => Promise<void>;
    executeCompleteRescue: (safeWallet: Address) => Promise<RescueResult>;
    cancelRescue: () => void;
    resetRescue: () => void;

    // Computed state
    isDiscovering: boolean;
    isExecuting: boolean;
    isCompleted: boolean;
    hasError: boolean;
    canExecute: boolean;

    // Results
    rescueResult: RescueResult | null;
    errorMessage: string | null;
}

// === SERVICE TYPES ===

export interface EmergencyRescueServiceConfig extends EmergencyRescueConfig {
    chainId: number;
    userAddress: Address;
}

// === UI COMPONENT PROPS ===

export interface SafuRescueInterfaceProps {
    className?: string;
    onRescueComplete?: (result: RescueResult) => void;
    onError?: (error: string) => void;
    config?: Partial<EmergencyRescueConfig>;
}

export interface RescueProgressProps {
    progress: RescueProgress;
    transactions: RescueTransaction[];
    onCancel?: () => void;
}

export interface AssetDiscoveryProps {
    assets: RescuableAsset[];
    isLoading: boolean;
    totalValueUSD: number;
    onRefresh?: () => void;
}

// === ERROR TYPES ===

export interface RescueError {
    code: string;
    message: string;
    details?: any;
    transaction?: string;
    recoverable: boolean;
}

export type RescueErrorCode =
    | 'INSUFFICIENT_GAS'
    | 'SWAP_FAILED'
    | 'TRANSFER_FAILED'
    | 'INVALID_ADDRESS'
    | 'NO_ASSETS_FOUND'
    | 'NETWORK_ERROR'
    | 'USER_REJECTED'
    | 'TIMEOUT'
    | 'UNKNOWN_ERROR';