import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import { useLock } from "../hooks/useLock";
import { useAccount } from "wagmi";

const SimpleLockCreator: React.FC = () => {
  const { address, isConnected } = useAccount();
  const {
    // ✨ This is all you need!
    createAndRegisterLock,
    locks,
    isLoading,
    isTransactionPending,
    transactionHash,
    error,
    transactionError,

    // Some useful reactive data
    totalLocksOnChain,
    isContractPaused,
  } = useLock();

  const [lockName, setLockName] = useState("");
  const [lockDescription, setLockDescription] = useState("");

  const handleCreateLock = async () => {
    if (!lockName.trim()) {
      Alert.alert("Error", "Please enter a lock name");
      return;
    }

    try {
      // 🎉 ONE FUNCTION CALL DOES EVERYTHING!
      // - Generates crypto keys
      // - Saves to AsyncStorage
      // - Registers on blockchain
      // - Updates UI automatically
      await createAndRegisterLock({
        name: lockName,
        description: lockDescription || undefined,
      });

      Alert.alert(
        "Success! 🎉",
        "Lock created locally and registration submitted to blockchain!\n\nThe transaction will be confirmed automatically."
      );

      // Clear form
      setLockName("");
      setLockDescription("");
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to create lock"
      );
    }
  };

  if (!isConnected) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>🔐 Simple Lock Creator</Text>
        <Text style={styles.subtitle}>Please connect your wallet first</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🔐 Simple Lock Creator</Text>
      <Text style={styles.subtitle}>
        Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
      </Text>

      {/* Contract Status */}
      <View style={styles.statusCard}>
        <Text style={styles.statusTitle}>📊 Contract Status</Text>
        <Text style={styles.statusText}>
          Total locks on chain: {totalLocksOnChain || 0}
        </Text>
        <Text
          style={[
            styles.statusText,
            {
              color: isContractPaused ? "#FF6B6B" : "#4ECDC4",
            },
          ]}
        >
          Contract status: {isContractPaused ? "Paused ⏸️" : "Active ✅"}
        </Text>
      </View>

      {/* Lock Creation Form */}
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Create New Lock</Text>

        <Text style={styles.label}>Lock Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Front Door, Office Lock"
          value={lockName}
          onChangeText={setLockName}
          editable={!isLoading && !isTransactionPending}
        />

        <Text style={styles.label}>Description (optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="e.g., Main entrance to the building"
          value={lockDescription}
          onChangeText={setLockDescription}
          multiline
          numberOfLines={3}
          editable={!isLoading && !isTransactionPending}
        />

        <TouchableOpacity
          style={[
            styles.createButton,
            (isLoading || isTransactionPending) && styles.buttonDisabled,
          ]}
          onPress={handleCreateLock}
          disabled={isLoading || isTransactionPending}
        >
          <Text style={styles.buttonText}>
            {isLoading
              ? "🔐 Creating Lock..."
              : isTransactionPending
              ? "⚡ Registering on Blockchain..."
              : "✨ Create & Register Lock"}
          </Text>
        </TouchableOpacity>

        {/* Status Messages */}
        {isTransactionPending && (
          <View style={styles.statusMessage}>
            <Text style={styles.pendingText}>
              ⏳ Transaction is being confirmed...
            </Text>
          </View>
        )}

        {transactionHash && (
          <View style={styles.statusMessage}>
            <Text style={styles.txHashLabel}>Transaction Hash:</Text>
            <Text style={styles.txHash}>{transactionHash}</Text>
          </View>
        )}

        {(error || transactionError) && (
          <View style={styles.errorMessage}>
            <Text style={styles.errorText}>❌ {error || transactionError}</Text>
          </View>
        )}
      </View>

      {/* Your Locks */}
      <View style={styles.locksCard}>
        <Text style={styles.formTitle}>Your Locks ({locks.length})</Text>
        {locks.length === 0 ? (
          <Text style={styles.noLocksText}>No locks created yet</Text>
        ) : (
          locks.map((lock, index) => (
            <View key={lock.id} style={styles.lockItem}>
              <Text style={styles.lockName}>🔐 {lock.name}</Text>
              <Text style={styles.lockDetail}>ID: {lock.id}</Text>
              <Text style={styles.lockDetail}>
                Created: {new Date(lock.createdAt).toLocaleDateString()}
              </Text>
              {lock.description && (
                <Text style={styles.lockDescription}>{lock.description}</Text>
              )}
            </View>
          ))
        )}
      </View>

      {/* How it Works */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>How it works:</Text>
        <Text style={styles.infoText}>
          1. 🔑 Generates cryptographic keys locally{"\n"}
          2. 💾 Saves lock to your device storage{"\n"}
          3. ⚡ Registers public key on blockchain{"\n"}
          4. ✅ Updates UI automatically
        </Text>
        <Text style={styles.infoNote}>
          💡 Your private keys never leave your device!
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
    color: "#2c3e50",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    color: "#7f8c8d",
    marginBottom: 20,
  },
  statusCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    color: "#5d6d7e",
    marginBottom: 4,
  },
  formCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#34495e",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#bdc3c7",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
    marginBottom: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  createButton: {
    backgroundColor: "#3498db",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: "#95a5a6",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  statusMessage: {
    backgroundColor: "#e8f4f8",
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  pendingText: {
    color: "#2980b9",
    textAlign: "center",
    fontSize: 14,
  },
  txHashLabel: {
    fontSize: 12,
    color: "#7f8c8d",
    marginBottom: 4,
  },
  txHash: {
    fontSize: 10,
    fontFamily: "monospace",
    color: "#2980b9",
    backgroundColor: "#ecf0f1",
    padding: 8,
    borderRadius: 4,
  },
  errorMessage: {
    backgroundColor: "#fadbd8",
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  errorText: {
    color: "#c0392b",
    fontSize: 14,
  },
  locksCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noLocksText: {
    color: "#7f8c8d",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 8,
  },
  lockItem: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  lockName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 4,
  },
  lockDetail: {
    fontSize: 12,
    color: "#7f8c8d",
    marginBottom: 2,
  },
  lockDescription: {
    fontSize: 14,
    color: "#5d6d7e",
    marginTop: 4,
    fontStyle: "italic",
  },
  infoCard: {
    backgroundColor: "#e8f5e8",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#27ae60",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#2d5a3d",
    lineHeight: 20,
    marginBottom: 8,
  },
  infoNote: {
    fontSize: 12,
    color: "#27ae60",
    fontWeight: "600",
    textAlign: "center",
  },
});

export default SimpleLockCreator;
