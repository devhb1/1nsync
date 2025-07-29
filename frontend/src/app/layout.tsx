import type { Metadata } from "next";
import "./globals.css";
import { ReactNode } from "react";
import { Providers } from "@/modules/core/providers"; 
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "1nsync",
   description:
    "The Ultimate Modular DeFi Trading Platform",
  icons: {
    icon: "1nsync_Logo.png"
  },

};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Header />
          {children}
        </Providers>
      </body>
    </html>
  );
}
