import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import { useCustomAlert } from "../components/CustomAlert";
import {
  useVerifiableCredentials,
  CredentialRequest,
  IssuedCredential,
  CredentialType,
  QrCodeCredential,
} from "../hooks/useVerifiableCredentials";
import { Lock } from "../services/LockService";
import { UserMetaData } from "../types/types";

interface VerifiableCredentialsScreenProps {
  lock: Lock;
  onBack: () => void;
}

export default function VerifiableCredentialsScreen({
  lock,
  onBack,
}: VerifiableCredentialsScreenProps) {
  const {
    issuedCredentials,
    issueCredential,
    getIssuedCredentialsByLockId,
    isLoading,
    error,
    revokeIssuedCredential,
  } = useVerifiableCredentials();

  const { showAlert, AlertComponent } = useCustomAlert();

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<{
    email: string;
    name: string;
    validUntil: string;
  }>({
    email: "",
    name: "",
    validUntil: "",
  });

  // Share modal states
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedCredential, setSelectedCredential] =
    useState<IssuedCredential | null>(null);
  const [qrValue, setQrValue] = useState<string>("");
  const [qrExpiresAt, setQrExpiresAt] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const qrCodeRef = useRef<View>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Filter credentials for this specific lock
  const [lockCredentials, setLockCredentials] = useState<IssuedCredential[]>(
    []
  );

  useEffect(() => {
    loadCredentials();
  }, [lock.id, issuedCredentials]);

  // Timer effect for QR code expiration countdown
  useEffect(() => {
    if (showShareModal && qrExpiresAt) {
      // Start countdown timer
      timerRef.current = setInterval(() => {
        const now = new Date();
        const remaining = Math.floor(
          (qrExpiresAt.getTime() - now.getTime()) / 1000
        );

        if (remaining <= 0) {
          // QR code expired
          setTimeRemaining(0);
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          setShowShareModal(false);
          showAlert({
            title: "QR Code Expired",
            message: "This QR code has expired. Generate a new one to share.",
            icon: "time-outline",
            iconColor: "#fbbc04",
            buttons: [{ text: "OK" }],
          });
        } else {
          setTimeRemaining(remaining);
        }
      }, 1000);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [showShareModal, qrExpiresAt]);

  const loadCredentials = async () => {
    try {
      console.log("🔄 Loading credentials for lock:", lock.id);
      const credentials = await getIssuedCredentialsByLockId(lock.id);
      console.log("✅ Loaded credentials:", credentials.length);
      setLockCredentials(credentials);
    } catch (error) {
      console.error("❌ Error loading credentials:", error);
    }
  };

  const addCredential = () => {
    setFormData({ email: "", name: "", validUntil: "" });
    setShowAddForm(true);
  };

  const handleAddCredential = async () => {
    if (!formData.email.trim()) {
      showAlert({
        title: "Error",
        message: "Please enter an email address",
        icon: "alert-circle",
        iconColor: "#ea4335",
        buttons: [{ text: "OK" }],
      });
      return;
    }

    if (!formData.name.trim()) {
      showAlert({
        title: "Error",
        message: "Please enter a name",
        icon: "alert-circle",
        iconColor: "#ea4335",
        buttons: [{ text: "OK" }],
      });
      return;
    }

    try {
      const userMetaData: UserMetaData = {
        email: formData.email.trim(),
        name: formData.name.trim(),
      };

      const request: CredentialRequest = {
        lockId: lock.id,
        lockNickname: lock.name,
        userMetaData,
        pubk: lock.publicKey,
        privK: lock.privateKey, // Use lock's private key for signing
        validUntil: formData.validUntil || undefined,
      };

      console.log("🚀 Issuing credential for lock:", lock.id);
      console.log(
        "🔑 Using public key:",
        lock.publicKey.substring(0, 50) + "..."
      );
      console.log(
        "🔏 Using private key:",
        lock.privateKey.substring(0, 20) + "..."
      );

      const newCredential = await issueCredential(request);
      console.log("✅ Credential issued successfully:", newCredential.id);

      // Log proof for debugging
      const proof = Array.isArray(newCredential.proof)
        ? newCredential.proof[0]
        : newCredential.proof;
      console.log(
        "✍️  Signature created:",
        proof?.proofValue?.substring(0, 50) + "..."
      );

      showAlert({
        title: "Success",
        message: "Verifiable credential issued successfully!",
        icon: "checkmark-circle",
        iconColor: "#34a853",
        buttons: [{ text: "OK" }],
      });

      setShowAddForm(false);
    } catch (error) {
      showAlert({
        title: "Error",
        message: `Failed to issue credential: ${error}`,
        icon: "alert-circle",
        iconColor: "#ea4335",
        buttons: [{ text: "OK" }],
      });
    }
  };

  const handleRevoke = (credential: IssuedCredential) => {
    showAlert({
      title: "Revoke Credential",
      message: `Revoke access for ${
        credential.userMetaData?.email || "this user"
      }?`,
      icon: "warning",
      iconColor: "#fbbc04",
      buttons: [
        { text: "Cancel" },
        {
          text: "Revoke",
          onPress: () => {
            revokeIssuedCredential(credential.id!);
          },
        },
      ],
    });
  };

  const formatTimeRemaining = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const handleShare = (credential: IssuedCredential) => {
    // Set QR code expiration to 10 minutes from now
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Share the full W3C credential with QR expiration
    const shareableCredential: QrCodeCredential = {
      ...credential, // Spread all W3C fields
      credentialType: CredentialType.ACCESS,
      qrExpiresAt: expiresAt.toISOString(),
    };

    setQrValue(JSON.stringify(shareableCredential));
    setSelectedCredential(credential);
    setQrExpiresAt(expiresAt);
    setTimeRemaining(10 * 60); // 10 minutes in seconds
    setShowShareModal(true);
  };

  const renderCredentialItem = ({ item: credential }: { item: any }) => (
    <View style={styles.credentialCard}>
      <View style={styles.credentialInfo}>
        <View style={styles.credentialHeader}>
          <Ionicons name="document-text" size={20} color="#4285f4" />
          <View style={styles.credentialDetails}>
            <Text style={styles.credentialName}>
              {credential.userMetaData?.name || "Unknown User"}
            </Text>
            <Text style={styles.credentialEmail}>
              {credential.userMetaData?.email || "No email"}
            </Text>
            <Text style={styles.credentialDate}>
              Issued: {new Date(credential.validFrom).toLocaleDateString()}
            </Text>
            {credential.validUntil && (
              <Text style={styles.credentialExpiry}>
                Expires: {new Date(credential.validUntil).toLocaleDateString()}
              </Text>
            )}
          </View>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.shareButton]}
          onPress={() => handleShare(credential)}
        >
          <Ionicons name="share" size={18} color="#34a853" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.revokeButton]}
          onPress={() => handleRevoke(credential)}
        >
          <Ionicons name="close-circle" size={18} color="#ea4335" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFormModal = () => (
    <Modal
      visible={showAddForm}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowAddForm(false)}
    >
      <KeyboardAvoidingView
        style={styles.modalBackdrop}
        behavior={"padding"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : -25}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setShowAddForm(false)}
        />
        <View style={styles.modalContainer}>
          <View style={styles.modalHandle} />

          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Issue New Credential</Text>
            <Text style={styles.modalSubtitle}>
              Create access credential for {lock.name}
            </Text>
          </View>

          <ScrollView
            style={styles.formContainer}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.formContentContainer}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="user@example.com"
                    placeholderTextColor="#5f6368"
                    value={formData.email}
                    onChangeText={(text) =>
                      setFormData({ ...formData, email: text })
                    }
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Name</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="User's full name"
                    placeholderTextColor="#5f6368"
                    value={formData.name}
                    onChangeText={(text) =>
                      setFormData({ ...formData, name: text })
                    }
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Expiration Date (Optional)
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#5f6368"
                    value={formData.validUntil}
                    onChangeText={(text) =>
                      setFormData({ ...formData, validUntil: text })
                    }
                  />
                </View>
              </View>
            </TouchableWithoutFeedback>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.cancelActionButton}
              onPress={() => setShowAddForm(false)}
            >
              <Text style={styles.cancelActionText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryActionButton}
              onPress={handleAddCredential}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.primaryActionText}>Issue Credential</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  const renderShareModal = () => (
    <Modal
      visible={showShareModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowShareModal(false)}
    >
      <View style={styles.modalBackdrop}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setShowShareModal(false)}
        />
        <View style={styles.modalContainer}>
          <View style={styles.modalHandle} />

          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Share Access Credential</Text>
            <Text style={styles.modalSubtitle}>
              For {selectedCredential?.userMetaData?.name || "user"}
            </Text>
          </View>

          {/* QR Code Content */}
          <View style={styles.tabContent}>
            <View style={styles.qrContainer}>
              <View
                style={styles.qrWrapper}
                ref={qrCodeRef}
                collapsable={false}
              >
                <QRCode value={qrValue} size={250} backgroundColor="white" />
              </View>
              <Text style={styles.qrHelpText}>
                Show this QR code to the recipient or take a screenshot to share
              </Text>

              {/* Countdown Timer */}
              <View style={styles.timerContainer}>
                <Ionicons
                  name="time-outline"
                  size={20}
                  color={timeRemaining < 60 ? "#ea4335" : "#4285f4"}
                />
                <Text
                  style={[
                    styles.timerText,
                    timeRemaining < 60 && styles.timerTextUrgent,
                  ]}
                >
                  Expires in {formatTimeRemaining(timeRemaining)}
                </Text>
              </View>

              <View style={styles.expirationInfo}>
                <Ionicons name="warning-outline" size={16} color="#fbbc04" />
                <Text style={styles.expirationText}>
                  Handle this QR code with care. Anyone with access to it can
                  access the lock until the credential is revoked.
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.cancelActionButton}
              onPress={() => setShowShareModal(false)}
            >
              <Text style={styles.cancelActionText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#202124" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{lock.name}</Text>
          <Text style={styles.headerSubtitle}>Lock ID: {lock.id}</Text>
        </View>
      </View>

      {/* Add Button */}
      <View style={styles.addButtonContainer}>
        <TouchableOpacity style={styles.addButton} onPress={addCredential}>
          <Ionicons name="add" size={20} color="#ffffff" />
          <Text style={styles.addButtonText}>Issue New Credential</Text>
        </TouchableOpacity>
      </View>

      {/* Credentials List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4285f4" />
          <Text style={styles.loadingText}>Loading credentials...</Text>
        </View>
      ) : lockCredentials.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={64} color="#5f6368" />
          <Text style={styles.emptyTitle}>No Credentials Yet</Text>
          <Text style={styles.emptyText}>
            Issue your first verifiable credential to get started
          </Text>
        </View>
      ) : (
        <FlatList
          data={lockCredentials}
          renderItem={renderCredentialItem}
          keyExtractor={(item) => item.id || `cred-${Date.now()}`}
          style={styles.credentialsList}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Form Modal */}
      {renderFormModal()}

      {/* Share Modal */}
      {renderShareModal()}

      {/* Alert Component */}
      <AlertComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 8,
    backgroundColor: "#202124",
    borderBottomWidth: 1,
    borderBottomColor: "#3c4043",
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "500",
    color: "#ffffff",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#9aa0a6",
    marginTop: 2,
  },
  addButtonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  addButton: {
    backgroundColor: "#4285f4",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 24,
    shadowColor: "#4285f4",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  addButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 16,
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#9aa0a6",
    fontSize: 16,
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "500",
    color: "#ffffff",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#9aa0a6",
    textAlign: "center",
    lineHeight: 20,
  },
  credentialsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  credentialCard: {
    backgroundColor: "#202124",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#3c4043",
  },
  credentialInfo: {
    flex: 1,
  },
  credentialHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  credentialDetails: {
    flex: 1,
    marginLeft: 12,
  },
  credentialName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#ffffff",
    marginBottom: 4,
  },
  credentialEmail: {
    fontSize: 14,
    color: "#9aa0a6",
    marginBottom: 4,
  },
  credentialDate: {
    fontSize: 12,
    color: "#5f6368",
  },
  credentialExpiry: {
    fontSize: 12,
    color: "#fbbc04",
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: "row",
    marginLeft: 12,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  shareButton: {
    backgroundColor: "rgba(52, 168, 83, 0.1)",
  },
  revokeButton: {
    backgroundColor: "rgba(234, 67, 53, 0.1)",
  },
  // Modal styles (copied from DevicesScreen)
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContainer: {
    backgroundColor: "#202124",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "90%",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    flexDirection: "column",
  },
  modalHandle: {
    width: 32,
    height: 4,
    backgroundColor: "#5f6368",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  modalHeader: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "400",
    color: "#ffffff",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#9aa0a6",
    fontWeight: "400",
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  formContentContainer: {
    paddingBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#9aa0a6",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  textInput: {
    backgroundColor: "#3c4043",
    borderWidth: 1,
    borderColor: "#5f6368",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#ffffff",
    fontWeight: "400",
    minHeight: 48,
  },
  modalActions: {
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#3c4043",
  },
  cancelActionButton: {
    flex: 1,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#5f6368",
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelActionText: {
    color: "#9aa0a6",
    fontWeight: "500",
    fontSize: 16,
  },
  primaryActionButton: {
    flex: 1,
    backgroundColor: "#4285f4",
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    shadowColor: "#4285f4",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  primaryActionText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 16,
  },
  // Share Modal Styles
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#3c4043",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#4285f4",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#9aa0a6",
  },
  activeTabText: {
    color: "#4285f4",
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  qrContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  qrWrapper: {
    padding: 20,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    marginBottom: 20,
  },
  qrHelpText: {
    fontSize: 14,
    color: "#9aa0a6",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 20,
  },
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(66, 133, 244, 0.1)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  timerText: {
    fontSize: 16,
    color: "#4285f4",
    fontWeight: "600",
  },
  timerTextUrgent: {
    color: "#ea4335",
  },
  expirationInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(251, 188, 4, 0.1)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  expirationText: {
    fontSize: 12,
    color: "#fbbc04",
    fontWeight: "500",
  },
  sendContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  sendTitle: {
    fontSize: 20,
    fontWeight: "500",
    color: "#ffffff",
    marginTop: 16,
    marginBottom: 8,
  },
  sendDescription: {
    fontSize: 14,
    color: "#9aa0a6",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  shareQRButton: {
    backgroundColor: "#4285f4",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 24,
    gap: 8,
    shadowColor: "#4285f4",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  shareQRButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 16,
  },
});
