import "@walletconnect/react-native-compat";
import { WagmiProvider } from "wagmi";
import { mainnet, polygon, arbitrum } from "@wagmi/core/chains";
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

// 0. Setup queryClient
const queryClient = new QueryClient();

// 1. Get projectId at https://dashboard.reown.com
const projectId = WALLETCONNECT_PROJECT_ID;

// 2. Create config
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

const chains = [mainnet, polygon, arbitrum] as const;

const wagmiConfig = defaultWagmiConfig({ chains, projectId, metadata });

// 3. Create modal
createAppKit({
  projectId,
  metadata,
  wagmiConfig,
  defaultChain: mainnet, // Optional
  enableAnalytics: true, // Optional - defaults to your Cloud configuration
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
