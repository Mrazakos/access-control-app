import * as React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MainApp } from "./src/MainApp";
import { StyleSheet, Text, View, Pressable } from "react-native";
import {
  WalletConnectModal,
  useWalletConnectModal,
} from "@walletconnect/modal-react-native";

const projectId = "c924ddd7b59a1ba684e87d5ba27bb29c";

const providerMetaData = {
  name: "access-control",
  description: "handling smar locks",
  url: "https://example.com",
  icons: [],
  redirect: {
    native: "",
    universal: "",
  },
};
export default function App() {
  const { open, isConnected, address, provider } = useWalletConnectModal();

  const handleButtonPress = async () => {
    if (isConnected) {
      return provider?.disconnect();
    }
    return open();
  };
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>WalletConnect</Text>
        <Text style={styles.statusText}>
          {isConnected
            ? `Connected: ${address?.slice(0, 6)}...${address?.slice(-4)}`
            : "No wallet connected"}
        </Text>
        <Pressable style={styles.button} onPress={handleButtonPress}>
          <Text style={styles.buttonText}>
            {isConnected ? "Disconnect" : "Connect Wallet"}
          </Text>
        </Pressable>
      </View>
      <WalletConnectModal
        explorerRecommendedWalletIds={[
          "c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96",
        ]}
        explorerExcludedWalletIds={"ALL"}
        projectId={projectId}
        providerMetadata={providerMetaData}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 30,
  },
  statusText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 40,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#2563eb",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    minWidth: 200,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
});
