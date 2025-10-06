import React, { useState, useEffect } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCustomAlert } from "../components/CustomAlert";
import { useLock } from "../hooks/useLock";
import { Lock, LockStatus, CreateLockRequest } from "../services/LockService";

export default function DeviceScreen() {
  const {
    locks,
    isLoading,
    error,
    createAndRegisterLock,
    updateLock,
    updateLockByPublicKey,
    deleteLock,
    retryLockRegistration,
  } = useLock();

  const { showAlert, AlertComponent } = useCustomAlert();

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingLock, setEditingLock] = useState<Lock | null>(null);
  const [formData, setFormData] = useState<CreateLockRequest>({
    name: "",
    description: "",
    location: "",
  });

  const addLock = () => {
    setFormData({ name: "", description: "", location: "" });
    setShowAddForm(true);
  };

  const handleAddLock = async () => {
    if (!formData.name.trim()) {
      showAlert({
        title: "Error",
        message: "Lock name is required",
        icon: "alert-circle",
        iconColor: "#ea4335",
        buttons: [{ text: "OK" }],
      });
      return;
    }

    try {
      await createAndRegisterLock(formData, (result) => {
        showAlert({
          title: "Success",
          message: `Lock "${formData.name}" created and registered on blockchain with ID: ${result.lockId}`,
          icon: "checkmark-circle",
          iconColor: "#34a853",
          buttons: [{ text: "OK" }],
        });
      });
      setShowAddForm(false);
    } catch (err) {
      showAlert({
        title: "Error",
        message: err instanceof Error ? err.message : "Failed to create lock",
        icon: "alert-circle",
        iconColor: "#ea4335",
        buttons: [{ text: "OK" }],
      });
    }
  };

  const handleEditLock = (lock: Lock) => {
    setEditingLock(lock);
    setFormData({
      name: lock.name,
      description: lock.description || "",
      location: lock.location || "",
    });
    setShowEditForm(true);
  };

  const handleUpdateLock = async () => {
    if (!editingLock || !formData.name.trim()) {
      showAlert({
        title: "Error",
        message: "Lock name is required",
        icon: "alert-circle",
        iconColor: "#ea4335",
        buttons: [{ text: "OK" }],
      });
      return;
    }

    try {
      await updateLock(editingLock.id, formData);
      setShowEditForm(false);
      setEditingLock(null);
      showAlert({
        title: "Success",
        message: "Lock updated successfully",
        icon: "checkmark-circle",
        iconColor: "#34a853",
        buttons: [{ text: "OK" }],
      });
    } catch (err) {
      showAlert({
        title: "Error",
        message: err instanceof Error ? err.message : "Failed to update lock",
        icon: "alert-circle",
        iconColor: "#ea4335",
        buttons: [{ text: "OK" }],
      });
    }
  };

  const handleDeleteLock = (lock: Lock) => {
    showAlert({
      title: "Delete Lock",
      message: `Are you sure you want to delete "${lock.name}"? This action cannot be undone.`,
      icon: "trash",
      iconColor: "#ea4335",
      buttons: [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteLock(lock.id);
              showAlert({
                title: "Success",
                message: "Lock deleted successfully",
                icon: "checkmark-circle",
                iconColor: "#34a853",
                buttons: [{ text: "OK" }],
              });
            } catch (err) {
              showAlert({
                title: "Error",
                message:
                  err instanceof Error ? err.message : "Failed to delete lock",
                icon: "alert-circle",
                iconColor: "#ea4335",
                buttons: [{ text: "OK" }],
              });
            }
          },
        },
      ],
    });
  };

  const handleVCsNavigation = (lock: Lock) => {
    // TODO: Navigate to VCs screen for this lock
    showAlert({
      title: "Verifiable Credentials",
      message: `VCs management for "${lock.name}" will be implemented soon.`,
      icon: "document-text",
      iconColor: "#4285f4",
      buttons: [{ text: "OK" }],
    });
  };

  const handleRetryRegistration = async (lock: Lock) => {
    try {
      // Show immediate feedback that retry is starting
      showAlert({
        title: "Retrying Registration",
        message: `Attempting to register "${lock.name}" on blockchain...`,
        icon: "refresh",
        iconColor: "#fbbc04",
        buttons: [{ text: "OK" }],
      });

      await retryLockRegistration(lock, (result) => {
        showAlert({
          title: "Success",
          message: `Lock "${lock.name}" successfully registered on blockchain with ID: ${result.lockId}`,
          icon: "checkmark-circle",
          iconColor: "#34a853",
          buttons: [{ text: "OK" }],
        });
      });
    } catch (err) {
      showAlert({
        title: "Registration Failed",
        message:
          err instanceof Error ? err.message : "Failed to retry registration",
        icon: "alert-circle",
        iconColor: "#ea4335",
        buttons: [{ text: "OK" }],
      });
    }
  };

  const getLockStatus = (
    lock: Lock
  ): "active" | "inactive" | "syncing" | "failed" => {
    // Use the status directly from the lock object
    return lock.status;
  };

  const renderLockCard = ({ item: lock }: { item: Lock }) => {
    const status = getLockStatus(lock);

    return (
      <View style={styles.lockCard}>
        <View style={styles.lockInfo}>
          <Text style={styles.lockName}>{lock.name}</Text>
          {lock.description && (
            <Text style={styles.lockDescription}>{lock.description}</Text>
          )}
          {lock.location && (
            <Text style={styles.lockLocation}>📍 {lock.location}</Text>
          )}
          <Text style={styles.lockId}>ID: {lock.id}</Text>

          <TouchableOpacity
            style={styles.statusContainer}
            onPress={() => {
              if (status === "failed") {
                handleRetryRegistration(lock);
              }
            }}
            disabled={status !== "failed"}
          >
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    status === "active"
                      ? "#34a853" // Green for active
                      : status === "syncing"
                      ? "#fbbc04" // Yellow for syncing
                      : status === "inactive"
                      ? "#9aa0a6" // Gray for inactive
                      : "#ea4335", // Red for failed
                },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                status === "failed" && styles.clickableStatusText,
              ]}
            >
              {status === "active"
                ? "Active"
                : status === "syncing"
                ? "Syncing..."
                : status === "inactive"
                ? "Inactive"
                : "Failed (tap to retry)"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.vcsButton]}
            onPress={() => handleVCsNavigation(lock)}
          >
            <Ionicons name="document-text" size={18} color="#4285f4" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => handleEditLock(lock)}
          >
            <Ionicons name="create" size={18} color="#fbbc04" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteLock(lock)}
          >
            <Ionicons name="trash" size={18} color="#ea4335" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderFormModal = (isEdit: boolean) => (
    <Modal
      visible={isEdit ? showEditForm : showAddForm}
      animationType="slide"
      transparent={true}
      onRequestClose={() => {
        if (isEdit) {
          setShowEditForm(false);
          setEditingLock(null);
        } else {
          setShowAddForm(false);
        }
      }}
    >
      {/* Dark backdrop - tap to dismiss */}
      <TouchableOpacity
        style={styles.modalBackdrop}
        activeOpacity={1}
        onPress={() => {
          if (isEdit) {
            setShowEditForm(false);
            setEditingLock(null);
          } else {
            setShowAddForm(false);
          }
        }}
      >
        {/* Modal content container */}
        <TouchableOpacity
          style={styles.modalContent}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Google Wallet style handle */}
          <View style={styles.modalHandle} />

          {/* Header with Google Material style */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {isEdit ? "Edit Lock" : "Add New Lock"}
            </Text>
            <Text style={styles.modalSubtitle}>
              {isEdit ? "Update your lock details" : "Create a new smart lock"}
            </Text>
          </View>

          <ScrollView
            style={styles.formContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Lock Name</Text>
              <TextInput
                style={styles.textInput}
                value={formData.name}
                onChangeText={(text) =>
                  setFormData({ ...formData, name: text })
                }
                placeholder="Enter lock name"
                placeholderTextColor="#5f6368"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={formData.description}
                onChangeText={(text) =>
                  setFormData({ ...formData, description: text })
                }
                placeholder="Enter description (optional)"
                placeholderTextColor="#5f6368"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Location</Text>
              <TextInput
                style={styles.textInput}
                value={formData.location}
                onChangeText={(text) =>
                  setFormData({ ...formData, location: text })
                }
                placeholder="Enter location (optional)"
                placeholderTextColor="#5f6368"
              />
            </View>
          </ScrollView>

          {/* Google Material style action buttons */}
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.cancelActionButton}
              onPress={() => {
                if (isEdit) {
                  setShowEditForm(false);
                  setEditingLock(null);
                } else {
                  setShowAddForm(false);
                }
              }}
            >
              <Text style={styles.cancelActionText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryActionButton}
              onPress={isEdit ? handleUpdateLock : handleAddLock}
              disabled={isLoading || !formData.name.trim()}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <Ionicons
                    name={isEdit ? "checkmark" : "add"}
                    size={20}
                    color="#ffffff"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.primaryActionText}>
                    {isEdit ? "Update" : "Create"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );

  // Show error alert if there's an error
  useEffect(() => {
    if (error) {
      showAlert({
        title: "Error",
        message: error,
        icon: "alert-circle",
        iconColor: "#ea4335",
        buttons: [{ text: "OK" }],
      });
    }
  }, [error, showAlert]);

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.addButton} onPress={addLock}>
        <Ionicons name="add-circle-outline" size={24} color="#ffffff" />
        <Text style={styles.addButtonText}>Add New Lock</Text>
      </TouchableOpacity>

      {isLoading && locks.length === 0 ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#4285f4" />
          <Text style={styles.loadingText}>Loading locks...</Text>
        </View>
      ) : locks.length === 0 ? (
        <View style={styles.centerContent}>
          <Ionicons name="lock-closed-outline" size={64} color="#9aa0a6" />
          <Text style={styles.emptyText}>No locks registered yet</Text>
          <Text style={styles.emptySubtext}>
            Create your first smart lock to get started
          </Text>
        </View>
      ) : (
        <FlatList
          style={styles.lockList}
          data={locks}
          renderItem={renderLockCard}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
        />
      )}

      {renderFormModal(false)}
      {renderFormModal(true)}
      <AlertComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#1f1f1f", // Google Dark Background
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  addButton: {
    backgroundColor: "#4285f4", // Google Blue
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 28,
    marginBottom: 24,
    shadowColor: "#4285f4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  addButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    marginLeft: 12,
    fontSize: 16,
    letterSpacing: 0.5,
  },
  lockList: {
    flex: 1,
  },
  lockCard: {
    backgroundColor: "#202124", // Google Dark Surface
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#3c4043",
  },
  lockInfo: {
    flex: 1,
  },
  lockName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 6,
    color: "#ffffff",
    letterSpacing: 0.3,
  },
  lockDescription: {
    fontSize: 14,
    color: "#9aa0a6",
    marginBottom: 4,
  },
  lockLocation: {
    fontSize: 14,
    color: "#9aa0a6",
    marginBottom: 4,
  },
  lockId: {
    fontSize: 12,
    color: "#5f6368",
    marginBottom: 8,
    fontFamily: "monospace",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2d2f31",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 13,
    textTransform: "capitalize",
    color: "#ffffff",
    fontWeight: "500",
  },
  clickableStatusText: {
    textDecorationLine: "underline",
    opacity: 0.8,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#2d2f31",
  },
  vcsButton: {
    backgroundColor: "rgba(66, 133, 244, 0.1)",
  },
  editButton: {
    backgroundColor: "rgba(251, 188, 4, 0.1)",
  },
  deleteButton: {
    backgroundColor: "rgba(234, 67, 53, 0.1)",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#9aa0a6",
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#ffffff",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#9aa0a6",
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#ea4335",
    marginTop: 16,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#4285f4",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  // Google Wallet style modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#1f1f1f",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: "75%",
    elevation: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
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
  inputGroup: {
    marginBottom: 24,
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
    backgroundColor: "#202124",
    borderWidth: 1,
    borderColor: "#3c4043",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#ffffff",
    fontWeight: "400",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
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
});
