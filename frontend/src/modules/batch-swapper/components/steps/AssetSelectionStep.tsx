import React from 'react';
import { Address } from 'viem';

interface TokenBalance {
  address: Address;
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

interface AssetSelectionStepProps {
  balances: TokenBalance[];
  selectedAssets: string[];
  sellPercentages: Record<string, number>;
  onAssetToggle: (symbol: string) => void;
  onPercentageChange: (symbol: string, percentage: number) => void;
  onContinue: () => void;
  onBack: () => void;
}

export const AssetSelectionStep: React.FC<AssetSelectionStepProps> = ({
  balances,
  selectedAssets,
  sellPercentages,
  onAssetToggle,
  onPercentageChange,
  onContinue,
  onBack
}) => {
  const hasValidSelection = selectedAssets.length > 0 && 
    Object.values(sellPercentages).some(p => p > 0);

  const totalSellValue = balances
    .filter(token => token.usdValue > 0.01)
    .reduce((sum, token) => {
      const sellPercentage = sellPercentages[token.symbol] || 0;
      return sum + (token.usdValue * sellPercentage / 100);
    }, 0);

  return (
    <div className="py-8">
      <div className="bg-white rounded-lg p-6 shadow-lg">
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-2">Step 2: Choose How Much to Sell</h3>
          <p className="text-gray-600">
            Set what percentage of each selected asset you want to sell/swap for rebalancing.
          </p>
        </div>

        {totalSellValue > 0 && (
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-800">
                Total Sell Value: ${totalSellValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-sm text-blue-600">
                This amount will be used to buy your target allocation
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {balances
            .filter(token => token.usdValue > 0.01)
            .sort((a, b) => b.usdValue - a.usdValue)
            .map(token => {
              const isSelected = selectedAssets.includes(token.symbol);
              const sellPercentage = sellPercentages[token.symbol] || 0;
              const sellValue = token.usdValue * sellPercentage / 100;

              return (
                <div 
                  key={token.address} 
                  className={`border rounded-lg p-4 transition-all ${
                    isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onAssetToggle(token.symbol)}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300"
                      />
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <span className="text-sm">{token.logoURI ? '🪙' : token.symbol.charAt(0)}</span>
                      </div>
                      <div>
                        <div className="font-medium">{token.symbol}</div>
                        <div className="text-sm text-gray-500">
                          Balance: {token.balanceFormatted} ({token.percentage.toFixed(1)}%)
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        ${token.usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center space-x-4">
                        <label className="text-sm font-medium text-gray-700">
                          Sell:
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={sellPercentage}
                          onChange={(e) => onPercentageChange(token.symbol, parseInt(e.target.value))}
                          className="flex-1"
                        />
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={sellPercentage}
                          onChange={(e) => onPercentageChange(token.symbol, parseInt(e.target.value) || 0)}
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                        />
                        <span className="text-sm text-gray-500">%</span>
                      </div>
                      
                      {sellPercentage > 0 && (
                        <div className="mt-2 text-sm text-blue-600">
                          Selling: ${sellValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
                          ({(Number(token.balance) * sellPercentage / 100 / Math.pow(10, token.decimals)).toFixed(6)} {token.symbol})
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        <div className="flex space-x-4 mt-6">
          <button
            onClick={onBack}
            className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
          >
            ← Back to Analysis
          </button>
          <button
            onClick={onContinue}
            disabled={!hasValidSelection}
            className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
              hasValidSelection
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Continue to Target Allocation →
          </button>
        </div>

        {!hasValidSelection && (
          <p className="text-red-500 text-sm mt-2 text-center">
            Please select at least one asset and set a sell percentage above 0%
          </p>
        )}
      </div>
    </div>
  );
};
