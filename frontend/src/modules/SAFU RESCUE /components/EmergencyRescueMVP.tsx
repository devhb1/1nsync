/**
 * Emergency Rescue MVP Component
 * Implements the exact 4-phase rescue flow for 1inch hackathon
 * 
 * Phase 1: Input compromised wallet + safe wallet
 * Phase 2: Discover assets using 1inch Balance API  
 * Phase 3: Execute complete rescue (Approve → Swap → Transfer)
 * Phase 4: Success confirmation
 */

'use client';

import React, { useState } from 'react';
import { Address, isAddress, formatEther } from 'viem';
import { useAccount, useConnect } from 'wagmi';
import { useEmergencyRescue } from '../hooks/useEmergencyRescue';
import { RescuableAsset } from '../types';

// Simple UI Components (inline to avoid shadcn dependencies)
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <div className={`bg-white border rounded-lg shadow-lg ${className}`}>
        {children}
    </div>
);

const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <div className={`p-6 border-b ${className}`}>
        {children}
    </div>
);

const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <div className={`p-6 ${className}`}>
        {children}
    </div>
);

const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <h2 className={`text-xl font-bold ${className}`}>
        {children}
    </h2>
);

const Button: React.FC<{ 
    children: React.ReactNode; 
    onClick?: () => void; 
    disabled?: boolean;
    className?: string;
    variant?: 'default' | 'outline';
    size?: 'default' | 'lg' | 'sm';
}> = ({ children, onClick, disabled = false, className = '', variant = 'default', size = 'default' }) => {
    const baseClasses = 'font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center justify-center';
    const sizeClasses = {
        default: 'px-4 py-2 text-sm',
        lg: 'px-6 py-3 text-base',
        sm: 'px-3 py-1.5 text-xs'
    };
    const variantClasses = {
        default: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
        outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500'
    };
    
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
        >
            {children}
        </button>
    );
};

const Input: React.FC<{
    id?: string;
    placeholder?: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    className?: string;
}> = ({ id, placeholder, value, onChange, className = '' }) => (
    <input
        id={id}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`}
    />
);

const Label: React.FC<{ htmlFor?: string; children: React.ReactNode; className?: string }> = ({ htmlFor, children, className = '' }) => (
    <label htmlFor={htmlFor} className={`block text-sm font-medium text-gray-700 ${className}`}>
        {children}
    </label>
);

const Alert: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <div className={`p-4 rounded-md border ${className}`}>
        {children}
    </div>
);

const AlertDescription: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <div className={`text-sm ${className}`}>
        {children}
    </div>
);

const Badge: React.FC<{ children: React.ReactNode; variant?: 'default' | 'destructive' | 'secondary'; className?: string }> = ({ 
    children, 
    variant = 'default', 
    className = '' 
}) => {
    const variantClasses = {
        default: 'bg-blue-100 text-blue-800',
        destructive: 'bg-red-100 text-red-800',
        secondary: 'bg-gray-100 text-gray-800'
    };
    
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]} ${className}`}>
            {children}
        </span>
    );
};

const Progress: React.FC<{ value: number; className?: string }> = ({ value, className = '' }) => (
    <div className={`w-full bg-gray-200 rounded-full ${className}`}>
        <div 
            className="bg-blue-600 h-full rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
    </div>
);

// Icons (simplified)
const AlertTriangle = () => <span>⚠️</span>;
const Shield = () => <span>🛡️</span>;
const ArrowRight = () => <span>→</span>;
const CheckCircle = () => <span>✅</span>;
const Loader2 = () => <span className="animate-spin">⏳</span>;
const Wallet = () => <span>👛</span>;
const Coins = () => <span>🪙</span>;
const ArrowUpRight = () => <span>↗️</span>;
const ExternalLink = () => <span>🔗</span>;

