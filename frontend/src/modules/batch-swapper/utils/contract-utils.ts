/**
 * Contract Integration Utilities - Simplified and Clean
 * Core functions for interacting with BatchSwapperV2 contract
 */

import { Address } from 'viem'
import { ContractSwapParams } from '../types'

// === ETH ADDRESS CONSTANT ===
const ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

// === PREPARE BATCH SWAP PARAMETERS ===
export function prepareBatchSwapParams(
    swaps: any[],
    supportedTokens?: any,
    userAddress?: Address
): Promise<{
    swapParams: ContractSwapParams[]
    totalEthValue: bigint
}> {
    console.log('Preparing batch swap params with swaps:', swaps);

    if (!swaps || swaps.length === 0) {
        throw new Error('No swaps provided to prepare batch swap parameters');
    }

    const swapParams = swaps.map((swap, index) => {
        console.log(`Processing swap ${index}:`, swap);

        // Validate required fields with detailed error messages
        if (!swap.tokenIn && !swap.fromToken && !swap.from) {
            console.error(`Swap ${index} missing tokenIn field:`, swap);
            throw new Error(`Missing tokenIn field in swap ${index}. Available fields: ${Object.keys(swap).join(', ')}`);
        }

        if (!swap.tokenOut && !swap.toToken && !swap.to) {
            console.error(`Swap ${index} missing tokenOut field:`, swap);
            throw new Error(`Missing tokenOut field in swap ${index}. Available fields: ${Object.keys(swap).join(', ')}`);
        }

        // Extract token addresses with fallback field names
        const tokenIn = (swap.tokenIn || swap.fromToken || swap.from) as Address;
        const tokenOut = (swap.tokenOut || swap.toToken || swap.to) as Address;

        // Extract amounts with fallback field names
        const amountIn = BigInt(swap.amountIn || swap.amount || swap.fromAmount || '0');
        const minAmountOut = BigInt(swap.minAmountOut || swap.expectedOutput || swap.toAmount || swap.minAmount || '0');

        // Extract swap data
        const swapData = (swap.swapData || swap.data || swap.calldata || '0x') as `0x${string}`;

        console.log(`Prepared swap ${index}: tokenIn=${tokenIn}, tokenOut=${tokenOut}, amountIn=${amountIn}, minAmountOut=${minAmountOut}`);

        return {
            tokenIn,
            tokenOut,
            amountIn,
            minAmountOut,
            swapData
        };
    });

    const totalEthValue = calculateTotalETHValue(swapParams);

    console.log('Prepared batch swap params:', { swapParams, totalEthValue });

    return Promise.resolve({
        swapParams,
        totalEthValue
    });
}

// === CREATE BATCH SWAP TRANSACTION ===
export function createBatchSwapTransaction(
    swaps: ContractSwapParams[],
    recipient: Address,
    totalEthValue?: bigint
) {
    return {
        swaps,
        recipient,
        value: totalEthValue || calculateTotalETHValue(swaps)
    }
}

// === CALCULATE TOTAL ETH VALUE ===
function calculateTotalETHValue(swaps: ContractSwapParams[]): bigint {
    return swaps.reduce((total, swap) => {
        // Add comprehensive null/undefined checks
        if (!swap || !swap.tokenIn || typeof swap.tokenIn !== 'string') {
            console.warn('Invalid swap object or tokenIn:', swap);
            return total;
        }

        if (swap.tokenIn.toLowerCase() === ETH_ADDRESS.toLowerCase()) {
            return total + (swap.amountIn || 0n);
        }
        return total;
    }, 0n);
}

// === VALIDATE SWAP PARAMETERS ===
export function validateSwapParams(swaps: ContractSwapParams[]): {
    isValid: boolean
    errors: string[]
} {
    const errors: string[] = []

    if (swaps.length === 0) {
        errors.push('No swaps provided')
    }

    if (swaps.length > 10) {
        errors.push('Too many swaps (max 10)')
    }

    swaps.forEach((swap, index) => {
        if (swap.tokenIn === swap.tokenOut) {
            errors.push(`Swap ${index + 1}: Cannot swap same token`)
        }

        if (swap.amountIn <= 0n) {
            errors.push(`Swap ${index + 1}: Amount must be greater than 0`)
        }

        if (swap.minAmountOut <= 0n) {
            errors.push(`Swap ${index + 1}: Min amount out must be greater than 0`)
        }
    })

    return {
        isValid: errors.length === 0,
        errors
    }
}
