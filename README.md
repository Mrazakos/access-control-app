# Decentralized Access Control Mobile Application

A React Native mobile application implementing blockchain-based access control using Verifiable Credentials (W3C VC 2.0) and Ethereum smart contracts. This project is part of a thesis on decentralized access control systems.

## 🎓 Thesis Project

This application demonstrates a practical implementation of decentralized access control for physical locks, combining:

- **W3C Verifiable Credentials 2.0** for credential issuance and verification
- **Ethereum blockchain** for lock registration and credential revocation
- **ECDSA cryptography** for off-chain and on-chain credential signing
- **React Native** for cross-platform mobile access

## 🏗️ Architecture Overview

### Key Components

1. **Lock Management**

   - Create and register smart locks on the blockchain
   - Each lock has its own cryptographic identity (ECDSA key pair + Ethereum address)
   - Locks are registered on-chain with their unique addresses

2. **Verifiable Credentials System**

   - **Off-chain Issuance**: Lock owners issue W3C-compliant VCs to grant access
   - **Privacy-Preserving**: User metadata is hashed before inclusion in credentials
   - **QR Code Sharing**: Credentials are shared via time-limited QR codes (10-minute expiry)
   - **On-chain Revocation**: Credentials are revoked by sending hash + signature to smart contract

3. **Dual Credential Storage**
   - **Issued Credentials**: Stored by lock owners with full user metadata
   - **Access Credentials**: Stored by recipients with only metadata hash (privacy)

### Architecture Flow

```
┌─────────────────┐
│  Lock Owner     │
│  (Issuer)       │
└────────┬────────┘
         │
         │ 1. Create Lock (generates identity)
         │ 2. Register on Blockchain
         ▼
┌─────────────────────────────────┐
│   Ethereum Smart Contract       │
│   - Lock Registry               │
│   - Revocation Registry         │
└─────────────────────────────────┘
         │
         │ 3. Issue VC (off-chain)
         │ 4. Generate QR Code
         ▼
┌─────────────────┐
│  Recipient      │
│  (Holder)       │
└────────┬────────┘
         │
         │ 5. Scan QR Code
         │ 6. Verify & Store VC
         │ 7. Use for Access
         ▼
┌─────────────────┐
│  Physical Lock  │
│  (Verifier)     │
└─────────────────┘
```

## 🔐 Cryptographic Design

### Off-chain vs On-chain Signatures

1. **Off-chain Credentials** (for lock verification):

   - Signed with standard ECDSA (secp256k1)
   - Verified using public key
   - Used for physical lock access

2. **On-chain Credentials** (for smart contract verification):
   - Signed with Ethereum message prefix (`\x19Ethereum Signed Message:\n`)
   - Verified using `ecrecover` in smart contract
   - Used for blockchain-based revocation

### Credential Hash Consistency

The VC hash remains **identical** between off-chain and on-chain versions:

- Only the **signature format** changes
- Ensures the same credential can be verified in both contexts
- Critical for revocation: off-chain VC hash matches on-chain revocation record

## 📱 Features

### Lock Owner Features

- ✅ Create and register smart locks on blockchain
- ✅ Issue W3C Verifiable Credentials to users
- ✅ Generate time-limited QR codes for credential sharing
- ✅ Revoke credentials on-chain with cryptographic proof
- ✅ Manage multiple locks and their credentials

### User Features

- ✅ Receive credentials via QR code scanning
- ✅ Store credentials locally (privacy-preserving)
- ✅ View credential details and expiration dates
- ✅ Use credentials to unlock doors (NFC/Bluetooth - TODO)
- ✅ Search and filter credentials by lock

## 🛠️ Technology Stack

### Frontend

- **React Native** with Expo
- **TypeScript** for type safety
- **React Navigation** for routing
- **Wagmi** for Ethereum interactions
- **WalletConnect** for wallet integration

### Blockchain

- **Ethereum** (Sepolia testnet for development)
- **Solidity** smart contracts
- **Infura** RPC provider
- **Viem** for Ethereum utilities

### Cryptography

