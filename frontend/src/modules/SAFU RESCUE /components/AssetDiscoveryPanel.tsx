/**
 * Asset Discovery Panel - Shows discovered rescuable assets
 */

'use client';

import React from 'react';
import { RescuableAsset } from '../types';

interface AssetDiscoveryPanelProps {
    assets: RescuableAsset[];
    isLoading: boolean;
    onRefresh: () => void;
    hasError: boolean;
    errorMessage: string | null;
}

export const AssetDiscoveryPanel: React.FC<AssetDiscoveryPanelProps> = ({
    assets,
    isLoading,
    onRefresh,
    hasError,
    errorMessage
}) => {
    const totalValue = assets.reduce((sum, asset) => sum + asset.valueUSD, 0);

    return (
        <div className="border-2 border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800 flex items-center">
                    🔍 Asset Discovery
                </h3>
                <button
                    onClick={onRefresh}
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                    {isLoading ? 'Scanning...' : 'Refresh'}
                </button>
            </div>

            {hasError && errorMessage ? (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    <strong>Error:</strong> {errorMessage}
                </div>
            ) : isLoading ? (
                <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Scanning wallet for rescuable assets...</p>
                </div>
            ) : assets.length === 0 ? (
                <div className="text-center py-8">
                    <p className="text-gray-600 mb-4">No rescuable assets found</p>
                    <p className="text-sm text-gray-500">Connect your wallet and click refresh to scan for assets</p>
                </div>
            ) : (
                <div>
                    {/* Summary */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-green-800 font-semibold">
                                    {assets.length} Assets Found
                                </p>
                                <p className="text-green-600">
                                    Total Value: ${totalValue.toFixed(2)}
                                </p>
                            </div>
                            <div className="text-2xl">✅</div>
                        </div>
                    </div>

                    {/* Asset List */}
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                        {assets.map((asset, index) => (
                            <div
                                key={`${asset.token.address}-${index}`}
                                className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"
                            >
                                <div className="flex items-center space-x-3">
                                    {asset.token.logoURI ? (
                                        <img
                                            src={asset.token.logoURI}
                                            alt={asset.token.symbol}
                                            className="w-8 h-8 rounded-full"
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                            }}
                                        />
                                    ) : (
                                        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-xs font-bold">
                                            {asset.token.symbol.slice(0, 2)}
                                        </div>
                                    )}
                                    <div>
                                        <p className="font-medium text-gray-800">
                                            {asset.token.symbol}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {asset.balanceFormatted}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-medium text-gray-800">
                                        ${asset.valueUSD.toFixed(2)}
                                    </p>
                                    <div className="flex items-center space-x-2">
                                        {asset.canSwap ? (
                                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                                Swappable
                                            </span>
                                        ) : (
                                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                                Direct Transfer
                                            </span>
                                        )}
                                        {asset.isNative && (
                                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                Native
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