// MVP Emergency Rescue Component
export const EmergencyRescueMVP: React.FC = () => {
    const { address, isConnected, chainId } = useAccount();
    const { connect, connectors } = useConnect();
    
    // Local state for MVP flow
    const [safeWallet, setSafeWallet] = useState('');
    const [phase, setPhase] = useState<'input' | 'discovering' | 'executing' | 'success'>('input');
    
    // Base mainnet only support
    const isCorrectChain = chainId === 8453;
    
    // Emergency rescue hook
    const {
        rescuableAssets,
        progress,
        transactions,
        discoverAssets,
        executeCompleteRescue,
        resetRescue,
        isDiscovering,
        isExecuting,
        isCompleted,
        hasError,
        canExecute,
        rescueResult,
        errorMessage
    } = useEmergencyRescue();

    // === PHASE HANDLERS ===

    const handleDiscoverAssets = async () => {
        setPhase('discovering');
        await discoverAssets();
    };

    const handleExecuteRescue = async () => {
        if (!isAddress(safeWallet)) {
            alert('Please enter a valid safe wallet address');
            return;
        }
        
        setPhase('executing');
        try {
            await executeCompleteRescue(safeWallet as Address);
            setPhase('success');
        } catch (error) {
            console.error('Rescue failed:', error);
            // Stay in executing phase to show error
        }
    };

    const handleReset = () => {
        resetRescue();
        setSafeWallet('');
        setPhase('input');
    };

    // Helper functions for formatting
    const formatBalance = (balance: bigint): string => {
        return parseFloat(formatEther(balance)).toFixed(6);
    };

    const formatEthBalance = (balance: bigint): string => {
        return parseFloat(formatEther(balance)).toFixed(4);
    };

    // === WALLET CONNECTION ===
    if (!isConnected) {
        return (
            <Card className="w-full max-w-2xl mx-auto border-red-200 bg-red-50">
                <CardHeader className="text-center">
                    <div className="flex items-center justify-center gap-2 text-red-600 mb-2">
                        <span className="text-2xl">⚠️</span>
                        <CardTitle className="text-2xl">🚨 EMERGENCY WALLET RESCUE</CardTitle>
                    </div>
                    <p className="text-red-700">
                        Your wallet may be compromised. Connect to begin emergency asset rescue.
                    </p>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Alert className="border-red-300 bg-red-100">
                        <AlertDescription className="text-red-800">
                            <strong>⚠️ URGENT ACTION REQUIRED</strong><br/>
                            If you suspect your wallet is compromised, every second counts. Connect your wallet to begin immediate asset rescue.
                        </AlertDescription>
                    </Alert>
                    
                    <div className="space-y-2">
                        {connectors.map((connector) => (
                            <Button
                                key={connector.id}
                                onClick={() => connect({ connector })}
                                className="w-full bg-red-600 hover:bg-red-700 text-white"
                                size="lg"
                            >
                                <span className="mr-2">👛</span>
                                Connect {connector.name}
                            </Button>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    // === CHAIN VALIDATION ===
    if (!isCorrectChain) {
        return (
            <Card className="w-full max-w-2xl mx-auto border-orange-200 bg-orange-50">
                <CardHeader className="text-center">
                    <div className="flex items-center justify-center gap-2 text-orange-600 mb-2">
                        <span className="text-2xl">🔗</span>
                        <CardTitle className="text-2xl">Wrong Network</CardTitle>
                    </div>
                    <p className="text-orange-700">
                        SAFU RESCUE currently supports Base mainnet only.
                    </p>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Alert className="border-orange-300 bg-orange-100">
                        <AlertDescription className="text-orange-800">
                            <strong>⚠️ NETWORK REQUIRED</strong><br/>
                            Please switch to Base mainnet (Chain ID: 8453) to use SAFU RESCUE.
                            <br/>Current network: {chainId ? `Chain ID ${chainId}` : 'Unknown'}
                        </AlertDescription>
                    </Alert>
                    
                    <Button
                        onClick={() => window.location.reload()}
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                        size="lg"
                    >
                        <span className="mr-2">🔄</span>
                        Switch to Base Mainnet
                    </Button>
                </CardContent>
            </Card>
        );
    }

    // === PHASE 1: INPUT ===
    if (phase === 'input') {
        return (
            <Card className="w-full max-w-2xl mx-auto border-red-200 bg-red-50">
                <CardHeader className="text-center">
                    <div className="flex items-center justify-center gap-2 text-red-600 mb-2">
                        <span className="text-2xl">⚠️</span>
                        <CardTitle className="text-2xl">🚨 EMERGENCY RESCUE</CardTitle>
                    </div>
                    <p className="text-red-700">
                        Compromised Wallet: <Badge variant="destructive" className="font-mono">{address}</Badge>
                    </p>
                </CardHeader>
                
                <CardContent className="space-y-6">
                    <Alert className="border-red-300 bg-red-100">
                        <AlertDescription className="text-red-800">
                            <span className="mr-2">🛡️</span>
                            <strong>RESCUE PROTOCOL ACTIVATED</strong><br/>
                            We will discover all your assets and swap them to ETH, then transfer to your safe wallet.
                        </AlertDescription>
                    </Alert>

                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="safeWallet" className="text-lg font-semibold text-red-800">
                                Safe Wallet Address *
                            </Label>
                            <Input
                                id="safeWallet"
                                placeholder="0x... (Enter your safe wallet address)"
                                value={safeWallet}
                                onChange={(e) => setSafeWallet(e.target.value)}
                                className="mt-1 border-red-300 focus:border-red-500"
                            />
                            <p className="text-sm text-red-600 mt-1">
                                ⚠️ This wallet will receive ALL your rescued assets as ETH
                            </p>
                        </div>

                        <Button
                            onClick={handleDiscoverAssets}
                            disabled={!safeWallet || !isAddress(safeWallet) || isDiscovering}
                            className="w-full bg-red-600 hover:bg-red-700 text-white text-lg py-3"
                            size="lg"
                        >
                            {isDiscovering ? (
                                <>
                                    <span className="mr-2 animate-spin">⏳</span>
                                    Scanning Assets...
                                </>
                            ) : (
                                <>
                                    <span className="mr-2">🪙</span>
                                    🚨 BEGIN EMERGENCY RESCUE
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // === PHASE 2: DISCOVERING ===
    if (phase === 'discovering' || (isDiscovering && rescuableAssets.length === 0)) {
        return (
            <Card className="w-full max-w-2xl mx-auto border-orange-200 bg-orange-50">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl text-orange-600">
                        🔍 SCANNING COMPROMISED WALLET
                    </CardTitle>
                    <p className="text-orange-700">Discovering all rescuable assets...</p>
                </CardHeader>
                
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-center py-8">
                        <span className="text-4xl animate-spin">⏳</span>
                    </div>
                    
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>Progress</span>
                            <span>{progress.progress}%</span>
                        </div>
                        <Progress value={progress.progress} className="h-2" />
                        <p className="text-center text-orange-700">{progress.message}</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // === PHASE 3: ASSETS DISCOVERED - READY TO EXECUTE ===
    if (rescuableAssets.length > 0 && !isExecuting && !isCompleted && !hasError) {
        const totalValueUSD = rescuableAssets.reduce((sum, asset) => sum + asset.valueUSD, 0);
        const tokenCount = rescuableAssets.filter(asset => !asset.isNative).length;
        const nativeAsset = rescuableAssets.find(asset => asset.isNative);

        return (
            <Card className="w-full max-w-2xl mx-auto border-orange-200 bg-orange-50">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl text-orange-600">
                        ⚡ ASSETS DISCOVERED - READY TO RESCUE
                    </CardTitle>
                    <p className="text-orange-700">Review and confirm emergency rescue</p>
                </CardHeader>
                
                <CardContent className="space-y-6">
                    <Alert className="border-orange-300 bg-orange-100">
                        <AlertDescription className="text-orange-800">
                            <span className="mr-2">🪙</span>
                            <strong>RESCUE SUMMARY</strong><br/>
                            • {rescuableAssets.length} assets worth <strong>${totalValueUSD.toFixed(2)}</strong><br/>
                            • {tokenCount} tokens will be swapped to ETH<br/>
                            {nativeAsset && <span>• {formatEthBalance(nativeAsset.balance)} ETH will be transferred directly</span>}
                        </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                        <h3 className="font-semibold text-orange-800">Assets to Rescue:</h3>
                        <div className="max-h-40 overflow-y-auto space-y-1">
                            {rescuableAssets.map((asset, index) => (
                                <div 
                                    key={index}
                                    className="flex justify-between items-center p-2 bg-white rounded border"
                                >
                                    <div>
                                        <span className="font-medium">{asset.token.symbol}</span>
                                        <span className="text-sm text-gray-600 ml-2">
                                            {asset.isNative ? formatEthBalance(asset.balance) : formatBalance(asset.balance)}
                                        </span>
                                    </div>
                                    <Badge variant="secondary">
                                        ${asset.valueUSD.toFixed(2)}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded border">
                        <p className="text-sm text-gray-700">
                            <strong>Safe Wallet:</strong> <span className="font-mono">{safeWallet}</span>
                        </p>
                    </div>

                    <Button
                        onClick={handleExecuteRescue}
                        className="w-full bg-red-600 hover:bg-red-700 text-white text-lg py-3"
                        size="lg"
                    >
                        <span className="mr-2">→</span>
                        🚨 EXECUTE EMERGENCY RESCUE
                    </Button>
                </CardContent>
            </Card>
        );
    }

    // === PHASE 4: EXECUTING ===
    if (isExecuting) {
        return (
            <Card className="w-full max-w-2xl mx-auto border-red-200 bg-red-50">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl text-red-600">
                        ⚡ EXECUTING EMERGENCY RESCUE
                    </CardTitle>
                    <p className="text-red-700">Rescuing your assets to safety...</p>
                </CardHeader>
                
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>Rescue Progress</span>
                            <span>{progress.progress}%</span>
                        </div>
                        <Progress value={progress.progress} className="h-3" />
                        <p className="text-center text-red-700 font-medium">{progress.message}</p>
                    </div>

                    <div className="text-center">
                        <span className="text-6xl animate-spin">⏳</span>
                    </div>

                    <Alert className="border-red-300 bg-red-100">
                        <AlertDescription className="text-red-800">
                            <span className="mr-2">⚠️</span>
                            <strong>DO NOT CLOSE THIS WINDOW</strong><br/>
                            Rescue in progress. Step {progress.currentStep} of {progress.totalSteps}.
                        </AlertDescription>
                    </Alert>

                    {transactions.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="font-semibold text-red-800">Transactions:</h3>
                            <div className="max-h-32 overflow-y-auto space-y-1">
                                {transactions.map((tx, index) => (
                                    <div 
                                        key={index}
                                        className="flex justify-between items-center p-2 bg-white rounded border text-sm"
                                    >
                                        <span>{tx.type}</span>
                                        <Badge variant={tx.status === 'SUCCESS' ? 'default' : 'secondary'}>
                                            {tx.status}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    }

    // === PHASE 5: SUCCESS ===
    if (isCompleted && rescueResult) {
        return (
            <Card className="w-full max-w-2xl mx-auto border-green-200 bg-green-50">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl text-green-600">
                        🎉 RESCUE COMPLETED!
                    </CardTitle>
                    <p className="text-green-700">Your assets have been safely rescued</p>
                </CardHeader>
                
                <CardContent className="space-y-6">
                    <div className="text-center">
                        <span className="text-8xl">✅</span>
                    </div>

                    <Alert className="border-green-300 bg-green-100">
                        <AlertDescription className="text-green-800">
                            <span className="mr-2">✅</span>
                            <strong>SUCCESS!</strong><br/>
                            • <strong>${rescueResult.totalValueRescued.toFixed(2)}</strong> total value rescued<br/>
                            • <strong>{formatEthBalance(rescueResult.totalETHRescued)} ETH</strong> transferred to safe wallet<br/>
                            • {rescueResult.transactions.length} successful swaps completed
                        </AlertDescription>
                    </Alert>

                    <div className="bg-white p-4 rounded border">
                        <p className="text-sm text-gray-700">
                            <strong>Safe Wallet:</strong> <span className="font-mono">{safeWallet}</span>
                        </p>
                        <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => window.open(`https://etherscan.io/address/${safeWallet}`, '_blank')}
                        >
                            <span className="mr-2">🔗</span>
                            View on Etherscan
                        </Button>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            onClick={handleReset}
                            variant="outline"
                            className="flex-1"
                        >
                            Rescue Another Wallet
                        </Button>
                        <Button
                            onClick={() => window.open('https://1inch.io', '_blank')}
                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                        >
                            <span className="mr-2">↗️</span>
                            Visit 1inch
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // === ERROR STATE ===
    if (hasError) {
        return (
            <Card className="w-full max-w-2xl mx-auto border-red-200 bg-red-50">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl text-red-600">
                        ❌ Rescue Failed
                    </CardTitle>
                </CardHeader>
                
                <CardContent className="space-y-4">
                    <Alert className="border-red-300 bg-red-100">
                        <AlertDescription className="text-red-800">
                            <span className="mr-2">⚠️</span>
                            <strong>Error:</strong> {errorMessage}
                        </AlertDescription>
                    </Alert>

                    <Button
                        onClick={handleReset}
                        className="w-full bg-red-600 hover:bg-red-700 text-white"
                    >
                        Try Again
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return null;
};

export default EmergencyRescueMVP;
