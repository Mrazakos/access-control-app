import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCustomAlert } from "../components/CustomAlert";
import { useVerifiableCredentials } from "../hooks/useVerifiableCredentials";

export default function UnlockScreen() {
  const { accessCredentials, isCredentialExpired, deleteAccessCredential } =
    useVerifiableCredentials();
  const { showAlert, AlertComponent } = useCustomAlert();
  const [unlockingId, setUnlockingId] = useState<string | null>(null);

  const handleUnlock = async (credentialId: string) => {
    setUnlockingId(credentialId);
    // TODO: Implement actual unlock logic here
    setTimeout(() => setUnlockingId(null), 1200); // Simulate unlock
  };

  const handleDelete = (credentialId: string) => {
    showAlert({
      title: "Delete Access Credential",
      message:
        "Are you sure you want to delete this access credential? This action cannot be undone.",
      icon: "trash",
      iconColor: "#ea4335",
      buttons: [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteAccessCredential(credentialId);
          },
        },
      ],
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🚪 Access Credentials</Text>
      <ScrollView contentContainerStyle={styles.listContainer}>
        {accessCredentials.length === 0 ? (
          <Text style={styles.emptyText}>No access credentials found.</Text>
        ) : (
          accessCredentials.map((cred) => (
            <View
              key={cred.id}
              style={[
                styles.card,
                isCredentialExpired(cred) && styles.cardExpired,
              ]}
            >
              <View style={styles.cardHeader}>
                <Ionicons
                  name="key"
                  size={24}
                  color="#4285f4"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.lockText}>
                  Lock #{cred.lockId} ({cred.lockNickname})
                </Text>
              </View>
              <Text style={styles.credId}>ID: {cred.id}</Text>
              <Text style={styles.hashText}>
                Hash: {cred.userMetaDataHash?.substring(0, 20)}...
              </Text>
              <Text style={styles.dateText}>
                Expires:{" "}
                {cred.expirationDate
                  ? new Date(cred.expirationDate).toLocaleDateString()
                  : "Never"}
              </Text>
              {isCredentialExpired(cred) && (
                <Text style={styles.expiredText}>Expired</Text>
              )}
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.unlockButton,
                    unlockingId === cred.id && styles.buttonLoading,
                  ]}
                  onPress={() => handleUnlock(cred.id || "")}
                  disabled={
                    unlockingId === cred.id || isCredentialExpired(cred)
                  }
                >
                  <Ionicons
                    name={unlockingId === cred.id ? "hourglass" : "lock-open"}
                    size={18}
                    color="#fff"
                  />
                  <Text style={styles.buttonText}>
                    {unlockingId === cred.id ? "Unlocking..." : "Unlock"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.deleteButton]}
                  onPress={() => handleDelete(cred.id || "")}
                >
                  <Ionicons name="trash" size={18} color="#fff" />
                  <Text style={styles.buttonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
      <AlertComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1f1f1f",
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 16,
    textAlign: "center",
  },
  listContainer: {
    paddingBottom: 32,
  },
  emptyText: {
    color: "#aaa",
    textAlign: "center",
    marginTop: 32,
    fontStyle: "italic",
  },
  card: {
    backgroundColor: "#23272a",
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  cardExpired: {
    opacity: 0.5,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  lockText: {
    fontWeight: "600",
    color: "#fff",
    fontSize: 16,
  },
  credId: {
    fontSize: 12,
    color: "#bbb",
    marginBottom: 2,
    fontFamily: "monospace",
  },
  hashText: {
    fontSize: 13,
    color: "#9aa0a6",
    marginBottom: 2,
  },
  dateText: {
    fontSize: 13,
    color: "#9aa0a6",
    marginBottom: 2,
  },
  expiredText: {
    color: "#ea4335",
    fontWeight: "bold",
    fontSize: 13,
    marginTop: 2,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
    gap: 10,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 8,
  },
  unlockButton: {
    backgroundColor: "#4285f4",
  },
  buttonLoading: {
    opacity: 0.7,
  },
  deleteButton: {
    backgroundColor: "#ea4335",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 6,
    fontSize: 15,
  },
});
