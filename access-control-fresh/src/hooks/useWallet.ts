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

  // Load existing door auth token on mount
  useEffect(() => {
    const loadDoorAuth = async () => {
      try {
        const token = await AsyncStorage.getItem("door_auth_token");
        const expiry = await AsyncStorage.getItem("door_auth_expiry");

        if (token && expiry && Date.now() < parseInt(expiry)) {
          setDoorAuthToken(token);
          setTokenExpiry(parseInt(expiry));
        } else {
          // Clear expired token
          await AsyncStorage.multiRemove([
            "door_auth_token",
            "door_auth_expiry",
          ]);
        }
      } catch (error) {
        console.error("Failed to load door auth:", error);
      }
    };

    if (isConnected) {
      loadDoorAuth();
    }
  }, [isConnected]);

  /**
   * Create a long-lived door access token (24 hours)
   * User signs once per day for door access
   */
  const createDoorAuthToken = async (): Promise<boolean> => {
    if (!isConnected || !address) return false;

    try {
      const expiryTime = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
      const authMessage = JSON.stringify({
        purpose: "door_access",
        address,
        timestamp: Date.now(),
        expires: expiryTime,
        permissions: ["unlock", "lock", "status"],
      });

      const result = await walletService.signMessage(authMessage);

      if (result.success && result.signature) {
        const token = Buffer.from(
          JSON.stringify({
            signature: result.signature,
            message: authMessage,
            address,
          })
        ).toString("base64");

        // Store token locally
        await AsyncStorage.setItem("door_auth_token", token);
        await AsyncStorage.setItem("door_auth_expiry", expiryTime.toString());

        setDoorAuthToken(token);
        setTokenExpiry(expiryTime);

        return true;
      }
    } catch (error) {
      console.error("Failed to create door auth token:", error);
    }

    return false;
  };

  /**
   * Check if we have a valid door auth token
   */
  const hasDoorAccess = (): boolean => {
    return (
      doorAuthToken !== null && tokenExpiry !== null && Date.now() < tokenExpiry
    );
  };

  /**
   * Unlock door using existing token (no MetaMask needed!)
   */
  const unlockDoor = async (): Promise<boolean> => {
    if (!hasDoorAccess()) {
      console.log("No valid door access token");
      return false;
    }

    try {
      // Create unlock command with token
      const unlockCommand = {
        action: "unlock",
        token: doorAuthToken,
        timestamp: Date.now(),
        device: "smart-lock-001",
      };

      console.log("Unlocking door with token:", unlockCommand);

      // TODO: Send to NFC/Bluetooth/WiFi module
      // For now, just simulate success
      return true;
    } catch (error) {
      console.error("Door unlock failed:", error);
      return false;
    }
  };

  /**
   * Get time remaining on door access token
   */
  const getDoorAccessTimeRemaining = (): string => {
    if (!tokenExpiry) return "No access";

    const remaining = tokenExpiry - Date.now();
    if (remaining <= 0) return "Expired";

    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else {
      return `${minutes}m remaining`;
    }
  };

  /**
   * Clear door access token
   */
  const clearDoorAccess = async (): Promise<void> => {
    try {
      await AsyncStorage.multiRemove(["door_auth_token", "door_auth_expiry"]);
      setDoorAuthToken(null);
      setTokenExpiry(null);
    } catch (error) {
      console.error("Failed to clear door access:", error);
    }
  };

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

    // Door-specific methods (seamless experience)
    createDoorAuthToken,
    hasDoorAccess,
    unlockDoor,
    getDoorAccessTimeRemaining,
    clearDoorAccess,

    // Original service methods (for other use cases)
    signMessage: async (message: string): Promise<SignMessageResult> => {
      return await walletService.signMessage(message);
    },

    createUnlockSignature: async (): Promise<SignMessageResult> => {
      return await walletService.createUnlockSignature();
    },

    formatAddress: (format: "short" | "medium" | "full" = "short"): string => {
      return walletService.formatAddress(address || null, format);
    },
  };
};
