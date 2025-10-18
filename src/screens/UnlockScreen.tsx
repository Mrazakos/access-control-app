import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StatusBar,
  Modal,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { CameraView, Camera } from "expo-camera";
import { useCustomAlert } from "../components/CustomAlert";
import {
  AccessCredential,
  QrCodeCredential,
  useVerifiableCredentials,
} from "../hooks/useVerifiableCredentials";
import { useCall } from "wagmi";
import { AccessControl } from "../typechain-types";

export default function UnlockScreen() {
  const {
    accessCredentials,
    filteredAccessCredentials,
    searchQuery,
    setSearchQuery,
    isCredentialExpired,
    deleteAccessCredential,
    refreshAccessCredentials,
    receiveAccessCredential,
  } = useVerifiableCredentials();
  const { showAlert, AlertComponent } = useCustomAlert();
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);

  // Refresh credentials every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log("🔄 UnlockScreen focused - refreshing access credentials...");
      refreshAccessCredentials();
    }, [refreshAccessCredentials])
  );

  // Request camera permissions
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  const handleOpenQrScanner = () => {
    if (hasPermission === null) {
      showAlert({
        title: "Camera Permission",
        message: "Requesting camera permission...",
        icon: "camera",
        iconColor: "#4285f4",
        buttons: [{ text: "OK", style: "default" }],
      });
      return;
    }

    if (hasPermission === false) {
      showAlert({
        title: "Camera Permission Denied",
        message:
          "Please enable camera access in your device settings to scan QR codes.",
        icon: "warning",
        iconColor: "#ea4335",
        buttons: [{ text: "OK", style: "default" }],
      });
      return;
    }

    setScanned(false);
    setShowQrScanner(true);
  };

  const handleCloseQrScanner = () => {
    setShowQrScanner(false);
    setScanned(false);
  };

  const handleBarCodeScanned = async ({
    data,
  }: {
    type: string;
    data: string;
  }) => {
    if (scanned) return;

    setScanned(true);

    try {
      // Parse the QR code data
      const credential = JSON.parse(data) as QrCodeCredential;

      // Validate that it's a proper credential object
      if (!credential.id || !credential.lockId || !credential.signature) {
        throw new Error("Invalid QR code format");
      }

      // Try to receive the credential
      await receiveAccessCredential(credential);

      // Show success alert
      showAlert({
        title: "Success",
        message: `Access credential for ${
          credential.lockNickname || "Lock"
        } has been added successfully!`,
        icon: "checkmark-circle",
        iconColor: "#34a853",
        buttons: [
          {
            text: "OK",
            style: "default",
            onPress: () => {
              handleCloseQrScanner();
              refreshAccessCredentials();
            },
          },
        ],
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Invalid QR code";

      showAlert({
        title: "Error",
        message: errorMessage,
        icon: "close-circle",
        iconColor: "#ea4335",
        buttons: [
          {
            text: "Try Again",
            style: "default",
            onPress: () => setScanned(false),
          },
          {
            text: "Cancel",
            style: "cancel",
            onPress: handleCloseQrScanner,
          },
        ],
      });
    }
  };

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
      <StatusBar backgroundColor="#1f1f1f" barStyle="light-content" />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color="#9aa0a6"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by lock"
          placeholderTextColor="#9aa0a6"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={20} color="#9aa0a6" />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={handleOpenQrScanner}
          style={styles.qrButton}
          accessibilityRole="button"
          accessibilityLabel="Scan QR code to add access credential"
        >
          <Ionicons name="qr-code" size={20} color="#34a853" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => refreshAccessCredentials()}
          style={styles.refreshButton}
        >
          <Ionicons name="refresh" size={20} color="#4285f4" />
        </TouchableOpacity>
      </View>

      {/* Credentials List */}
      <ScrollView
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      >
        {filteredAccessCredentials.length === 0 ? (
          <View style={styles.emptyContainer}>
            {searchQuery.trim() ? (
              <>
                <Ionicons name="search" size={48} color="#666" />
                <Text style={styles.emptyText}>
                  No credentials match your search
                </Text>
                <Text style={styles.emptySubtext}>
                  Try searching with different terms
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="key-outline" size={48} color="#666" />
                <Text style={styles.emptyText}>
                  No access credentials found
                </Text>
                <Text style={styles.emptySubtext}>
                  Received credentials will appear here
                </Text>
              </>
            )}
          </View>
        ) : (
          filteredAccessCredentials.map((cred) => (
            <View
              key={cred.id}
              style={[
                styles.credentialCard,
                isCredentialExpired(cred) && styles.cardExpired,
              ]}
            >
              {/* Main Info */}
              <View style={styles.cardHeader}>
                <View style={styles.lockIconContainer}>
                  <Ionicons
                    name={isCredentialExpired(cred) ? "lock-closed" : "key"}
                    size={20}
                    color={isCredentialExpired(cred) ? "#ea4335" : "#4285f4"}
                  />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.lockName} numberOfLines={1}>
                    Lock: {cred.lockNickname || `Unnamed Lock`}
                  </Text>
                  <Text style={styles.lockId}>Lock ID: {cred.lockId}</Text>
                  <View style={styles.expirationContainer}>
                    <Ionicons name="time-outline" size={14} color="#9aa0a6" />
                    <Text style={styles.expirationText}>
                      {cred.expirationDate
                        ? `Expires ${new Date(
                            cred.expirationDate
                          ).toLocaleDateString("en-us", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}`
                        : "No expiry"}
                    </Text>
                  </View>
                </View>
                {isCredentialExpired(cred) && (
                  <View style={styles.expiredBadge}>
                    <Text style={styles.expiredBadgeText}>EXPIRED</Text>
                  </View>
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.unlockButton,
                    (unlockingId === cred.id || isCredentialExpired(cred)) &&
                      styles.buttonDisabled,
                  ]}
                  onPress={() => handleUnlock(cred.id || "")}
                  disabled={
                    unlockingId === cred.id || isCredentialExpired(cred)
                  }
                >
                  <Ionicons
                    name={
                      unlockingId === cred.id
                        ? "hourglass"
                        : "lock-open-outline"
                    }
                    size={16}
                    color="#fff"
                  />
                  <Text style={styles.actionButtonText}>
                    {unlockingId === cred.id ? "Unlocking..." : "Unlock"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDelete(cred.id || "")}
                >
                  <Ionicons name="trash-outline" size={14} color="#ea4335" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* QR Code Scanner Modal */}
      <Modal
        visible={showQrScanner}
        animationType="slide"
        onRequestClose={handleCloseQrScanner}
        transparent={true}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Scan QR Code</Text>
              <TouchableOpacity
                onPress={handleCloseQrScanner}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.cameraContainer}>
              {hasPermission === null ? (
                <View style={styles.permissionContainer}>
                  <Ionicons name="camera" size={48} color="#9aa0a6" />
                  <Text style={styles.permissionText}>
                    Requesting camera permission...
                  </Text>
                </View>
              ) : hasPermission === false ? (
                <View style={styles.permissionContainer}>
                  <Ionicons name="warning" size={48} color="#ea4335" />
                  <Text style={styles.permissionText}>
                    Camera permission denied
                  </Text>
                  <Text style={styles.permissionSubtext}>
                    Please enable camera access in your device settings
                  </Text>
                </View>
              ) : (
                <CameraView
                  style={styles.camera}
                  facing="back"
                  onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                  barcodeScannerSettings={{
                    barcodeTypes: ["qr"],
                  }}
                >
                  <View style={styles.scannerOverlay}>
                    <View style={styles.scannerFrame} />
                    <Text style={styles.scannerText}>
                      {scanned ? "Processing..." : "Align QR code within frame"}
                    </Text>
                  </View>
                </CameraView>
              )}
            </View>

            <View style={styles.modalFooter}>
              <Text style={styles.footerText}>
                Scan the QR code provided by the lock owner to gain access
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      <AlertComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1f1f1f",
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2a2d32",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#3c4043",
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    fontWeight: "400",
  },
  qrButton: {
    marginLeft: 12,
    padding: 4,
  },
  refreshButton: {
    marginLeft: 12,
    padding: 4,
  },
  listContainer: {
    paddingBottom: 32,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyText: {
    color: "#9aa0a6",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    color: "#666",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  credentialCard: {
    backgroundColor: "#2a2d32",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#3c4043",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardExpired: {
    opacity: 0.6,
    borderColor: "#ea4335",
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  lockIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#3c4043",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  lockName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 2,
  },
  lockId: {
    fontSize: 12,
    color: "#9aa0a6",
    fontWeight: "500",
    marginBottom: 4,
  },
  expiredBadge: {
    backgroundColor: "#ea4335",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  expiredBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  expirationContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  expirationText: {
    fontSize: 12,
    color: "#9aa0a6",
    marginLeft: 4,
    fontWeight: "500",
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  unlockButton: {
    backgroundColor: "#4285f4",
    flex: 1,
    marginRight: 8,
  },
  deleteButton: {
    backgroundColor: "#2a2d32",
    borderWidth: 1,
    borderColor: "#ea4335",
    width: 40,
    height: 40,
    paddingHorizontal: 0,
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 6,
    fontSize: 14,
  },
  // QR Scanner Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    height: "90%",
    backgroundColor: "#1f1f1f",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#2a2d32",
    borderBottomWidth: 1,
    borderBottomColor: "#3c4043",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },
  closeButton: {
    padding: 4,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    backgroundColor: "#1f1f1f",
  },
  permissionText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 16,
  },
  permissionSubtext: {
    color: "#9aa0a6",
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  scannerOverlay: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  scannerFrame: {
    width: 300,
    height: 300,
    borderWidth: 3,
    borderColor: "#34a853",
    borderRadius: 16,
    backgroundColor: "transparent",
  },
  scannerText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 24,
    paddingHorizontal: 32,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingVertical: 12,
    borderRadius: 8,
  },
  modalFooter: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: "#2a2d32",
    borderTopWidth: 1,
    borderTopColor: "#3c4043",
  },
  footerText: {
    color: "#9aa0a6",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
