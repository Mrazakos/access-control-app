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

export const environment = {
  // WalletConnect Configuration
  walletConnectProjectId: getRequiredEnvVar(
    "EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID"
  ),

  // App Configuration
  appName: getRequiredEnvVar("EXPO_PUBLIC_APP_NAME"),
  appDescription: getRequiredEnvVar("EXPO_PUBLIC_APP_DESCRIPTION"),
  appUrl: getRequiredEnvVar("EXPO_PUBLIC_APP_URL"),
  appScheme: getRequiredEnvVar("EXPO_PUBLIC_APP_SCHEME"),

  // Blockchain Configuration
  ethereumChainId: getRequiredEnvVar("EXPO_PUBLIC_ETHEREUM_CHAIN_ID"),
  infuraApiKey: getRequiredEnvVar("EXPO_PUBLIC_INFURA_API_KEY"),
  contractAddress: getRequiredEnvVar("EXPO_PUBLIC_CONTRACT_ADDRESS"),

  // Development flags
  isDevelopment: process.env.NODE_ENV === "development",
  isProduction: process.env.NODE_ENV === "production",
} as const;

export default environment;
