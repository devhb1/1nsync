// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IBatchSwapper
 * @dev Interface for the BatchSwapper contract
 */
interface IBatchSwapper {
    // Structs
    struct SwapParams {
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        bytes swapData;
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

    // Main functions
    function batchSwap(
        SwapParams[] calldata swaps,
        address recipient
    ) external payable;

    // View functions
    function oneInchRouter() external view returns (address);

    function platformFee() external view returns (uint256);

    function feeRecipient() external view returns (address);

    function version() external pure returns (string memory);

    // Admin functions
    function updateOneInchRouter(address _newRouter) external;

    function updatePlatformFee(uint256 _newFee) external;

    function updateFeeRecipient(address _newRecipient) external;

    function emergencyWithdraw(
        address token,
        address to,
        uint256 amount
    ) external;
}
