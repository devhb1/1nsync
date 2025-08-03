import React, { useState, useEffect } from 'react';
import { useChain } from '@/modules/core/chainContext';
import { oneInchAPI } from '../../services/oneInchAPI';
import { Address } from 'viem';

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

interface TargetAllocation {
  symbol: string;
  percentage: number;
  address?: string;
  name?: string;
  logoURI?: string;
}

interface AllocationTargetStepProps {
  currentBalances: TokenBalance[];
  targetAllocations: TargetAllocation[];
  onTargetAllocationChange: (allocations: TargetAllocation[]) => void;
  onContinue: () => void;
  onBack: () => void;
}

interface SupportedToken {
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

export const AllocationTargetStep: React.FC<AllocationTargetStepProps> = ({
  currentBalances,
  targetAllocations,
  onTargetAllocationChange,
  onContinue,
  onBack
}) => {
  const { selectedChainConfig } = useChain();
  const [supportedTokens, setSupportedTokens] = useState<SupportedToken[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [localAllocations, setLocalAllocations] = useState<TargetAllocation[]>(targetAllocations);

  // Popular tokens for quick selection
  const popularTokens = ['WETH', 'USDC', 'USDT', 'DAI', 'WBTC'];

  // Fetch supported tokens from 1inch
  useEffect(() => {
    const fetchTokens = async () => {
      if (!selectedChainConfig) return;
      
      setLoadingTokens(true);
      try {
        const response = await oneInchAPI.getTokens(selectedChainConfig.chainId);
        const tokens = Object.values(response.tokens).map(token => ({
          address: token.address as Address,
          symbol: token.symbol,
          name: token.name,
          decimals: token.decimals,
          logoURI: token.logoURI
        }));
        setSupportedTokens(tokens);
      } catch (error) {
        console.error('Failed to fetch supported tokens:', error);
      } finally {
        setLoadingTokens(false);
      }
    };

    fetchTokens();
  }, [selectedChainConfig]);

  // Filter tokens based on search
  const filteredTokens = supportedTokens.filter(token =>
    token.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    token.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    token.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPercentage = localAllocations.reduce((sum, allocation) => sum + allocation.percentage, 0);
  const canProceed = Math.abs(totalPercentage - 100) < 0.01 && localAllocations.length > 0;

  const addToken = (token: SupportedToken) => {
    const exists = localAllocations.find(a => a.symbol === token.symbol);
    if (!exists) {
      const newAllocation: TargetAllocation = {
        symbol: token.symbol,
        percentage: 0,
        address: token.address,
        name: token.name,
        logoURI: token.logoURI
      };
      setLocalAllocations(prev => [...prev, newAllocation]);
    }
  };

  const removeToken = (symbol: string) => {
    setLocalAllocations(prev => prev.filter(a => a.symbol !== symbol));
  };

  const updatePercentage = (symbol: string, percentage: number) => {
    setLocalAllocations(prev => 
      prev.map(a => a.symbol === symbol ? { ...a, percentage } : a)
    );
  };

  const handleContinue = () => {
    onTargetAllocationChange(localAllocations);
    onContinue();
  };

  const addPopularToken = (symbol: string) => {
    const token = supportedTokens.find(t => t.symbol === symbol);
    if (token) {
      addToken(token);
    }
  };

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🎯</span>
        </div>
        <h3 className="text-xl font-semibold mb-2">Step 3: Set Target Allocation</h3>
        <p className="text-gray-600">
          Choose the tokens you want to buy and set their allocation percentages. Total must equal 100%.
        </p>
      </div>

      <div className="max-w-4xl mx-auto bg-white rounded-lg p-6 shadow-lg">
        {/* Quick Select Popular Tokens */}
        <div className="mb-6">
          <h4 className="text-lg font-semibold mb-3">Popular Tokens</h4>
          <div className="flex flex-wrap gap-2">
            {popularTokens.map(symbol => (
              <button
                key={symbol}
                onClick={() => addPopularToken(symbol)}
                disabled={localAllocations.some(a => a.symbol === symbol)}
                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                  localAllocations.some(a => a.symbol === symbol)
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                {symbol}
              </button>
            ))}
          </div>
        </div>

        {/* Search Tokens */}
        <div className="mb-6">
          <h4 className="text-lg font-semibold mb-3">Search & Add Tokens</h4>
          <div className="relative">
            <input
              type="text"
              placeholder="Search by symbol, name, or contract address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {searchTerm && (
            <div className="mt-3 max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
              {loadingTokens ? (
                <div className="p-4 text-center text-gray-500">Loading tokens...</div>
              ) : filteredTokens.length > 0 ? (
                filteredTokens.slice(0, 20).map(token => (
                  <div
                    key={token.address}
                    className="flex items-center justify-between p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                        {token.logoURI ? (
                          <img src={token.logoURI} alt={token.symbol} className="w-full h-full object-cover" />
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
                    <button
                      onClick={() => addToken(token)}
                      disabled={localAllocations.some(a => a.symbol === token.symbol)}
                      className={`px-3 py-1 rounded text-sm transition-colors ${
                        localAllocations.some(a => a.symbol === token.symbol)
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {localAllocations.some(a => a.symbol === token.symbol) ? 'Added' : 'Add'}
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-gray-500">No tokens found</div>
              )}
            </div>
          )}
        </div>

        {/* Current Allocations */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-lg font-semibold">Your Target Allocation</h4>
            <div className={`text-sm font-semibold ${
              Math.abs(totalPercentage - 100) < 0.01 ? 'text-green-600' : 'text-red-600'
            }`}>
              Total: {totalPercentage.toFixed(1)}% {Math.abs(totalPercentage - 100) < 0.01 ? '✓' : '(Must be 100%)'}
            </div>
          </div>

          {localAllocations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No tokens selected. Add tokens from popular options or search above.
            </div>
          ) : (
            <div className="space-y-3">
              {localAllocations.map(allocation => (
                <div key={allocation.symbol} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                      {allocation.logoURI ? (
                        <img src={allocation.logoURI} alt={allocation.symbol} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                          {allocation.symbol.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-semibold">{allocation.symbol}</div>
                      <div className="text-sm text-gray-600">{allocation.name}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={allocation.percentage}
                      onChange={(e) => updatePercentage(allocation.symbol, parseFloat(e.target.value) || 0)}
                      className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                      placeholder="0"
                    />
                    <span className="text-sm text-gray-600">%</span>
                    <button
                      onClick={() => removeToken(allocation.symbol)}
                      className="px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between">
          <button
            onClick={onBack}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Back
          </button>
          
          <button
            onClick={handleContinue}
            disabled={!canProceed}
            className={`px-6 py-2 rounded-lg transition-colors ${
              canProceed
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Continue to Review
          </button>
        </div>
      </div>
    </div>
  );
};
