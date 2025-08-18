// components/Confirmation.tsx
import { colors } from "@/constants/theme";
import { BlurView } from "expo-blur";
import * as Icons from "phosphor-react-native";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

type Props = {
  visible: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  icon?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
};

const Confirmation: React.FC<Props> = ({
  visible,
  title = "Confirm Action",
  message,
  confirmText = "Logout",
  cancelText = "Cancel",
  icon = <Icons.WarningCircle size={44} color={colors.red} weight="fill" />,
  onConfirm,
  onCancel,
}) => {
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      // Scale & fade in
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          bounciness: 14,
          speed: 18,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        // Icon pulse
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1.3, duration: 700, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
          ])
        ),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, { toValue: 0.7, duration: 150, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <BlurView intensity={60} tint="dark" style={styles.overlay}>
        <Animated.View style={{ transform: [{ scale: scaleAnim }], opacity: opacityAnim }}>
          <BlurView intensity={10} tint="dark" style={styles.container}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <View style={styles.iconWrapper}>{icon}</View>
            </Animated.View>

            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.button, styles.cancelBtn]}
                activeOpacity={0.7}
                onPress={onCancel}
              >
                <Text style={styles.cancelText}>{cancelText}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.confirmBtn]}
                activeOpacity={0.85}
                onPress={onConfirm}
              >
                <Text style={styles.confirmText}>{confirmText}</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </Animated.View>
      </BlurView>
    </Modal>
  );
};

export default Confirmation;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingHorizontal: 20,
  },
  container: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 28,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: "center",
    backgroundColor: "rgba(30,30,30,0.85)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.35,
    shadowRadius: 25,
    elevation: 15,
  },
  iconWrapper: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 12,
    textAlign: "center",
  },
  message: {
    fontSize: 17,
    color: "#e0e0e0",
    textAlign: "center",
    marginBottom: 28,
    lineHeight: 26,
    fontWeight: "600",
  },
  actions: {
    flexDirection: "row",
    gap: 14,
    width: "100%",
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtn: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  confirmBtn: {
    backgroundColor: colors.red,
    shadowColor: colors.red,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  cancelText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  confirmText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
