// Example usage of the useLockService hook in a React Native component

import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, TextInput, Alert } from "react-native";
import { useLock } from "../hooks/useLock";
import { useAccount } from "wagmi";

export const LockManagementExample = () => {
  const [lockName, setLockName] = useState("");
  const [lockDescription, setLockDescription] = useState("");
  const { address } = useAccount();

  const {
    // Local storage operations
    locks,
    isLoading,
    error,
    createLock,
    refreshLocks,
    deleteLock,

    // Blockchain operations
    registerLockOnChain,
    revokeSignatureOnChain,
    isTransactionPending,
    transactionHash,
    transactionError,
  } = useLock();

  useEffect(() => {
    // Load locks when component mounts
    refreshLocks();
  }, [refreshLocks]);

  const handleCreateLock = async () => {
    if (!address || !lockName.trim()) {
      Alert.alert("Error", "Please connect wallet and enter lock name");
      return;
    }

    try {
      // Create lock locally
      const newLock = await createLock({
        name: lockName.trim(),
        description: lockDescription.trim() || undefined,
      });

      // Register the lock's public key on the blockchain
      await registerLockOnChain({
        publicKey: newLock.publicKey,
      });

      Alert.alert(
        "Success",
        `Lock "${lockName}" created and registered on blockchain!`
      );
      setLockName("");
      setLockDescription("");
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to create lock"
      );
    }
  };

  const handleDeleteLock = async (lockId: number, lockName: string) => {
    Alert.alert(
      "Delete Lock",
      `Are you sure you want to delete "${lockName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteLock(lockId);
              Alert.alert("Success", "Lock deleted successfully");
            } catch (err) {
              Alert.alert("Error", "Failed to delete lock");
            }
          },
        },
      ]
    );
  };

  const handleRevokeSignature = async (lockId: number, signature: string) => {
    if (!address) {
      Alert.alert("Error", "Please connect your wallet");
      return;
    }

    try {
      await revokeSignatureOnChain({
        lockId,
        signature,
      });
      Alert.alert("Success", "Signature revoked on blockchain");
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Failed to revoke signature"
      );
    }
  };

  if (error) {
    return (
      <View style={{ padding: 20 }}>
        <Text style={{ color: "red" }}>Error: {error}</Text>
        <TouchableOpacity onPress={refreshLocks}>
          <Text>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 20 }}>
        Lock Management
      </Text>

      {/* Create Lock Form */}
      <View style={{ marginBottom: 30 }}>
        <Text style={{ fontSize: 18, marginBottom: 10 }}>Create New Lock</Text>

        <TextInput
          placeholder="Lock Name"
          value={lockName}
          onChangeText={setLockName}
          style={{
            borderWidth: 1,
            borderColor: "#ccc",
            padding: 10,
            marginBottom: 10,
            borderRadius: 5,
          }}
        />

        <TextInput
          placeholder="Description (optional)"
          value={lockDescription}
          onChangeText={setLockDescription}
          style={{
            borderWidth: 1,
            borderColor: "#ccc",
            padding: 10,
            marginBottom: 10,
            borderRadius: 5,
          }}
        />

        <TouchableOpacity
          onPress={handleCreateLock}
          disabled={isLoading || isTransactionPending}
          style={{
            backgroundColor:
              isLoading || isTransactionPending ? "#ccc" : "#007AFF",
            padding: 15,
            borderRadius: 5,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "white", fontWeight: "bold" }}>
            {isLoading || isTransactionPending ? "Creating..." : "Create Lock"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Transaction Status */}
      {transactionHash && (
        <View
          style={{ marginBottom: 20, padding: 10, backgroundColor: "#f0f0f0" }}
        >
          <Text>Transaction: {transactionHash}</Text>
          <Text>
            Status: {isTransactionPending ? "Pending..." : "Confirmed"}
          </Text>
        </View>
      )}

      {transactionError && (
        <View
          style={{ marginBottom: 20, padding: 10, backgroundColor: "#ffebee" }}
        >
          <Text style={{ color: "red" }}>
            Transaction Error: {transactionError}
          </Text>
        </View>
      )}

      {/* Locks List */}
      <Text style={{ fontSize: 18, marginBottom: 10 }}>
        Your Locks ({locks.length})
      </Text>

      {locks.map((lock) => (
        <View
          key={lock.id}
          style={{
            borderWidth: 1,
            borderColor: "#ddd",
            padding: 15,
            marginBottom: 10,
            borderRadius: 5,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "bold" }}>{lock.name}</Text>
          {lock.description && (
            <Text style={{ marginTop: 5, color: "#666" }}>
              {lock.description}
            </Text>
          )}
          <Text style={{ marginTop: 5, fontSize: 12, color: "#999" }}>
            ID: {lock.id} | Created:{" "}
            {new Date(lock.createdAt).toLocaleDateString()}
          </Text>
          <Text style={{ marginTop: 5, fontSize: 12, color: "#999" }}>
            Status: {lock.isActive ? "Active" : "Inactive"}
          </Text>

          <View style={{ flexDirection: "row", marginTop: 10 }}>
            <TouchableOpacity
              onPress={() => handleDeleteLock(lock.id, lock.name)}
              style={{
                backgroundColor: "#ff4444",
                padding: 8,
                borderRadius: 3,
                marginRight: 10,
              }}
            >
              <Text style={{ color: "white", fontSize: 12 }}>Delete</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                handleRevokeSignature(lock.id, "example-signature")
              }
              style={{
                backgroundColor: "#ff9800",
                padding: 8,
                borderRadius: 3,
              }}
            >
              <Text style={{ color: "white", fontSize: 12 }}>
                Revoke Signature
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <TouchableOpacity
        onPress={refreshLocks}
        style={{
          backgroundColor: "#28a745",
          padding: 15,
          borderRadius: 5,
          alignItems: "center",
          marginTop: 20,
        }}
      >
        <Text style={{ color: "white", fontWeight: "bold" }}>
          Refresh Locks
        </Text>
      </TouchableOpacity>
    </View>
  );
};
