// Complete business logic extracted from your working BatchSwapperInterface
// This preserves all your complex logic in clean, reusable functions

import { Address } from 'viem';
import { oneInchAPI } from '../services/oneInchAPI';
import {
    prepareBatchSwapParams,
    createBatchSwapTransaction,
} from '../utils/contract-utils';

// Types (matching your existing interfaces)
interface TokenBalance {
    address: Address;
    symbol: string;
    name: string;
    decimals: number;
    logoURI?: string;
    balance: string;
    balanceFormatted: string;
    usdPrice: number;
    usdValue: number;
    percentage: number;
}

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

interface TargetAllocation {
    symbol: string;
    percentage: number;
}

interface GasSavings {
    batchGas: number;
    individualGas: number;
    savedGas: number;
    savedUsd: number;
}

export class BatchSwapBusinessLogic {
    private tokens: any[] = [];
    private balances: TokenBalance[] = [];
    private totalValue: number = 0;
    private contractAddress: Address = '0x' as Address;
    private selectedChainId: number = 8453;

    constructor(
        tokens: any[],
        balances: TokenBalance[],
        totalValue: number,
        contractAddress: Address,
        selectedChainId: number
    ) {
        this.tokens = tokens;
        this.balances = balances;
        this.totalValue = totalValue;
        this.contractAddress = contractAddress;
        this.selectedChainId = selectedChainId;
    }

    // Helper function to get token data by symbol from current balances (1inch data)
    getTokenBySymbol(symbol: string) {
        console.log(`🔍 getTokenBySymbol called for: "${symbol}"`);

        // First, check in user's actual portfolio tokens (from 1inch)
        const portfolioToken = this.balances.find(b => b.symbol === symbol);
        if (portfolioToken) {
            console.log(`✅ Found ${symbol} in portfolio:`, portfolioToken.address);
            return {
                address: portfolioToken.address,
                symbol: portfolioToken.symbol,
                name: portfolioToken.name,
                decimals: portfolioToken.decimals,
                logo: portfolioToken.logoURI || '🪙'
            };
        }

        // If not in portfolio, look it up in the full 1inch tokens array
        const fullToken = this.tokens.find(t => t.symbol === symbol);
        if (fullToken) {
            console.log(`✅ Found ${symbol} in full token list:`, fullToken.address);
            return {
                address: fullToken.address,
                symbol: fullToken.symbol,
                name: fullToken.name,
                decimals: fullToken.decimals,
                logo: fullToken.logoURI || '🪙'
            };
        }

        console.warn(`❌ Token ${symbol} not found in portfolio or full token list`);
        return null;
    }

    // Create token lookup object from portfolio data for batch swap
    createTokenLookup() {
        const tokenLookup: Record<string, any> = {};

        // Add all portfolio tokens to lookup
        this.balances.forEach(token => {
            tokenLookup[token.symbol] = {
                address: token.address,
                symbol: token.symbol,
                name: token.name,
                decimals: token.decimals,
                logo: token.logoURI || '🪙'
            };
        });

        // Also add all available 1inch tokens to lookup for completeness
        this.tokens.forEach(token => {
            if (!tokenLookup[token.symbol]) {
                tokenLookup[token.symbol] = {
                    address: token.address,
                    symbol: token.symbol,
                    name: token.name,
                    decimals: token.decimals,
                    logo: token.logoURI || '🪙'
                };
            }
        });

        console.log('📋 Created token lookup from portfolio + full token list:', Object.keys(tokenLookup).length, 'tokens');
        return tokenLookup;
    }

