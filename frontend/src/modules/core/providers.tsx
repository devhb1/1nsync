// All our context providers (RainbowKit, Wagmi, Query

"use client";

import { WagmiProvider } from "wagmi";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import config from "@/modules/core/rainbowKitConfig";
import { ThemeProvider } from "@/modules/core/theme";
import { ChainProvider } from "@/modules/core/chainContext";
import "@rainbow-me/rainbowkit/styles.css";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ThemeProvider>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider>
            <ChainProvider>
              {children}
            </ChainProvider>
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  );
}
