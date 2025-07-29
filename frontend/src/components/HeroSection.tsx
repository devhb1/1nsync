"use client";

import { useAccount } from "wagmi";
import { ArrowRight, Zap, Shield, TrendingUp } from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export function HeroSection() {
  const { isConnected } = useAccount();

  return (
    <section className="relative overflow-hidden px-4 py-20 sm:px-6 lg:px-8">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-secondary/5 to-primary/5" />
      
      <div className="relative mx-auto max-w-7xl">
        <div className="text-center">
          {/* Main Title */}
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
            The Ultimate{" "}
            <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              DeFi Trading
            </span>{" "}
            Platform
          </h1>

          {/* Subtitle */}
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
            Gas optimization, social trading, automated DCA, and AI-powered decisions. 
            All in one modular platform powered by 1inch APIs.
          </p>

          {/* Feature Pills */}
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <div className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm text-primary border border-primary/20">
              <Zap className="h-4 w-4" />
              50% Gas Savings
            </div>
            <div className="flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm text-secondary-foreground border border-border">
              <Shield className="h-4 w-4" />
              MEV Protected
            </div>
            <div className="flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm text-accent-foreground border border-border">
              <TrendingUp className="h-4 w-4" />
              AI Optimized
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="mt-10 flex items-center justify-center gap-x-6">
            {isConnected ? (
              <button
                className="group flex items-center gap-2 rounded-lg bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                onClick={() => {
                  document.getElementById('modules')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Launch App
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            ) : (
              <ConnectButton />
            )}
            
            <button
              className="rounded-lg border border-border bg-background px-8 py-3 text-sm font-semibold text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              onClick={() => {
                document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Learn More
            </button>
          </div>
        </div>

        {/* Floating Cards */}
        <div className="mt-16 sm:mt-20">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { title: "Gas Optimizer", value: "50%", subtitle: "Cost Reduction" },
              { title: "Social Trading", value: "100+", subtitle: "Top Traders" },
              { title: "Auto DCA", value: "24/7", subtitle: "Monitoring" },
              { title: "AI Trading", value: "12+", subtitle: "1inch APIs" },
            ].map((stat) => (
              <div
                key={stat.title}
                className="rounded-xl bg-card p-6 backdrop-blur-lg border border-border shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.subtitle}</div>
                <div className="text-xs text-muted-foreground/70 mt-1">{stat.title}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}