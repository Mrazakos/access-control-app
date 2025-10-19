# Quick Start: Network Configuration

## ✅ What Was Added

Your app now supports **Development Mode** and **Production Mode** for connecting to different Ethereum networks.

## 🚀 How to Use

### 1. Update Your `.env` File

Add these new variables to your `.env` file:

```bash
# Development Mode (true = Sepolia testnet, false = Ethereum mainnet)
EXPO_PUBLIC_DEV_MODE=true

# Replace old EXPO_PUBLIC_CONTRACT_ADDRESS with:
EXPO_PUBLIC_CONTRACT_ADDRESS_SEPOLIA=0xYourSepoliaContractAddress
EXPO_PUBLIC_CONTRACT_ADDRESS_MAINNET=0xYourMainnetContractAddress
```

### 2. Remove Old Variable

Delete or comment out the old variable:

```bash
# EXPO_PUBLIC_CONTRACT_ADDRESS=0x...  ❌ Remove this
# EXPO_PUBLIC_ETHEREUM_CHAIN_ID=...   ❌ Remove this too
```

### 3. Deploy Your Contracts

**Sepolia (Development)**:

```bash
npx hardhat run scripts/deploy.ts --network sepolia
# Copy address to EXPO_PUBLIC_CONTRACT_ADDRESS_SEPOLIA
```

**Mainnet (Production)**:

```bash
npx hardhat run scripts/deploy.ts --network mainnet
# Copy address to EXPO_PUBLIC_CONTRACT_ADDRESS_MAINNET
```

### 4. Restart Your App

```bash
npm start -- --clear
```

## 🎯 Network Modes

| Mode                                    | Network  | Chain ID | Use Case                      |
| --------------------------------------- | -------- | -------- | ----------------------------- |
| **Dev** (`EXPO_PUBLIC_DEV_MODE=true`)   | Sepolia  | 11155111 | Testing with free test ETH    |
| **Prod** (`EXPO_PUBLIC_DEV_MODE=false`) | Ethereum | 1        | Live deployment with real ETH |

## 📋 Example `.env` File

```bash
# Development Mode
EXPO_PUBLIC_DEV_MODE=true

# API Keys
EXPO_PUBLIC_INFURA_API_KEY=abc123...

# Contract Addresses
EXPO_PUBLIC_CONTRACT_ADDRESS_SEPOLIA=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1
EXPO_PUBLIC_CONTRACT_ADDRESS_MAINNET=0x1234567890123456789012345678901234567890

# WalletConnect
EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID=abc123...
EXPO_PUBLIC_APP_NAME="Access Control"
EXPO_PUBLIC_APP_DESCRIPTION="Decentralized Access Control"
EXPO_PUBLIC_APP_URL=https://your-app.com
EXPO_PUBLIC_APP_SCHEME=accesscontrol
```

## 🔍 Verify It's Working

When you start the app, check the console:

**Development Mode**:

```
✅ WalletConnect AppKit initialized (DEV mode - Sepolia)
```

**Production Mode**:

```
✅ WalletConnect AppKit initialized (PROD mode - Ethereum)
```

## 🔄 Switching Networks

**To switch from Dev to Prod**:

1. Change `EXPO_PUBLIC_DEV_MODE=false` in `.env`
2. Restart: `npm start -- --clear`

**To switch from Prod to Dev**:

1. Change `EXPO_PUBLIC_DEV_MODE=true` in `.env`
2. Restart: `npm start -- --clear`

## 💡 Tips

- ✅ Always test on Sepolia first
- ✅ Get free Sepolia ETH from https://sepoliafaucet.com/
- ✅ Keep both contract addresses updated
- ⚠️ Production mode uses real ETH - be careful!

## 📚 More Info

See [Network-Configuration.md](./Network-Configuration.md) for detailed documentation.
