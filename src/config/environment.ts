/**
 * Environment configuration
 * Centralized access to environment variables with validation
 */

// Helper function to get required environment variables
function getRequiredEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
}

// Helper function to get optional environment variables
function getOptionalEnvVar(
  name: string,
  defaultValue?: string
): string | undefined {
  return process.env[name] || defaultValue;
}

// Helper function to parse boolean environment variables
function getBooleanEnvVar(name: string, defaultValue: boolean): boolean {
  const value = process.env[name];
  if (!value) return defaultValue;
  return value.toLowerCase() === "true";
}

// Determine if we're in development mode
const isDevMode = getBooleanEnvVar("EXPO_PUBLIC_DEV_MODE", true);

// Network-specific configuration
const networkConfig = {
  development: {
    chainId: 11155111, // Sepolia
    chainName: "Sepolia",
    rpcUrl: `https://sepolia.infura.io/v3/${process.env.EXPO_PUBLIC_INFURA_API_KEY}`,
    explorerUrl: "https://sepolia.etherscan.io",
    contractAddress: getOptionalEnvVar("EXPO_PUBLIC_CONTRACT_ADDRESS_SEPOLIA", ""),
  },
  production: {
    chainId: 1, // Ethereum Mainnet
    chainName: "Ethereum",
    rpcUrl: `https://mainnet.infura.io/v3/${process.env.EXPO_PUBLIC_INFURA_API_KEY}`,
    explorerUrl: "https://etherscan.io",
    contractAddress: getOptionalEnvVar("EXPO_PUBLIC_CONTRACT_ADDRESS_MAINNET", ""),
  },
};

// Select active network based on dev mode
const activeNetwork = isDevMode
  ? networkConfig.development
  : networkConfig.production;

export const environment = {
  // Development Mode
  isDevMode,

  // WalletConnect Configuration
  walletConnectProjectId: getRequiredEnvVar(
    "EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID"
  ),

  // App Configuration
  appName: getRequiredEnvVar("EXPO_PUBLIC_APP_NAME"),
  appDescription: getRequiredEnvVar("EXPO_PUBLIC_APP_DESCRIPTION"),
  appUrl: getRequiredEnvVar("EXPO_PUBLIC_APP_URL"),
  appScheme: getRequiredEnvVar("EXPO_PUBLIC_APP_SCHEME"),

  // Blockchain Configuration (active network)
  network: activeNetwork,
  
  // Backward compatibility (deprecated - use environment.network instead)
  contractAddress: activeNetwork.contractAddress,
  infuraApiKey: getRequiredEnvVar("EXPO_PUBLIC_INFURA_API_KEY"),

  // Development flags
  isDevelopment: process.env.NODE_ENV === "development",
  isProduction: process.env.NODE_ENV === "production",
} as const;

export default environment;
