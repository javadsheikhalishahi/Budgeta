import { spacingX, spacingY } from "@/constants/theme";
import { verticalScale } from "@/utils/styling";
import { BlurView } from "expo-blur";
import * as Icon from "phosphor-react-native";
import React, { useEffect, useState } from "react";
import {
    AccessibilityRole,
    Animated,
    Easing,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

interface TrendAlertProps {
  visible: boolean;
  message: string;
  type?: "error" | "success" | "info";
  onClose?: () => void;
}

const TrendAlert: React.FC<TrendAlertProps> = ({
  visible,
  message,
  type = "error",
  onClose,
}) => {
  const [show, setShow] = useState(visible);
  const slideAnim = React.useRef(new Animated.Value(-100)).current;
  const opacity = React.useRef(new Animated.Value(0)).current;
  const scale = React.useRef(new Animated.Value(0.95)).current;
  const progress = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      setShow(true);

      // Entrance animation
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 18,
          bounciness: 5,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 350,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      // Progress bar animation
      progress.setValue(1);
      Animated.timing(progress, {
        toValue: 0,
        duration: 3500,
        useNativeDriver: false,
      }).start();

      const timer = setTimeout(() => {
        handleClose();
      }, 3500);
      return () => clearTimeout(timer);
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 200,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => setShow(false));
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShow(false);
      onClose && onClose();
    });
  };

  if (!show) return null;

  const theme = {
    error: {
      icon: <Icon.XCircle weight="fill" color="#F87171" size={26} />,
      text: "#FECACA",
      tint: "rgba(248,113,113,0.15)",
      glow: "#F87171",
    },
    success: {
      icon: <Icon.CheckCircle weight="fill" color="#4ADE80" size={26} />,
      text: "#BBF7D0",
      tint: "rgba(74,222,128,0.15)",
      glow: "#4ADE80",
    },
    info: {
      icon: <Icon.Info weight="fill" color="#60A5FA" size={26} />,
      text: "#BFDBFE",
      tint: "rgba(96,165,250,0.15)",
      glow: "#60A5FA",
    },
  }[type];

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          transform: [{ translateY: slideAnim }, { scale }],
          opacity,
          shadowColor: theme.glow,
        },
      ]}
      accessibilityRole={"alert" as AccessibilityRole}
    >
      <BlurView intensity={30} tint="dark" style={[styles.blurContainer, { backgroundColor: theme.tint }]}>
        <View style={styles.icon}>{theme.icon}</View>
        <Text style={[styles.text, { color: theme.text }]} numberOfLines={2}>
          {message}
        </Text>
        <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
          <Icon.X size={16} color={theme.text} weight="bold" />
        </TouchableOpacity>
        {/* Progress Bar */}
        <Animated.View
          style={[
            styles.progressBar,
            {
              backgroundColor: theme.glow,
              transform: [{ scaleX: progress }],
            },
          ]}
        />
      </BlurView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    top: spacingY._15,
    left: spacingX._20,
    right: spacingX._20,
    zIndex: 1000,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  blurContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacingY._10,
    paddingHorizontal: spacingX._12,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  icon: {
    marginRight: 8,
  },
  text: {
    flex: 1,
    fontWeight: "500",
    fontSize: verticalScale(14),
    lineHeight: verticalScale(18),
  },
  closeBtn: {
    marginLeft: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 20,
    padding: 4,
  },
  progressBar: {
    height: 2,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    transformOrigin: "left",
  },
});

export default TrendAlert;
