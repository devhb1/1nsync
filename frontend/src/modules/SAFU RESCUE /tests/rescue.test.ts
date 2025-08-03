/**
 * SAFU RESCUE Module - Mock Data and Examples
 * Example data for testing and development
 */

import { Address } from 'viem';
import { RescuableAsset, RescueResult } from '../types';

// Mock data for testing
export const mockRescuableAssets: RescuableAsset[] = [
    {
        token: {
            address: '0xA0b86a33E6441d25d0e1b0c7F3E5f4b5c9a3b2c1' as Address,
            symbol: 'USDC',
            name: 'USD Coin',
            decimals: 6,
            logoURI: 'https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png'
        },
        balance: BigInt('5000000'), // 5 USDC
        balanceFormatted: '5.000000',
        valueUSD: 5.0,
        priceUSD: 1.0,
        isNative: false,
        priority: 5.0,
        canSwap: true
    },
    {
        token: {
            address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as Address,
            symbol: 'ETH',
            name: 'Ethereum',
            decimals: 18
        },
        balance: BigInt('100000000000000000'), // 0.1 ETH
        balanceFormatted: '0.1',
        valueUSD: 300.0,
        priceUSD: 3000.0,
        isNative: true,
        priority: 330.0, // Higher priority due to native boost
        canSwap: true
    },
    {
        token: {
            address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599' as Address,
            symbol: 'WBTC',
            name: 'Wrapped Bitcoin',
            decimals: 8,
            logoURI: 'https://assets.coingecko.com/coins/images/7598/thumb/wrapped_bitcoin_wbtc.png'
        },
        balance: BigInt('50000'), // 0.0005 WBTC
        balanceFormatted: '0.00050000',
        valueUSD: 25.0,
        priceUSD: 50000.0,
        isNative: false,
        priority: 25.0,
        canSwap: true
    }
];

export const mockRescueResult = {
    success: true,
    totalValueRescued: 325.0,
    totalETHRescued: BigInt('108333333333333333'), // ~0.108 ETH
    totalGasSpent: 5.0,
    efficiency: 98.5,
    transactions: [
        {
            hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
            type: 'SWAP' as const,
            fromToken: '0xA0b86a33E6441d25d0e1b0c7F3E5f4b5c9a3b2c1' as Address,
            toToken: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as Address,
            amount: BigInt('5000000'),
            status: 'SUCCESS' as const,
            timestamp: Date.now() - 30000
        },
        {
            hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            type: 'TRANSFER' as const,
            amount: BigInt('108333333333333333'),
            status: 'SUCCESS' as const,
            timestamp: Date.now()
        }
    ],
    failedAssets: [],
    executionTimeSeconds: 45,
    finalSafeWalletBalance: BigInt('108333333333333333')
};
