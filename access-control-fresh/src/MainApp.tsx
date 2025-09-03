import * as React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { Text, Pressable, StyleSheet, Alert } from "react-native";
import { useWallet } from "./hooks/useWallet";
import DevicesScreen from "./screens/DevicesScreen";
import UnlockScreen from "./screens/UnlockScreen";

// Import screens from the correct path
const Tab = createBottomTabNavigator();

export const MainApp = () => {
  const { isConnected, displayAddress, connect, disconnect } = useWallet();

  const getWalletName = () => {
    return "wallet";
  };

  const handleWalletPress = async () => {
    if (isConnected) {
      const walletName = getWalletName();

      Alert.alert(
        "Disconnect Wallet",
        `Are you sure you want to disconnect the ${displayAddress} ${walletName}?`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Disconnect",
            style: "destructive",
            onPress: () => {
              disconnect();
            },
          },
        ]
      );
    } else {
      connect();
    }
  };

  const WalletButton = () => (
    <Pressable style={styles.walletButton} onPress={handleWalletPress}>
      <Text style={styles.walletButtonText}>
        {isConnected ? displayAddress : "Connect"}
      </Text>
    </Pressable>
  );

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }: { route: { name: string } }) => ({
          tabBarIcon: ({
            focused,
            color,
            size,
          }: {
            focused: boolean;
            color: string;
            size: number;
          }) => {
            let iconName: keyof typeof Ionicons.glyphMap;

            if (route.name === "Devices") {
              iconName = focused ? "hardware-chip" : "hardware-chip-outline";
            } else if (route.name === "Unlock") {
              iconName = focused ? "lock-open" : "lock-open-outline";
            } else {
              iconName = "help-outline";
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: "#2563eb",
          tabBarInactiveTintColor: "gray",
          headerStyle: {
            backgroundColor: "#2563eb",
          },
          headerTintColor: "#fff",
          headerTitleStyle: {
            fontWeight: "bold",
          },
          headerRight: () => <WalletButton />,
        })}
      >
        <Tab.Screen
          name="Devices"
          component={DevicesScreen}
          options={{ title: "My Devices" }}
        />
        <Tab.Screen
          name="Unlock"
          component={UnlockScreen}
          options={{ title: "NFC Unlock" }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  walletButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  walletButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
});
