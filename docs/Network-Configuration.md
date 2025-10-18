# Network Configuration Guide

## Overview

The app supports two network modes:

- **Development Mode**: Connects to Sepolia testnet (for testing)
- **Production Mode**: Connects to Ethereum mainnet (for live deployment)

## Quick Setup

### 1. Copy Environment File

```bash
cp .env.example .env
```

### 2. Configure Your `.env` File

#### Development Mode (Default)

```bash
# Development Mode - Use Sepolia testnet
EXPO_PUBLIC_DEV_MODE=true

# API Keys
EXPO_PUBLIC_INFURA_API_KEY=your_infura_api_key_here

# Smart Contract Addresses
EXPO_PUBLIC_CONTRACT_ADDRESS_SEPOLIA=0xYourSepoliaContractAddress
EXPO_PUBLIC_CONTRACT_ADDRESS_MAINNET=0xYourMainnetContractAddress

# WalletConnect Configuration
EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
EXPO_PUBLIC_APP_NAME="Your App Name"
EXPO_PUBLIC_APP_DESCRIPTION="Your App Description"
EXPO_PUBLIC_APP_URL=https://your-app-url.com
EXPO_PUBLIC_APP_SCHEME=yourapp
```

#### Production Mode

To switch to production (Ethereum mainnet), simply change:

```bash
EXPO_PUBLIC_DEV_MODE=false
```

## Network Details

### Sepolia Testnet (Development)

- **Chain ID**: 11155111
- **Chain Name**: Sepolia
- **RPC URL**: `https://sepolia.infura.io/v3/YOUR_API_KEY`
- **Explorer**: https://sepolia.etherscan.io
- **Test ETH**: Get free test ETH from [Sepolia Faucet](https://sepoliafaucet.com/)

### Ethereum Mainnet (Production)

- **Chain ID**: 1
- **Chain Name**: Ethereum
- **RPC URL**: `https://mainnet.infura.io/v3/YOUR_API_KEY`
- **Explorer**: https://etherscan.io
- **Note**: Uses real ETH - be careful!

## Switching Networks

### During Development

1. **Edit `.env` file**:

   ```bash
   EXPO_PUBLIC_DEV_MODE=true   # for Sepolia
   # or
   EXPO_PUBLIC_DEV_MODE=false  # for Mainnet
   ```

2. **Restart the app**:

   ```bash
   npm start
   ```

3. **Clear cache if needed**:
   ```bash
   npm start -- --clear
   ```

### Environment Variable Behavior

The `EXPO_PUBLIC_DEV_MODE` variable:

- **`true`** or **not set**: Uses Sepolia (development)
- **`false`**: Uses Ethereum Mainnet (production)

## Contract Addresses

You need to deploy your smart contract to both networks and configure both addresses:

### Deploying to Sepolia (Dev)

```bash
# In your smart contract project
npx hardhat run scripts/deploy.ts --network sepolia
```

Copy the deployed address to `EXPO_PUBLIC_CONTRACT_ADDRESS_SEPOLIA`

### Deploying to Mainnet (Prod)

```bash
# In your smart contract project
npx hardhat run scripts/deploy.ts --network mainnet
```

Copy the deployed address to `EXPO_PUBLIC_CONTRACT_ADDRESS_MAINNET`

## Usage in Code

The app automatically uses the correct network configuration:

```typescript
import { environment } from "./src/config/environment";

// Check current mode
console.log(environment.isDevMode); // true or false

// Get current network info
console.log(environment.network.chainName); // "Sepolia" or "Ethereum"
console.log(environment.network.chainId); // 11155111 or 1
console.log(environment.network.contractAddress); // Current contract address
console.log(environment.network.explorerUrl); // Current block explorer
```

## Console Output

When the app starts, you'll see:

**Development Mode**:

```
✅ WalletConnect AppKit initialized (DEV mode - Sepolia)
📝 Using contract address: 0x... (Sepolia)
🔐 Using contract address: 0x... (Sepolia)
```

**Production Mode**:

```
✅ WalletConnect AppKit initialized (PROD mode - Ethereum)
📝 Using contract address: 0x... (Ethereum)
🔐 Using contract address: 0x... (Ethereum)
```

## Best Practices

### ✅ DO

- Always test on Sepolia before deploying to mainnet
- Keep separate contract addresses for dev and prod
- Use descriptive naming for your networks
- Document which contract version is on which network
- Test wallet connections on both networks

### ❌ DON'T

- Don't use production keys in development
- Don't commit your `.env` file to git (it's in `.gitignore`)
- Don't skip testing on Sepolia
- Don't use the same contract address for both networks

## Troubleshooting

### Wrong Network Connected

**Problem**: App shows wrong network in WalletConnect

**Solution**:

1. Check your `.env` file for correct `EXPO_PUBLIC_DEV_MODE` value
2. Restart the app with cache clear: `npm start -- --clear`
3. Disconnect and reconnect your wallet

### Contract Not Found

**Problem**: "Contract not found" or similar error

**Solution**:

1. Verify contract address in `.env` matches deployed contract
2. Ensure you're on the correct network (dev/prod)
3. Check contract is verified on block explorer

### Environment Variables Not Loading

**Problem**: App doesn't see new environment variables

**Solution**:

1. Stop the development server
2. Clear Metro bundler cache: `npm start -- --reset-cache`
3. Restart: `npm start`

## Security Notes

### Development Environment

- ✅ Safe to use test accounts
- ✅ Free test ETH from faucets
- ✅ Can reset and redeploy contracts freely

### Production Environment

- ⚠️ Uses real ETH - costs real money
- ⚠️ Transactions are permanent
- ⚠️ Triple-check contract addresses
- ⚠️ Test thoroughly on Sepolia first
- ⚠️ Consider using a hardware wallet for deployment

## Example Workflow

### Development Phase

1. Set `EXPO_PUBLIC_DEV_MODE=true`
2. Deploy contract to Sepolia
3. Update `EXPO_PUBLIC_CONTRACT_ADDRESS_SEPOLIA`
4. Test all features with test ETH
5. Fix bugs and iterate

### Pre-Production

1. Audit smart contract code
2. Test extensively on Sepolia
3. Verify contract on Sepolia Etherscan
4. Document all test results

### Production Deployment

1. Deploy contract to Ethereum mainnet
2. Verify contract on Etherscan
3. Update `EXPO_PUBLIC_CONTRACT_ADDRESS_MAINNET`
4. Set `EXPO_PUBLIC_DEV_MODE=false`
5. Final testing with small amounts
6. Go live! 🚀

## Additional Resources

- [Infura Documentation](https://docs.infura.io/)
- [Sepolia Testnet Info](https://sepolia.dev/)
- [WalletConnect Docs](https://docs.walletconnect.com/)
- [Ethereum Mainnet Info](https://ethereum.org/)
