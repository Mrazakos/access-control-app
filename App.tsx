import "@walletconnect/react-native-compat";
import { WagmiProvider } from "wagmi";
import { mainnet, sepolia } from "@wagmi/core/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createAppKit,
  defaultWagmiConfig,
  AppKit,
} from "@reown/appkit-wagmi-react-native";
import { MainApp } from "./src/MainApp";
import { environment } from "./src/config/environment";
import React from "react";

const queryClient = new QueryClient();

// Global flag to prevent multiple WalletConnect initializations
declare global {
  var __WALLETCONNECT_INITIALIZED__: boolean | undefined;
}

const projectId = environment.walletConnectProjectId;

const metadata = {
  name: environment.appName,
  description: environment.appDescription,
  url: environment.appUrl,
  icons: ["https://avatars.githubusercontent.com/u/179229932"],
  redirect: {
    native: "yourapp://",
    universal: "yourapp.com",
  },
};

const chains = [mainnet, sepolia] as const;

const wagmiConfig = defaultWagmiConfig({ chains, projectId, metadata });

// Initialize AppKit only once globally
if (!global.__WALLETCONNECT_INITIALIZED__) {
  try {
    createAppKit({
      projectId,
      metadata,
      wagmiConfig,
      defaultChain: sepolia,
      enableAnalytics: true,
      themeMode: "dark",
    });
    global.__WALLETCONNECT_INITIALIZED__ = true;
    console.log("✅ WalletConnect AppKit initialized");
  } catch (error) {
    console.warn("⚠️ WalletConnect initialization error:", error);
  }
} else {
  console.log("🔄 WalletConnect already initialized, skipping...");
}

export default function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <MainApp />
        <AppKit />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
