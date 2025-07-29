"use client";

interface AnimatedCounterProps {
  end: number;
  suffix?: string;
  prefix?: string;
}

function AnimatedCounter({ end, suffix = "", prefix = "" }: AnimatedCounterProps) {
  return (
    <span>
      {prefix}{end.toLocaleString()}{suffix}
    </span>
  );
}

export function StatsSection() {
  const stats = [
    {
      label: "Gas Saved",
      value: 50,
      suffix: "%",
      description: "Average savings on batch transactions"
    },
    {
      label: "APIs Integrated",
      value: 12,
      suffix: "+",
      description: "1inch APIs powering the platform"
    },
    {
      label: "Protocols Supported",
      value: 100,
      suffix: "+",
      description: "DEX protocols for optimal routing"
    },
    {
      label: "Active Users",
      value: 1000,
      suffix: "+",
      description: "Traders using 1nsync daily"
    }
  ];

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 relative">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5" />
      
      <div className="relative mx-auto max-w-7xl">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
            Trusted by DeFi Traders
          </h2>
          <p className="mt-4 text-muted-foreground">
            Real metrics from our integrated 1inch-powered platform
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="text-center"
            >
              <div className="rounded-lg bg-card p-6 backdrop-blur-sm border border-border shadow-sm hover:shadow-md transition-shadow">
                <div className="text-3xl font-bold text-foreground mb-2">
                  <AnimatedCounter 
                    end={stat.value} 
                    suffix={stat.suffix}
                  />
                </div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  {stat.label}
                </div>
                <div className="text-xs text-muted-foreground/70">
                  {stat.description}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Additional metrics */}
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="text-center">
            <div className="text-lg font-semibold text-primary">
              $<AnimatedCounter end={10} suffix="M+" />
            </div>
            <div className="text-sm text-muted-foreground">Volume Traded</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-secondary-foreground">
              <AnimatedCounter end={99} suffix=".9%" />
            </div>
            <div className="text-sm text-muted-foreground">Uptime</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-accent-foreground">
              <AnimatedCounter end={5} suffix="s" />
            </div>
            <div className="text-sm text-muted-foreground">Avg Settlement</div>
          </div>
        </div>
      </div>
    </section>
  );
}