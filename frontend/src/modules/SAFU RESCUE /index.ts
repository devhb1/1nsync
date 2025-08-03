/**
 * SAFU RESCUE Module - Emergency Wallet Rescue
 * 
 * This module provides emergency wallet rescue functionality for 1inch hackathon.
 * It enables users to quickly discover and rescue assets from compromised wallets.
 * 
 * Key Features:
 * - Asset discovery using 1inch Balance API
 * - ERC-20 token approval automation
 * - Emergency swaps to ETH with proper slippage
 * - Direct transfer to safe wallet
 * 
 * Technical Implementation:
 * - 4-phase rescue process: Discovery → Approval → Swaps → Transfer
 * - Real-time progress tracking
 * - Transaction monitoring
 * - Error handling and recovery
 */

// Main page component
export { default as SafuRescuePage } from './pages/SafuRescuePage';

// Legacy component (backwards compatibility)
export { SafuRescueInterface } from './pages/SafuRescueInterface';

// MVP component
export { EmergencyRescueMVP } from './components/EmergencyRescueMVP';

// Hook
export { useEmergencyRescue } from './hooks/useEmergencyRescue';

// Service
export { emergencyRescueService, createEmergencyRescueService } from './services/emergencyRescueService';

// Types
export type {
    RescuableAsset,
    RescueExecutionState,
    RescueProgress,
    RescueTransaction,
    RescueResult,
    EmergencyRescueConfig,
    UseEmergencyRescueReturn
} from './types';

// Module metadata for 1inch hackathon
export const SAFU_RESCUE_MODULE = {
    name: 'SAFU RESCUE',
    version: '1.0.0',
    description: 'Emergency wallet rescue tool for compromised wallets',
    author: '1nsync Team',
    hackathon: 'ETH Global - 1inch',
    features: [
        'Emergency asset discovery',
        'Automated ERC-20 approvals',
        'Batch swaps to ETH',
        'Safe wallet transfer',
        'Real-time progress tracking'
    ],
    integrations: [
        '1inch Balance API',
        '1inch Approval API',
        '1inch Swap API',
        'Web3 Provider Integration'
    ]
} as const;
