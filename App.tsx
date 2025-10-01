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
