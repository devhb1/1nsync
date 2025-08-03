/**
 * Rescue Progress Panel - Shows real-time progress of rescue execution
 */

'use client';

import React from 'react';
import { formatEther } from 'viem';
import { RescueProgress, RescueTransaction } from '../types';

interface RescueProgressPanelProps {
    progress: RescueProgress;
    transactions: RescueTransaction[];
    onCancel?: () => void;
}

export const RescueProgressPanel: React.FC<RescueProgressPanelProps> = ({
    progress,
    transactions,
    onCancel
}) => {
    const getStateColor = (state: string) => {
        switch (state) {
            case 'DISCOVERING_ASSETS': return 'text-blue-600';
            case 'ANALYZING_RESCUE': return 'text-yellow-600';
            case 'WAITING_APPROVAL': return 'text-purple-600';
            case 'EXECUTING_SWAPS': return 'text-orange-600';
            case 'TRANSFERRING_ETH': return 'text-green-600';
            case 'COMPLETED': return 'text-green-600';
            case 'FAILED': return 'text-red-600';
            case 'CANCELLED': return 'text-gray-600';
            default: return 'text-gray-600';
        }
    };

    const getTransactionIcon = (type: string, status: string) => {
        if (status === 'PENDING') return '⏳';
        if (status === 'FAILED') return '❌';
        if (status === 'SUCCESS') {
            switch (type) {
                case 'SWAP': return '🔄';
                case 'TRANSFER': return '📤';
                case 'APPROVAL': return '✅';
                default: return '✅';
            }
        }
        return '⏳';
    };

    const canCancel = ['DISCOVERING_ASSETS', 'ANALYZING_RESCUE', 'WAITING_APPROVAL'].includes(progress.state);

    return (
        <div className="border-2 border-orange-200 rounded-lg p-6 bg-orange-50">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800 flex items-center">
                    🚀 Rescue Progress
                </h3>
                {canCancel && onCancel && (
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-100 transition-colors"
                    >
                        Cancel Rescue
                    </button>
                )}
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                    <span className={`font-semibold ${getStateColor(progress.state)}`}>
                        {progress.state.replace('_', ' ')}
                    </span>
                    <span className="text-sm text-gray-600">
                        Step {progress.currentStep} of {progress.totalSteps}
                    </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                        className={`h-3 rounded-full transition-all duration-500 ${
                            progress.state === 'FAILED' ? 'bg-red-500' :
                            progress.state === 'COMPLETED' ? 'bg-green-500' :
                            'bg-blue-500'
                        }`}
                        style={{ width: `${progress.progress}%` }}
                    ></div>
                </div>
                <p className="text-sm text-gray-600 mt-2">{progress.message}</p>
            </div>

            {/* Progress Details */}
            {progress.details && (
                <div className="bg-white p-4 rounded-lg border mb-6">
                    <h4 className="font-semibold text-gray-800 mb-3">Progress Details</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        {progress.details.assetsDiscovered !== undefined && (
                            <div>
                                <p className="text-gray-600">Assets Found</p>
                                <p className="font-medium">{progress.details.assetsDiscovered}</p>
                            </div>
                        )}
                        {progress.details.swapsCompleted !== undefined && progress.details.totalSwaps !== undefined && (
                            <div>
                                <p className="text-gray-600">Swaps</p>
                                <p className="font-medium">
                                    {progress.details.swapsCompleted} / {progress.details.totalSwaps}
                                </p>
                            </div>
                        )}
                        {progress.details.ethAccumulated !== undefined && (
                            <div>
                                <p className="text-gray-600">ETH Rescued</p>
                                <p className="font-medium">
                                    {parseFloat(formatEther(progress.details.ethAccumulated)).toFixed(4)} ETH
                                </p>
                            </div>
                        )}
                        {progress.details.lastTxHash && (
                            <div>
                                <p className="text-gray-600">Last Transaction</p>
                                <a
                                    href={`https://etherscan.io/tx/${progress.details.lastTxHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-medium text-blue-600 hover:text-blue-800 truncate block"
                                >
                                    {progress.details.lastTxHash.slice(0, 10)}...
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Transaction History */}
            {transactions.length > 0 && (
                <div className="bg-white p-4 rounded-lg border">
                    <h4 className="font-semibold text-gray-800 mb-3">
                        Transaction History ({transactions.length})
                    </h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {transactions.map((tx, index) => (
                            <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                                <div className="flex items-center space-x-3">
                                    <span className="text-lg">
                                        {getTransactionIcon(tx.type, tx.status)}
                                    </span>
                                    <div>
                                        <p className="text-sm font-medium">
                                            {tx.type === 'SWAP' ? 'Token Swap' :
                                             tx.type === 'TRANSFER' ? 'ETH Transfer' :
                                             'Token Approval'}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {new Date(tx.timestamp).toLocaleTimeString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    {tx.hash ? (
                                        <a
                                            href={`https://etherscan.io/tx/${tx.hash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:text-blue-800 text-sm font-mono"
                                        >
                                            {tx.hash.slice(0, 8)}...
                                        </a>
                                    ) : (
                                        <span className="text-gray-400 text-sm">Pending...</span>
                                    )}
                                    <p className={`text-xs font-medium ${
                                        tx.status === 'SUCCESS' ? 'text-green-600' :
                                        tx.status === 'FAILED' ? 'text-red-600' :
                                        'text-yellow-600'
                                    }`}>
                                        {tx.status}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Error Message */}
            {progress.details?.errorMessage && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mt-4">
                    <strong>Error:</strong> {progress.details.errorMessage}
                </div>
            )}
        </div>
    );
};
