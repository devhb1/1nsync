import React from 'react';
import { useAccount, useChainId } from 'wagmi';
import { useChain } from '@/modules/core/chainContext';
import { ChainSelector } from '@/modules/core/components/ChainSelector';

interface WalletConnectionStepProps {
  onContinue: () => void;
  isConnectedToSelectedChain: boolean;
}

export const WalletConnectionStep: React.FC<WalletConnectionStepProps> = ({
  onContinue,
  isConnectedToSelectedChain
}) => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { selectedChainConfig } = useChain();

  if (!isConnected) {
    return (
      <div className="text-center py-8">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold mb-2">🚀 Gas-Optimized Portfolio Rebalancer</h2>
          <p className="text-blue-100">
            Rebalance your portfolio in a single transaction to save gas
          </p>
        </div>
        
        <div className="bg-white rounded-lg p-6 shadow-lg space-y-6">
          {/* Step 1: Select Chain */}
          <div className="mb-6">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🔗</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Step 1: Select Chain</h3>
            <p className="text-gray-600 mb-4">
              Choose the blockchain network for your portfolio analysis
            </p>
            <ChainSelector />
          </div>

          {/* Step 2: Connect Wallet */}
          <div className="border-t pt-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">👛</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Step 2: Connect Your Wallet</h3>
            <p className="text-gray-600">
              Please connect your wallet to analyze your portfolio and start batch swapping
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isConnectedToSelectedChain) {
    return (
      <div className="text-center py-8">
        <div className="bg-white rounded-lg p-6 shadow-lg">
          <div className="mb-6">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Switch Network</h3>
            <p className="text-gray-600 mb-4">
              Please switch to {selectedChainConfig?.name} to continue, or select a different chain
            </p>
          </div>
          
          <div className="mb-4">
            <ChainSelector />
          </div>
        </div>
      </div>
    );
  }

  // Connected and on correct chain
  return (
    <div className="text-center py-8">
      <div className="bg-white rounded-lg p-6 shadow-lg space-y-6">
        {/* Chain Selection */}
        <div className="border-b pb-6">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔗</span>
          </div>
          <h3 className="text-xl font-semibold mb-2">Selected Chain</h3>
          <p className="text-gray-600 mb-4">
            Current network: <span className="font-semibold text-blue-600">{selectedChainConfig?.name}</span>
          </p>
          <ChainSelector />
        </div>

        {/* Wallet Status */}
        <div>
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">✅</span>
          </div>
          <h3 className="text-xl font-semibold mb-2">Wallet Connected</h3>
          <p className="text-gray-600 mb-2">
            Ready to analyze portfolio on {selectedChainConfig?.name}
          </p>
          <p className="text-sm text-gray-500 font-mono mb-6">
            {address}
          </p>
          
          <button
            onClick={onContinue}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
          >
            Continue to Portfolio Analysis
          </button>
        </div>
      </div>
    </div>
  );
};
