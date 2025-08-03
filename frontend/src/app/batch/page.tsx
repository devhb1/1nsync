import { BatchSwapperInterface } from '@/modules/batch-swapper';

export default function BatchPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Batch Swap
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Execute multiple token swaps in a single transaction on Base mainnet. 
            Save on gas fees and optimize your portfolio rebalancing.
          </p>
        </div>
        
        <BatchSwapperInterface />
      </div>
    </div>
  );
}