    // Calculate rebalance steps (your existing complex logic)
    calculateRebalanceSteps(
        selectedAssets: string[],
        sellPercentages: Record<string, number>,
        targetAllocations: TargetAllocation[]
    ): RebalanceStep[] {
        const steps: RebalanceStep[] = [];

        // Calculate total USD value we're selling
        let totalSellValue = 0;
        const sellDetails: Array<{ symbol: string, usdValue: number, tokenAmount: string }> = [];

        selectedAssets.forEach(symbol => {
            const sellPercentage = sellPercentages[symbol] || 0;
            const currentBalance = this.balances.find(b => b.symbol === symbol);
            if (currentBalance && sellPercentage > 0) {
                const sellUsdValue = (currentBalance.usdValue * sellPercentage) / 100;
                const sellTokenAmount = Math.floor(Number(currentBalance.balance) * sellPercentage / 100).toString();

                totalSellValue += sellUsdValue;
                sellDetails.push({
                    symbol,
                    usdValue: sellUsdValue,
                    tokenAmount: sellTokenAmount
                });
            }
        });

        if (totalSellValue === 0) {
            console.log('No sell value, cannot create rebalance steps');
            return steps;
        }

        console.log('Total sell value:', totalSellValue);
        console.log('Sell details:', sellDetails);

        // Calculate how much USD value we need to buy for each target token
        const buyDetails: Array<{ symbol: string, usdValue: number, percentage: number }> = [];
        let totalTargetUsdValue = 0;

        targetAllocations.forEach(target => {
            if (target.percentage > 0) {
                // Calculate target USD value based on the total portfolio value
                const targetUsdValue = (this.totalValue * target.percentage) / 100;
                const currentBalance = this.balances.find(b => b.symbol === target.symbol);
                const currentUsdValue = currentBalance?.usdValue || 0;

                // We need to buy: target - current
                const needToBuyUsdValue = Math.max(0, targetUsdValue - currentUsdValue);

                if (needToBuyUsdValue > 0.1) { // Need to buy at least $0.10 worth
                    buyDetails.push({
                        symbol: target.symbol,
                        usdValue: needToBuyUsdValue,
                        percentage: target.percentage
                    });
                    totalTargetUsdValue += needToBuyUsdValue;
                }
            }
        });

        console.log('Buy details:', buyDetails);
        console.log('Total target USD value needed:', totalTargetUsdValue);

        if (buyDetails.length === 0) {
            console.log('No tokens need to be bought');
            return steps;
        }

        // Create swap steps: split our sell amount proportionally across target tokens
        for (const sellDetail of sellDetails) {
            const swapsForThisToken: Array<{
                buyToken: string;
                proportion: number;
                calculatedAmount: number;
            }> = [];

            // First, calculate all proportions and amounts for this sell token
            for (const buyDetail of buyDetails) {
                // Skip if trying to swap to the same token
                if (sellDetail.symbol === buyDetail.symbol) continue;

                const buyProportion = buyDetail.usdValue / totalTargetUsdValue;
                const calculatedAmount = Math.floor(Number(sellDetail.tokenAmount) * buyProportion);

                if (calculatedAmount > 0) {
                    swapsForThisToken.push({
                        buyToken: buyDetail.symbol,
                        proportion: buyProportion,
                        calculatedAmount
                    });
                }
            }

            // Ensure amounts add up to the total - adjust the last swap to consume any remainder
            if (swapsForThisToken.length > 0) {
                const totalCalculated = swapsForThisToken.reduce((sum, swap) => sum + swap.calculatedAmount, 0);
                const totalTokenAmount = Number(sellDetail.tokenAmount);
                const remainder = totalTokenAmount - totalCalculated;

                console.log(`📊 Amount distribution for ${sellDetail.symbol}:`, {
                    totalTokenAmount,
                    totalCalculated,
                    remainder,
                    swaps: swapsForThisToken.map(s => ({ token: s.buyToken, amount: s.calculatedAmount }))
                });

                // Add remainder to the largest swap to ensure we use the full approved amount
                if (remainder !== 0) {
                    const largestSwapIndex = swapsForThisToken.reduce((maxIndex, swap, index, array) =>
                        swap.calculatedAmount > array[maxIndex].calculatedAmount ? index : maxIndex, 0);

                    swapsForThisToken[largestSwapIndex].calculatedAmount += remainder;
                    console.log(`📝 Added remainder ${remainder} to ${swapsForThisToken[largestSwapIndex].buyToken} swap`);
                }

                // Create the actual swap steps
                for (const swap of swapsForThisToken) {
                    console.log(`Creating swap: ${swap.calculatedAmount} ${sellDetail.symbol} → ${swap.buyToken} (${(swap.proportion * 100).toFixed(1)}%)`);

                    // Get actual token addresses instead of symbols
                    const fromTokenData = this.getTokenBySymbol(sellDetail.symbol);
                    const toTokenData = this.getTokenBySymbol(swap.buyToken);

                    if (!fromTokenData || !toTokenData) {
                        console.error(`Token data missing for ${sellDetail.symbol} or ${swap.buyToken}`);
                        continue;
                    }

                    steps.push({
                        fromToken: fromTokenData.address, // Use address instead of symbol
                        toToken: toTokenData.address,     // Use address instead of symbol
                        fromAmount: swap.calculatedAmount.toString(),
                        fromAmountFormatted: '',
                        expectedOutput: '',
                        expectedOutputFormatted: '',
                        quote: null,
                        priceImpact: 0,
                        minOutput: '',
                        minOutputFormatted: '',
                        gasEstimate: 0,
                        loading: false,
                        error: null
                    });
                }
            }
        }

        console.log('Generated rebalance steps:', steps);
        return steps;
    }

