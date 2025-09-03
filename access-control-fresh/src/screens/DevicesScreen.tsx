import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCustomAlert } from "../components/CustomAlert";

interface Device {
  id: string;
  name: string;
  lockId: number;
  status: "online" | "offline";
}

export default function DevicesScreen() {
  const [devices, setDevices] = useState<Device[]>([
    { id: "1", name: "Front Door Lock", lockId: 1, status: "online" },
    { id: "2", name: "Back Door Lock", lockId: 2, status: "offline" },
  ]);
  const { showAlert, AlertComponent } = useCustomAlert();

  const addDevice = () => {
    showAlert({
      title: "Add Device",
      message: "This will register a new smart lock device on the blockchain",
      icon: "add-circle",
      iconColor: "#4285f4",
      buttons: [
        { text: "Cancel", style: "cancel" },
        {
          text: "Add Device",
          onPress: () => {
            // TODO: Implement device registration
            showAlert({
              title: "Coming Soon",
              message:
                "Device registration will be implemented with smart contract integration.",
              icon: "construct",
              iconColor: "#fbbc04",
              buttons: [{ text: "OK" }],
            });
          },
        },
      ],
    });
  };

  const renderDevice = ({ item }: { item: Device }) => (
    <View style={styles.deviceCard}>
      <View style={styles.deviceInfo}>
        <Text style={styles.deviceName}>{item.name}</Text>
        <Text style={styles.deviceId}>Lock ID: {item.lockId}</Text>
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor:
                  item.status === "online" ? "#10b981" : "#ef4444",
              },
            ]}
          />
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.configButton}>
        <Ionicons name="settings-outline" size={24} color="#4285f4" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.addButton} onPress={addDevice}>
        <Ionicons name="add" size={24} color="white" />
        <Text style={styles.addButtonText}>Add New Device</Text>
      </TouchableOpacity>

      <FlatList
        data={devices}
        renderItem={renderDevice}
        keyExtractor={(item) => item.id}
        style={styles.deviceList}
      />

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
  deviceList: {
    flex: 1,
  },
  deviceCard: {
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
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 6,
    color: "#ffffff",
    letterSpacing: 0.3,
  },
  deviceId: {
    fontSize: 14,
    color: "#9aa0a6",
    marginBottom: 12,
    fontFamily: "monospace",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2d2f31",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
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
  configButton: {
    padding: 12,
    backgroundColor: "#2d2f31",
    borderRadius: 12,
    marginLeft: 12,
  },
});
