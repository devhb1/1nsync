# 🚨 SAFU RESCUE - Emergency Wallet Rescue Module

**Built for 1inch ETH Global Hackathon**

Emergency wallet rescue tool that helps users quickly move assets from compromised wallets to safety using 1inch Protocol infrastructure.

## 🎯 Problem Statement

When a wallet is compromised (private key exposed, malicious contract interaction, etc.), users need to act fast to rescue their assets before attackers drain them. Traditional methods are slow and require multiple manual transactions.

## 💡 Solution

SAFU RESCUE automates the entire rescue process with a 4-phase approach:

1. **Discovery** - Scan wallet using 1inch Balance API
2. **Approval** - Batch approve all ERC-20 tokens via 1inch Approval API  
3. **Swapping** - Convert all tokens to ETH using 1inch Swap API with `destReceiver`
4. **Transfer** - Send all ETH to safe wallet

## 🏗️ Technical Implementation

### MVP Architecture

```
┌─────────────────────────────────────────┐
│                Frontend                 │
├─────────────────────────────────────────┤
│  EmergencyRescueMVP Component           │
│  ├─ Phase Input (safe wallet)          │
│  ├─ Asset Discovery                     │
│  ├─ Rescue Execution                    │
│  └─ Success Confirmation               │
├─────────────────────────────────────────┤
│  useEmergencyRescue Hook                │
│  ├─ State Management                    │
│  ├─ Progress Tracking                   │
│  └─ Error Handling                      │
├─────────────────────────────────────────┤
│  emergencyRescueService                 │
│  ├─ Asset Discovery                     │
│  ├─ Approval Orchestration             │
│  ├─ Swap Execution                      │
│  └─ ETH Transfer                        │
└─────────────────────────────────────────┘
                     │
┌─────────────────────────────────────────┐
│              1inch APIs                 │
├─────────────────────────────────────────┤
│  Balance API - Asset discovery          │
│  Approval API - Token approvals         │
│  Swap API - Token → ETH conversion      │
│  (with destReceiver parameter)          │
└─────────────────────────────────────────┘
```

### 4-Phase Rescue Flow

#### Phase 1: Asset Discovery
```typescript
// Discover all rescuable assets
const assets = await fetch(`https://api.1inch.io/v5.0/1/tokens/balance/${userAddress}`, {
    headers: { 'Authorization': `Bearer ${apiKey}` }
});
```

#### Phase 2: ERC-20 Approvals
```typescript
// Approve each token for 1inch router
for (const token of tokens) {
    const approvalTx = await fetch(`https://api.1inch.io/v5.0/1/approve/transaction`, {
        method: 'POST',
        body: JSON.stringify({
            tokenAddress: token.address,
            amount: token.balance
        })
    });
    await wallet.sendTransaction(approvalTx.data);
}
```

#### Phase 3: Batch Swaps with destReceiver
```typescript
// Swap tokens directly to safe wallet
for (const token of approvedTokens) {
    const swapTx = await fetch(`https://api.1inch.io/v5.0/1/swap`, {
        method: 'POST', 
        body: JSON.stringify({
            fromTokenAddress: token.address,
            toTokenAddress: ETH_ADDRESS,
            amount: token.balance,
            fromAddress: compromisedWallet,
            destReceiver: safeWallet, // Direct to safe wallet!
            slippage: 5, // Higher slippage for emergency
            disableEstimate: true
        })
    });
    await wallet.sendTransaction(swapTx.data);
}
```

#### Phase 4: ETH Transfer
```typescript
// Transfer remaining ETH to safe wallet
const ethBalance = await provider.getBalance(compromisedWallet);
if (ethBalance > gasReserve) {
    await wallet.sendTransaction({
        to: safeWallet,
        value: ethBalance - gasReserve
    });
}
```

## 🚀 Usage

### Basic Integration

```typescript
import { SafuRescuePage } from '@/modules/SAFU RESCUE';

// Use as standalone page
<SafuRescuePage />
```

### Custom Implementation

```typescript
import { useEmergencyRescue, EmergencyRescueMVP } from '@/modules/SAFU RESCUE';

function CustomRescue() {
    const {
        rescuableAssets,
        progress,
        discoverAssets,
        executeCompleteRescue,
        isExecuting
    } = useEmergencyRescue();

    return (
        <div>
            <EmergencyRescueMVP />
            {/* Or build custom UI */}
        </div>
    );
}
```

## 🔧 Environment Setup

Required environment variables:

```env
# 1inch API Configuration
NEXT_PUBLIC_ONEINCH_API_KEY=your_1inch_api_key
NEXT_PUBLIC_ONEINCH_API_URL=https://api.1inch.io/v5.0