    // Calculate total sell amounts for each token (used for approvals)
    calculateTotalSellAmounts(selectedAssets: string[], sellPercentages: Record<string, number>) {
        console.log('🔍 calculateTotalSellAmounts called with:', {
            selectedAssets,
            sellPercentages,
            balances: this.balances.map(b => ({ symbol: b.symbol, balance: b.balance }))
        });

        const totalSellAmounts: { token: Address, amount: bigint }[] = [];

        selectedAssets.forEach(symbol => {
            const sellPercentage = sellPercentages[symbol] || 0;
            const currentBalance = this.balances.find(b => b.symbol === symbol);

            console.log(`🔍 Processing ${symbol}:`, {
                sellPercentage,
                currentBalance: currentBalance ? {
                    symbol: currentBalance.symbol,
                    balance: currentBalance.balance,
                    usdValue: currentBalance.usdValue
                } : 'NOT FOUND'
            });

            if (currentBalance && sellPercentage > 0) {
                const token = this.getTokenBySymbol(symbol);

                console.log(`🔍 Token lookup result for ${symbol}:`, token);

                if (token) {
                    // Calculate total amount to sell (full percentage of holdings)
                    const totalSellAmount = (BigInt(currentBalance.balance) * BigInt(sellPercentage)) / BigInt(100);

                    console.log(`📊 Total sell amount for ${symbol}:`, {
                        balance: currentBalance.balance,
                        sellPercentage,
                        totalSellAmount: totalSellAmount.toString(),
                        tokenAddress: token.address
                    });

                    // Skip ETH as it doesn't need approval
                    const isETH = token.address.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' ||
                        token.address.toLowerCase() === '0x0000000000000000000000000000000000000000';

                    if (!isETH && totalSellAmount > 0n) {
                        totalSellAmounts.push({
                            token: token.address as Address,
                            amount: totalSellAmount
                        });
                        console.log(`✅ Added ${symbol} to approval list:`, {
                            token: token.address,
                            amount: totalSellAmount.toString()
                        });
                    } else if (isETH) {
                        console.log(`⏭️ Skipped ${symbol} (ETH) - no approval needed`);
                    } else {
                        console.log(`⏭️ Skipped ${symbol} - zero sell amount`);
                    }
                } else {
                    console.error(`❌ Token ${symbol} not found in available tokens`);
                }
            } else {
                console.log(`⏭️ Skipped ${symbol} - sellPercentage: ${sellPercentage}, hasBalance: ${!!currentBalance}`);
            }
        });

        console.log('📊 Total sell amounts calculated:', totalSellAmounts);
        return totalSellAmounts;
    }

