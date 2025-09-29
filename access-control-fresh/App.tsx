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
import {
  WALLETCONNECT_PROJECT_ID,
  APP_NAME,
  APP_DESCRIPTION,
  APP_URL,
} from "@env";
import React from "react";

const queryClient = new QueryClient();

const projectId = WALLETCONNECT_PROJECT_ID;

const metadata = {
  name: APP_NAME,
  description: APP_DESCRIPTION,
  url: APP_URL,
  icons: ["https://avatars.githubusercontent.com/u/179229932"],
  redirect: {
    native: "yourapp://",
    universal: "yourapp.com",
  },
};

const chains = [mainnet, sepolia] as const;

const wagmiConfig = defaultWagmiConfig({ chains, projectId, metadata });

createAppKit({
  projectId,
  metadata,
  wagmiConfig,
  defaultChain: sepolia,
  enableAnalytics: true,
});

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
