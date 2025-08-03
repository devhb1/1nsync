/**
 * Calculation utilities for the BatchSwapper module
 * Includes formatting, validation, and mathematical operations
 */

/**
 * Format wei amount to ether string
 * @param wei - Amount in wei (bigint)
 * @returns Formatted ether string
 */
export const formatEther = (wei: bigint): string => {
    const etherValue = Number(wei) / 1e18;
    if (etherValue < 0.0001) {
        return etherValue.toExponential(2);
    }
    if (etherValue < 1) {
        return etherValue.toFixed(6);
    }
    if (etherValue < 1000) {
        return etherValue.toFixed(4);
    }
    return etherValue.toFixed(2);
};

/**
 * Format token amount with decimals
 * @param amount - Token amount (bigint)
 * @param decimals - Token decimals
 * @returns Formatted token amount string
 */
export const formatUnits = (amount: bigint | string, decimals: number): string => {
    const amountBigInt = typeof amount === 'string' ? BigInt(amount) : amount;
    const divisor = BigInt(10 ** decimals);
    const quotient = amountBigInt / divisor;
    const remainder = amountBigInt % divisor;

    if (remainder === BigInt(0)) {
        return quotient.toString();
    }

    const remainderStr = remainder.toString().padStart(decimals, '0');
    const trimmedRemainder = remainderStr.replace(/0+$/, '');

    if (trimmedRemainder === '') {
        return quotient.toString();
    }

    return `${quotient}.${trimmedRemainder}`;
};

/**
 * Parse string to token units (opposite of formatUnits)
 * @param value - String value to parse
 * @param decimals - Token decimals
 * @returns Token amount as bigint
 */
export const parseUnits = (value: string, decimals: number): bigint => {
    const [integer, fraction = ''] = value.split('.');
    const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
    return BigInt(integer + paddedFraction);
};

/**
 * Format currency value to USD string
 * @param value - Numeric value
 * @returns Formatted currency string
 */
export const formatCurrency = (value: number): string => {
    if (value === 0) return '$0.00';

    if (value < 0.01) {
        return `$${value.toFixed(6)}`;
    }

    if (value < 1) {
        return `$${value.toFixed(4)}`;
    }

    if (value < 1000) {
        return `$${value.toFixed(2)}`;
    }

    if (value < 1000000) {
        return `$${(value / 1000).toFixed(1)}K`;
    }

    if (value < 1000000000) {
        return `$${(value / 1000000).toFixed(1)}M`;
    }

    return `$${(value / 1000000000).toFixed(1)}B`;
};

/**
 * Format percentage value
 * @param value - Percentage value (0-100)
 * @returns Formatted percentage string
 */
export const formatPercentage = (value: number): string => {
    if (Math.abs(value) < 0.01) {
        return '0.00%';
    }

    if (Math.abs(value) < 1) {
        return `${value.toFixed(2)}%`;
    }

    return `${value.toFixed(1)}%`;
};

/**
 * Format gas amount for display
 * @param gas - Gas amount (bigint or number)
 * @returns Formatted gas string
 */
export const formatGas = (gas: bigint | number): string => {
    const gasNumber = typeof gas === 'bigint' ? Number(gas) : gas;

    if (gasNumber > 1000000) {
        return `${(gasNumber / 1000000).toFixed(1)}M`;
    }

    if (gasNumber > 1000) {
        return `${(gasNumber / 1000).toFixed(0)}K`;
    }

    return gasNumber.toString();
};

/**
 * Validate allocation percentages
 * @param allocations - Array of allocation objects with percentage property
 * @returns Validation result
 */
export interface AllocationValidation {
    isValid: boolean;
    totalPercentage: number;
    errors: string[];
}

export const validateAllocationPercentages = (
    allocations: Array<{ percentage: number; token?: any }>
): AllocationValidation => {
    const errors: string[] = [];
    let totalPercentage = 0;

    // Check individual allocations
    allocations.forEach((allocation, index) => {
        if (allocation.percentage < 0) {
            errors.push(`Allocation ${index + 1}: Percentage cannot be negative`);
        }

        if (allocation.percentage > 100) {
            errors.push(`Allocation ${index + 1}: Percentage cannot exceed 100%`);
        }

        totalPercentage += allocation.percentage;
    });

    // Check total percentage
    if (Math.abs(totalPercentage - 100) > 0.01) {
        errors.push(`Total allocation must equal 100% (current: ${totalPercentage.toFixed(2)}%)`);
    }

    return {
        isValid: errors.length === 0,
        totalPercentage,
        errors
    };
};

/**
 * Calculate price impact for a swap
 * @param inputAmount - Input token amount
 * @param outputAmount - Output token amount
 * @param marketPrice - Current market price
 * @returns Price impact percentage
 */
