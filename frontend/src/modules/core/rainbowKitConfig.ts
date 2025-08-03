// Wagmi config with chains + project ID
"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import {
    mainnet,
    base,
    arbitrum,
    optimism,
    zksync,
    baseSepolia,
    sepolia,
} from "wagmi/chains";

export default getDefaultConfig({
    appName: "1nsync",
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
    chains: [mainnet, base, arbitrum, optimism, zksync, baseSepolia, sepolia],
    ssr: false,
});