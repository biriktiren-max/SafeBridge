// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// Polygon escrow. Fee is 0.25% (25 / 10000), paid to FEE_RECIPIENT at lock time.
/// The locked amount is the net. The recipient releases it with a password commit
/// (keccak256 of the password), never the plaintext password.
/// The sender can refund only after the time lock (minimum 1 hour).
contract SafeBridgeEscrow {
    uint256 public constant FEE_BPS = 25;
    uint256 public constant FEE_DENOMINATOR = 10000;
    uint256 public constant MIN_DURATION = 1 hours;
    uint256 public constant MAX_DURATION = 365 days;
    address public constant FEE_RECIPIENT = 0x68E0c1948900699E23a5490fcE4e376EDe21588D;
    address public constant USDT = 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359;
    address public constant USDTE = 0xc2132D05D31c914a87C6611C10748AEb04B58e8F;
    address public constant PAXG = 0x714DB550b574b3e927Fb3d93E26127d15721d4c2;

    enum Status {
        Active,
        Released,
        Refunded
    }

    struct Escrow {
        address sender;
        address recipient;
        address token;
        uint256 amount;
        bytes32 passwordHash;
        uint256 timelock;
        uint256 createdAt;
        Status status;
    }

    uint256 public nextId;
    mapping(uint256 => Escrow) private escrows;

    event EscrowCreated(
        uint256 indexed txId,
        address indexed sender,
        address indexed recipient,
        address token,
        uint256 grossAmount,
        uint256 feeAmount,
        uint256 netAmount,
        uint256 timelock
    );
    event EscrowReleased(uint256 indexed txId);
    event EscrowRefunded(uint256 indexed txId);

    function isAllowedToken(address token) public pure returns (bool) {
        return token == address(0) || token == USDT || token == USDTE || token == PAXG;
    }

    function createEscrow(
        address payable recipient,
        address token,
        uint256 grossAmount,
        bytes32 passwordCommit,
        uint256 duration
    ) external payable {
        require(recipient != address(0), "Invalid recipient");
        require(isAllowedToken(token), "Token not allowed");
        require(grossAmount > 0, "Amount must be > 0");
        require(passwordCommit != bytes32(0), "Invalid password commit");
        require(duration >= MIN_DURATION, "Duration too short");
        require(duration <= MAX_DURATION, "Duration too long");

        uint256 fee = (grossAmount * FEE_BPS) / FEE_DENOMINATOR;
        uint256 net = grossAmount - fee;
        require(net > 0, "Net amount must be > 0");

        uint256 txId = nextId;
        escrows[txId] = Escrow({
            sender: msg.sender,
            recipient: recipient,
            token: token,
            amount: net,
            passwordHash: _bindCommit(passwordCommit, txId, recipient),
            timelock: duration,
            createdAt: block.timestamp,
            status: Status.Active
        });
        nextId = txId + 1;

        if (token == address(0)) {
            require(msg.value == grossAmount, "Incorrect POL value sent");
            _sendPol(FEE_RECIPIENT, fee, "Fee transfer failed");
        } else {
            require(msg.value == 0, "Do not send POL for ERC20");
            _callToken(
                token,
                abi.encodeWithSelector(0x23b872dd, msg.sender, address(this), grossAmount),
                "Token transfer failed"
            );
            _callToken(
                token,
                abi.encodeWithSelector(0xa9059cbb, FEE_RECIPIENT, fee),
                "Token fee transfer failed"
            );
        }

        emit EscrowCreated(txId, msg.sender, recipient, token, grossAmount, fee, net, duration);
    }

    function releaseEscrow(uint256 txId, bytes32 passwordCommit) external {
        Escrow storage item = escrows[txId];
        require(item.status == Status.Active, "Not active");
        require(msg.sender == item.recipient, "Only recipient");
        require(_bindCommit(passwordCommit, txId, item.recipient) == item.passwordHash, "Invalid password");

        item.status = Status.Released;
        _pay(item.recipient, item.token, item.amount, "Transfer failed", "Token transfer failed");
        emit EscrowReleased(txId);
    }

    function refundEscrow(uint256 txId) external {
        Escrow storage item = escrows[txId];
        require(item.status == Status.Active, "Not active");
        require(msg.sender == item.sender, "Only sender");
        require(block.timestamp >= item.createdAt + item.timelock, "Timelock not passed");

        item.status = Status.Refunded;
        _pay(item.sender, item.token, item.amount, "Refund failed", "Token refund failed");
        emit EscrowRefunded(txId);
    }

    function getTransaction(uint256 txId)
        external
        view
        returns (
            address sender,
            address recipient,
            address token,
            uint256 amount,
            uint256 timelock,
            uint256 createdAt,
            uint8 status
        )
    {
        Escrow storage item = escrows[txId];
        return (
            item.sender,
            item.recipient,
            item.token,
            item.amount,
            item.timelock,
            item.createdAt,
            uint8(item.status)
        );
    }

    function _bindCommit(bytes32 passwordCommit, uint256 txId, address recipient) private view returns (bytes32) {
        return keccak256(abi.encodePacked(passwordCommit, txId, recipient, address(this), block.chainid));
    }

    function _pay(address to, address token, uint256 amount, string memory nativeError, string memory tokenError)
        private
    {
        if (token == address(0)) {
            _sendPol(to, amount, nativeError);
        } else {
            _callToken(token, abi.encodeWithSelector(0xa9059cbb, to, amount), tokenError);
        }
    }

    function _sendPol(address to, uint256 amount, string memory errorMessage) private {
        if (amount == 0) return;
        (bool ok,) = to.call{value: amount}("");
        require(ok, errorMessage);
    }

    function _callToken(address token, bytes memory data, string memory errorMessage) private {
        (bool ok, bytes memory ret) = token.call(data);
        require(
            ok && (ret.length == 0 || (ret.length == 32 && abi.decode(ret, (bool)))),
            errorMessage
        );
    }
}
