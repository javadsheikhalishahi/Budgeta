import BackButton from "@/components/BackButton";
import Button from "@/components/Button";
import ScreenWrapper from "@/components/ScreenWrapper";
import TrendAlert from "@/components/TrendAlert";
import Typo from "@/components/Typo";
import { colors, spacingX, spacingY } from "@/constants/theme";
import { useAuth } from "@/contexts/authContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import { useRouter } from "expo-router";
import * as Icon from "phosphor-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  KeyboardAvoidingView, Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

interface PinInputProps {
  pin: string;
  setPin: (pin: string) => void;
  editable: boolean;
  shakeAnim: Animated.Value;
}

const PinInput: React.FC<PinInputProps> = ({ pin, setPin, editable, shakeAnim }) => {
  const inputRef = React.useRef<TextInput | null>(null);

  const boxes = [];
  for (let i = 0; i < 4; i++) {
    const digit = pin[i] || "";
    const isFocused = pin.length === i;

    boxes.push(
      <View
        key={i}
        style={[
          styles.box,
          isFocused && editable && styles.boxFocused,
        ]}
      >
        <Typo size={24} fontWeight="700" color={digit ? colors.primary : colors.textLight}>
          {digit ? "•" : ""}
        </Typo>
      </View>
    );
  }

  return (
    <Pressable onPress={() => inputRef.current?.focus()} style={styles.pinContainer}>
      <TextInput
        ref={inputRef}
        value={pin}
        onChangeText={(text) => setPin(text.replace(/[^0-9]/g, "").slice(0, 4))}
        keyboardType="numeric"
        maxLength={4}
        style={styles.hiddenInput}
        editable={editable}
        secureTextEntry={true}
        autoFocus={true}
      />
      <Animated.View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          width: "80%",
          transform: [{ translateX: shakeAnim }],
        }}
      >
        {boxes}
      </Animated.View>
    </Pressable>
  );
};

