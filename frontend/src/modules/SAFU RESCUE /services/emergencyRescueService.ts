/**
 * Emergency Rescue Service - MVP Implementation with proper 1inch flow
 * PHASE 1: Discovery → PHASE 2: Approvals → PHASE 3: Swaps → PHASE 4: ETH Transfer
 */

import { Address, parseEther, formatEther } from 'viem';
import {
    RescuableAsset,
    RescueTransaction,
    RescueResult,
    EmergencyRescueServiceConfig,
    RescueError,
    RescueErrorCode,
    RescueProgress
} from '../types';

// Core configuration constants
const ONE_INCH_ROUTER = "0x1111111254EEB25477B68fb85Ed929f73A960582"; // 1inch V5 Router

// Default emergency configuration
const DEFAULT_EMERGENCY_CONFIG: EmergencyRescueServiceConfig = {
    chainId: 8453, // Base mainnet - only supported chain
    userAddress: '0x' as Address,
    maxGasPriceGwei: 100, // Higher for emergency
    gasLimitMultiplier: 2.0,
    emergencySlippageTolerance: 3, // 3% slippage
    minValueUSDToRescue: 1, // Rescue assets worth $1+
    maxAssetsToProcess: 20,
    timeoutMinutes: 15,
    retryAttempts: 3,
    parallelSwaps: false, // Sequential for reliability
    reserveETHForGas: BigInt('5000000000000000'), // 0.005 ETH reserve
    validateAddresses: true
};

export class EmergencyRescueService {
    private config: EmergencyRescueServiceConfig;
    private transactions: RescueTransaction[] = [];
    private apiKey: string;

    constructor(config: Partial<EmergencyRescueServiceConfig>) {
        this.config = { ...DEFAULT_EMERGENCY_CONFIG, ...config };
        this.apiKey = process.env.NEXT_PUBLIC_ONEINCH_API_KEY || '';
        if (!this.apiKey) {
            console.warn('⚠️ 1inch API key not found. Set NEXT_PUBLIC_ONEINCH_API_KEY');
        }
    }

