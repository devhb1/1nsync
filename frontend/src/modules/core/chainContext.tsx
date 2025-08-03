/**
 * Chain Context Provider for Multi-Chain Support
 * Manages the currently selected chain for batch swapping operations
 */

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { 
  CHAINS, 
  SUPPORTED_CHAINS, 
  DEFAULT_CHAIN, 
  type ChainConfig, 
  type SupportedChain,
  getChainConfig,
  getChainByKey,
  isChainSupported 
} from './chains';

interface ChainContextType {
  // Current selected chain for batch swapping
  selectedChain: SupportedChain;
  selectedChainConfig: ChainConfig;
  
  // Chain selection methods
  setSelectedChain: (chain: SupportedChain) => void;
  
  // Helper methods
  isConnectedToSelectedChain: boolean;
  connectedChainConfig: ChainConfig | null;
  supportedChains: ChainConfig[];
  
  // Status
  isSupported: boolean;
}

const ChainContext = createContext<ChainContextType | undefined>(undefined);

export const useChain = () => {
  const context = useContext(ChainContext);
  if (!context) {
    throw new Error('useChain must be used within a ChainProvider');
  }
  return context;
};

interface ChainProviderProps {
  children: ReactNode;
}

export const ChainProvider: React.FC<ChainProviderProps> = ({ children }) => {
  const { isConnected } = useAccount();
  const connectedChainId = useChainId();
  
  // State for user's selected chain (for batch swapping)
  const [selectedChain, setSelectedChain] = useState<SupportedChain>(DEFAULT_CHAIN);
  
  // Get config for selected chain
  const selectedChainConfig = getChainByKey(selectedChain)!;
  
  // Get config for connected chain (wallet)
  const connectedChainConfig = getChainConfig(connectedChainId) || null;
  
  // Check if user's wallet is connected to the selected chain
  const isConnectedToSelectedChain = isConnected && connectedChainId === selectedChainConfig.chainId;
  
  // Check if connected chain is supported for batch swapping
  const isSupported = isChainSupported(connectedChainId);
  
  // Get all supported chain configs
  const supportedChains = SUPPORTED_CHAINS.map(key => CHAINS[key]);
  
  // Manual chain switching only - no auto-switching
  // Users must manually select their desired chain
  /*
  // Auto-switch to connected chain if it's supported
  useEffect(() => {
    if (isConnected && isSupported && connectedChainConfig) {
      const connectedChainKey = Object.keys(CHAINS).find(
        key => CHAINS[key].chainId === connectedChainId
      ) as SupportedChain;
      
      if (connectedChainKey && connectedChainKey !== selectedChain) {
        console.log(`🔄 Auto-switching to connected chain: ${connectedChainConfig.name}`);
        setSelectedChain(connectedChainKey);
      }
    }
  }, [isConnected, connectedChainId, isSupported, connectedChainConfig, selectedChain]);
  */
  
  const value: ChainContextType = {
    selectedChain,
    selectedChainConfig,
    setSelectedChain,
    isConnectedToSelectedChain,
    connectedChainConfig,
    supportedChains,
    isSupported,
  };
  
  return (
    <ChainContext.Provider value={value}>
      {children}
    </ChainContext.Provider>
  );
};

// Export the context for advanced usage
export { ChainContext };
