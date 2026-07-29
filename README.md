# SafeBridge Global (v6.0) 🦅

Decentralized, Multi-Token, Cryptographically Armored On-Chain Escrow Bridge deployed on Polygon Mainnet.

## 🛡️ Smart Contract Architecture
- **Network:** Polygon Mainnet (Chain ID: `137` / `0x89`)
- **Contract Address:** `0x71C95911E9a5D330f4D621842EC243EE1343292e`
- **Security Engine:** Client-side Keccak256 hashing to prevent mempool front-running/sniping attacks.
- **Tokens Supported:** POL (Native), USDT (Tether), XAUT (Gold)
- **Production Standard:** Engineered with strict precision and industrial discipline.

## ⚙️ Cryptographic ABI Spec
```json
[
  "function createBridge(address _seller, bytes32 _passwordHash, uint256 _hours, address _tokenAddress, uint256 _amount) public payable",
  "function claimFunds(uint256 _id, bytes32 _password) public",
  "function cancelAndRefund(uint256 _id) public"
]
