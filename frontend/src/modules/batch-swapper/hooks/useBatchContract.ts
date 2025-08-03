import { useState, useEffect, useCallback } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { BatchSwapperContractService } from '../services/BatchSwapperContractService';
import {
    SwapInstruction,
    OptimizationConfig,
    BatchContractResult,
    ContractSwapParams
} from '../types';
import { BatchSwapperV2ABI, BATCH_SWAPPER_ADDRESSES } from '../utils';
import type { SupportedChainId } from '../utils';
import { parseEther } from 'viem';

export const useBatchContract = (chainId?: number) => {
    const { address } = useAccount();
    const { writeContract, isPending: isWritePending, data: hash, error: writeError } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

    const [contractService, setContractService] = useState<BatchSwapperContractService | null>(null);
    const [isAvailable, setIsAvailable] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [contractInfo, setContractInfo] = useState<any>(null);

    // Initialize contract service
    useEffect(() => {
        if (chainId) {
            try {
                const service = new BatchSwapperContractService(chainId);
                setContractService(service);
                setIsAvailable(service.isContractAvailable());
                setError(null);

                // Get contract info with better error handling
                service.getContractInfo()
                    .then(setContractInfo)
                    .catch((err) => {
                        console.warn('Failed to fetch contract info (this is non-critical):', err);
                        // Don't set error state, just log the warning
                        setContractInfo(null);
                    });
            } catch (err) {
                console.warn(`BatchSwapper not available on chain ${chainId}:`, err);
                setContractService(null);
                setIsAvailable(false);
                setError(err instanceof Error ? err.message : 'Contract not available on this chain.');
            }
        } else {
            setContractService(null);
            setIsAvailable(false);
            setError('No chain ID provided.');
        }
    }, [chainId]);

    /**
     * Check what token approvals are needed before batch swap
     */
    const checkApprovalsNeeded = useCallback(async (
        tokenAddresses: string[],
        amounts: bigint[]
    ) => {
        if (!contractService || !address) {
            throw new Error('Contract service not initialized or wallet not connected');
        }

        return await contractService.checkApprovalsNeeded(
            address,
            tokenAddresses as `0x${string}`[],
            amounts
        );
    }, [contractService, address]);

    /**
     * Prepare batch swap transaction data
     */
    const prepareBatchSwap = useCallback(async (
        swapInstructions: SwapInstruction[],
        config: OptimizationConfig
    ): Promise<BatchContractResult> => {
        if (!contractService || !address) {
            throw new Error('Contract service not initialized or wallet not connected');
        }
        if (!isAvailable) {
            throw new Error('Batch swapper contract is not available on the current chain');
        }

        return await contractService.prepareBatchSwap(swapInstructions, address, config);
    }, [contractService, address, isAvailable]);

    /**
     * Execute batch swap via the smart contract
     */
    const executeBatchSwap = useCallback(async (
        swapParams: ContractSwapParams[],
        ethValue: bigint = 0n
    ): Promise<void> => {
        if (!address || !chainId) {
            throw new Error('Wallet not connected or chain ID not available');
        }
        if (!isAvailable) {
            throw new Error('Batch swapper contract is not available on the current chain');
        }

        const contractAddress = BATCH_SWAPPER_ADDRESSES.batchSwapper[chainId as SupportedChainId];
        if (!contractAddress) {
            throw new Error('Contract address not found for current chain');
        }

        try {
            // Fix: Cast swapParams to the correct type expected by the ABI
            await writeContract({
                address: contractAddress,
                abi: BatchSwapperV2ABI,
                functionName: 'batchSwap',
                args: [swapParams as any, address], // Type assertion to bypass strict typing
                value: ethValue,
            });
        } catch (err) {
            console.error('Failed to execute batch swap:', err);
            throw err;
        }
    }, [address, chainId, isAvailable, writeContract]);

    /**
     * Get estimated gas savings
     */
    const estimateGasSavings = useCallback((
        individualGasTotal: bigint,
        swapCount: number
    ): bigint => {
        if (!contractService) return 0n;
        return contractService.estimateGasSavings(individualGasTotal, swapCount);
    }, [contractService]);

    return {
        // Contract service and info
        contractService,
        contractInfo,
        isAvailable,
        error: error || writeError?.message,

        // Transaction states
        isPending: isWritePending,
        isConfirming,
        isConfirmed,
        hash,

        // Functions
        checkApprovalsNeeded,
        prepareBatchSwap,
        executeBatchSwap,
        estimateGasSavings,
    };
};