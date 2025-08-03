"use client";

import { useAccount } from "wagmi";
import { 
  Zap, 
  Users, 
  TrendingUp, 
  Bot, 
  ArrowRight, 
  Lock,
  Clock,
  Shield
} from "lucide-react";
import Link from "next/link";

interface ModuleCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  status: 'available' | 'coming-soon' | 'in-development';
  href: string;
  gradient: string;
}

function ModuleCard({ 
  title, 
  description, 
  icon, 
  features, 
  status, 
  href, 
  gradient
}: ModuleCardProps) {
  const { isConnected } = useAccount();
  const isClickable = status === 'available' && isConnected;

  return (
    <div className="group relative">
      <div className={`absolute -inset-0.5 rounded-xl bg-gradient-to-r ${gradient} opacity-20 blur transition duration-300 group-hover:opacity-40`} />
      
       <div className="relative rounded-xl bg-card p-6 backdrop-blur-lg border border-border hover:border-border/60 transition-all duration-300 shadow-sm hover:shadow-md">
        {/* Status Badge */}
        <div className="absolute top-4 right-4">
          {status === 'available' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-500/20 px-2 py-1 text-xs font-medium text-green-600 dark:text-green-400 border border-green-500/20">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
              Ready
            </span>
          )}
          {status === 'in-development' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/20 px-2 py-1 text-xs font-medium text-yellow-600 dark:text-yellow-400 border border-yellow-500/20">
              <Clock className="h-3 w-3" />
              Building
            </span>
          )}
          {status === 'coming-soon' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/20 px-2 py-1 text-xs font-medium text-primary border border-primary/20">
              <Lock className="h-3 w-3" />
              Soon
            </span>
          )}
        </div>

        {/* Icon */}
        <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-r ${gradient}`}>
          {icon}
        </div>

        {/* Content */}
        <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-muted-foreground text-sm mb-4 leading-relaxed">{description}</p>

        {/* Features */}
        <ul className="space-y-2 mb-6">
          {features.map((feature, index) => (
            <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
              {feature}
            </li>
          ))}
        </ul>

        {/* Action Button */}
        {isClickable ? (
          <Link href={href}>
            <button className="group/btn flex w-full items-center justify-between rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 border border-primary/20">
              Launch Module
              <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
            </button>
          </Link>
        ) : (
          <button
            disabled
            className="flex w-full items-center justify-center rounded-lg bg-muted px-4 py-3 text-sm font-medium text-muted-foreground cursor-not-allowed border border-border"
          >
            {!isConnected ? "Connect Wallet" : status === 'in-development' ? "In Development" : "Coming Soon"}
          </button>
        )}
      </div>
    </div>
  );
}

export function ModulesGrid() {
  const modules: ModuleCardProps[] = [
    {
      title: "Gas Optimized Batch Swapper",
      description: "Batch multiple swaps and save up to 50% on gas costs with intelligent route optimization.",
      icon: <Zap className="h-6 w-6 text-white" />,
      features: [
        "Multi-token rebalancing",
        "Batch vs individual comparison",
        "Real-time gas estimation",
        "Route optimization"
      ],
      status: 'available',
      href: '/batch-swapper',
      gradient: 'from-yellow-500 to-orange-500'
    },
    // {
    //   title: "Social Trading",
    //   description: "Copy successful traders with MEV protection and risk management features.",
    //   icon: <Users className="h-6 w-6 text-white" />,
    //   features: [
    //     "Top trader leaderboard",
    //     "Strategy analysis",
    //     "MEV protection",
    //     "Risk management"
    //   ],
    //   status: 'in-development',
    //   href: '/social-trading',
    //   gradient: 'from-blue-500 to-purple-500'
    // },
    // {
    //   title: "Auto DCA",
    //   description: "Volatility-based dollar cost averaging with AI-optimized scheduling.",
    //   icon: <TrendingUp className="h-6 w-6 text-white" />,
    //   features: [
    //     "Volatility analysis",
    //     "Smart scheduling",
    //     "Backtesting",
    //     "Performance tracking"
    //   ],
    //   status: 'coming-soon',
    //   href: '/auto-dca',
    //   gradient: 'from-green-500 to-teal-500'
    // },
    // {
    //   title: "Trading Autopilot",
    //   description: "AI-powered trading decisions across all DeFi protocols with optimal execution.",
    //   icon: <Bot className="h-6 w-6 text-white" />,
    //   features: [
    //     "Protocol selection",
    //     "Market analysis",
    //     "Automated execution",
    //     "Cross-chain support"
    //   ],
    //   status: 'coming-soon',
    //   href: '/trading-autopilot',
    //   gradient: 'from-purple-500 to-pink-500'
    // }
  ];

  return (
    <section id="modules" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Modular DeFi Trading
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose the modules you need. Each one integrates seamlessly with 1inch APIs 
            for optimal performance and gas efficiency.
          </p>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
          {modules.map((module) => (
            <ModuleCard key={module.title} {...module} />
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <div className="rounded-xl bg-card p-8 backdrop-blur-lg border border-border shadow-sm">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-primary">Powered by 1inch</span>
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              12+ APIs Integrated
            </h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              From gas optimization to cross-chain swaps, every module leverages 
              the full power of the 1inch ecosystem.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}