- **@mrazakos/vc-ecdsa-crypto** v3.0.0 - Custom library for W3C VC 2.0
- **ECDSA secp256k1** for signatures
- **Keccak-256** for hashing

### Storage

- **AsyncStorage** for local persistence
- Separate storage for issued vs. access credentials

## 📋 Project Structure

```
mobile-app/
├── src/
│   ├── components/         # Reusable UI components
│   │   └── CustomAlert.tsx
│   ├── config/            # Environment configuration
│   │   └── environment.ts
│   ├── hooks/             # Custom React hooks
│   │   ├── useLock.ts              # Lock management logic
│   │   └── useVerifiableCredentials.ts  # VC logic
│   ├── screens/           # Main app screens
│   │   ├── DevicesScreen.tsx       # Lock management
│   │   ├── UnlockScreen.tsx        # Access credentials & unlock
│   │   └── VerifiableCredentialsScreen.tsx  # VC issuance
│   ├── services/          # Business logic services
│   │   ├── LockService.ts
│   │   └── WalletService.ts
│   ├── typechain-types/   # Smart contract TypeScript bindings
│   └── types/             # TypeScript type definitions
│       └── types.ts
├── docs/                  # Documentation
├── android/               # Android-specific code
├── App.tsx               # Root component
└── package.json
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Yarn or npm
- Expo CLI
- Android Studio / Xcode (for development builds)
- An Ethereum wallet (e.g., MetaMask)
- Infura API key
- WalletConnect Project ID

### Environment Setup

1. Clone the repository
2. Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

3. Configure your `.env` file:

```env
# WalletConnect (required)
EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# Infura (required)
EXPO_PUBLIC_INFURA_API_KEY=your_infura_key

# App Configuration
EXPO_PUBLIC_APP_NAME="Access Control"
EXPO_PUBLIC_APP_DESCRIPTION="Decentralized Access Control System"
EXPO_PUBLIC_APP_URL="https://yourapp.com"
EXPO_PUBLIC_APP_SCHEME="accesscontrol"

# Development Mode (true for Sepolia, false for Mainnet)
EXPO_PUBLIC_DEV_MODE=true

# Smart Contract Addresses
EXPO_PUBLIC_CONTRACT_ADDRESS_SEPOLIA=0x...
EXPO_PUBLIC_CONTRACT_ADDRESS_MAINNET=0x...
```

### Installation

```bash
# Install dependencies
yarn install

# Start Metro bundler
npx expo start

