"use client";

import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Image from "next/image";
import { HeroSection } from "@/components/HeroSection";
import { ModulesGrid } from "@/components/ModulesGrid";
import { StatsSection } from "@/components/StatsSection";
import { FeaturesSection } from "@/components/FeaturesSection";

export default function Home() {
  const { isConnected } = useAccount();

  return (
    <div className="min-h-screen bg-background relative">
      {/* Overlay for not connected - always rendered, just hidden if connected */}
      <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 transition-opacity duration-200 ${isConnected ? 'pointer-events-none opacity-0' : 'opacity-100'}`}>
        <Image
          src="/1NSYNC Banner.png"
          alt="1nsync Banner"
          width={600}
          height={200}
          className="mb-8 rounded-lg shadow-lg"
        />
        <h1 className="text-2xl font-bold text-foreground mb-4">Connect your wallet to access 1nsync</h1>
        <ConnectButton />
      </div>
      {/* Main app always rendered */}
      <HeroSection />
      <StatsSection />
      <ModulesGrid />
      <FeaturesSection />
    </div>
  );
}