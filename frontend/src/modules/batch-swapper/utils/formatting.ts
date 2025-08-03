/**
 * Number and BigInt Utility Functions
 * For safe conversions and formatting in batch swap operations
 */

import { formatUnits as viemFormatUnits, parseUnits as viemParseUnits } from 'viem'

// === SAFE BIGINT CONVERSION ===
export function safeBigInt(value: string | number, context = ''): bigint {
    try {
        const stringValue = typeof value === 'number' ? value.toString() : value

        // Handle decimal points
        if (stringValue.includes('.')) {
            console.warn(`⚠️ Converting decimal to BigInt in ${context}:`, stringValue)
            const integerPart = Math.floor(Number(stringValue)).toString()
            return BigInt(integerPart)
        }

        // Handle scientific notation
        if (stringValue.includes('e') || stringValue.includes('E')) {
            console.warn(`⚠️ Converting scientific notation to BigInt in ${context}:`, stringValue)
            const integerPart = Math.floor(Number(stringValue)).toString()
            return BigInt(integerPart)
        }

        return BigInt(stringValue)
    } catch (error) {
        console.error(`❌ Failed to convert ${value} to BigInt in ${context}:`, error)
        throw new Error(`Invalid BigInt conversion: ${value} (${context})`)
    }
}

// === TOKEN AMOUNT FORMATTING ===
export function formatTokenAmount(value: bigint, decimals: number): string {
    return viemFormatUnits(value, decimals)
}

export function parseTokenAmount(value: string, decimals: number): bigint {
    return viemParseUnits(value, decimals)
}

// === ETH FORMATTING SHORTCUTS ===
export function formatEther(value: bigint): string {
    return viemFormatUnits(value, 18)
}

export function parseEther(value: string): bigint {
    return viemParseUnits(value, 18)
}

// === USD FORMATTING ===
export function formatUSD(value: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value)
}

// === PERCENTAGE FORMATTING ===
export function formatPercentage(value: number, decimals = 2): string {
    return `${value.toFixed(decimals)}%`
}

// === NUMBER VALIDATION ===
export function validateNumberFormat(value: any, field: string): void {
    if (typeof value !== 'string' && typeof value !== 'number') {
        throw new Error(`${field} must be a string or number, got ${typeof value}`)
    }

    const num = Number(value)
    if (isNaN(num)) {
        throw new Error(`${field} is not a valid number: ${value}`)
    }

    if (num < 0) {
        throw new Error(`${field} cannot be negative: ${value}`)
    }
}

// === GAS CALCULATIONS ===
export function calculateGasSavings(swapCount: number): {
    traditional: number
    batched: number
    saved: number
    percentage: number
} {
    const baseGas = 21000
    const swapGas = 150000

    const traditional = swapCount * (baseGas + swapGas)
    const batched = baseGas + (swapCount * 120000) + 30000 // Batch overhead
    const saved = traditional - batched
    const percentage = Math.round((saved / traditional) * 100)

    return {
        traditional,
        batched,
        saved,
        percentage
    }
}