    // Check if approvals are needed for tokens
    async checkApprovalsNeeded(
        swapParams: any[],
        selectedAssets: string[],
        sellPercentages: Record<string, number>,
        userAddress: Address
    ): Promise<{ token: Address, amount: bigint }[]> {
        console.log('🔍 NEW APPROVAL STRATEGY: Checking approvals for TOTAL SELL AMOUNTS');

        const approvalsNeeded: { token: Address, amount: bigint }[] = [];
        const totalSellAmounts = this.calculateTotalSellAmounts(selectedAssets, sellPercentages);

        console.log('💡 Total sell amounts calculated:', totalSellAmounts);

        if (totalSellAmounts.length === 0) {
            console.log('⚠️ No total sell amounts calculated - using fallback');
            return [];
        }

        // Check approvals for each sell amount
        for (const sellAmount of totalSellAmounts) {
            console.log('📋 Checking approval for total sell amount:', {
                token: sellAmount.token,
                amount: sellAmount.amount.toString()
            });

            try {
                // Check current allowance for BatchSwapper contract
                const allowanceUrl = `/api/1inch/allowance?tokenAddress=${sellAmount.token}&walletAddress=${userAddress}&spenderAddress=${this.contractAddress}&chainId=${this.selectedChainId}`;
                console.log('📞 Fetching allowance from:', allowanceUrl);

                const allowanceResponse = await fetch(allowanceUrl);

                if (!allowanceResponse.ok) {
                    const errorText = await allowanceResponse.text();
                    console.error(`❌ Failed to check allowance for ${sellAmount.token}:`, allowanceResponse.status, errorText);
                    // Assume approval is needed if we can't check
                    approvalsNeeded.push({
                        token: sellAmount.token,
                        amount: sellAmount.amount
                    });
                    continue;
                }

                const allowanceData = await allowanceResponse.json();
                console.log('📋 Allowance response:', allowanceData);

                // Handle different response formats from 1inch API
                let currentAllowance: bigint;
                if (typeof allowanceData === 'object' && allowanceData !== null) {
                    if ('allowance' in allowanceData) {
                        currentAllowance = BigInt(allowanceData.allowance || '0');
                    } else if ('result' in allowanceData) {
                        currentAllowance = BigInt(allowanceData.result || '0');
                    } else {
                        currentAllowance = BigInt(allowanceData.toString() || '0');
                    }
                } else {
                    currentAllowance = BigInt(allowanceData || '0');
                }

                const requiredAmount = sellAmount.amount;

                console.log(`💰 Allowance check for ${sellAmount.token}:`, {
                    currentAllowance: currentAllowance.toString(),
                    requiredAmount: requiredAmount.toString(),
                    needsApproval: currentAllowance < requiredAmount,
                    spender: this.contractAddress
                });

                if (currentAllowance < requiredAmount) {
                    console.log(`⚠️ Approval needed for ${sellAmount.token}: ${requiredAmount.toString()}`);
                    approvalsNeeded.push({
                        token: sellAmount.token,
                        amount: requiredAmount
                    });
                } else {
                    console.log(`✅ Sufficient allowance for ${sellAmount.token}`);
                }
            } catch (err) {
                console.error(`💥 Error checking allowance for ${sellAmount.token}:`, err);
                // Assume approval is needed if we can't check
                approvalsNeeded.push({
                    token: sellAmount.token,
                    amount: sellAmount.amount
                });
            }
        }

        console.log('📊 Final approvals needed:', approvalsNeeded);
        return approvalsNeeded;
    }

