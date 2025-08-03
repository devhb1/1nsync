import React from 'react';
import { Address } from 'viem';

interface ExecutionStepProps {
  executionStatus: 'idle' | 'preparing' | 'checking-approvals' | 'approving' | 'executing' | 'success' | 'error';
  approvalsNeeded: Array<{token: Address, amount: bigint}>;
  currentApprovalIndex: number;
  isApproving: boolean;
  isExecuting: boolean;
  error: string | null;
  hash: string | undefined;
  isConfirmed: boolean;
  isConfirming: boolean;
  tokens: any[];
  onExecute: () => Promise<void>;
  onReset: () => void;
}

export const ExecutionStep: React.FC<ExecutionStepProps> = ({
  executionStatus,
  approvalsNeeded,
  currentApprovalIndex,
  isApproving,
  isExecuting,
  error,
  hash,
  isConfirmed,
  isConfirming,
  tokens,
  onExecute,
  onReset
}) => {
  const getTokenByAddress = (address: Address) => {
    return tokens.find(t => t.address.toLowerCase() === address.toLowerCase());
  };

  if (executionStatus === 'success') {
    return (
      <div className="py-8">
        <div className="bg-white rounded-lg p-6 shadow-lg text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">✅</span>
          </div>
          <h3 className="text-xl font-semibold mb-2 text-green-600">
            Batch Swap Successful!
          </h3>
          <p className="text-gray-600 mb-4">
            Your portfolio has been successfully rebalanced in a single transaction.
          </p>
          
          {hash && (
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <div className="text-sm text-gray-500 mb-1">Transaction Hash:</div>
              <div className="font-mono text-xs break-all">{hash}</div>
            </div>
          )}
          
          <div className="space-y-3">
            <button
              onClick={onReset}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Start New Rebalance
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (executionStatus === 'error') {
    return (
      <div className="py-8">
        <div className="bg-white rounded-lg p-6 shadow-lg text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">❌</span>
          </div>
          <h3 className="text-xl font-semibold mb-2 text-red-600">
            Execution Failed
          </h3>
          <p className="text-gray-600 mb-4">{error}</p>
          
          <div className="space-y-3">
            <button
              onClick={onExecute}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={onReset}
              className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Start Over
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="bg-white rounded-lg p-6 shadow-lg">
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-2">Execute Rebalancing</h3>
          <p className="text-gray-600">
            {executionStatus === 'idle' && 'Ready to execute your batch swap transaction.'}
            {executionStatus === 'preparing' && 'Preparing batch swap transaction...'}
            {executionStatus === 'checking-approvals' && 'Checking token approvals...'}
            {executionStatus === 'approving' && 'Approving tokens for the BatchSwapper contract...'}
            {executionStatus === 'executing' && 'Executing batch swap transaction...'}
          </p>
        </div>

        {/* Approval Progress */}
        {(executionStatus === 'approving' || executionStatus === 'checking-approvals') && approvalsNeeded.length > 0 && (
          <div className="mb-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium mb-3">Token Approvals Required</h4>
              <p className="text-sm text-gray-600 mb-4">
                Approving tokens for the BatchSwapper contract to spend on your behalf.
              </p>
              
              <div className="space-y-3">
                {approvalsNeeded.map((approval, index) => {
                  const token = getTokenByAddress(approval.token);
                  const isActive = index === currentApprovalIndex;
                  const isCompleted = index < currentApprovalIndex;
                  
                  return (
                    <div 
                      key={approval.token}
                      className={`flex items-center space-x-3 p-3 rounded ${
                        isCompleted ? 'bg-green-50 border border-green-200' :
                        isActive ? 'bg-blue-50 border border-blue-200' :
                        'bg-gray-50 border border-gray-200'
                      }`}
                    >
                      <div className="w-6 h-6 rounded-full flex items-center justify-center">
                        {isCompleted ? (
                          <span className="text-green-600">✅</span>
                        ) : isActive ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        ) : (
                          <span className="text-gray-400">⏳</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{token?.symbol || 'Unknown Token'}</div>
                        <div className="text-sm text-gray-500">
                          {isCompleted ? 'Approved' : 
                           isActive ? 'In Progress' : 
                           'Pending'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-4 text-sm text-gray-600">
                Progress: {currentApprovalIndex} of {approvalsNeeded.length} approvals
                {isApproving && ' (Please confirm in your wallet)'}
              </div>
            </div>
          </div>
        )}

        {/* Transaction Progress */}
        {executionStatus === 'executing' && (
          <div className="mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <div>
                  <div className="font-medium">Executing Batch Swap</div>
                  <div className="text-sm text-gray-600">
                    {isConfirming ? 'Waiting for confirmation...' : 'Please confirm in your wallet'}
                  </div>
                </div>
              </div>
              
              {hash && (
                <div className="mt-3 p-3 bg-white rounded border">
                  <div className="text-sm text-gray-500 mb-1">Transaction Hash:</div>
                  <div className="font-mono text-xs break-all">{hash}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Execute Button */}
        {executionStatus === 'idle' && (
          <div className="text-center">
            <button
              onClick={onExecute}
              disabled={isExecuting}
              className={`px-8 py-3 rounded-lg font-medium ${
                isExecuting
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isExecuting ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></span>
                  Processing...
                </>
              ) : (
                'Execute Batch Swap'
              )}
            </button>
          </div>
        )}

        {/* Status Messages */}
        {executionStatus === 'preparing' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600">Preparing transaction parameters...</p>
          </div>
        )}
      </div>
    </div>
  );
};
