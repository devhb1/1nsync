/**
 * Hook for accessing chain-specific batch swapper configuration
 * Integrates with the chain context to provide contract addresses and settings
 */

import { useMemo } from 'react';
import { useChain } from '@/modules/core/chainContext';
import {
    getDeploymentInfo,
    getContractAddress,
    getRouterAddress,
    isDeployedOnChain,
    SUPPORTED_CHAINS,
    type SupportedChainId
} from '../utils/multi-chain-config';

export const useBatchSwapperConfig = () => {
    const { selectedChainConfig } = useChain();

    // Map chain ID to supported chain ID
    const supportedChainId = useMemo(() => {
        return selectedChainConfig.chainId as SupportedChainId;
    }, [selectedChainConfig.chainId]);

    // Get deployment info for selected chain
    const deploymentInfo = useMemo(() => {
        return getDeploymentInfo(supportedChainId);
    }, [supportedChainId]);

    // Get contract addresses
    const contractAddress = useMemo(() => {
        return getContractAddress(supportedChainId);
    }, [supportedChainId]);

    const routerAddress = useMemo(() => {
        return getRouterAddress(supportedChainId);
    }, [supportedChainId]);

    // Check deployment status
    const isDeployed = useMemo(() => {
        return isDeployedOnChain(supportedChainId);
    }, [supportedChainId]);

    return {
        // Chain info
        chainId: supportedChainId,
        chainConfig: selectedChainConfig,

        // Contract addresses
        contractAddress,
        routerAddress,

        // Deployment info
        deploymentInfo,
        isDeployed,

        // Status
        isReady: isDeployed && contractAddress !== '0x0000000000000000000000000000000000000000',
    };
};
