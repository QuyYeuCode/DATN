// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./interfaces/ILendingProtocol.sol";
import "./interfaces/IPriceOracle.sol";

/**
 * @title LendingManager
 * @notice Manages lending positions across multiple lending protocols
 * @dev Automatically routes funds to the highest yield lending protocol
 */
contract LendingManager is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using Counters for Counters.Counter;

    // Position ID counter
    Counters.Counter private _positionId;

    // Struct for a lending protocol configuration
    struct LendingProtocolConfig {
        address protocol;
        bool enabled;
    }

    // Struct for a lending position
    struct LendingPosition {
        uint256 id;
        address user;
        address token;
        uint256 amount;
        address protocol;
        uint256 createdAt;
        bool active;
    }

    // Whitelisted lending protocols
    mapping(address => LendingProtocolConfig) public lendingProtocols;
    address[] public lendingProtocolAddresses;

    // Mapping from position ID to position details
    mapping(uint256 => LendingPosition) public positions;

    // Whitelist of tokens supported for lending
    mapping(address => bool) public supportedTokens;
    address[] public supportedTokenList;

    // Address authorized to manage positions (e.g., LimitOrderManager)
    mapping(address => bool) public authorizedManagers;

    // Oracle for APY data
    address public yieldOracle;

    // Protocol switch threshold (in basis points, e.g., 10 = 0.1%)
    uint16 public switchThreshold = 10;

    // Minimum time between protocol switches (in seconds)
    uint256 public cooldownPeriod = 1 hours;

    // Last time a position was switched for a token
    mapping(address => uint256) public lastProtocolSwitch;

    // Events
    event ProtocolAdded(address protocol);
    event ProtocolRemoved(address protocol);
    event ProtocolEnabled(address protocol);
    event ProtocolDisabled(address protocol);
    event TokenAdded(address token);
    event TokenRemoved(address token);
    event ManagerAuthorized(address manager);
    event ManagerDeauthorized(address manager);
    event PositionCreated(
        uint256 indexed positionId,
        address indexed user,
        address token,
        uint256 amount,
        address protocol
    );
    event PositionWithdrawn(
        uint256 indexed positionId,
        address indexed user,
        address token,
        uint256 amount,
        address protocol
    );
    event ProtocolSwitched(
        uint256 indexed positionId,
        address oldProtocol,
        address newProtocol,
        uint256 oldAmount,
        uint256 newAmount
    );
    event YieldOracleUpdated(address oldOracle, address newOracle);
    event SwitchThresholdUpdated(uint16 oldThreshold, uint16 newThreshold);
    event CooldownPeriodUpdated(uint256 oldPeriod, uint256 newPeriod);

    /**
     * @notice Contract constructor
     * @param _yieldOracle Address of the yield oracle
     */
    constructor(address _yieldOracle) {
        require(_yieldOracle != address(0), "Invalid yield oracle");
        yieldOracle = _yieldOracle;
    }

    // Modifiers

    /**
     * @notice Ensures caller is an authorized manager
     */
    modifier onlyAuthorized() {
        require(
            authorizedManagers[msg.sender] || msg.sender == owner(),
            "Not authorized"
        );
        _;
    }

    // External functions

    /**
     * @notice Deposits tokens to the lending protocol with highest yield
     * @param token Token address
     * @param amount Amount to deposit
     * @return positionId ID of the created position
     */
    function depositToHighestYieldPool(
        address token,
        uint256 amount
    ) external nonReentrant onlyAuthorized returns (uint256) {
        require(supportedTokens[token], "Token not supported");
        require(amount > 0, "Zero amount");

        // Get protocol with highest yield for this token
        address bestProtocol = getBestProtocolForToken(token);
        require(bestProtocol != address(0), "No protocol available");

        // Transfer tokens from sender
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        // Approve tokens for lending protocol
        IERC20(token).safeApprove(bestProtocol, 0);
        IERC20(token).safeApprove(bestProtocol, amount);

        // Deposit to lending protocol
        uint256 depositedAmount = ILendingProtocol(bestProtocol).deposit(
            token,
            amount
        );

        // Create position
        _positionId.increment();
        uint256 newPositionId = _positionId.current();

        positions[newPositionId] = LendingPosition({
            id: newPositionId,
            user: msg.sender,
            token: token,
            amount: depositedAmount,
            protocol: bestProtocol,
            createdAt: block.timestamp,
            active: true
        });

        emit PositionCreated(
            newPositionId,
            msg.sender,
            token,
            depositedAmount,
            bestProtocol
        );

        return newPositionId;
    }

    /**
     * @notice Withdraws tokens from lending protocol
     * @param positionId ID of the position to withdraw
     * @param token Token address (for verification)
     * @return Amount withdrawn including interest
     */
    function withdrawFromPool(
        uint256 positionId,
        address token
    ) external nonReentrant onlyAuthorized returns (uint256) {
        LendingPosition storage position = positions[positionId];

        require(position.active, "Position not active");
        require(position.token == token, "Token mismatch");

        // Withdraw from lending protocol
        uint256 balanceBefore = IERC20(token).balanceOf(address(this));

        uint256 withdrawnAmount = ILendingProtocol(position.protocol).withdraw(
            token,
            position.amount
        );

        uint256 balanceAfter = IERC20(token).balanceOf(address(this));
        require(balanceAfter > balanceBefore, "Withdrawal failed");

        // Update position
        position.active = false;

        // Transfer tokens to caller
        IERC20(token).safeTransfer(msg.sender, withdrawnAmount);

        emit PositionWithdrawn(
            positionId,
            msg.sender,
            token,
            withdrawnAmount,
            position.protocol
        );

        return withdrawnAmount;
    }

    /**
     * @notice Checks for better yields and switches protocols if needed
     * @param positionId Position ID to optimize
     * @return New position ID if switched, same ID if not
     */
    function optimizeYield(
        uint256 positionId
    ) external nonReentrant onlyAuthorized returns (uint256) {
        LendingPosition storage position = positions[positionId];

        require(position.active, "Position not active");

        // Check if we can switch (cooldown period)
        if (
            block.timestamp <
            lastProtocolSwitch[position.token] + cooldownPeriod
        ) {
            return positionId; // Too soon to switch
        }

        address bestProtocol = getBestProtocolForToken(position.token);
        if (bestProtocol == position.protocol) {
            return positionId; // Already in best protocol
        }

        // Check if yield difference is significant enough
        uint256 currentYield = getProtocolYield(
            position.protocol,
            position.token
        );
        uint256 bestYield = getProtocolYield(bestProtocol, position.token);

        if (
            bestYield > currentYield &&
            bestYield - currentYield > switchThreshold
        ) {
            // Withdraw from current protocol
            uint256 balanceBefore = IERC20(position.token).balanceOf(
                address(this)
            );

            ILendingProtocol(position.protocol).withdraw(
                position.token,
                position.amount
            );

            uint256 balanceAfter = IERC20(position.token).balanceOf(
                address(this)
            );
            uint256 withdrawnAmount = balanceAfter - balanceBefore;

            // Approve tokens for new protocol
            IERC20(position.token).safeApprove(bestProtocol, 0);
            IERC20(position.token).safeApprove(bestProtocol, withdrawnAmount);

            // Deposit to new protocol
            uint256 depositedAmount = ILendingProtocol(bestProtocol).deposit(
                position.token,
                withdrawnAmount
            );

            // Update last switch time
            lastProtocolSwitch[position.token] = block.timestamp;

            // Create new position
            _positionId.increment();
            uint256 newPositionId = _positionId.current();

            // Update old position
            position.active = false;

            // Create new position
            positions[newPositionId] = LendingPosition({
                id: newPositionId,
                user: position.user,
                token: position.token,
                amount: depositedAmount,
                protocol: bestProtocol,
                createdAt: block.timestamp,
                active: true
            });

            emit ProtocolSwitched(
                positionId,
                position.protocol,
                bestProtocol,
                position.amount,
                depositedAmount
            );

            return newPositionId;
        }

        return positionId; // No switch needed
    }

    /**
     * @notice Gets the current yield for a token on a lending protocol
     * @param protocol Protocol address
     * @param token Token address
     * @return Yield in APY basis points (e.g., 500 = 5% APY)
     */
    function getProtocolYield(
        address protocol,
        address token
    ) public view returns (uint256) {
        // Call the yield oracle to get current APY
        return IPriceOracle(yieldOracle).getAPY(protocol, token);
    }

    /**
     * @notice Finds the lending protocol with highest yield for a token
     * @param token Token address
     * @return Protocol address with highest yield
     */
    function getBestProtocolForToken(
        address token
    ) public view returns (address) {
        address bestProtocol = address(0);
        uint256 highestYield = 0;

        for (uint256 i = 0; i < lendingProtocolAddresses.length; i++) {
            address protocol = lendingProtocolAddresses[i];

            // Skip disabled protocols
            if (!lendingProtocols[protocol].enabled) {
                continue;
            }

            // Check if protocol supports this token
            if (!ILendingProtocol(protocol).supportsToken(token)) {
                continue;
            }

            uint256 currentYield = getProtocolYield(protocol, token);

            if (currentYield > highestYield) {
                highestYield = currentYield;
                bestProtocol = protocol;
            }
        }

        return bestProtocol;
    }

    /**
     * @notice Gets position details
     * @param positionId Position ID
     * @return Position details
     */
    function getPosition(
        uint256 positionId
    ) external view returns (LendingPosition memory) {
        return positions[positionId];
    }

    /**
     * @notice Gets current balance of a position including interest
     * @param positionId Position ID
     * @return Current balance
     */
    function getPositionBalance(
        uint256 positionId
    ) external view returns (uint256) {
        LendingPosition memory position = positions[positionId];

        if (!position.active) {
            return 0;
        }

        return
            ILendingProtocol(position.protocol).getBalance(
                position.token,
                address(this),
                position.amount
            );
    }

    /**
     * @notice Gets all active lending protocols
     * @return Array of protocol addresses
     */
    function getAllProtocols() external view returns (address[] memory) {
        return lendingProtocolAddresses;
    }

    /**
     * @notice Gets all supported tokens
     * @return Array of token addresses
     */
    function getAllSupportedTokens() external view returns (address[] memory) {
        return supportedTokenList;
    }

    // Admin functions

    /**
     * @notice Adds a new lending protocol
     * @param protocol Protocol address
     */
    function addProtocol(address protocol) external onlyOwner {
        require(protocol != address(0), "Invalid protocol address");
        require(
            !lendingProtocols[protocol].protocol,
            "Protocol already exists"
        );

        lendingProtocols[protocol] = LendingProtocolConfig({
            protocol: protocol,
            enabled: true
        });

        lendingProtocolAddresses.push(protocol);

        emit ProtocolAdded(protocol);
    }

    /**
     * @notice Removes a lending protocol
     * @param protocol Protocol address
     */
    function removeProtocol(address protocol) external onlyOwner {
        require(lendingProtocols[protocol].protocol, "Protocol doesn't exist");

        // Remove from array
        for (uint256 i = 0; i < lendingProtocolAddresses.length; i++) {
            if (lendingProtocolAddresses[i] == protocol) {
                lendingProtocolAddresses[i] = lendingProtocolAddresses[
                    lendingProtocolAddresses.length - 1
                ];
                lendingProtocolAddresses.pop();
                break;
            }
        }

        delete lendingProtocols[protocol];

        emit ProtocolRemoved(protocol);
    }

    /**
     * @notice Enables a lending protocol
     * @param protocol Protocol address
     */
    function enableProtocol(address protocol) external onlyOwner {
        require(lendingProtocols[protocol].protocol, "Protocol doesn't exist");

        lendingProtocols[protocol].enabled = true;

        emit ProtocolEnabled(protocol);
    }

    /**
     * @notice Disables a lending protocol
     * @param protocol Protocol address
     */
    function disableProtocol(address protocol) external onlyOwner {
        require(lendingProtocols[protocol].protocol, "Protocol doesn't exist");

        lendingProtocols[protocol].enabled = false;

        emit ProtocolDisabled(protocol);
    }

    /**
     * @notice Adds a supported token
     * @param token Token address
     */
    function addSupportedToken(address token) external onlyOwner {
        require(token != address(0), "Invalid token address");
        require(!supportedTokens[token], "Token already supported");

        supportedTokens[token] = true;
        supportedTokenList.push(token);

        emit TokenAdded(token);
    }

    /**
     * @notice Removes a supported token
     * @param token Token address
     */
    function removeSupportedToken(address token) external onlyOwner {
        require(supportedTokens[token], "Token not supported");

        // Remove from array
        for (uint256 i = 0; i < supportedTokenList.length; i++) {
            if (supportedTokenList[i] == token) {
                supportedTokenList[i] = supportedTokenList[
                    supportedTokenList.length - 1
                ];
                supportedTokenList.pop();
                break;
            }
        }

        supportedTokens[token] = false;

        emit TokenRemoved(token);
    }

    /**
     * @notice Authorizes a manager to create and manage positions
     * @param manager Manager address
     */
    function authorizeManager(address manager) external onlyOwner {
        require(manager != address(0), "Invalid manager address");
        require(!authorizedManagers[manager], "Manager already authorized");

        authorizedManagers[manager] = true;

        emit ManagerAuthorized(manager);
    }

    /**
     * @notice Deauthorizes a manager
     * @param manager Manager address
     */
    function deauthorizeManager(address manager) external onlyOwner {
        require(authorizedManagers[manager], "Manager not authorized");

        authorizedManagers[manager] = false;

        emit ManagerDeauthorized(manager);
    }

    /**
     * @notice Updates the yield oracle
     * @param _yieldOracle New yield oracle address
     */
    function updateYieldOracle(address _yieldOracle) external onlyOwner {
        require(_yieldOracle != address(0), "Invalid yield oracle");

        address oldOracle = yieldOracle;
        yieldOracle = _yieldOracle;

        emit YieldOracleUpdated(oldOracle, _yieldOracle);
    }

    /**
     * @notice Updates the switch threshold
     * @param _switchThreshold New switch threshold in basis points
     */
    function updateSwitchThreshold(uint16 _switchThreshold) external onlyOwner {
        uint16 oldThreshold = switchThreshold;
        switchThreshold = _switchThreshold;

        emit SwitchThresholdUpdated(oldThreshold, _switchThreshold);
    }

    /**
     * @notice Updates the cooldown period
     * @param _cooldownPeriod New cooldown period in seconds
     */
    function updateCooldownPeriod(uint256 _cooldownPeriod) external onlyOwner {
        uint256 oldPeriod = cooldownPeriod;
        cooldownPeriod = _cooldownPeriod;

        emit CooldownPeriodUpdated(oldPeriod, _cooldownPeriod);
    }

    /**
     * @notice Allows the owner to rescue stuck tokens
     * @param token Token to rescue
     * @param to Address to send tokens to
     * @param amount Amount to rescue
     */
    function rescueTokens(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
    }
}
