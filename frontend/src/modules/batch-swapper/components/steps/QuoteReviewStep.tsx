import React from 'react';

interface RebalanceStep {
  fromToken: string;
  toToken: string;
  fromAmount: string;
  fromAmountFormatted: string;
  expectedOutput: string;
  expectedOutputFormatted: string;
  quote: any;
  priceImpact: number;
  minOutput: string;
  minOutputFormatted: string;
  gasEstimate: number;
  loading: boolean;
  error: string | null;
}

interface GasSavings {
  batchGas: number;
  individualGas: number;
  savedGas: number;
  savedUsd: number;
}

interface QuoteReviewStepProps {
  rebalanceSteps: RebalanceStep[];
  totalGasEstimate: number;
  totalSlippage: number;
  gasSavings: GasSavings | null;
  simulationLoading: boolean;
  tokens: any[];
  onSimulate: () => Promise<void>;
  onContinue: () => void;
  onBack: () => void;
}

export const QuoteReviewStep: React.FC<QuoteReviewStepProps> = ({
  rebalanceSteps,
  totalGasEstimate,
  totalSlippage,
  gasSavings,
  simulationLoading,
  tokens,
  onSimulate,
  onContinue,
  onBack
}) => {
  const getTokenByAddress = (address: string) => {
    return tokens.find(t => t.address.toLowerCase() === address.toLowerCase());
  };

  const hasValidQuotes = rebalanceSteps.length > 0 && rebalanceSteps.some(step => !step.error && !step.loading);

  return (
    <div className="py-8">
      <div className="bg-white rounded-lg p-6 shadow-lg">
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-2">Step 4: Review & Optimize</h3>
          <p className="text-gray-600">
            Review the swap routes and gas optimization before execution.
          </p>
        </div>

        {/* Simulate Button */}
        {rebalanceSteps.length === 0 && (
          <div className="text-center py-8">
            <button
              onClick={onSimulate}
              disabled={simulationLoading}
              className={`px-6 py-3 rounded-lg font-medium ${
                simulationLoading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {simulationLoading ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></span>
                  Getting Live Quotes...
                </>
              ) : (
                'Get Live Quotes'
              )}
            </button>
          </div>
        )}

        {/* Gas Savings Display */}
        {gasSavings && (
          <div className="bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-sm text-green-100">Batch Gas</div>
                <div className="text-lg font-bold">{gasSavings.batchGas.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-green-100">Individual Gas</div>
                <div className="text-lg font-bold">{gasSavings.individualGas.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-green-100">Gas Saved</div>
                <div className="text-lg font-bold">{gasSavings.savedGas.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-green-100">USD Saved</div>
                <div className="text-lg font-bold">${gasSavings.savedUsd.toFixed(2)}</div>
              </div>
            </div>
          </div>
        )}

        {/* Swap Routes */}
        {rebalanceSteps.length > 0 && (
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Swap Routes</h4>
              <button
                onClick={onSimulate}
                disabled={simulationLoading}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                🔄 Refresh Quotes
              </button>
            </div>

            {rebalanceSteps.map((step, index) => {
              const fromToken = getTokenByAddress(step.fromToken);
              const toToken = getTokenByAddress(step.toToken);

              return (
                <div key={index} className="border rounded-lg p-4">
                  {step.loading ? (
                    <div className="flex items-center space-x-3">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span>Getting quote for {fromToken?.symbol} → {toToken?.symbol}...</span>
                    </div>
                  ) : step.error ? (
                    <div className="flex items-center space-x-3 text-red-600">
                      <span>❌</span>
                      <span>Error: {step.error}</span>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">
                          {fromToken?.symbol} → {toToken?.symbol}
                        </div>
                        <div className="text-sm text-gray-500">
                          Gas: {step.gasEstimate.toLocaleString()}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-gray-500">Selling</div>
                          <div className="font-medium">
                            {step.fromAmountFormatted} {fromToken?.symbol}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500">Expected</div>
                          <div className="font-medium">
                            {step.expectedOutputFormatted} {toToken?.symbol}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-2 text-xs text-gray-500">
                        Minimum: {step.minOutputFormatted} {toToken?.symbol} (1% slippage)
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Summary Stats */}
        {hasValidQuotes && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-sm text-gray-500">Total Swaps</div>
                <div className="font-bold">{rebalanceSteps.filter(s => !s.error).length}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Est. Gas</div>
                <div className="font-bold">{totalGasEstimate.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Avg. Slippage</div>
                <div className="font-bold">{totalSlippage.toFixed(2)}%</div>
              </div>
            </div>
          </div>
        )}

        <div className="flex space-x-4">
          <button
            onClick={onBack}
            className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
          >
            ← Back to Allocation
          </button>
          <button
            onClick={onContinue}
            disabled={!hasValidQuotes}
            className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
              hasValidQuotes
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Execute Batch Swap →
          </button>
        </div>

        {!hasValidQuotes && rebalanceSteps.length > 0 && (
          <p className="text-red-500 text-sm mt-2 text-center">
            Please get valid quotes before proceeding to execution
          </p>
        )}
      </div>
    </div>
  );
};