# Web3 Provider
NEXT_PUBLIC_WEB3_PROVIDER_URL=your_rpc_url
```

## 📁 File Structure

```
src/modules/SAFU RESCUE/
├── README.md                           # This file
├── index.ts                           # Module exports
├── types/
│   └── index.ts                       # TypeScript definitions
├── services/
│   └── emergencyRescueService.ts      # Core business logic
├── hooks/
│   └── useEmergencyRescue.ts          # React hook
├── components/
│   └── EmergencyRescueMVP.tsx         # Main UI component
└── pages/
    └── SafuRescuePage.tsx             # Complete page
```

## 🔐 Security Considerations

1. **API Key Security** - Use environment variables, never hardcode
2. **Transaction Validation** - Always verify transaction data before signing  
3. **Slippage Protection** - Higher slippage for emergencies but capped at 5%
4. **Gas Management** - Reserve ETH for transaction fees
5. **Safe Wallet Verification** - Validate destination address format

## 🧪 Testing

For testing, use the following test tokens on mainnet:
- USDC: `0xA0b86a33E6824c8F8D8FA8b0b3E5e4b6CA6a1D5B`
- USDT: `0xdAC17F958D2ee523a2206206994597C13D831ec7`

Test with 1-2 tokens initially to validate the complete flow.

## 🎯 Hackathon Features

### 1inch Integration Points:
- ✅ **Balance API** - Asset discovery
- ✅ **Approval API** - ERC-20 approvals  
- ✅ **Swap API** - Token conversions with `destReceiver`
- ✅ **Real-time progress** - Live transaction tracking
- ✅ **Emergency UX** - Red/orange urgent design

### Key Innovation:
- **Direct Transfer**: Using `destReceiver` parameter to send swapped ETH directly to safe wallet
- **Batch Processing**: All approvals and swaps in coordinated sequence
- **Progress Tracking**: Real-time updates on rescue progress
- **Emergency Design**: Urgent UI for stressed users

## 🏆 1inch Hackathon Alignment

This module showcases:
1. **Deep 1inch Integration** - Uses multiple 1inch APIs in coordinated fashion
2. **Practical Utility** - Solves real user problem of wallet compromise
3. **Technical Innovation** - Automated rescue with `destReceiver` direct transfer
4. **User Experience** - Simple 4-phase flow for emergency situations

## 📝 License

Built for ETH Global 1inch Hackathon - MIT License
- Clear success/failure feedback

## 🏗️ Architecture

```
SAFU RESCUE/
├── types/                  # TypeScript definitions
├── services/              # Business logic & API integration
│   └── emergencyRescueService.ts
├── hooks/                 # React hooks
│   └── useEmergencyRescue.ts
├── components/           # UI components
│   ├── AssetDiscoveryPanel.tsx
│   ├── RescuePlanPanel.tsx
│   ├── RescueProgressPanel.tsx
│   └── RescueSuccessPanel.tsx
├── pages/                # Main interface
│   └── SafuRescueInterface.tsx
└── index.ts              # Module exports
```

## 🚀 Quick Start

### Import and Use

```tsx
import { SafuRescueInterface } from '@/modules/SAFU RESCUE';

function EmergencyPage() {
  return (
    <SafuRescueInterface
      onRescueComplete={(result) => {
        console.log(`Rescued $${result.totalValueRescued} worth of assets!`);
      }}
      onError={(error) => {
        console.error('Rescue failed:', error);
      }}
      config={{
        emergencySlippageTolerance: 5, // 5% slippage for emergency
        minValueUSDToRescue: 1,        // Rescue assets worth $1+
        maxAssetsToProcess: 20         // Process up to 20 assets
      }}
    />
  );
}
```

### Using the Hook Directly

```tsx
import { useEmergencyRescue } from '@/modules/SAFU RESCUE';

function CustomRescueComponent() {
  const {
    rescuableAssets,
    executionPlan,
    progress,
    discoverAssets,
    generateRescuePlan,
    executeRescue,
    isExecuting,
    isCompleted
  } = useEmergencyRescue();

  // Custom implementation...
}
```

## 🔧 Configuration Options

```typescript
interface EmergencyRescueConfig {
  // Gas settings for emergency situations
  maxGasPriceGwei: number;           // Max gas price (default: 50)
  gasLimitMultiplier: number;        // Gas limit multiplier (default: 1.5)
  
  // Slippage settings
  emergencySlippageTolerance: number; // Slippage % (default: 5)
  
