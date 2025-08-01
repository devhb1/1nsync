// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IBatchSwapperV2
 * @dev Interface for the BatchSwapperV2 contract - Updated to match V2 implementation
 */
interface IBatchSwapperV2 {
    // Structs
    struct SwapParams {
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        bytes swapData; // Calldata for 1inch router
    }

    // Events
    event BatchSwapExecuted(
        address indexed user,
        uint256 swapCount,
        uint256 totalGasUsed
    );

    event SwapExecuted(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );

    event RouterUpdated(address indexed oldRouter, address indexed newRouter);

    // Main functions
    function batchSwap(
        SwapParams[] calldata swaps,
        address recipient
    ) external payable;

    // View functions
    function oneInchRouter() external view returns (address);

    function VERSION() external pure returns (string memory);

    function ETH_ADDRESS() external pure returns (address);

    function MAX_SWAPS_PER_BATCH() external pure returns (uint256);

    // Admin functions
    function updateRouter(address newRouter) external;

    function emergencyWithdraw(
        address token,
        address to,
        uint256 amount
    ) external;

    // Owner functions (inherited from Ownable)
    function owner() external view returns (address);

    function transferOwnership(address newOwner) external;

    function renounceOwnership() external;
}
