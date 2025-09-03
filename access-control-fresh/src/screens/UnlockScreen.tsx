import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useWallet } from "../hooks/useWallet";
import { useCustomAlert } from "../components/CustomAlert";

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
  const { showAlert, AlertComponent } = useCustomAlert();

  const setupDoorAccess = async () => {
    setIsCreatingAuth(true);

    try {
      showAlert({
        title: "Setup Door Access",
        message:
          "Sign once to enable seamless door unlocking for 24 hours. You won't need to open MetaMask again today!",
        icon: "shield-checkmark",
        iconColor: "#4285f4",
        buttons: [
          { text: "Cancel", style: "cancel" },
          {
            text: "Sign",
            onPress: async () => {
              const success = await createDoorAuthToken();
              if (success) {
                showAlert({
                  title: "Success!",
                  message:
                    "Door access enabled! You can now unlock seamlessly.",
                  icon: "checkmark-circle",
                  iconColor: "#34a853",
                  buttons: [{ text: "OK" }],
                });
              } else {
                showAlert({
                  title: "Error",
                  message: "Failed to setup door access. Please try again.",
                  icon: "warning",
                  iconColor: "#ea4335",
                  buttons: [{ text: "OK" }],
                });
              }
            },
          },
        ],
      });
    } finally {
      setIsCreatingAuth(false);
    }
  };

  const handleQuickUnlock = async () => {
    if (!isConnected) {
      showAlert({
        title: "Wallet Not Connected",
        message: "Please connect your wallet using the button in the header",
        icon: "wallet-outline",
        iconColor: "#ea4335",
        buttons: [{ text: "OK" }],
      });
      return;
    }

    if (!hasDoorAccess()) {
      showAlert({
        title: "Door Access Not Setup",
        message: "Setup 24-hour door access for seamless unlocking",
        icon: "time",
        iconColor: "#fbbc04",
        buttons: [
          { text: "Cancel", style: "cancel" },
          { text: "Setup Access", onPress: setupDoorAccess },
        ],
      });
      return;
    }

    setIsUnlocking(true);

    try {
      // This doesn't open MetaMask - uses stored token!
      const success = await unlockDoor();

      if (success) {
        showAlert({
          title: "NFC Ready",
          message: "Tap your phone to the smart lock NFC reader",
          icon: "radio",
          iconColor: "#4285f4",
          buttons: [{ text: "OK" }],
        });

        // Simulate NFC unlock process
        setTimeout(() => {
          setIsUnlocking(false);
          showAlert({
            title: "Success!",
            message: "🚪 Door unlocked successfully!",
            icon: "checkmark-circle",
            iconColor: "#34a853",
            buttons: [{ text: "Great!" }],
          });
        }, 1500);
      } else {
        setIsUnlocking(false);
        showAlert({
          title: "Error",
          message: "Failed to unlock door. Please try again.",
          icon: "warning",
          iconColor: "#ea4335",
          buttons: [{ text: "OK" }],
        });
      }
    } catch (error) {
      setIsUnlocking(false);
      console.error("Unlock error:", error);
      showAlert({
        title: "Error",
        message: "Failed to unlock smart lock",
        icon: "warning",
        iconColor: "#ea4335",
        buttons: [{ text: "OK" }],
      });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.statusContainer}>
        <Ionicons
          name={isConnected ? "wallet" : "wallet-outline"}
          size={64}
          color={isConnected ? "#34a853" : "#9aa0a6"}
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
              color={hasDoorAccess() ? "#34a853" : "#fbbc04"}
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
              showAlert({
                title: "Clear Door Access",
                message:
                  "This will remove your door access token. You'll need to sign again.",
                icon: "trash",
                iconColor: "#ea4335",
                buttons: [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Clear",
                    style: "destructive",
                    onPress: clearDoorAccess,
                  },
                ],
              });
            }}
          >
            <Text style={styles.clearButtonText}>Clear Door Access</Text>
          </TouchableOpacity>
        )}
      </View>

      <AlertComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#1f1f1f", // Google Dark Background
  },
  statusContainer: {
    alignItems: "center",
    marginBottom: 48,
    backgroundColor: "#202124", // Google Dark Surface
    padding: 32,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  statusText: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
    color: "#ffffff",
    letterSpacing: 0.5,
  },
  walletAddress: {
    fontSize: 14,
    color: "#9aa0a6",
    marginBottom: 16,
    fontFamily: "monospace",
  },
  accessStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    backgroundColor: "#2d2f31",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  accessText: {
    fontSize: 13,
    color: "#9aa0a6",
    fontWeight: "500",
  },
  accessActive: {
    color: "#34a853", // Google Green
    fontWeight: "600",
  },
  setupButton: {
    backgroundColor: "#4285f4", // Google Blue
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 28,
    marginBottom: 24,
    gap: 12,
    shadowColor: "#4285f4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  setupButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 16,
    letterSpacing: 0.5,
  },
  unlockContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  unlockButton: {
    backgroundColor: "#4285f4", // Google Blue
    padding: 32,
    borderRadius: 75,
    alignItems: "center",
    justifyContent: "center",
    width: 150,
    height: 150,
    marginBottom: 32,
    shadowColor: "#4285f4",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 15,
  },
  seamlessButton: {
    backgroundColor: "#34a853", // Google Green for seamless unlock
    shadowColor: "#34a853",
  },
  disabledButton: {
    backgroundColor: "#3c4043",
    shadowColor: "#000",
    shadowOpacity: 0.2,
  },
  unlockButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
    marginTop: 12,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  instructionText: {
    textAlign: "center",
    color: "#9aa0a6",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
    marginHorizontal: 24,
    fontWeight: "400",
  },
  clearButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: "#2d2f31",
    borderRadius: 20,
    marginTop: 16,
  },
  clearButtonText: {
    color: "#ea4335", // Google Red
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.3,
  },
});
