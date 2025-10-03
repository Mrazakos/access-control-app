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
import { Lock, CreateLockRequest } from "../services/LockService";

export default function DevicesScreen() {
  const {
    locks,
    isLoading,
    error,
    createAndRegisterLock,
    updateLock,
    deleteLock,
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

  const getLockStatus = (lock: Lock): "active" | "inactive" | "syncing" => {
    if (!lock.isActive) return "inactive";
    // Check if lock ID exists (has been registered on blockchain)
    return lock.id > 0 ? "active" : "syncing";
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

          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    status === "active"
                      ? "#34a853"
                      : status === "syncing"
                      ? "#fbbc04"
                      : "#ea4335",
                },
              ]}
            />
            <Text style={styles.statusText}>
              {status === "active"
                ? "Active"
                : status === "syncing"
                ? "Syncing..."
                : "Inactive"}
            </Text>
          </View>
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
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>
            {isEdit ? "Edit Lock" : "Add New Lock"}
          </Text>
          <TouchableOpacity
            onPress={() => {
              if (isEdit) {
                setShowEditForm(false);
                setEditingLock(null);
              } else {
                setShowAddForm(false);
              }
            }}
          >
            <Ionicons name="close" size={24} color="#9aa0a6" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Lock Name *</Text>
            <TextInput
              style={styles.textInput}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="Enter lock name"
              placeholderTextColor="#9aa0a6"
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
              placeholderTextColor="#9aa0a6"
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
              placeholderTextColor="#9aa0a6"
            />
          </View>
        </ScrollView>

        <View style={styles.modalFooter}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              if (isEdit) {
                setShowEditForm(false);
                setEditingLock(null);
              } else {
                setShowAddForm(false);
              }
            }}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={isEdit ? handleUpdateLock : handleAddLock}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>
                {isEdit ? "Update" : "Create"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Ionicons name="alert-circle" size={48} color="#ea4335" />
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => window.location.reload()}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
        <AlertComponent />
      </View>
    );
  }

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
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: "#1f1f1f",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#3c4043",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#ffffff",
  },
  formContainer: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#ffffff",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#202124",
    borderWidth: 1,
    borderColor: "#3c4043",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#ffffff",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  modalFooter: {
    flexDirection: "row",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#3c4043",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#2d2f31",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#9aa0a6",
    fontWeight: "600",
  },
  submitButton: {
    flex: 1,
    backgroundColor: "#4285f4",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  submitButtonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
});