const Login = () => {
  const { loginWithBiometrics, loginWithPin, user } = useAuth();
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPinInput, setShowPinInput] = useState(false);
  const [pin, setPin] = useState("");
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [showPinHelper, setShowPinHelper] = useState(false);
  const router = useRouter();
  const [alertType, setAlertType] = useState<"error" | "success" | "info">("error");

  // Animated values
  const biometricScale = useRef(new Animated.Value(1)).current;
  const pinButtonScale = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current; // for shaking PIN input on error

  useEffect(() => {
    const checkBiometricAvailability = async () => {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setIsBiometricAvailable(hasHardware && isEnrolled);
    };
    checkBiometricAvailability();
  }, []);

  // Shake animation for wrong PIN
  const triggerShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 50,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 6,
        duration: 50,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -6,
        duration: 50,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 3,
        duration: 50,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -3,
        duration: 50,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 50,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Animated button press feedback
  const onPressIn = (anim: Animated.Value) => {
    Animated.spring(anim, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = (anim: Animated.Value) => {
    Animated.spring(anim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const showTrendAlert = (message: string, type: "success" | "error" | "info" = "error") => {
    setAlertMessage(message);
    setAlertType(type);
    setAlertVisible(true);
  };  

  const handleBiometricLogin = async () => {
    if (!isBiometricAvailable) {
      showTrendAlert("Biometric authentication is not available.", "info");
      return;
    }
    setIsLoading(true);
    const res = await loginWithBiometrics();
    setIsLoading(false);

    if (!res.success) {
      showTrendAlert(res.msg || "Biometric login failed", "error");
      setShowPinInput(true); // fallback to PIN input on fail
      return;
    }
    const savedUser = await AsyncStorage.getItem("user");
    const parsedUser = savedUser ? JSON.parse(savedUser) : null;
    showTrendAlert(`Welcome, ${parsedUser?.name || ""}`, "success");
    setTimeout(() => router.replace("/(tabs)"), 1500);
  };

  const handlePinLogin = async () => {
    if (pin.length < 4) {
      showTrendAlert("Enter 4-digit PIN", "error");
      triggerShake();
      return;
    }
    setIsLoading(true);
    const res = await loginWithPin(pin);
    setIsLoading(false);

    if (!res.success) {
      showTrendAlert(res.msg || "PIN login failed", "error");
      triggerShake();
      return;
    }
    const savedUser = await AsyncStorage.getItem("user");
    const parsedUser = savedUser ? JSON.parse(savedUser) : null;
    showTrendAlert(`Welcome, ${parsedUser?.name || ""}`, "success");
    setTimeout(() => router.replace("/(tabs)"), 1500);
  };

  // Show onboarding tooltip on first PIN input open
  useEffect(() => {
    if (showPinInput && !showPinHelper) {
      setShowPinHelper(true);
      const timer = setTimeout(() => setShowPinHelper(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [showPinInput]);

  return (
    <ScreenWrapper>
      <TrendAlert
        visible={alertVisible}
        message={alertMessage}
        type={alertType}
        onClose={() => setAlertVisible(false)}
      />
       <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "android" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "android" ? 50 : 0}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
      <View style={styles.container}>
        <BackButton iconSize={28} />
        <View style={{ marginTop: spacingY._5 }}>
  {/* Heading */}
  <View style={{ gap: spacingY._7 }}>
    <Typo size={32} fontWeight="800" style={{ lineHeight: 38,  }}>
      Hey,
    </Typo>
    <Typo size={32} fontWeight="800" style={{ lineHeight: 38,  }}>
      Welcome Back
    </Typo>
  </View>

  {/* Underline separator */}
  <View
    style={{
      height: 3,
      backgroundColor: colors.primary,
      width: 70,
      marginVertical: spacingY._15,
      borderRadius: 2,
      alignSelf: "flex-start",
    }}
  />

  {/* Subtitle */}
  <Typo
    size={15}
    color={colors.textLight}
    style={{ lineHeight: 22, maxWidth: "90%" }}
  >
    Log in today to stay on top of your expenses
  </Typo>
</View>

<View
  style={{
    backgroundColor: colors.primary + "0D",
    padding: spacingY._15,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacingY._3,
    marginBottom: spacingY._3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  }}
>
  <Icon.Lock
    size={28}
    color={colors.primary}
    weight="duotone"
    style={{ marginRight: spacingX._15 }}
  />
  <View style={{ flex: 1 }}>
    <Typo size={16} fontWeight="700" color={colors.primary}>
      Choose Your Login Method
    </Typo>
    <Typo size={13} color={colors.textLight}>
      Use biometrics for speed, or enter your PIN for flexibility.
    </Typo>
  </View>
</View>

        {!showPinInput ? (
          <View style={styles.form}>
            <View style={styles.rowCenter}>
              <Typo size={16} color={colors.textLight}>
                Login with biometric authentication
              </Typo>
              {!isBiometricAvailable && (
                <Icon.WarningCircle
                  size={20}
                  color={colors.rose}
                  style={{ marginLeft: 8 }}
                />
              )}
            </View>

            <Animated.View style={{ transform: [{ scale: biometricScale }] }}>
              <Button
                disabled={isLoading || !isBiometricAvailable}
                loading={isLoading}
                onPress={handleBiometricLogin}
                onPressIn={() => onPressIn(biometricScale)}
                onPressOut={() => onPressOut(biometricScale)}
              >
                <View style={styles.buttonContent}>
                  <Icon.Fingerprint size={24} color={colors.black} weight="bold" />
                  <Typo
                    fontWeight={"700"}
                    color={colors.black}
                    size={20}
                    style={{ marginLeft: 8 }}
                  >
                    Login with Biometrics
                  </Typo>
                </View>
              </Button>
            </Animated.View>

            <Pressable
              onPress={() => setShowPinInput(true)}
              style={{ marginTop: 10 }}
            >
              <Typo
                size={14}
                color={colors.primary}
                style={{ textAlign: "center" }}
              >
                Or login with PIN
              </Typo>
            </Pressable>
          </View>
        ) : (
          <View style={styles.form}>
            <View style={{ position: "relative" }}>
              <Typo size={16} color={colors.textLight}>
                Enter your 4-digit PIN
              </Typo>

              {showPinHelper && (
                <View style={styles.tooltip}>
                  <Typo size={12} color={colors.textLight}>
                    Tip: Your PIN is the 4-digit code you set during registration.
                  </Typo>
                </View>
              )}
            </View>

            <Animated.View
              style={{
                transform: [
                  {
                    translateX: shakeAnim,
                  },
                ],
              }}
            >
              
            </Animated.View>

            <PinInput
              pin={pin}
              setPin={setPin}
              editable={!isLoading}
              shakeAnim={shakeAnim}
            />
            
            <Animated.View style={{ transform: [{ scale: pinButtonScale }] }}>
              <Button
                loading={isLoading}
                onPress={handlePinLogin}
                onPressIn={() => onPressIn(pinButtonScale)}
                onPressOut={() => onPressOut(pinButtonScale)}
              >
                <View style={styles.buttonContent}>
                  <Icon.Key size={24} color={colors.black} weight="bold" />
                  <Typo
                    fontWeight={"700"}
                    color={colors.black}
                    size={20}
                    style={{ marginLeft: 8 }}
                  >
                    Login with PIN
                  </Typo>
                </View>
              </Button>
            </Animated.View>

            <Pressable
              onPress={() => setShowPinInput(false)}
              style={{ marginTop: 10 }}
            >
              <Typo
                size={14}
                color={colors.primary}
                style={{ textAlign: "center" }}
              >
                Back to biometric login
              </Typo>
            </Pressable>
          </View>
        )}

<View
    style={{
      height: 3,
      backgroundColor: colors.primary,
      width: "80%",
      marginVertical: spacingY._3,
      borderRadius: 2,
      alignSelf: "center",
    }}
  />
        <View style={styles.footer}>
          <Typo size={14}>Don’t have an account?</Typo>
          <Pressable onPress={() => router.navigate("/(auth)/register")}>
            <Typo size={15} fontWeight={"700"} color={colors.primary}>
              Register
            </Typo>
          </Pressable>
        </View>
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </ScreenWrapper>
  );
};

export default Login;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacingY._30,
    paddingHorizontal: spacingX._20,
  },
  form: {
    gap: spacingY._20,
  },
  pinInput: {
    color: colors.primary,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    fontSize: 24,
    letterSpacing: 12,
    textAlign: "center",
    paddingVertical: 10,
    marginBottom: 10,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  rowCenter: {
    flexDirection: "row",
    alignItems: "center",
  },
  tooltip: {
    position: "absolute",
    top: 28,
    left: 0,
    backgroundColor: "rgba(55, 65, 81, 0.9)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    zIndex: 100,
    width: 280,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  pinContainer: {
    width: "100%",
    alignItems: "center",
  },
  hiddenInput: {
    position: "absolute",
    opacity: 0,
    height: 0,
    width: 0,
  },
  box: {
    borderWidth: 2,
    borderColor: colors.textLight,
    borderRadius: 8,
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 5,
  },
  boxFocused: {
    borderColor: colors.primary,
  },
});
