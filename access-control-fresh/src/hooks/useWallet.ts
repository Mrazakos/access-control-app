import { useWalletConnectModal } from "@walletconnect/modal-react-native";
import {
  WalletService,
  WalletConnection,
  SignMessageResult,
} from "../services/WalletService";
import { useMemo, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Enhanced wallet hook that combines WalletConnect with our service layer
 */
export const useWallet = () => {
  const { open, isConnected, address, provider } = useWalletConnectModal();
  const walletService = WalletService.getInstance();
  const [doorAuthToken, setDoorAuthToken] = useState<string | null>(null);
  const [tokenExpiry, setTokenExpiry] = useState<number | null>(null);

  // Create a connection object that our service can use
  const connection: WalletConnection = useMemo(
    () => ({
      isConnected,
      address: address || null,
      provider,
    }),
    [isConnected, address, provider]
  );

  // Update the service with current connection state whenever it changes
  useEffect(() => {
    walletService.updateConnection(connection);
  }, [walletService, connection]);


  return {
    // Connection state
    isConnected,
    address,
    provider,

    // UI helpers
    displayAddress: address
      ? `${address.slice(0, 6)}...${address.slice(-4)}`
      : "Not connected",
    connectionStatus: isConnected ? "connected" : ("disconnected" as const),

    // Actions
    connect: open,
    disconnect: () => provider?.disconnect(),

    formatAddress: (format: "short" | "medium" | "full" = "short"): string => {
      return walletService.formatAddress(address || null, format);
    },
  };
};