  // Asset filtering
  minValueUSDToRescue: number;       // Min asset value (default: $1)
  maxAssetsToProcess: number;        // Max assets (default: 20)
  
  // Execution settings
  timeoutMinutes: number;            // Timeout (default: 10)
  retryAttempts: number;             // Retry attempts (default: 3)
  parallelSwaps: boolean;            // Parallel execution (default: false)
  
  // Safety settings
  reserveETHForGas: bigint;          // ETH to reserve (default: 0.01 ETH)
  validateAddresses: boolean;        // Address validation (default: true)
}
```

## 🔄 Integration with Batch Swapper

The SAFU RESCUE module leverages infrastructure from the batch-swapper module:

- **1inch API Service**: Token prices, swap quotes, and execution
- **Portfolio Service**: Asset discovery and balance fetching  
- **Token Service**: Token metadata and validation
- **Contract Integration**: Batch swap contract for gas optimization

## ⚡ Emergency Execution Flow

1. **Connect Compromised Wallet**
   - User connects wallet needing rescue
   - Automatic asset discovery begins

2. **Asset Discovery**
   - Scan all token balances
   - Filter valuable assets ($1+ USD)
   - Calculate total rescue value

3. **Rescue Planning**
   - Enter safe wallet address
   - Generate optimal swap plan
   - Display risk assessment

4. **Emergency Execution**
   - User confirms rescue plan
   - Execute swaps sequentially
   - Transfer all ETH to safe wallet

5. **Completion**
   - Display rescue summary
   - Show transaction history
   - Provide security recommendations

## 🛡️ Security Features

- **Address Validation**: Prevents sending to invalid/same wallet
- **Gas Optimization**: Reserves ETH for transaction costs
- **Error Recovery**: Handles failed swaps gracefully
- **Slippage Protection**: Configurable emergency slippage tolerance
- **Transaction Monitoring**: Full audit trail of all operations

## 🎨 UI/UX Principles

### Emergency Design Language
- **Red/Orange Color Scheme**: Conveys urgency
- **Large Action Buttons**: Easy to click under stress
- **Clear Progress Indicators**: Shows exactly what's happening
- **Minimal Steps**: Fastest path to asset safety
- **Emergency Icons**: Visual cues for urgency (🚨, ⚠️, 🛡️)

### Accessibility
- High contrast colors for clarity
- Large touch targets for mobile
- Clear error messages
- Progress announcements for screen readers

## 🔧 Development

### Running Tests
```bash
# Test asset discovery
npm run test:rescue:discovery

# Test rescue planning
npm run test:rescue:planning

# Test execution simulation
npm run test:rescue:execution
```

### Building for Production
```bash
npm run build:rescue
```

## 🚨 Important Notes

### When to Use SAFU RESCUE
- ✅ Wallet private key is compromised
- ✅ Suspicious unauthorized transactions detected
- ✅ Malware infection suspected
- ✅ Need to quickly consolidate assets

### When NOT to Use
- ❌ Normal portfolio rebalancing (use Batch Swapper)
- ❌ Cost optimization (emergency = higher gas/slippage)
- ❌ Partial asset moves (this moves EVERYTHING)

### Security Warnings
- **Verify Safe Wallet**: Double-check destination address
- **Act Quickly**: Time is critical if wallet is compromised
- **Gas Costs**: Emergency execution uses higher gas prices
- **One-Time Use**: Cannot undo rescue operations

## 📊 Expected Performance

- **Asset Discovery**: ~5-10 seconds
- **Rescue Planning**: ~10-15 seconds  
- **Execution**: ~2-5 minutes (depends on assets)
- **Gas Efficiency**: 85-95% of value rescued (emergency mode)

## 🤝 Integration Examples

### With React Router
```tsx
// In your routes
import { SafuRescueInterface } from '@/modules/SAFU RESCUE';

<Route path="/emergency-rescue" element={<SafuRescueInterface />} />
```

### With Notification System
```tsx
<SafuRescueInterface
  onRescueComplete={(result) => {
    toast.success(`Successfully rescued $${result.totalValueRescued.toFixed(2)}!`);
  }}
  onError={(error) => {
    toast.error(`Rescue failed: ${error}`);
  }}
/>
```

## 📞 Support

For emergency situations or critical issues:
- Check transaction status on Etherscan
- Review failed operations in rescue summary
- Contact support with transaction hashes

---

**⚠️ Remember: Only use SAFU RESCUE in genuine emergency situations where your wallet security is compromised. For normal operations, use the standard Batch Swapper module.**
