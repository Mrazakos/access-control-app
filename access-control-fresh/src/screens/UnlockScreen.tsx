import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function UnlockScreen() {
  const [isConnected, setIsConnected] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);

  const connectWallet = async () => {
    // TODO: Implement MetaMask connection
    Alert.alert("Connect Wallet", "This will connect to MetaMask");
    setIsConnected(true);
  };

  const startNFCUnlock = async () => {
    if (!isConnected) {
      Alert.alert(
        "Connect Wallet First",
        "Please connect your MetaMask wallet"
      );
      return;
    }

    setIsUnlocking(true);
    // TODO: Implement NFC unlock process
    Alert.alert("NFC Ready", "Tap your phone to the smart lock NFC reader");

    // Simulate unlock process
    setTimeout(() => {
      setIsUnlocking(false);
      Alert.alert("Success", "Door unlocked successfully!");
    }, 2000);
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
        <Text style={styles.walletAddress}>
          {isConnected ? "0x1234...5678" : "Connect to see address"}
        </Text>
      </View>

      {!isConnected && (
        <TouchableOpacity style={styles.connectButton} onPress={connectWallet}>
          <Text style={styles.buttonText}>Connect MetaMask Wallet</Text>
        </TouchableOpacity>
      )}

      <View style={styles.unlockContainer}>
        <TouchableOpacity
          style={[styles.unlockButton, !isConnected && styles.disabledButton]}
          onPress={startNFCUnlock}
          disabled={!isConnected || isUnlocking}
        >
          <Ionicons
            name={isUnlocking ? "hourglass" : "lock-open"}
            size={32}
            color="white"
          />
          <Text style={styles.unlockButtonText}>
            {isUnlocking ? "Unlocking..." : "NFC Unlock"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.instructionText}>
          {isConnected
            ? "Tap the button above, then hold your phone near the smart lock's NFC reader"
            : "Connect your wallet first to enable NFC unlock"}
        </Text>
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
  },
});
