"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ThemeToggle } from "./ThemeToggle";
import Image from "next/image";

// Navigation config
const navigation = [
  { name: "Home", href: "/", available: true },
  { name: "Batch Swapper", href: "/batch", available: true },
  // { name: "SAFU RESCUE", href: "/safu-rescue", available: true, emergency: true },
  // { name: "Auto DCA", href: "/autodca", available: false },
  // { name: "MEV Protected Trades", href: "/mev", available: false },
  // { name: "AI AgentX", href: "/agentx", available: false },

];

export default function Header() {
  return (
    <header className="bg-background border-b border-border">
      <nav className="mx-auto flex max-w-7xl items-center justify-between p-4 lg:px-8">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <Image
            className="h-8 w-auto"
            src="/1nsync_Logo.png"
            alt="1nsync Logo"
            width={32}
            height={32}
            priority
          />
          <span className="text-xl font-bold text-foreground">1nsync</span>
        </div>

        {/* Navigation */}
        <div className="hidden md:flex gap-6">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.available ? item.href : "#"}
              tabIndex={item.available ? 0 : -1}
              aria-disabled={!item.available}
              className={
                "text-sm font-medium transition-colors " +
                (item.available
                  ? "text-foreground hover:text-primary"
                  : "text-muted-foreground cursor-not-allowed pointer-events-none")
              }
              onClick={e => {
                if (!item.available) e.preventDefault();
              }}
            >
              {item.name}
            </Link>
          ))}
        </div>

        {/* Theme Toggle and Wallet Connect */}
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <div className="flex justify-end min-w-[220px]">
            <ConnectButton />
          </div>
        </div>
      </nav>
      {/* Gradient Bar */}
      <div className="h-1 w-full bg-gradient-to-r from-primary via-accent to-secondary" />
    </header>
  );
}