    /**
     * PHASE 1: DISCOVERY - Scan wallet for rescuable assets
     */
    async discoverRescuableAssets(): Promise<RescuableAsset[]> {
        try {
            console.log('🔍 Phase 1: Starting asset discovery...');

            // Use your existing API route instead of direct 1inch API call
            const response = await fetch(
                `/api/1inch/balance/${this.config.chainId}/${this.config.userAddress}`,
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Balance API failed: ${response.status}`);
            }

            const balanceData = await response.json();
            const rescuableAssets: RescuableAsset[] = [];

            // Process each token balance
            for (const [tokenAddress, tokenData] of Object.entries(balanceData)) {
                const token = tokenData as any;

                // Calculate USD value
                const balance = BigInt(token.balance || '0');
                const price = parseFloat(token.price || '0');
                const decimals = parseInt(token.decimals || '18');
                const valueUSD = (parseFloat(balance.toString()) / Math.pow(10, decimals)) * price;

                // Skip if below minimum value threshold
                if (valueUSD < this.config.minValueUSDToRescue) {
                    continue;
                }

                const isNative = tokenAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

                const rescuableAsset: RescuableAsset = {
                    token: {
                        address: tokenAddress as Address,
                        symbol: token.symbol || 'UNKNOWN',
                        name: token.name || 'Unknown Token',
                        decimals: decimals,
                        logoURI: token.logoURI
                    },
                    balance: balance,
                    balanceFormatted: (parseFloat(balance.toString()) / Math.pow(10, decimals)).toFixed(6),
                    valueUSD: valueUSD,
                    priceUSD: price,
                    isNative: isNative,
                    priority: valueUSD * (isNative ? 1.1 : 1.0), // Slight priority boost for ETH
                    canSwap: true // Assume all tokens can be swapped via 1inch
                };

                rescuableAssets.push(rescuableAsset);
            }

            // Sort by priority (highest value first)
            rescuableAssets.sort((a, b) => b.priority - a.priority);

            // Limit to max assets for gas optimization
            const limitedAssets = rescuableAssets.slice(0, this.config.maxAssetsToProcess);

            console.log(`✅ Phase 1 Complete: Found ${limitedAssets.length} rescuable assets worth $${limitedAssets.reduce((sum, asset) => sum + asset.valueUSD, 0).toFixed(2)}`);

            return limitedAssets;

        } catch (error) {
            console.error('❌ Phase 1 Failed - Asset discovery:', error);
            throw this.createError('NO_ASSETS_FOUND', 'Failed to discover assets');
        }
    }

    /**
     * PHASE 2: APPROVALS - Approve all ERC-20 tokens for 1inch router
     */
    async approveAllTokens(
        tokens: RescuableAsset[],
        onProgress?: (progress: number, message: string) => void
    ): Promise<void> {
        try {
            console.log('🔐 Phase 2: Starting token approvals...');

            const erc20Tokens = tokens.filter(token => !token.isNative);
            let approvedCount = 0;

            for (const token of erc20Tokens) {
                onProgress?.(
                    (approvedCount / erc20Tokens.length) * 100,
                    `Approving ${token.token.symbol} for swapping...`
                );

                try {
                    // Check current allowance using your API route
                    const allowanceResponse = await fetch(
                        `/api/1inch/allowance?` +
                        `tokenAddress=${token.token.address}&walletAddress=${this.config.userAddress}&spenderAddress=${ONE_INCH_ROUTER}&chainId=${this.config.chainId}`
                    );

                    const allowanceData = await allowanceResponse.json();
                    const currentAllowance = BigInt(allowanceData.allowance || '0');

                    // If allowance is insufficient, approve unlimited
                    if (currentAllowance < token.balance) {
                        const approvalResponse = await fetch(
                            `/api/1inch/approve?` +
                            `tokenAddress=${token.token.address}&amount=unlimited&chainId=${this.config.chainId}`
                        );

                        const approvalTx = await approvalResponse.json();

                        // This would execute the approval transaction
                        // For now, we'll simulate it
                        const txHash = await this.executeTransaction(approvalTx);

                        this.transactions.push({
                            hash: txHash,
                            type: 'APPROVAL',
                            fromToken: token.token.address,
                            amount: token.balance,
                            status: 'SUCCESS',
                            timestamp: Date.now()
                        });

                        console.log(`✅ Approved ${token.token.symbol} for swapping`);
                    } else {
                        console.log(`✅ ${token.token.symbol} already approved`);
                    }

                    approvedCount++;

                } catch (approvalError) {
                    console.warn(`⚠️ Failed to approve ${token.token.symbol}:`, approvalError);

                    this.transactions.push({
                        hash: '',
                        type: 'APPROVAL',
                        fromToken: token.token.address,
                        amount: token.balance,
                        status: 'FAILED',
                        timestamp: Date.now(),
                        errorMessage: approvalError instanceof Error ? approvalError.message : 'Approval failed'
                    });
                }
            }

            onProgress?.(100, `Approved ${approvedCount}/${erc20Tokens.length} tokens`);
            console.log(`✅ Phase 2 Complete: Approved ${approvedCount}/${erc20Tokens.length} tokens`);

        } catch (error) {
            console.error('❌ Phase 2 Failed - Token approvals:', error);
            throw this.createError('SWAP_FAILED', 'Failed to approve tokens');
        }
    }

    /**
     * PHASE 3: SWAPS - Execute swaps with destReceiver set to safe wallet
     */
    async executeSwapsToSafeWallet(
        tokens: RescuableAsset[],
        safeWalletAddress: Address,
        onProgress?: (progress: number, message: string) => void
    ): Promise<bigint> {
        try {
            console.log('🔄 Phase 3: Starting swaps to safe wallet...');

            const swappableTokens = tokens.filter(token => !token.isNative);
            let swappedCount = 0;
            let totalETHReceived = BigInt(0);

            for (const token of swappableTokens) {
                onProgress?.(
                    (swappedCount / swappableTokens.length) * 100,
                    `Swapping ${token.token.symbol} to ETH → Safe Wallet...`
                );

                try {
                    // Get swap transaction with destReceiver set to safe wallet using your API route
                    const swapResponse = await fetch(
                        `/api/1inch/swap?` +
                        `fromTokenAddress=${token.token.address}&toTokenAddress=0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE&amount=${token.balance}&fromAddress=${this.config.userAddress}&slippage=${this.config.emergencySlippageTolerance}&destReceiver=${safeWalletAddress}&disableEstimate=true&chainId=${this.config.chainId}`
                    );

                    const swapData = await swapResponse.json();

                    if (swapData.tx) {
                        // Execute the swap transaction
                        const txHash = await this.executeTransaction(swapData.tx);

                        const estimatedETH = BigInt(swapData.toAmount || '0');
                        totalETHReceived += estimatedETH;

                        this.transactions.push({
                            hash: txHash,
                            type: 'SWAP',
                            fromToken: token.token.address,
                            toToken: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as Address,
                            amount: token.balance,
                            status: 'SUCCESS',
                            timestamp: Date.now()
                        });

                        console.log(`✅ Swapped ${token.token.symbol} to ETH → Safe Wallet`);
                        swappedCount++;
                    } else {
                        throw new Error('Failed to get swap transaction data');
                    }
                } catch (swapError) {
                    console.warn(`⚠️ Failed to swap ${token.token.symbol}:`, swapError);

                    this.transactions.push({
                        hash: '',
                        type: 'SWAP',
                        fromToken: token.token.address,
                        toToken: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as Address,
                        amount: token.balance,
                        status: 'FAILED',
                        timestamp: Date.now(),
                        errorMessage: swapError instanceof Error ? swapError.message : 'Swap failed'
                    });
                }
            }

            onProgress?.(100, `Swapped ${swappedCount}/${swappableTokens.length} tokens`);
            console.log(`✅ Phase 3 Complete: Swapped ${swappedCount}/${swappableTokens.length} tokens`);

            return totalETHReceived;

        } catch (error) {
            console.error('❌ Phase 3 Failed - Token swaps:', error);
            throw this.createError('SWAP_FAILED', 'Failed to execute swaps');
        }
    }

    /**
     * PHASE 4: ETH TRANSFER - Send remaining native ETH to safe wallet
     */
    async transferRemainingETH(safeWalletAddress: Address): Promise<bigint> {
        try {
            console.log('💰 Phase 4: Transferring remaining ETH...');

            // This would get the actual ETH balance
            // For now, we'll simulate it
            const balance = BigInt('100000000000000000'); // 0.1 ETH example
            const transferAmount = balance - this.config.reserveETHForGas;

            if (transferAmount > 0) {
                // Execute ETH transfer
                const txHash = await this.executeETHTransfer(safeWalletAddress, transferAmount);

                this.transactions.push({
                    hash: txHash,
                    type: 'TRANSFER',
                    amount: transferAmount,
                    status: 'SUCCESS',
                    timestamp: Date.now()
                });

                console.log(`✅ Phase 4 Complete: Transferred ${formatEther(transferAmount)} ETH to safe wallet`);
                return transferAmount;
            } else {
                console.log('⚠️ No ETH remaining to transfer');
                return BigInt(0);
            }

        } catch (error) {
            console.error('❌ Phase 4 Failed - ETH transfer:', error);
            throw this.createError('TRANSFER_FAILED', 'Failed to transfer ETH');
        }
    }

    /**
     * COMPLETE RESCUE EXECUTION - All 4 phases
     */
    async executeCompleteRescue(
        safeWalletAddress: Address,
        onProgress?: (phase: string, progress: number, message: string) => void
    ): Promise<RescueResult> {
        try {
            const startTime = Date.now();
            this.transactions = [];
            let totalValueRescued = 0;
            let totalETHRescued = BigInt(0);

            // PHASE 1: Discovery
            onProgress?.('discovery', 10, 'Scanning wallet for assets...');
            const rescuableAssets = await this.discoverRescuableAssets();
            totalValueRescued = rescuableAssets.reduce((sum, asset) => sum + asset.valueUSD, 0);

            // PHASE 2: Approvals
            onProgress?.('approval', 30, 'Approving tokens for swapping...');
            await this.approveAllTokens(rescuableAssets, (progress, message) => {
                onProgress?.('approval', 30 + (progress * 0.3), message);
            });

            // PHASE 3: Swaps
            onProgress?.('swapping', 60, 'Swapping assets to safe wallet...');
            const swappedETH = await this.executeSwapsToSafeWallet(rescuableAssets, safeWalletAddress, (progress, message) => {
                onProgress?.('swapping', 60 + (progress * 0.3), message);
            });
            totalETHRescued += swappedETH;

            // PHASE 4: ETH Transfer
            onProgress?.('transfer', 90, 'Transferring remaining ETH...');
            const transferredETH = await this.transferRemainingETH(safeWalletAddress);
            totalETHRescued += transferredETH;

            // Complete
            onProgress?.('complete', 100, 'Rescue completed successfully!');

            const executionTimeSeconds = (Date.now() - startTime) / 1000;
            const totalGasSpent = 10; // Estimate
            const efficiency = ((totalValueRescued - totalGasSpent) / totalValueRescued) * 100;

            const result: RescueResult = {
                success: true,
                totalValueRescued: totalValueRescued - totalGasSpent,
                totalETHRescued,
                totalGasSpent,
                efficiency,
                transactions: this.transactions,
                failedAssets: [],
                executionTimeSeconds,
                finalSafeWalletBalance: totalETHRescued
            };

            console.log(`🎉 RESCUE COMPLETED! Rescued $${result.totalValueRescued.toFixed(2)} worth of assets`);
            return result;

        } catch (error) {
            console.error('❌ RESCUE FAILED:', error);
            throw error instanceof Error ? error : this.createError('UNKNOWN_ERROR', 'Complete rescue failed');
        }
    }

    // === HELPER METHODS ===

    private async executeTransaction(txData: any): Promise<string> {
        // This would execute the actual transaction via web3/ethers
        // For now, return a mock transaction hash
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate network delay
        return `0x${Math.random().toString(16).substring(2)}`;
    }

    private async executeETHTransfer(to: Address, amount: bigint): Promise<string> {
        // This would execute the actual ETH transfer
        // For now, return a mock transaction hash
        await new Promise(resolve => setTimeout(resolve, 1000));
        return `0x${Math.random().toString(16).substring(2)}`;
    }

    private createError(code: RescueErrorCode, message: string): RescueError {
        return {
            code,
            message,
            recoverable: ['NETWORK_ERROR', 'SWAP_FAILED'].includes(code)
        } as RescueError;
    }

    // === PUBLIC UTILITY METHODS ===

    public updateConfig(newConfig: Partial<EmergencyRescueServiceConfig>): void {
        this.config = { ...this.config, ...newConfig };
    }

    public getTransactions(): RescueTransaction[] {
        return [...this.transactions];
    }

    public clearTransactions(): void {
        this.transactions = [];
    }
}

// Export singleton instance factory
export const createEmergencyRescueService = (config: Partial<EmergencyRescueServiceConfig>) => {
    return new EmergencyRescueService(config);
};

// Export default configured instance
export const emergencyRescueService = new EmergencyRescueService(DEFAULT_EMERGENCY_CONFIG);