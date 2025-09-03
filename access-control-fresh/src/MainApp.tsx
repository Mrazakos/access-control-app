import * as React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { Text, Pressable, StyleSheet, Alert } from "react-native";
import { useWalletConnectModal } from "@walletconnect/modal-react-native";
import DevicesScreen from "./screens/DevicesScreen";
import UnlockScreen from "./screens/UnlockScreen";

// Import screens from the correct path
const Tab = createBottomTabNavigator();

export const MainApp = () => {
  const { open, isConnected, address, provider } = useWalletConnectModal();

  const getWalletName = () => {
    // You can customize this based on the connected wallet type
    // For now, we'll use a generic "wallet" or try to detect from provider
    return "wallet";
  };

  const handleWalletPress = async () => {
    if (isConnected) {
      const walletName = getWalletName();
      const truncatedAddress = `${address?.slice(0, 6)}...${address?.slice(
        -4
      )}`;

      Alert.alert(
        "Disconnect Wallet",
        `Are you sure you want to disconnect the ${truncatedAddress} ${walletName}?`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Disconnect",
            style: "destructive",
            onPress: () => {
              provider?.disconnect();
            },
          },
        ]
      );
    } else {
      return open();
    }
  };

  const WalletButton = () => (
    <Pressable style={styles.walletButton} onPress={handleWalletPress}>
      <Text style={styles.walletButtonText}>
        {isConnected
          ? `${address?.slice(0, 4)}...${address?.slice(-4)}`
          : "Connect"}
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