# For development build
npx expo run:android
# or
npx expo run:ios
```

### Running on Physical Device

**Option 1: Same Network**

```bash
npx expo start
# Scan QR code with Expo Go app
```

**Option 2: Tunnel (for different networks)**

```bash
npx expo start --tunnel
```

**Option 3: Development Build**

```bash
# Build and install development build
npx expo run:android
# or
npx expo run:ios
```

## 🧪 Testing

### Manual Testing Flow

1. **Setup**

   - Connect your Ethereum wallet
   - Ensure you have Sepolia ETH for gas fees

2. **Create a Lock**

   - Navigate to "Devices" tab
   - Tap "+" to create a new lock
   - Lock is automatically registered on blockchain

3. **Issue a Credential**

   - Select a lock
   - Tap "Issue New Credential"
   - Enter user email and name
   - Optional: Set expiration date

4. **Share Credential**

   - Tap the share icon on a credential
   - QR code is generated (10-minute expiry)
   - Recipient scans with "Unlock" tab

5. **Revoke Credential**
   - Tap the revoke icon on a credential
   - Confirm revocation
   - Transaction is sent to blockchain

### Smart Contract Testing

See the smart contract repository for Hardhat testing setup.

## 📖 W3C Verifiable Credentials 2.0

This project implements the [W3C Verifiable Credentials Data Model 2.0](https://www.w3.org/TR/vc-data-model/) specification.

### Credential Structure

```json
{
  "@context": ["https://www.w3.org/ns/credentials/v2"],
  "type": ["VerifiableCredential", "LockAccessCredential"],
  "id": "vc:uuid-here",
  "issuer": {
    "id": "did:lock:123",
    "name": "Main Entrance Lock"
  },
  "validFrom": "2025-11-03T10:00:00Z",
  "validUntil": "2025-12-03T10:00:00Z",
  "credentialSubject": {
    "id": "did:user:abc123",
    "userMetaDataHash": "0x...",
    "lock": {
      "id": "123",
      "name": "Main Entrance"
    },
    "accessLevel": "standard",
    "permissions": ["unlock"]
  },
  "proof": {
    "type": "EcdsaSecp256k1Signature2019",
    "created": "2025-11-03T10:00:00Z",
    "proofPurpose": "assertionMethod",
    "verificationMethod": "did:lock:123#key-1",
    "proofValue": "0x..."
  }
}
```

## 🔒 Security Considerations

### Privacy

- User metadata (email, name) is **hashed** before inclusion in credentials
- Only credential holder and issuer know the actual user information
- Credentials can be verified without revealing user identity

### Key Management

- Each lock has its own ECDSA key pair
- Private keys stored securely in device's encrypted storage
- Never transmitted over network

### Revocation

- Revoked credentials are recorded on-chain
- Immutable revocation registry
- Physical locks can check revocation status before granting access

### QR Code Security

- Time-limited (10-minute expiry)
- One-time use recommended
- Contains full credential for offline verification

## 🎯 Future Enhancements

- [ ] **NFC Communication** for physical lock interaction
- [ ] **Bluetooth** for wireless unlock
- [ ] **Biometric Authentication** for credential access
- [ ] **Multi-signature** for high-security locks
- [ ] **Delegation** - Allow credential holders to delegate access
- [ ] **Time-based Access Control** - Restrict access to specific time windows
- [ ] **Audit Logs** - Track all access attempts
- [ ] **Credential Refresh** - Automatic renewal of expiring credentials

## 🔗 Related Repositories

This project is part of a research paper on decentralized access control systems. The following open-source repositories accompany the paper to ensure full reproducibility of all findings and benchmarks.

### 📊 Benchmarking Suites

| Repository | Description |
|---|---|
| [bc-crypto-storage](https://github.com/Mrazakos/bc-crypto-storage) | **On-Chain Gas Profiling** — Hardhat smart contracts and EVM gas evaluation scripts used to benchmark on-chain storage and cryptographic operations. |
| [vc-ecdsa-crypto](https://github.com/Mrazakos/vc-ecdsa-crypto) | **Off-Chain Edge Emulation** — Custom W3C credentialing suite, mobile issuer metrics, and containerized IoT benchmarking scripts for off-chain performance evaluation. |

### 🏗️ Proof of Concept — Reference Architecture

| Repository | Description |
|---|---|
| [access-control-app](https://github.com/Mrazakos/access-control-app) *(this repo)* | **Mobile App** — React Native mobile application implementing blockchain-based access control using W3C Verifiable Credentials and Ethereum smart contracts. |
| [access-control-lock](https://github.com/Mrazakos/access-control-lock) | **Smart Lock** — Firmware and software for the physical smart lock device acting as the credential verifier in the access control system. |
| [access-control-contract](https://github.com/Mrazakos/access-control-contract) | **Smart Contract** — Solidity smart contracts for on-chain lock registry and credential revocation, deployed on the Ethereum network. |

---

## 👤 Author

**Ákos Mráz**

- Thesis: Decentralized Access Control Systems
- Institution: University Of Szeged
- Year: 2025

## 🙏 Acknowledgments

- W3C Verifiable Credentials Working Group
- Ethereum Foundation
- Expo team for React Native tooling

## 📚 References

1. [W3C Verifiable Credentials Data Model 2.0](https://www.w3.org/TR/vc-data-model/)
2. [Ethereum Yellow Paper](https://ethereum.github.io/yellowpaper/paper.pdf)
3. [EIP-191: Signed Data Standard](https://eips.ethereum.org/EIPS/eip-191)
4. [Decentralized Identifiers (DIDs)](https://www.w3.org/TR/did-core/)

---

**Note**: This is a thesis project demonstrating decentralized access control concepts. Not intended for production use without proper security audit and testing.
