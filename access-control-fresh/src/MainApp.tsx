import * as React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { Text, Pressable, StyleSheet } from "react-native";
import { useWallet } from "./hooks/useWallet";
import { useCustomAlert } from "./components/CustomAlert";
import DevicesScreen from "./screens/DevicesScreen";
import UnlockScreen from "./screens/UnlockScreen";

// Import screens from the correct path
const Tab = createBottomTabNavigator();

export const MainApp = () => {
  const { isConnected, displayAddress, connect, disconnect } = useWallet();
  const { showAlert, AlertComponent } = useCustomAlert();

  const getWalletName = () => {
    return "wallet";
  };

  const handleWalletPress = async () => {
    if (isConnected) {
      const walletName = getWalletName();

      showAlert({
        title: "Disconnect Wallet",
        message: `Are you sure you want to disconnect the ${displayAddress} ${walletName}?`,
        icon: "wallet",
        iconColor: "#ea4335",
        buttons: [
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
        ],
      });
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
          tabBarActiveTintColor: "#4285f4", // Google Blue
          tabBarInactiveTintColor: "#9aa0a6",
          tabBarStyle: {
            backgroundColor: "#202124", // Google Dark Surface
            borderTopColor: "#3c4043",
            paddingBottom: 8,
            height: 65,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: "500",
          },
          headerStyle: {
            backgroundColor: "#1f1f1f", // Dark header
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          },
          headerTintColor: "#ffffff",
          headerTitleStyle: {
            fontWeight: "600",
            fontSize: 18,
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

      <AlertComponent />
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  walletButton: {
    backgroundColor: "#4285f4", // Google Blue
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  walletButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});
