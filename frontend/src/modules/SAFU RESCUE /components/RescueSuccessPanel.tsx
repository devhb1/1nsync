/**
 * Rescue Success Panel - Shows successful rescue completion results
 */

'use client';

import React from 'react';
import { formatEther } from 'viem';
import { RescueResult } from '../types';

interface RescueSuccessPanelProps {
    result: RescueResult;
    onStartOver: () => void;
}

export const RescueSuccessPanel: React.FC<RescueSuccessPanelProps> = ({
    result,
    onStartOver
}) => {
    const successfulTransactions = result.transactions.filter(tx => tx.status === 'SUCCESS');
    const failedTransactions = result.transactions.filter(tx => tx.status === 'FAILED');

    return (
        <div className="text-center">
            {/* Success Header */}
            <div className="mb-8">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-3xl md:text-4xl font-bold text-green-600 mb-4">
                    WALLET RESCUED!
                </h2>
                <p className="text-lg text-gray-600">
                    Your assets have been successfully moved to safety
                </p>
            </div>

            {/* Results Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-green-50 border border-green-200 p-6 rounded-lg">
                    <div className="text-2xl mb-2">💰</div>
                    <p className="text-sm text-green-600 mb-1">Total Value Rescued</p>
                    <p className="text-2xl font-bold text-green-800">
                        ${result.totalValueRescued.toFixed(2)}
                    </p>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
                    <div className="text-2xl mb-2">🏃‍♂️</div>
                    <p className="text-sm text-blue-600 mb-1">ETH Rescued</p>
                    <p className="text-2xl font-bold text-blue-800">
                        {parseFloat(formatEther(result.totalETHRescued)).toFixed(4)} ETH
                    </p>
                </div>
                
                <div className="bg-purple-50 border border-purple-200 p-6 rounded-lg">
                    <div className="text-2xl mb-2">⚡</div>
                    <p className="text-sm text-purple-600 mb-1">Efficiency</p>
                    <p className="text-2xl font-bold text-purple-800">
                        {result.efficiency.toFixed(1)}%
                    </p>
                </div>
            </div>

            {/* Execution Details */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8 text-left">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Rescue Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-gray-600">Execution Time</p>
                        <p className="font-medium">{Math.round(result.executionTimeSeconds)} seconds</p>
                    </div>
                    <div>
                        <p className="text-gray-600">Gas Spent</p>
                        <p className="font-medium">${result.totalGasSpent.toFixed(2)}</p>
                    </div>
                    <div>
                        <p className="text-gray-600">Successful Transactions</p>
                        <p className="font-medium text-green-600">{successfulTransactions.length}</p>
                    </div>
                    <div>
                        <p className="text-gray-600">Failed Operations</p>
                        <p className="font-medium text-red-600">{failedTransactions.length}</p>
                    </div>
                </div>
            </div>

            {/* Transaction List */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8 text-left">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Transaction History ({result.transactions.length})
                </h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                    {result.transactions.map((tx, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                            <div className="flex items-center space-x-3">
                                <span className="text-lg">
                                    {tx.status === 'SUCCESS' ? '✅' : 
                                     tx.status === 'FAILED' ? '❌' : '⏳'}
                                </span>
                                <div>
                                    <p className="text-sm font-medium">
                                        {tx.type === 'SWAP' ? 'Token Swap' :
                                         tx.type === 'TRANSFER' ? 'ETH Transfer' :
                                         'Token Approval'}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {new Date(tx.timestamp).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                {tx.hash && (
                                    <a
                                        href={`https://etherscan.io/tx/${tx.hash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800 text-sm font-mono"
                                    >
                                        View Transaction ↗
                                    </a>
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

            {/* Failed Assets Warning */}
            {result.failedAssets.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
                    <h3 className="text-lg font-semibold text-yellow-800 mb-4 flex items-center">
                        ⚠️ Some Assets Could Not Be Rescued
                    </h3>
                    <p className="text-yellow-700 mb-4">
                        {result.failedAssets.length} assets could not be rescued. You may need to handle these manually.
                    </p>
                    <div className="space-y-2">
                        {result.failedAssets.map((asset, index) => (
                            <div key={index} className="text-sm text-yellow-800 bg-yellow-100 p-2 rounded">
                                {asset.token.symbol}: {asset.balanceFormatted} (${asset.valueUSD.toFixed(2)})
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Final Wallet Balance */}
            <div className="bg-green-100 border border-green-300 rounded-lg p-6 mb-8">
                <h3 className="text-lg font-semibold text-green-800 mb-2">
                    🛡️ Safe Wallet Balance
                </h3>
                <p className="text-3xl font-bold text-green-700">
                    {parseFloat(formatEther(result.finalSafeWalletBalance)).toFixed(4)} ETH
                </p>
                <p className="text-sm text-green-600 mt-2">
                    Your rescued assets are now safe in your secure wallet
                </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                    onClick={onStartOver}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Rescue Another Wallet
                </button>
                <a
                    href="https://etherscan.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors inline-block text-center"
                >
                    View on Etherscan ↗
                </a>
            </div>

            {/* Security Reminder */}
            <div className="mt-8 text-center">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-800 mb-2">🔒 Important Security Reminder</h4>
                    <p className="text-sm text-blue-700">
                        Remember to secure your new wallet, review what caused the compromise, 
                        and consider using hardware wallets for maximum security.
                    </p>
                </div>
            </div>
        </div>
    );
};
