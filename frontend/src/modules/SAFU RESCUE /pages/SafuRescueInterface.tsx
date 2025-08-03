/** * SAFU Rescue Interface - Legacy Component (Deprecated) * @deprecated This component is deprecated. Use EmergencyRescueMVP instead. * This wrapper is kept for backwards compatibility. */ 
"use client";
import React from "react";
import { EmergencyRescueMVP } from "../components/EmergencyRescueMVP";
export interface SafuRescueInterfaceProps {
  className?: string;
  onRescueComplete?: (result: any) => void;
  onError?: (error: string) => void;
  config?: any;
}
/** * Legacy SafuRescueInterface - now just wraps EmergencyRescueMVP * @deprecated Use EmergencyRescueMVP directly instead */ export const SafuRescueInterface: React.FC<
  SafuRescueInterfaceProps
> = ({ className = "" }) => {
  return (
    <div className={`deprecated-safu-rescue-interface ${className}`}>
      {" "}
      {/* Legacy wrapper - renders MVP component */} <EmergencyRescueMVP />{" "}
    </div>
  );
};
