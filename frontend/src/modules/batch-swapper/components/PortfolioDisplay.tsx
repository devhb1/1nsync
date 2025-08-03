/**
 * Portfolio Display Component - Clean UI for showing user's complete portfolio
 */

import React from 'react';
import { usePortfolio } from '../hooks/usePortfolio';
import { PortfolioToken } from '../services/portfolioService';
import { formatUnits } from '../utils/calculations';

interface PortfolioDisplayProps {
    chainId?: number;
    className?: string;
}

interface TokenRowProps {
    token: PortfolioToken;
    totalPortfolioValue: number;
}

const TokenRow: React.FC<TokenRowProps> = ({ token, totalPortfolioValue }) => {
    const percentage = totalPortfolioValue > 0 && token.balanceUSD 
        ? (token.balanceUSD / totalPortfolioValue) * 100 
        : 0;

    return (
        <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700/50 hover:border-gray-600 transition-colors">
            <div className="flex items-center space-x-3">
                {/* Token Icon */}
                <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                    {token.logoURI ? (
                        <img 
                            src={token.logoURI} 
                            alt={token.symbol}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const nextElement = target.nextElementSibling as HTMLElement;
                                if (nextElement) {
                                    nextElement.style.display = 'flex';
                                }
                            }}
                        />
                    ) : null}
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                        {token.symbol.slice(0, 2).toUpperCase()}
                    </div>
                </div>

                {/* Token Info */}
                <div>
                    <div className="flex items-center space-x-2">
                        <span className="font-semibold text-white">{token.symbol}</span>
                        {token.isNative && (
                            <span className="px-2 py-0.5 bg-green-600 text-green-100 text-xs rounded-full">Native</span>
                        )}
                    </div>
                    <div className="text-sm text-gray-400">{token.name}</div>
                </div>
            </div>

            {/* Balance Info */}
            <div className="text-right">
                <div className="font-semibold text-white">
                    {parseFloat(token.balanceFormatted).toFixed(6)} {token.symbol}
                </div>
                <div className="text-sm text-gray-400">
                    {token.balanceUSD ? (
                        <div>
                            <span>${token.balanceUSD.toFixed(2)}</span>
                            {percentage > 0 && (
                                <span className="ml-2 text-xs">({percentage.toFixed(1)}%)</span>
                            )}
                        </div>
                    ) : (
                        <span>No price data</span>
                    )}
                </div>
            </div>
        </div>
    );
};

const LoadingState: React.FC = () => (
    <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-700 rounded-full animate-pulse"></div>
                    <div className="space-y-2">
                        <div className="h-4 bg-gray-700 rounded w-16 animate-pulse"></div>
                        <div className="h-3 bg-gray-700 rounded w-24 animate-pulse"></div>
                    </div>
                </div>
                <div className="text-right space-y-2">
                    <div className="h-4 bg-gray-700 rounded w-20 animate-pulse"></div>
                    <div className="h-3 bg-gray-700 rounded w-16 animate-pulse"></div>
                </div>
            </div>
        ))}
    </div>
);

const EmptyState: React.FC = () => (
    <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-700 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-300 mb-2">No tokens found</h3>
        <p className="text-gray-500">Your portfolio appears to be empty or we couldn't fetch your balances.</p>
    </div>
);

export const PortfolioDisplay: React.FC<PortfolioDisplayProps> = ({ 
    chainId = 8453, 
    className = "" 
}) => {
    const { 
        portfolio, 
        tokens, 
        totalValueUSD, 
        tokenCount, 
        hasBalances,
        isLoading, 
        isError, 
        error,
        refetch,
        isFetching
    } = usePortfolio({ chainId });

    if (isLoading) {
        return (
            <div className={`space-y-6 ${className}`}>
                <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700/50">
                    <div className="h-6 bg-gray-700 rounded w-32 animate-pulse mb-4"></div>
                    <div className="h-8 bg-gray-700 rounded w-24 animate-pulse"></div>
                </div>
                <LoadingState />
            </div>
        );
    }

    if (isError) {
        return (
            <div className={`bg-red-900/20 border border-red-500/50 rounded-lg p-6 ${className}`}>
                <h3 className="text-red-400 font-semibold mb-2">Failed to load portfolio</h3>
                <p className="text-red-300/80 text-sm mb-4">
                    {error?.message || 'Unable to fetch your portfolio data'}
                </p>
                <button 
                    onClick={() => refetch()}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className={`space-y-6 ${className}`}>
            {/* Portfolio Header */}
            <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-lg p-6 border border-blue-500/20">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white">Your Portfolio</h2>
                    <button 
                        onClick={() => refetch()}
                        disabled={isFetching}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                    >
                        <svg className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Refresh</span>
                    </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <div className="text-2xl font-bold text-green-400">
                            ${totalValueUSD.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-400">Total Portfolio Value</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-blue-400">{tokenCount}</div>
                        <div className="text-sm text-gray-400">Tokens Held</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-purple-400">
                            {portfolio?.chainName || 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-400">Network</div>
                    </div>
                </div>
            </div>

            {/* Token List */}
            <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white">Token Holdings</h3>
                
                {!hasBalances ? (
                    <EmptyState />
                ) : (
                    <div className="space-y-3">
                        {tokens.map((token) => (
                            <TokenRow 
                                key={token.address} 
                                token={token} 
                                totalPortfolioValue={totalValueUSD}
                            />
                        ))}
                        
                        {tokenCount > tokens.length && (
                            <div className="text-center py-4">
                                <span className="text-gray-400 text-sm">
                                    Showing {tokens.length} of {tokenCount} tokens
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
