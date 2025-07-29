# Building for the UnityDeFi x 1inch Hackathon — 2025

> LET'S BUILD 🫡

---

# 💎 1NSYNC — The Ultimate Modular DeFi Trading Platform

## 🎯 Platform Vision
**1NSYNC** is a full-stack, modular DeFi trading platform that leverages the power of **1inch APIs** to deliver an unparalleled user experience. Our goal is to create a seamless, gas-optimized, and MEV-safe trading environment that empowers users to trade smarter and more efficiently.


**“The Ultimate DeFi Trading Platform”** —  
A full-stack, modular DeFi experience that empowers users to trade smarter through:
- 🔋 Gas-optimized batch swapping
- 🧑‍🤝‍🧑 MEV-safe social trading
- 📅 Automated DCA (Dollar-Cost Averaging)
- 🤖 AI-guided strategy suggestions

All seamlessly integrated using the powerful **1inch APIs**.

---

## 🧰 Core Features:

----------- 

### 1. 🔁 Gas-Optimized Batch Swapper
> Intelligent rebalancing across multiple tokens with real-time gas savings.

#### ✅ Core Flow:
- **Wallet Analysis**
  - Connect via **RainbowKit**
  - Fetch live token balances using **1inch Wallet API**
  - Display current portfolio and allocation %
  
- **Target Portfolio Input**
  - Users define target allocations across up to 10 tokens (e.g., ETH, USDC, WBTC)
  
- **Optimized Rebalancing Route**
  - Use **1inch Swap API** to determine optimal path to target allocation
  - Compare **gas cost of individual vs batch swaps**
  - Visualize potential gas savings and slippage

- **Execution**
  - Execute batch swap using **1inch Limit Orders** for MEV protection
  - Show transaction details and estimated gas savings  

  
------------


### 2. 🧑‍💼 MEV-Protected Social Trading
> Discover, analyze, and copy top DeFi traders—with MEV protection baked in.

#### 🔗 Integrated Capabilities:
- **Trader Discovery**
  - Browse trader profiles and on-chain stats
  - Pull strategy history using **1inch Traces API**

- **Copy Execution**
  - One-click strategy cloning with routing via **1inch Swap + Limit Orders**
  - Protect copy-trades using **private tx routing / Fusion**

- **Analytics**
  - View PnL, win/loss ratio, asset composition, and trade frequency per trader



---

## 🛠️ (In Progress / Bonus Features if Time Permits)

### 📅 Automated DCA (Dollar-Cost Averaging)
- Users configure scheduled token purchases
- Backend triggers recurring trades via the **1inch Swap API**
- Supports multiple DCA strategies (daily, weekly, buy-the-dip)

---

### 🤖 AI-Powered Insights
- Simulated trade scoring based on price momentum, gas cost, and user risk profile
- Recommends token rotations or swap timing using data from **1inch Prices + Gas APIs**

---

---

## 🧩 Modular by Design

Each feature of **1NSYNC** works as a standalone tool or can be combined into powerful workflows.

Update: chore: resolve conflicts, clean up organization, and move git root to project directory

- Resolved merge conflicts
- Improved project organization and structure
- Moved git root to main project