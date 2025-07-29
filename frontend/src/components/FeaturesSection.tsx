"use client";

import { 
  Shield, 
  Zap, 
  TrendingUp, 
  Users, 
  Bot, 
  Lock,
  Clock,
  BarChart3,
  Layers,
  Globe,
  Cpu,
  ArrowRight
} from "lucide-react";

interface FeatureProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function Feature({ icon, title, description }: FeatureProps) {
  return (
    <div className="flex flex-col items-start">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

export function FeaturesSection() {
  const features = [
    {
      icon: <Zap className="h-6 w-6 text-primary" />,
      title: "Gas Optimization",
      description: "Intelligent batching and route optimization reduces transaction costs by up to 50% using 1inch's advanced algorithms."
    },
    {
      icon: <Shield className="h-6 w-6 text-primary" />,
      title: "MEV Protection",
      description: "Advanced MEV protection through private mempools and 1inch Fusion+ keeps your trades safe from front-running."
    },
    {
      icon: <Users className="h-6 w-6 text-primary" />,
      title: "Social Trading",
      description: "Copy successful traders with built-in risk management and performance analytics powered by 1inch Traces API."
    },
    {
      icon: <TrendingUp className="h-6 w-6 text-primary" />,
      title: "Smart DCA",
      description: "Volatility-based dollar cost averaging that adapts to market conditions for optimal entry points."
    },
    {
      icon: <Bot className="h-6 w-6 text-primary" />,
      title: "AI Trading",
      description: "Machine learning algorithms analyze market conditions and execute trades across 100+ protocols automatically."
    },
    {
      icon: <Globe className="h-6 w-6 text-primary" />,
      title: "Cross-Chain",
      description: "Seamless trading across multiple blockchains with 1inch's cross-chain infrastructure and bridge integrations."
    }
  ];

  const additionalFeatures = [
    {
      icon: <Lock className="h-5 w-5 text-primary" />,
      title: "Non-Custodial",
      description: "Your keys, your crypto. All trades execute directly from your wallet."
    },
    {
      icon: <Clock className="h-5 w-5 text-primary" />,
      title: "Real-Time Data",
      description: "Live price feeds and gas estimates for informed trading decisions."
    },
    {
      icon: <BarChart3 className="h-5 w-5 text-primary" />,
      title: "Advanced Analytics",
      description: "Detailed performance tracking and portfolio analytics dashboard."
    },
    {
      icon: <Layers className="h-5 w-5 text-primary" />,
      title: "Modular Design",
      description: "Use only the features you need with our flexible module system."
    }
  ];

  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Everything You Need for DeFi Trading
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Comprehensive tools powered by 1inch APIs to optimize your trading strategy, 
            reduce costs, and maximize returns.
          </p>
        </div>

        {/* Main Features Grid */}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 mb-16">
          {features.map((feature) => (
            <Feature key={feature.title} {...feature} />
          ))}
        </div>

        {/* 1inch Integration Highlight */}
        <div className="mb-16">
          <div className="rounded-xl bg-card p-8 backdrop-blur-lg border border-border shadow-sm">
            <div className="flex items-center justify-center mb-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                  <Cpu className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground">Powered by 1inch</h3>
                  <p className="text-sm text-muted-foreground">12+ APIs Integrated</p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              <div className="text-center">
                <div className="text-lg font-semibold text-primary">Fusion+</div>
                <div className="text-xs text-muted-foreground">Intent-based swaps</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-primary">Limit Orders</div>
                <div className="text-xs text-muted-foreground">Advanced orders</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-primary">Traces API</div>
                <div className="text-xs text-muted-foreground">Transaction analysis</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-primary">Cross-chain</div>
                <div className="text-xs text-muted-foreground">Bridge integration</div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Features */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-16">
          {additionalFeatures.map((feature) => (
            <div key={feature.title} className="rounded-lg bg-card p-6 backdrop-blur-sm border border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                {feature.icon}
                <h4 className="font-medium text-foreground text-sm">{feature.title}</h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center">
          <div className="rounded-xl bg-card p-8 border border-border shadow-sm">
            <h3 className="text-2xl font-bold text-foreground mb-4">
              Ready to Optimize Your DeFi Trading?
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Join thousands of traders saving gas, copying strategies, and automating their DeFi portfolio.
            </p>
            <button
              className="group inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              onClick={() => {
                document.getElementById('modules')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Get Started Now
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}