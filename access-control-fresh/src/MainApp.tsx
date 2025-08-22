import * as React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import DevicesScreen from "./screens/DevicesScreen";
import UnlockScreen from "./screens/UnlockScreen";

// Import screens from the correct path
const Tab = createBottomTabNavigator();

export const MainApp = () => {
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
