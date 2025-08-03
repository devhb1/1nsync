/**
 * Rescue Plan Panel - Shows the generated rescue execution plan
 * @deprecated This component is part of the legacy complex planning system.
 * The MVP uses EmergencyRescueMVP with simplified asset-based approach.
 * This component is kept for reference but not used in production.
 */

'use client';

import React from 'react';
import { Address, formatEther } from 'viem';

// Legacy type - kept for reference
interface LegacyRescueExecutionPlan {
    totalInputValueUSD: number;
    estimatedOutputETH: bigint;
    netRescueValueUSD: number;
    riskAssessment: {
        gasCostPercentage: number;
        slippageRisk: string;
        timeEstimateSeconds: number;
    };
    operations: Array<{
        slippage: number;
        estimatedOutputETH: bigint;
        estimatedGasUSD: number;
    }>;
}

interface RescuePlanPanelProps {
    plan: LegacyRescueExecutionPlan;
    safeWallet: Address;
    onConfirm: () => void;
    onEdit?: () => void;
}

export const RescuePlanPanel: React.FC<RescuePlanPanelProps> = ({
    plan,
    safeWallet,
    onConfirm,
    onEdit
}) => {
    const getRiskColor = (risk: string) => {
        switch (risk) {
            case 'LOW': return 'text-green-600 bg-green-100';
            case 'MEDIUM': return 'text-yellow-600 bg-yellow-100';
            case 'HIGH': return 'text-red-600 bg-red-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    return (
        <div className="border-2 border-blue-200 rounded-lg p-6 bg-blue-50">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800 flex items-center">
                    📋 Rescue Execution Plan
                </h3>
                {onEdit && (
                    <button
                        onClick={onEdit}
                        className="px-4 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                        Edit Plan
                    </button>
                )}
            </div>

            {/* Plan Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg border">
                    <p className="text-sm text-gray-600">Total Input Value</p>
                    <p className="text-lg font-bold text-gray-800">
                        ${plan.totalInputValueUSD.toFixed(2)}
                    </p>
                </div>
                <div className="bg-white p-4 rounded-lg border">
                    <p className="text-sm text-gray-600">Estimated ETH Output</p>
                    <p className="text-lg font-bold text-gray-800">
                        {parseFloat(formatEther(plan.estimatedOutputETH)).toFixed(4)} ETH
                    </p>
                </div>
                <div className="bg-white p-4 rounded-lg border">
                    <p className="text-sm text-gray-600">Net Rescue Value</p>
                    <p className="text-lg font-bold text-green-600">
                        ${plan.netRescueValueUSD.toFixed(2)}
                    </p>
                </div>
            </div>

            {/* Risk Assessment */}
            <div className="bg-white p-4 rounded-lg border mb-6">
                <h4 className="font-semibold text-gray-800 mb-3">Risk Assessment</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <p className="text-sm text-gray-600">Gas Cost</p>
                        <p className="font-medium">
                            {plan.riskAssessment.gasCostPercentage.toFixed(1)}% of total value
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Slippage Risk</p>
                        <span className={`inline-block px-2 py-1 rounded text-sm font-medium ${getRiskColor(plan.riskAssessment.slippageRisk)}`}>
                            {plan.riskAssessment.slippageRisk}
                        </span>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Estimated Time</p>
                        <p className="font-medium">
                            ~{Math.round(plan.riskAssessment.timeEstimateSeconds / 60)} minutes
                        </p>
                    </div>
                </div>
            </div>

            {/* Operations List */}
            <div className="bg-white p-4 rounded-lg border mb-6">
                <h4 className="font-semibold text-gray-800 mb-3">
                    Planned Operations ({plan.operations.length})
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                    {plan.operations.map((operation, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                            <div className="flex items-center space-x-3">
                                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">
                                    {index + 1}
                                </span>
                                <div>
                                    <p className="text-sm font-medium">
                                        Swap to ETH
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        Slippage: {operation.slippage}%
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-medium">
                                    {parseFloat(formatEther(operation.estimatedOutputETH)).toFixed(4)} ETH
                                </p>
                                <p className="text-xs text-gray-500">
                                    Est. Gas: ${operation.estimatedGasUSD.toFixed(2)}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Destination */}
            <div className="bg-white p-4 rounded-lg border mb-6">
                <h4 className="font-semibold text-gray-800 mb-2">Destination Wallet</h4>
                <p className="font-mono text-sm bg-gray-100 p-2 rounded break-all">
                    {safeWallet}
                </p>
            </div>

            {/* Warnings */}
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6">
                <h4 className="font-semibold text-red-800 mb-2 flex items-center">
                    ⚠️ Important Warnings
                </h4>
                <ul className="text-sm text-red-700 space-y-1">
                    <li>• This operation will move ALL your assets to the specified wallet</li>
                    <li>• Gas costs will be deducted from the rescued amount</li>
                    <li>• Slippage may affect the final amount received</li>
                    <li>• This action cannot be reversed once executed</li>
                    <li>• Verify the destination address is correct and secure</li>
                </ul>
            </div>

            {/* Action Button */}
            <div className="text-center">
                <button
                    onClick={onConfirm}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-8 rounded-lg text-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                    🚨 EXECUTE EMERGENCY RESCUE
                </button>
                <p className="text-xs text-gray-500 mt-2">
                    By clicking this button, you confirm that your wallet is compromised and you want to proceed with the rescue
                </p>
            </div>
        </div>
    );
};
