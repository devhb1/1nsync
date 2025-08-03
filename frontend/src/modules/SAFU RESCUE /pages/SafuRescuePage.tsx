/**
 * SAFU RESCUE Main Page
 * Emergency wallet rescue module for 1inch hackathon
 * 
 * This page provides the main entry point for emergency wallet rescue functionality.
 * Users can discover and rescue assets from compromised wallets.
 */

'use client';

import React from 'react';
import { EmergencyRescueMVP } from '../components/EmergencyRescueMVP';

const SafuRescuePage: React.FC = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 py-8">
            <div className="container mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl md:text-5xl font-bold text-red-600 mb-4">
                        🚨 SAFU RESCUE
                    </h1>
                    <p className="text-lg text-red-700 max-w-2xl mx-auto">
                        Emergency wallet rescue tool for compromised wallets. 
                        Quickly discover and transfer your assets to safety using 1inch infrastructure.
                    </p>
                </div>

                {/* Emergency Notice */}
                <div className="max-w-4xl mx-auto mb-8">
                    <div className="bg-red-100 border-l-4 border-red-500 p-4 rounded-r-lg">
                        <div className="flex items-start">
                            <div className="flex-shrink-0">
                                <span className="text-2xl">⚠️</span>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-lg font-medium text-red-800">
                                    Emergency Protocol Information
                                </h3>
                                <div className="mt-2 text-sm text-red-700">
                                    <p className="mb-2">
                                        <strong>When to use SAFU RESCUE:</strong>
                                    </p>
                                    <ul className="list-disc list-inside space-y-1">
                                        <li>Your private key has been compromised</li>
                                        <li>You've interacted with a malicious contract</li>
                                        <li>Your wallet shows unauthorized transactions</li>
                                        <li>You need to quickly move assets to safety</li>
                                    </ul>
                                    <p className="mt-3">
                                        <strong>How it works:</strong> We discover all your assets, swap them to ETH using 1inch, 
                                        and transfer everything to your safe wallet in one coordinated rescue operation.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Rescue Interface */}
                <div className="flex justify-center">
                    <EmergencyRescueMVP />
                </div>

                {/* Footer */}
                <div className="text-center mt-12 text-gray-600">
                    <p className="text-sm">
                        Powered by <a href="https://1inch.io" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">1inch Protocol</a>
                        {' '} • Built for ETH Global Hackathon
                    </p>
                    <p className="text-xs mt-1 text-gray-500">
                        Always verify transactions before signing. Use at your own risk.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SafuRescuePage;