    // Simulate rebalancing with 1inch quotes
    async simulateRebalancing(
        selectedAssets: string[],
        sellPercentages: Record<string, number>,
        targetAllocations: TargetAllocation[]
    ): Promise<{
        steps: RebalanceStep[];
        totalGasEstimate: number;
        totalSlippage: number;
        gasSavings: GasSavings | null;
    }> {
        console.log('Starting simulation with:', {
            selectedAssets,
            sellPercentages,
            targetAllocations,
            totalValue: this.totalValue
        });

        const steps = this.calculateRebalanceSteps(selectedAssets, sellPercentages, targetAllocations);
        console.log('Generated steps:', steps);

        if (steps.length === 0) {
            throw new Error('No swaps needed - your target allocation matches current holdings or no valid sell/target configuration');
        }

        // Get quotes for each step
        const updatedSteps = await Promise.all(
            steps.map(async (step) => {
                try {
                    const fromToken = this.tokens.find(t => t.address.toLowerCase() === step.fromToken.toLowerCase());
                    const toToken = this.tokens.find(t => t.address.toLowerCase() === step.toToken.toLowerCase());

                    if (!fromToken || !toToken) {
                        throw new Error('Token not found in 1inch token list');
                    }

                    // Get quote from 1inch
                    const quoteParams = new URLSearchParams({
                        src: fromToken.address,
                        dst: toToken.address,
                        amount: step.fromAmount,
                        chainId: this.selectedChainId.toString()
                    });

                    console.log('Getting quote with params:', quoteParams.toString());
                    const quoteResponse = await fetch(`/api/1inch/quote?${quoteParams}`);

                    if (!quoteResponse.ok) {
                        const errorText = await quoteResponse.text();
                        console.error(`Quote API error for ${fromToken.symbol}→${toToken.symbol}:`, errorText);

                        if (quoteResponse.status === 500) {
                            console.warn(`⚠️ 1inch API error, using fallback estimation`);
                            const estimatedOutput = BigInt(step.fromAmount);
                            const minOutput = (estimatedOutput * BigInt(99)) / BigInt(100);

                            return {
                                ...step,
                                fromAmountFormatted: (Number(step.fromAmount) / (10 ** fromToken.decimals)).toFixed(6),
                                expectedOutput: estimatedOutput.toString(),
                                expectedOutputFormatted: (Number(estimatedOutput) / (10 ** toToken.decimals)).toFixed(6),
                                quote: null,
                                priceImpact: 0.1,
                                minOutput: minOutput.toString(),
                                minOutputFormatted: (Number(minOutput) / (10 ** toToken.decimals)).toFixed(6),
                                gasEstimate: 200000,
                                loading: false,
                                error: null
                            };
                        }

                        throw new Error(`Failed to get quote: ${quoteResponse.status} - ${errorText}`);
                    }

                    const quote = await quoteResponse.json();
                    console.log('Received quote:', quote);

                    // Calculate formatted amounts
                    const fromAmountFormatted = (Number(step.fromAmount) / (10 ** fromToken.decimals)).toFixed(6);
                    const expectedOutputFormatted = (Number(quote.dstAmount) / (10 ** toToken.decimals)).toFixed(6);

                    // Calculate minimum output with 1% slippage
                    const minOutputBigInt = (BigInt(quote.dstAmount) * BigInt(99)) / BigInt(100);
                    const minOutput = minOutputBigInt.toString();
                    const minOutputFormatted = (Number(minOutput) / (10 ** toToken.decimals)).toFixed(6);

                    const priceImpact = 0.1; // 0.1% for demo

                    return {
                        ...step,
                        fromAmountFormatted,
                        expectedOutput: quote.dstAmount,
                        expectedOutputFormatted,
                        quote,
                        priceImpact,
                        minOutput,
                        minOutputFormatted,
                        gasEstimate: quote.gas || 200000,
                        loading: false,
                        error: null
                    };
                } catch (err) {
                    console.error('Error getting quote for step:', step, err);
                    return {
                        ...step,
                        loading: false,
                        error: err instanceof Error ? err.message : 'Failed to get quote'
                    };
                }
            })
        );

        // Calculate totals
        const successfulSteps = updatedSteps.filter(step => !step.error);
        let totalGasEstimate = 0;
        let totalSlippage = 0;
        let gasSavings: GasSavings | null = null;

        if (successfulSteps.length > 0) {
            totalGasEstimate = successfulSteps.reduce((sum, step) => sum + step.gasEstimate, 0);
            totalSlippage = successfulSteps.reduce((sum, step) => sum + step.priceImpact, 0) / successfulSteps.length;

            // Calculate gas savings: batch vs individual transactions
            const baseTransactionGas = 21000;
            const individualTotalGas = successfulSteps.reduce((sum, step) => sum + step.gasEstimate + baseTransactionGas, 0);
            const batchTotalGas = totalGasEstimate + baseTransactionGas;
            const savedGas = individualTotalGas - batchTotalGas;

            // Estimate USD savings
            const gasPriceGwei = 0.001;
            const ethPrice = 3000;
            const savedUsd = (savedGas * gasPriceGwei * ethPrice) / 1e9;

            gasSavings = {
                batchGas: batchTotalGas,
                individualGas: individualTotalGas,
                savedGas,
                savedUsd
            };

            console.log('Gas analysis:', gasSavings);
        }

        return {
            steps: updatedSteps,
            totalGasEstimate,
            totalSlippage,
            gasSavings
        };
    }
}
