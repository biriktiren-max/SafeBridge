// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// Instant wallet send with a 0.25% fee (25 / 10000) paid to FEE_RECIPIENT.
/// Only POL, USDT, USDT.e and PAXG on Polygon are accepted.
contract SafeBridgeInstant {
    uint256 public constant FEE_BPS = 25;
    uint256 public constant FEE_DENOMINATOR = 10000;
    address public constant FEE_RECIPIENT = 0x68E0c1948900699E23a5490fcE4e376EDe21588D;
    address public constant USDT = 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359;
    address public constant USDTE = 0xc2132D05D31c914a87C6611C10748AEb04B58e8F;
    address public constant PAXG = 0x714DB550b574b3e927Fb3d93E26127d15721d4c2;

    event InstantSent(
        address indexed sender,
        address indexed recipient,
        address token,
        uint256 grossAmount,
        uint256 feeAmount,
        uint256 netAmount
    );

    function isAllowedToken(address token) public pure returns (bool) {
        return token == address(0) || token == USDT || token == USDTE || token == PAXG;
    }

    function send(address payable recipient, address token, uint256 grossAmount) external payable {
        require(recipient != address(0), "Invalid recipient");
        require(isAllowedToken(token), "Token not allowed");
        require(grossAmount > 0, "Amount must be > 0");

        uint256 fee = (grossAmount * FEE_BPS) / FEE_DENOMINATOR;
        uint256 net = grossAmount - fee;
        require(net > 0, "Net amount must be > 0");

        if (token == address(0)) {
            require(msg.value == grossAmount, "Incorrect POL value sent");
            _sendPol(FEE_RECIPIENT, fee, "Fee transfer failed");
            _sendPol(recipient, net, "Transfer failed");
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
            _callToken(
                token,
                abi.encodeWithSelector(0xa9059cbb, recipient, net),
                "Token transfer failed"
            );
        }

        emit InstantSent(msg.sender, recipient, token, grossAmount, fee, net);
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
