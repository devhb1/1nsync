/**
 * Emergency Rescue Hook - MVP React hook for SAFU RESCUE functionality
 * Simplified 4-phase rescue: Discovery → Approval → Swaps → ETH Transfer
 */

import { useState, useCallback, useRef } from 'react';
import { useAccount } from 'wagmi';
import { Address } from 'viem';
import {
    emergencyRescueService,
    createEmergencyRescueService
} from '../services/emergencyRescueService';
import {
    RescuableAsset,
    RescueExecutionState,
    RescueProgress,
    RescueTransaction,
    RescueResult,
    UseEmergencyRescueReturn,
    EmergencyRescueConfig
} from '../types';

// Default progress state
const DEFAULT_PROGRESS: RescueProgress = {
    state: 'IDLE',
    currentStep: 0,
    totalSteps: 4,
    message: 'Ready to begin emergency rescue',
    progress: 0
};

export const useEmergencyRescue = (
    config?: Partial<EmergencyRescueConfig>
): UseEmergencyRescueReturn => {
    const { address, isConnected, chainId } = useAccount();

    // State management
    const [rescuableAssets, setRescuableAssets] = useState<RescuableAsset[]>([]);
    const [progress, setProgress] = useState<RescueProgress>(DEFAULT_PROGRESS);
    const [transactions, setTransactions] = useState<RescueTransaction[]>([]);
    const [rescueResult, setRescueResult] = useState<RescueResult | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Service instance ref
    const serviceRef = useRef(createEmergencyRescueService({
        chainId: chainId || 8453, // Default to Base mainnet - only supported chain
        userAddress: address || ('0x' as Address),
        ...config
    }));

    // Update service when account changes
    if (address && chainId) {
        serviceRef.current.updateConfig({
            chainId,
            userAddress: address
        });
    }

    // === COMPUTED STATE ===
    const isDiscovering = progress.state === 'DISCOVERING_ASSETS';
    const isExecuting = [
        'APPROVING_TOKENS',
        'EXECUTING_SWAPS',
        'TRANSFERRING_ETH'
    ].includes(progress.state);
    const isCompleted = progress.state === 'COMPLETED';
    const hasError = progress.state === 'FAILED' || !!errorMessage;
    const canExecute = rescuableAssets.length > 0 && !isExecuting && !isCompleted && !hasError;

    // === ACTION HANDLERS ===

    /**
     * PHASE 1: Discover all rescuable assets
     */
    const discoverAssets = useCallback(async () => {
        if (!isConnected || !address) {
            setErrorMessage('Please connect your wallet first');
            return;
        }

        try {
            setErrorMessage(null);
            setProgress({
                state: 'DISCOVERING_ASSETS',
                currentStep: 1,
                totalSteps: 4,
                message: 'Scanning wallet for rescuable assets...',
                progress: 25,
                details: { assetsDiscovered: 0 }
            });

            const assets = await serviceRef.current.discoverRescuableAssets();

            setRescuableAssets(assets);
            setProgress({
                state: 'IDLE',
                currentStep: 1,
                totalSteps: 4,
                message: `Found ${assets.length} rescuable assets worth $${assets.reduce((sum, asset) => sum + asset.valueUSD, 0).toFixed(2)}`,
                progress: 25,
                details: { assetsDiscovered: assets.length }
            });

            console.log(`✅ Phase 1 Complete: ${assets.length} assets discovered`);

        } catch (error) {
            console.error('❌ Phase 1 Failed - Asset discovery:', error);
            setErrorMessage(error instanceof Error ? error.message : 'Asset discovery failed');
            setProgress({
                state: 'FAILED',
                currentStep: 1,
                totalSteps: 4,
                message: 'Failed to discover assets',
                progress: 0,
                details: { errorMessage: error instanceof Error ? error.message : 'Unknown error' }
            });
        }
    }, [isConnected, address]);

    /**
     * COMPLETE RESCUE EXECUTION - All 4 phases in sequence
     */
    const executeCompleteRescue = useCallback(async (safeWallet: Address): Promise<RescueResult> => {
        if (!rescuableAssets.length) {
            throw new Error('No rescuable assets found. Please discover assets first.');
        }

        try {
            setErrorMessage(null);

            // Start the complete rescue process
            const result = await serviceRef.current.executeCompleteRescue(
                safeWallet,
                (phase: string, progressPercent: number, message: string) => {
                    // Map phases to progress states
                    const stateMap: Record<string, RescueExecutionState> = {
                        'discovery': 'DISCOVERING_ASSETS',
                        'approval': 'APPROVING_TOKENS',
                        'swapping': 'EXECUTING_SWAPS',
                        'transfer': 'TRANSFERRING_ETH',
                        'complete': 'COMPLETED'
                    };

                    const stepMap: Record<string, number> = {
                        'discovery': 1,
                        'approval': 2,
                        'swapping': 3,
                        'transfer': 4,
                        'complete': 4
                    };

                    setProgress({
                        state: stateMap[phase] || 'EXECUTING_SWAPS',
                        currentStep: stepMap[phase] || 2,
                        totalSteps: 4,
                        message,
                        progress: progressPercent,
                        details: {
                            assetsDiscovered: rescuableAssets.length,
                            totalTokens: rescuableAssets.filter(a => !a.isNative).length,
                            totalSwaps: rescuableAssets.filter(a => !a.isNative).length
                        }
                    });

                    // Update transactions in real-time
                    const currentTransactions = serviceRef.current.getTransactions();
                    setTransactions(currentTransactions);
                }
            );

            // Get final transactions
            const finalTransactions = serviceRef.current.getTransactions();
            setTransactions(finalTransactions);
            setRescueResult(result);

            setProgress({
                state: 'COMPLETED',
                currentStep: 4,
                totalSteps: 4,
                message: `🎉 Rescue completed! $${result.totalValueRescued.toFixed(2)} rescued to safe wallet`,
                progress: 100,
                details: {
                    assetsDiscovered: rescuableAssets.length,
                    totalTokens: rescuableAssets.filter(a => !a.isNative).length,
                    totalSwaps: rescuableAssets.filter(a => !a.isNative).length,
                    ethAccumulated: result.totalETHRescued
                }
            });

            console.log(`🎉 COMPLETE RESCUE SUCCESS!`);
            return result;

        } catch (error) {
            console.error('❌ Complete rescue failed:', error);
            setErrorMessage(error instanceof Error ? error.message : 'Rescue execution failed');
            setProgress({
                state: 'FAILED',
                currentStep: progress.currentStep,
                totalSteps: 4,
                message: 'Rescue execution failed',
                progress: progress.progress,
                details: { errorMessage: error instanceof Error ? error.message : 'Unknown error' }
            });

            throw error;
        }
    }, [rescuableAssets, progress.currentStep, progress.progress]);

    /**
     * Cancel ongoing rescue operation
     */
    const cancelRescue = useCallback(() => {
        setProgress({
            state: 'CANCELLED',
            currentStep: progress.currentStep,
            totalSteps: 4,
            message: 'Rescue operation cancelled',
            progress: 0
        });

        console.log('🚫 Rescue operation cancelled by user');
    }, [progress.currentStep]);

    /**
     * Reset all rescue state
     */
    const resetRescue = useCallback(() => {
        setRescuableAssets([]);
        setProgress(DEFAULT_PROGRESS);
        setTransactions([]);
        setRescueResult(null);
        setErrorMessage(null);
        serviceRef.current.clearTransactions();

        console.log('🔄 Rescue state reset');
    }, []);

    return {
        // State
        rescuableAssets,
        progress,
        transactions,

        // Actions
        discoverAssets,
        executeCompleteRescue,
        cancelRescue,
        resetRescue,

        // Computed state
        isDiscovering,
        isExecuting,
        isCompleted,
        hasError,
        canExecute,

        // Results
        rescueResult,
        errorMessage
    };
};