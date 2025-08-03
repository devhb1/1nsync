/**
 * SAFU RESCUE Page - Emergency wallet rescue for compromised accounts
 */

'use client';

import React from 'react';
import { EmergencyRescueMVP } from '@/modules/SAFU RESCUE ';
import { AlertTriangle, ArrowLeft, Shield } from 'lucide-react';
import Link from 'next/link';

export default function SafuRescuePage() {
    return (
        <div className="min-h-screen bg-background">
            {/* Header with back navigation */}
            <div className="border-b border-border bg-card/50 backdrop-blur-sm">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <Link 
                            href="/" 
                            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to 1NSYNC
                        </Link>
                        
                        <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium text-primary">Powered by 1inch</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="container mx-auto px-4 py-8">
                {/* Page header */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-r from-red-500 to-orange-500">
                            <AlertTriangle className="h-6 w-6 text-white" />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold text-foreground">
                            🚨 SAFU RESCUE
                        </h1>
                    </div>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Emergency wallet rescue tool for compromised accounts. 
                        Quickly discover and transfer all assets to safety using 1inch infrastructure.
                    </p>
                </div>

                {/* Emergency notice */}
                <div className="max-w-4xl mx-auto mb-8">
                    <div className="rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 p-6">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-red-500 mt-1 flex-shrink-0" />
                            <div>
                                <h3 className="font-semibold text-red-800 dark:text-red-300 mb-2">
                                    Emergency Protocol
                                </h3>
                                <p className="text-sm text-red-700 dark:text-red-400 mb-3">
                                    Only use this tool if your wallet has been compromised or you've detected unauthorized access.
                                </p>
                                <ul className="text-sm text-red-600 dark:text-red-400 space-y-1">
                                    <li>• Asset discovery across multiple chains</li>
                                    <li>• Automated swapping to ETH via 1inch</li>
                                    <li>• Transfer to your safe wallet address</li>
                                    <li>• One coordinated rescue operation</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* SAFU RESCUE Component */}
                <EmergencyRescueMVP />
            </div>
        </div>
    );
}
