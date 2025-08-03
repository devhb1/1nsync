import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { useChain } from '@/modules/core/chainContext';

interface TokenBalance {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  balance: string;
  balanceFormatted: string;
  usdPrice: number;
  usdValue: number;
  percentage: number;
}

interface PortfolioAnalysisStepProps {
  onContinue: () => void;
  onBack?: () => void;
  balances: TokenBalance[];
  totalValue: number;
  portfolioLoading: boolean;
  onFetchPortfolio: () => void;
}

export const PortfolioAnalysisStep: React.FC<PortfolioAnalysisStepProps> = ({
  onContinue,
  onBack,
  balances,
  totalValue,
  portfolioLoading,
  onFetchPortfolio
}) => {
  const { address } = useAccount();
  const { selectedChainConfig } = useChain();

  const canProceed = balances.length > 0 && totalValue > 0;

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">📊</span>
        </div>
        <h3 className="text-xl font-semibold mb-2">Step 2: Portfolio Analysis</h3>
        <p className="text-gray-600">
          Review your current portfolio on {selectedChainConfig?.name || 'the selected network'}
        </p>
      </div>

      {/* Chain Selection & Fetch Button */}
      <div className="max-w-4xl mx-auto bg-white rounded-lg p-6 shadow-lg">
        <div className="text-center mb-6">
          <p className="text-gray-700 mb-4">
            Connected to: <span className="font-semibold text-blue-600">{selectedChainConfig?.name}</span>
          </p>
          <p className="text-gray-600 mb-4">
            Wallet: {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not Connected'}
          </p>
          
          <button
            onClick={onFetchPortfolio}
            disabled={portfolioLoading || !address}
            className={`px-8 py-3 rounded-lg font-semibold transition-colors ${
              portfolioLoading || !address
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {portfolioLoading ? 'Fetching Portfolio...' : 'Fetch Portfolio'}
          </button>
        </div>

        {/* Portfolio Display */}
        {balances.length > 0 && (
          <div className="space-y-4">
            <div className="border-t pt-6">
              <h4 className="text-lg font-semibold mb-4 text-center">
                Portfolio Summary: ${totalValue.toFixed(2)}
              </h4>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {balances.map((token) => (
                  <div key={token.address} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                        {token.logoURI ? (
                          <img 
                            src={token.logoURI} 
                            alt={token.symbol}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                            {token.symbol.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-semibold">{token.symbol}</div>
                        <div className="text-sm text-gray-600">{token.name}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{token.balanceFormatted} {token.symbol}</div>
                      <div className="text-sm text-gray-600">${token.usdValue.toFixed(2)} ({token.percentage.toFixed(1)}%)</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* No Portfolio Message */}
        {!portfolioLoading && balances.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-500">
              <p>No portfolio data found.</p>
              <p className="text-sm mt-2">Click "Fetch Portfolio" to load your token balances.</p>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between max-w-4xl mx-auto">
        {onBack && (
          <button
            onClick={onBack}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Back
          </button>
        )}
        
        <button
          onClick={onContinue}
          disabled={!canProceed || portfolioLoading}
          className={`px-6 py-2 rounded-lg transition-colors ${
            canProceed && !portfolioLoading
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {portfolioLoading ? 'Loading...' : canProceed ? 'Continue to Asset Selection' : 'Fetch Portfolio First'}
        </button>
      </div>

      {/* Additional Info */}
      {canProceed && (
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm text-gray-500">
            Ready to proceed with {balances.length} tokens worth ${totalValue.toFixed(2)}
          </p>
        </div>
      )}
    </div>
  );
};
