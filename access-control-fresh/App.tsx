import * as React from "react";
import { MainApp } from "./src/MainApp";
import { WalletConnectModal } from "@walletconnect/modal-react-native";
import {
  WALLETCONNECT_PROJECT_ID,
  APP_NAME,
  APP_DESCRIPTION,
  APP_URL,
  ETHEREUM_CHAIN_ID,
} from "@env";

const projectId = WALLETCONNECT_PROJECT_ID;

const providerMetaData = {
  name: APP_NAME,
  description: APP_DESCRIPTION,
  url: APP_URL,
  icons: [],
  redirect: {
    native: "",
    universal: "",
  },
};

export default function App() {
  const chains = [ETHEREUM_CHAIN_ID];

  return (
    <>
      <MainApp />
      <WalletConnectModal
        explorerRecommendedWalletIds={[
          "c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96",
        ]}
        projectId={projectId}
        providerMetadata={providerMetaData}
        sessionParams={{
          namespaces: {
            eip155: {
              methods: [
                "eth_sendTransaction",
                "eth_signTransaction",
                "eth_sign",
                "personal_sign",
                "eth_signTypedData",
              ],
              chains: chains,
              events: ["chainChanged", "accountsChanged"],
            },
          },
        }}
      />
    </>
  );
}
