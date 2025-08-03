/**
 * SAFU RESCUE Integration Example
 * Shows how to integrate the emergency rescue module into your app
 */

'use client';

import React from 'react';
import { EmergencyRescueMVP } from '../index';

export const SafuRescuePageExample: React.FC = () => {
    return (
        <div className="min-h-screen">
            {/* Simply drop in the EmergencyRescueMVP component */}
            <EmergencyRescueMVP />
        </div>
    );
};

export default SafuRescuePageExample;
