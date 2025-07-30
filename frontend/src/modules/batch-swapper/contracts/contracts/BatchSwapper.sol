// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title BatchSwapper
 * @dev Gas-optimized batch swapping contract for portfolio rebalancing
 * @notice This contract allows users to execute multiple token swaps in a single transaction
 */
contract BatchSwapper is ReentrancyGuard, Ownable {
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

    event EmergencyWithdraw(
        address indexed token,
        address indexed to,
        uint256 amount
    );

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
    uint256 public constant MAX_SWAPS_PER_BATCH = 10; // Limit to prevent excessive gas usage in a single tx

    // Fee configuration
    uint256 public platformFee = 50; // 0.5% in basis points (50 = 0.5%)
    uint256 public constant MAX_PLATFORM_FEE = 100; // 1% max fee
    address public feeRecipient;

    // Contract version for tracking
    string public constant VERSION = "1.0.0";

    // Modifier to check valid swap parameters
    modifier validSwapParams(SwapParams[] calldata swaps) {
        require(swaps.length > 0, "BatchSwapper: No swaps provided");
        require(
            swaps.length <= MAX_SWAPS_PER_BATCH,
            "BatchSwapper: Too many swaps"
        );
        _;
    }

    /**
     * @dev Constructor for the BatchSwapper contract.
     * @param _oneInchRouter The address of the 1inch router contract.
     * @param _feeRecipient The address to receive platform fees.
     */
    constructor(address _oneInchRouter, address _feeRecipient) {
        require(
            _oneInchRouter != address(0),
            "BatchSwapper: Invalid router address"
        );
        require(
            _feeRecipient != address(0),
            "BatchSwapper: Invalid fee recipient"
        );

        oneInchRouter = _oneInchRouter;
        feeRecipient = _feeRecipient;
    }

    /**
     * @dev Executes multiple token swaps in a single transaction using 1inch router.
     * This function handles token transfers, approvals, and calls to the 1inch router.
     * It also manages ETH value and refunds any excess.
     * @param swaps Array of swap parameters.
     * @param recipient Address to receive the output tokens.
     */
    function batchSwap(
        SwapParams[] calldata swaps,
        address recipient
    ) external payable nonReentrant validSwapParams(swaps) {
        require(recipient != address(0), "BatchSwapper: Invalid recipient");

        uint256 initialGas = gasleft(); // Capture gas at the start for estimation
        uint256 totalEthValueSentByMsg = msg.value; // Total ETH sent by the user
        uint256 totalEthValueConsumedBySwaps = 0; // Total ETH value required for ETH-in swaps

        for (uint256 i = 0; i < swaps.length; i++) {
            SwapParams memory swap = swaps[i];

            // Basic validation for each swap
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

            uint256 balanceBefore;
            uint256 balanceAfter;

            // Handle ETH as input token
            if (swap.tokenIn == ETH_ADDRESS) {
                // Ensure enough ETH was sent with the transaction for this swap
                require(
                    totalEthValueSentByMsg >=
                        totalEthValueConsumedBySwaps + swap.amountIn,
                    "BatchSwapper: Insufficient ETH sent for swap"
                );
                totalEthValueConsumedBySwaps += swap.amountIn; // Accumulate ETH consumed

                // Record balance before swap
                balanceBefore = _getBalance(swap.tokenOut, recipient);
                // Execute swap, sending ETH value to the 1inch router
                _executeSwap(swap, swap.amountIn);
                // Record balance after swap
                balanceAfter = _getBalance(swap.tokenOut, recipient);
            } else {
                // Handle ERC20 as input token
                IERC20 tokenIn = IERC20(swap.tokenIn);

                // Transfer tokens from the user's wallet to this contract.
                // The user must have approved this contract beforehand.
                tokenIn.safeTransferFrom(
                    msg.sender,
                    address(this), // This contract is the recipient of the transfer
                    swap.amountIn
                );

                // Approve the 1inch router to spend tokens from *this* contract.
                // We approve max amount to avoid repeated approvals for subsequent swaps.
                // This is a one-time approval for the 1inch router from the BatchSwapper contract.
                if (
                    tokenIn.allowance(address(this), oneInchRouter) <
                    swap.amountIn // Only approve if current allowance is insufficient for this specific amount
                ) {
                    tokenIn.safeApprove(oneInchRouter, type(uint256).max);
                }

                // Record balance before swap, considering if output is ETH or ERC20
                if (swap.tokenOut == ETH_ADDRESS) {
                    balanceBefore = recipient.balance;
                    _executeSwap(swap, 0); // No ETH value sent for ERC20-in swap
                    balanceAfter = recipient.balance;
                } else {
                    balanceBefore = _getBalance(swap.tokenOut, recipient);
                    _executeSwap(swap, 0); // No ETH value sent for ERC20-in swap
                    balanceAfter = _getBalance(swap.tokenOut, recipient);
                }
            }

            // Calculate actual amount received from the swap
            uint256 amountOut = balanceAfter - balanceBefore;

            // Apply slippage protection: ensure received amount is at least minAmountOut
            require(
                amountOut >= swap.minAmountOut,
                "BatchSwapper: Insufficient output amount due to slippage"
            );

            // Transfer output tokens to the recipient (user's wallet)
            if (swap.tokenOut == ETH_ADDRESS) {
                payable(recipient).transfer(amountOut);
            } else {
                IERC20(swap.tokenOut).safeTransfer(recipient, amountOut);
            }

            // Emit event for individual swap details
            emit SwapExecuted(
                msg.sender,
                swap.tokenIn,
                swap.tokenOut,
                swap.amountIn,
                amountOut
            );
        }

        // Refund any excess ETH sent by the user that wasn't consumed by ETH-in swaps
        if (totalEthValueSentByMsg > totalEthValueConsumedBySwaps) {
            payable(msg.sender).transfer(
                totalEthValueSentByMsg - totalEthValueConsumedBySwaps
            );
        }

        // Calculate total gas used for the entire batch transaction
        uint256 gasUsed = initialGas - gasleft();
        // Emit event for the overall batch swap execution
        emit BatchSwapExecuted(msg.sender, swaps.length, gasUsed);
    }

    /**
     * @dev Executes a single swap by calling the 1inch router.
     * This is a private helper function used internally by `batchSwap`.
     * @param swap Swap parameters including the 1inch calldata.
     * @param ethValue ETH value to send with the call (0 for ERC20-in swaps).
     */
    function _executeSwap(SwapParams memory swap, uint256 ethValue) private {
        // Perform the low-level call to the 1inch router with the provided swapData
        (bool success, bytes memory result) = oneInchRouter.call{
            value: ethValue
        }(swap.swapData); // Send ETH if it's an ETH-in swap

        // If the call to 1inch router failed, revert with its error message
        if (!success) {
            if (result.length > 0) {
                // Propagate the error message from the 1inch router call
                assembly {
                    let returndata_size := mload(result)
                    revert(add(32, result), returndata_size)
                }
            } else {
                revert("BatchSwapper: 1inch swap execution failed");
            }
        }
    }

    /**
     * @dev Gets the balance of a token for a given account.
     * @param token Token address (use ETH_ADDRESS for native Ether).
     * @param account The address whose balance is to be checked.
     * @return balance The token balance.
     */
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

    /**
     * @dev Updates the 1inch router address. Only callable by the contract owner.
     * @param _newRouter The new 1inch router address.
     */
    function updateOneInchRouter(address _newRouter) external onlyOwner {
        require(
            _newRouter != address(0),
            "BatchSwapper: Invalid new router address"
        );
        oneInchRouter = _newRouter;
    }

    /**
     * @dev Updates the platform fee. Only callable by the contract owner.
     * The fee is in basis points (e.g., 50 for 0.5%).
     * @param _newFee The new fee in basis points.
     */
    function updatePlatformFee(uint256 _newFee) external onlyOwner {
        require(_newFee <= MAX_PLATFORM_FEE, "BatchSwapper: Fee too high");
        platformFee = _newFee;
    }

    /**
     * @dev Updates the fee recipient address. Only callable by the contract owner.
     * @param _newRecipient The new fee recipient address.
     */
    function updateFeeRecipient(address _newRecipient) external onlyOwner {
        require(
            _newRecipient != address(0),
            "BatchSwapper: Invalid new fee recipient"
        );
        feeRecipient = _newRecipient;
    }

    /**
     * @dev Allows the owner to withdraw accidentally sent tokens or ETH from the contract.
     * This is an emergency function to recover funds stuck in the contract.
     * @param token Token address (use ETH_ADDRESS for native Ether).
     * @param to Recipient address for the withdrawn funds.
     * @param amount Amount to withdraw.
     */
    function emergencyWithdraw(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner {
        require(
            to != address(0),
            "BatchSwapper: Invalid recipient for withdrawal"
        );

        if (token == ETH_ADDRESS) {
            require(
                amount <= address(this).balance,
                "BatchSwapper: Insufficient ETH balance for withdrawal"
            );
            payable(to).transfer(amount);
        } else {
            IERC20(token).safeTransfer(to, amount);
        }

        emit EmergencyWithdraw(token, to, amount);
    }

    /**
     * @dev Fallback function to allow the contract to receive native Ether.
     */
    receive() external payable {
        // This function is executed when Ether is sent to the contract without any data.
        // It simply allows the contract to hold Ether.
    }
}