export const calculatePriceImpact = (
    inputAmount: number,
    outputAmount: number,
    marketPrice: number
): number => {
    const expectedOutput = inputAmount * marketPrice;
    const priceImpact = ((expectedOutput - outputAmount) / expectedOutput) * 100;
    return Math.max(0, priceImpact);
};

/**
 * Calculate gas savings (overloaded function)
 * @param individualGas - Total gas for individual swaps OR number of swaps
 * @param batchGas - Gas for batch swap (optional)
 * @returns Gas savings object
 */
export function calculateGasSavings(swapCount: number): { absolute: bigint; percentage: number };
export function calculateGasSavings(individualGas: bigint, batchGas: bigint): { absolute: bigint; percentage: number };
export function calculateGasSavings(
    individualGasOrSwapCount: bigint | number,
    batchGas?: bigint
): { absolute: bigint; percentage: number } {
    // If called with a single number (swap count), estimate gas
    if (typeof individualGasOrSwapCount === 'number' && batchGas === undefined) {
        const swapCount = individualGasOrSwapCount;
        const estimatedIndividualGas = BigInt(swapCount) * 150000n; // Estimated gas per swap
        const estimatedBatchGas = 100000n + (BigInt(swapCount) * 80000n); // Batch overhead + per swap

        const absolute = estimatedIndividualGas - estimatedBatchGas;
        const percentage = (Number(absolute) / Number(estimatedIndividualGas)) * 100;

        return {
            absolute,
            percentage: Math.max(0, percentage)
        };
    }

    // If called with two bigint parameters
    if (typeof individualGasOrSwapCount === 'bigint' && batchGas !== undefined) {
        const absolute = individualGasOrSwapCount - batchGas;
        const percentage = (Number(absolute) / Number(individualGasOrSwapCount)) * 100;

        return {
            absolute,
            percentage: Math.max(0, percentage)
        };
    }

    throw new Error('Invalid parameters for calculateGasSavings');
};

/**
 * Convert wei to gwei
 * @param wei - Amount in wei
 * @returns Amount in gwei
 */
export const weiToGwei = (wei: bigint): number => {
    return Number(wei) / 1e9;
};

/**
 * Convert gwei to wei
 * @param gwei - Amount in gwei
 * @returns Amount in wei
 */
export const gweiToWei = (gwei: number): bigint => {
    return BigInt(Math.round(gwei * 1e9));
};

/**
 * Format token balance for display
 * @param balance - Token balance (string or bigint)
 * @param decimals - Token decimals
 * @param symbol - Token symbol
 * @returns Formatted balance string
 */
export const formatTokenBalance = (
    balance: string | bigint,
    decimals: number,
    symbol: string
): string => {
    const formattedAmount = formatUnits(
        typeof balance === 'string' ? BigInt(balance) : balance,
        decimals
    );

    return `${formattedAmount} ${symbol}`;
};

/**
 * Calculate portfolio allocation percentage
 * @param tokenValue - Value of specific token
 * @param totalValue - Total portfolio value
 * @returns Allocation percentage
 */
export const calculateAllocationPercentage = (
    tokenValue: number,
    totalValue: number
): number => {
    if (totalValue === 0) return 0;
    return (tokenValue / totalValue) * 100;
};

/**
 * Format large numbers with appropriate suffixes
 * @param value - Numeric value
 * @returns Formatted number string
 */
export const formatLargeNumber = (value: number): string => {
    if (value < 1000) {
        return value.toFixed(0);
    }

    if (value < 1000000) {
        return `${(value / 1000).toFixed(1)}K`;
    }

    if (value < 1000000000) {
        return `${(value / 1000000).toFixed(1)}M`;
    }

    return `${(value / 1000000000).toFixed(1)}B`;
};

/**
 * Calculate portfolio percentages for token balances
 * @param balances - Array of token balances with values
 * @returns Array of balances with percentage added
 */
export const calculatePortfolioPercentages = (balances: Array<{ valueUSD: number }>): Array<{ valueUSD: number; percentage: number }> => {
    const totalValue = balances.reduce((sum, balance) => sum + balance.valueUSD, 0);

    if (totalValue === 0) {
        return balances.map(balance => ({ ...balance, percentage: 0 }));
    }

    return balances.map(balance => ({
        ...balance,
        percentage: (balance.valueUSD / totalValue) * 100
    }));
};

/**
 * Calculate total portfolio value
 * @param balances - Array of token balances with USD values
 * @returns Total portfolio value in USD
 */
export const calculateTotalPortfolioValue = (balances: Array<{ valueUSD: number }>): number => {
    return balances.reduce((sum, balance) => sum + balance.valueUSD, 0);
};
