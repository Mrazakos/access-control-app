import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Animated,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
}

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message?: string;
  buttons: AlertButton[];
  onDismiss: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
}

const { width: screenWidth } = Dimensions.get("window");

export const CustomAlert: React.FC<CustomAlertProps> = ({
  visible,
  title,
  message,
  buttons,
  onDismiss,
  icon,
  iconColor = "#4285f4",
}) => {
  const scaleValue = React.useRef(new Animated.Value(0)).current;
  const opacityValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleValue, {
          toValue: 1,
          useNativeDriver: true,
          tension: 80,
          friction: 8,
        }),
        Animated.timing(opacityValue, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleValue, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacityValue, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const getButtonStyle = (style?: string) => {
    switch (style) {
      case "destructive":
        return [styles.button, styles.destructiveButton];
      case "cancel":
        return [styles.button, styles.cancelButton];
      default:
        return [styles.button, styles.defaultButton];
    }
  };

  const getButtonTextStyle = (style?: string) => {
    switch (style) {
      case "destructive":
        return [styles.buttonText, styles.destructiveButtonText];
      case "cancel":
        return [styles.buttonText, styles.cancelButtonText];
      default:
        return [styles.buttonText, styles.defaultButtonText];
    }
  };

  const handleButtonPress = (button: AlertButton) => {
    onDismiss();
    if (button.onPress) {
      setTimeout(() => button.onPress!(), 100);
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onDismiss}
    >
      <Animated.View style={[styles.overlay, { opacity: opacityValue }]}>
        <TouchableOpacity
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={onDismiss}
        >
          <Animated.View
            style={[
              styles.alertContainer,
              { transform: [{ scale: scaleValue }] },
            ]}
          >
            <TouchableOpacity activeOpacity={1}>
              {icon && (
                <View style={styles.iconContainer}>
                  <Ionicons name={icon} size={32} color={iconColor} />
                </View>
              )}

              <Text style={styles.title}>{title}</Text>

              {message && <Text style={styles.message}>{message}</Text>}

              <View style={styles.buttonContainer}>
                {buttons.map((button, index) => (
                  <TouchableOpacity
                    key={index}
                    style={getButtonStyle(button.style)}
                    onPress={() => handleButtonPress(button)}
                    activeOpacity={0.8}
                  >
                    <Text style={getButtonTextStyle(button.style)}>
                      {button.text}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  overlayTouchable: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  alertContainer: {
    backgroundColor: "#202124", // Google Dark Surface
    borderRadius: 24,
    padding: 24,
    marginHorizontal: 32,
    maxWidth: screenWidth - 64,
    minWidth: 280,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 20,
    borderWidth: 1,
    borderColor: "#3c4043",
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  message: {
    fontSize: 14,
    color: "#9aa0a6",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    minWidth: 80,
    alignItems: "center",
  },
  defaultButton: {
    backgroundColor: "#4285f4", // Google Blue
  },
  cancelButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#3c4043",
  },
  destructiveButton: {
    backgroundColor: "#ea4335", // Google Red
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  defaultButtonText: {
    color: "#ffffff",
  },
  cancelButtonText: {
    color: "#9aa0a6",
  },
  destructiveButtonText: {
    color: "#ffffff",
  },
});

// Hook for easier usage
export const useCustomAlert = () => {
  const [alertConfig, setAlertConfig] = React.useState<{
    visible: boolean;
    title: string;
    message?: string;
    buttons: AlertButton[];
    icon?: keyof typeof Ionicons.glyphMap;
    iconColor?: string;
  }>({
    visible: false,
    title: "",
    buttons: [],
  });

  const showAlert = (config: Omit<typeof alertConfig, "visible">) => {
    setAlertConfig({ ...config, visible: true });
  };

  const hideAlert = () => {
    setAlertConfig((prev) => ({ ...prev, visible: false }));
  };

  const AlertComponent = () => (
    <CustomAlert
      visible={alertConfig.visible}
      title={alertConfig.title}
      message={alertConfig.message}
      buttons={alertConfig.buttons}
      onDismiss={hideAlert}
      icon={alertConfig.icon}
      iconColor={alertConfig.iconColor}
    />
  );

  return { showAlert, AlertComponent };
};
