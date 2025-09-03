import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useWallet } from "../hooks/useWallet";

export default function UnlockScreen() {
  const {
    isConnected,
    displayAddress,
    createDoorAuthToken,
    hasDoorAccess,
    unlockDoor,
    getDoorAccessTimeRemaining,
    clearDoorAccess,
  } = useWallet();
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isCreatingAuth, setIsCreatingAuth] = useState(false);

  const setupDoorAccess = async () => {
    setIsCreatingAuth(true);

    try {
      Alert.alert(
        "Setup Door Access",
        "Sign once to enable seamless door unlocking for 24 hours. You won't need to open MetaMask again today!",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Sign",
            onPress: async () => {
              const success = await createDoorAuthToken();
              if (success) {
                Alert.alert(
                  "Success!",
                  "Door access enabled! You can now unlock seamlessly."
                );
              } else {
                Alert.alert(
                  "Error",
                  "Failed to setup door access. Please try again."
                );
              }
            },
          },
        ]
      );
    } finally {
      setIsCreatingAuth(false);
    }
  };

  const handleQuickUnlock = async () => {
    if (!isConnected) {
      Alert.alert(
        "Wallet Not Connected",
        "Please connect your wallet using the button in the header"
      );
      return;
    }

    if (!hasDoorAccess()) {
      Alert.alert(
        "Door Access Not Setup",
        "Setup 24-hour door access for seamless unlocking",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Setup Access", onPress: setupDoorAccess },
        ]
      );
      return;
    }

    setIsUnlocking(true);

    try {
      // This doesn't open MetaMask - uses stored token!
      const success = await unlockDoor();

      if (success) {
        Alert.alert("NFC Ready", "Tap your phone to the smart lock NFC reader");

        // Simulate NFC unlock process
        setTimeout(() => {
          setIsUnlocking(false);
          Alert.alert("Success!", "🚪 Door unlocked successfully!");
        }, 1500);
      } else {
        setIsUnlocking(false);
        Alert.alert("Error", "Failed to unlock door. Please try again.");
      }
    } catch (error) {
      setIsUnlocking(false);
      console.error("Unlock error:", error);
      Alert.alert("Error", "Failed to unlock smart lock");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.statusContainer}>
        <Ionicons
          name={isConnected ? "wallet" : "wallet-outline"}
          size={64}
          color={isConnected ? "#10b981" : "#6b7280"}
        />
        <Text style={styles.statusText}>
          {isConnected ? "Wallet Connected" : "Wallet Not Connected"}
        </Text>
        <Text style={styles.walletAddress}>{displayAddress}</Text>

        {/* Door Access Status */}
        {isConnected && (
          <View style={styles.accessStatus}>
            <Ionicons
              name={hasDoorAccess() ? "checkmark-circle" : "time"}
              size={20}
              color={hasDoorAccess() ? "#10b981" : "#f59e0b"}
            />
            <Text
              style={[
                styles.accessText,
                hasDoorAccess() && styles.accessActive,
              ]}
            >
              {hasDoorAccess()
                ? `Door Access: ${getDoorAccessTimeRemaining()}`
                : "Door Access: Setup Required"}
            </Text>
          </View>
        )}
      </View>

      {/* Setup Door Access Button */}
      {isConnected && !hasDoorAccess() && (
        <TouchableOpacity
          style={styles.setupButton}
          onPress={setupDoorAccess}
          disabled={isCreatingAuth}
        >
          <Ionicons name="shield-checkmark" size={20} color="white" />
          <Text style={styles.setupButtonText}>
            {isCreatingAuth ? "Setting up..." : "Setup 24h Door Access"}
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.unlockContainer}>
        <TouchableOpacity
          style={[
            styles.unlockButton,
            !isConnected && styles.disabledButton,
            hasDoorAccess() && styles.seamlessButton,
          ]}
          onPress={handleQuickUnlock}
          disabled={!isConnected || isUnlocking}
        >
          <Ionicons
            name={
              isUnlocking
                ? "hourglass"
                : hasDoorAccess()
                ? "flash"
                : "lock-open"
            }
            size={32}
            color="white"
          />
          <Text style={styles.unlockButtonText}>
            {isUnlocking
              ? "Unlocking..."
              : hasDoorAccess()
              ? "Quick Unlock"
              : "Setup & Unlock"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.instructionText}>
          {isConnected
            ? hasDoorAccess()
              ? "Tap to unlock instantly! No MetaMask needed."
              : "Setup door access first for seamless unlocking"
            : "Connect your wallet first to enable door unlocking"}
        </Text>

        {/* Clear Access Button */}
        {hasDoorAccess() && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => {
              Alert.alert(
                "Clear Door Access",
                "This will remove your door access token. You'll need to sign again.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Clear",
                    style: "destructive",
                    onPress: clearDoorAccess,
                  },
                ]
              );
            }}
          >
            <Text style={styles.clearButtonText}>Clear Door Access</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
  },
  statusContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  statusText: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
  },
  walletAddress: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 12,
  },
  accessStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  accessText: {
    fontSize: 12,
    color: "#6b7280",
  },
  accessActive: {
    color: "#10b981",
    fontWeight: "600",
  },
  setupButton: {
    backgroundColor: "#8b5cf6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
  },
  setupButtonText: {
    color: "white",
    fontWeight: "600",
  },
  connectButton: {
    backgroundColor: "#f59e0b",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 40,
  },
  unlockContainer: {
    alignItems: "center",
  },
  unlockButton: {
    backgroundColor: "#2563eb",
    padding: 24,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  seamlessButton: {
    backgroundColor: "#10b981", // Green for seamless unlock
  },
  disabledButton: {
    backgroundColor: "#9ca3af",
  },
  unlockButtonText: {
    color: "white",
    fontWeight: "bold",
    marginTop: 8,
    textAlign: "center",
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  instructionText: {
    textAlign: "center",
    color: "#6b7280",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  clearButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  clearButtonText: {
    color: "#ef4444",
    fontSize: 12,
    textDecorationLine: "underline",
  },
});
