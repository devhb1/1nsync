// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title BatchSwapperV2 - Fixed Version
 * @dev Gas-optimized batch swapping contract with proper token handling
 */
contract BatchSwapperV2 is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

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

    // Structs
    struct SwapParams {
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        bytes swapData; // Calldata for 1inch router
    }

    // State variables
    address public constant ETH_ADDRESS =
        0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public oneInchRouter;
    uint256 public constant MAX_SWAPS_PER_BATCH = 10;

    // Contract version
    string public constant VERSION = "2.0.0";

    modifier validSwapParams(SwapParams[] calldata swaps) {
        require(swaps.length > 0, "BatchSwapper: No swaps provided");
        require(
            swaps.length <= MAX_SWAPS_PER_BATCH,
            "BatchSwapper: Too many swaps"
        );
        _;
    }

    constructor(address _oneInchRouter) {
        require(
            _oneInchRouter != address(0),
            "BatchSwapper: Invalid router address"
        );
        oneInchRouter = _oneInchRouter;
    }

    /**
     * @dev Executes multiple token swaps in a single transaction.
     * FIXED: Contract receives tokens then transfers to recipient
     */
    function batchSwap(
        SwapParams[] calldata swaps,
        address recipient
    ) external payable nonReentrant validSwapParams(swaps) {
        require(recipient != address(0), "BatchSwapper: Invalid recipient");

        uint256 initialGas = gasleft();

        for (uint256 i = 0; i < swaps.length; i++) {
            SwapParams memory swap = swaps[i];

            require(
                swap.tokenIn != swap.tokenOut,
                "BatchSwapper: Cannot swap same token"
            );
            require(
                swap.amountIn > 0,
                "BatchSwapper: Amount in must be greater than zero"
            );
            require(
                swap.minAmountOut > 0,
                "BatchSwapper: Min amount out must be greater than zero"
            );

            uint256 amountOut;

            // Handle ETH as input token
            if (swap.tokenIn == ETH_ADDRESS) {
                require(
                    msg.value >= swap.amountIn,
                    "BatchSwapper: Insufficient ETH"
                );

                // Record balance of output token in this contract before swap
                uint256 balanceBefore = _getBalance(
                    swap.tokenOut,
                    address(this)
                );

                // Execute swap with ETH
                _executeSwap(swap, swap.amountIn);

                // Record balance after swap
                uint256 balanceAfter = _getBalance(
                    swap.tokenOut,
                    address(this)
                );

                amountOut = balanceAfter - balanceBefore;

                // Transfer output tokens to recipient
                if (swap.tokenOut == ETH_ADDRESS) {
                    (bool success, ) = recipient.call{value: amountOut}("");
                    require(success, "BatchSwapper: ETH transfer failed");
                } else {
                    IERC20(swap.tokenOut).safeTransfer(recipient, amountOut);
                }
            } else {
                // Handle ERC20 as input token
                IERC20 tokenIn = IERC20(swap.tokenIn);

                // Transfer input tokens to this contract
                tokenIn.safeTransferFrom(
                    msg.sender,
                    address(this),
                    swap.amountIn
                );

                // Approve 1inch router if needed
                if (
                    tokenIn.allowance(address(this), oneInchRouter) <
                    swap.amountIn
                ) {
                    tokenIn.safeApprove(oneInchRouter, type(uint256).max);
                }

                // Record balance of output token in this contract before swap
                uint256 balanceBefore = _getBalance(
                    swap.tokenOut,
                    address(this)
                );

                // Execute swap
                _executeSwap(swap, 0);

                // Record balance after swap
                uint256 balanceAfter = _getBalance(
                    swap.tokenOut,
                    address(this)
                );

                amountOut = balanceAfter - balanceBefore;

                // Transfer output tokens to recipient
                if (swap.tokenOut == ETH_ADDRESS) {
                    (bool success, ) = recipient.call{value: amountOut}("");
                    require(success, "BatchSwapper: ETH transfer failed");
                } else {
                    IERC20(swap.tokenOut).safeTransfer(recipient, amountOut);
                }
            }

            // Apply slippage protection
            require(
                amountOut >= swap.minAmountOut,
                "BatchSwapper: Insufficient output amount due to slippage"
            );

            emit SwapExecuted(
                msg.sender,
                swap.tokenIn,
                swap.tokenOut,
                swap.amountIn,
                amountOut
            );
        }

        uint256 totalGasUsed = initialGas - gasleft();
        emit BatchSwapExecuted(msg.sender, swaps.length, totalGasUsed);
    }

    /**
     * @dev Executes a single swap by calling the 1inch router.
     * FIXED: Swap data should be configured to send tokens to this contract
     */
    function _executeSwap(SwapParams memory swap, uint256 ethValue) private {
        (bool success, bytes memory result) = oneInchRouter.call{
            value: ethValue
        }(swap.swapData);

        if (!success) {
            if (result.length > 0) {
                assembly {
                    let returndata_size := mload(result)
                    revert(add(32, result), returndata_size)
                }
            } else {
                revert("BatchSwapper: 1inch swap execution failed");
            }
        }
    }

    function _getBalance(
        address token,
        address account
    ) private view returns (uint256) {
        if (token == ETH_ADDRESS) {
            return account.balance;
        } else {
            return IERC20(token).balanceOf(account);
        }
    }

    function updateRouter(address newRouter) external onlyOwner {
        require(
            newRouter != address(0),
            "BatchSwapper: Invalid router address"
        );
        address oldRouter = oneInchRouter;
        oneInchRouter = newRouter;
        emit RouterUpdated(oldRouter, newRouter);
    }

    // Emergency recovery
    function emergencyWithdraw(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner {
        require(to != address(0), "BatchSwapper: Invalid recipient");
        require(amount > 0, "BatchSwapper: Invalid amount");

        if (token == ETH_ADDRESS) {
            (bool success, ) = to.call{value: amount}("");
            require(success, "BatchSwapper: ETH transfer failed");
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
    }

    receive() external payable {}
}
