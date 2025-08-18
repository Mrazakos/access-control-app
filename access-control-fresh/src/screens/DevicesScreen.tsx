import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

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

  const addDevice = () => {
    Alert.alert(
      "Add Device",
      "This will register a new smart lock device on the blockchain"
    );
    // TODO: Implement device registration
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
        <Ionicons name="settings-outline" size={24} color="#2563eb" />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f8fafc",
  },
  addButton: {
    backgroundColor: "#2563eb",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  addButtonText: {
    color: "white",
    fontWeight: "bold",
    marginLeft: 8,
  },
  deviceList: {
    flex: 1,
  },
  deviceCard: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  deviceId: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    textTransform: "capitalize",
  },
  configButton: {
    padding: 8,
  },
});
