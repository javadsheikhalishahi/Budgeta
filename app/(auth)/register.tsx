import BackButton from "@/components/BackButton";
import Button from "@/components/Button";
import Input from "@/components/Input";
import ScreenWrapper from "@/components/ScreenWrapper";
import TrendAlert from "@/components/TrendAlert";
import Typo from "@/components/Typo";
import { colors, spacingX, spacingY } from "@/constants/theme";
import { useAuth } from "@/contexts/authContext";
import { verticalScale } from "@/utils/styling";
import { useRouter } from "expo-router";
import * as Icon from "phosphor-react-native";
import { Info } from "phosphor-react-native";
import React, { useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

const Register = () => {
  const nameRef = useRef("");
  const pinRef = useRef("");
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const { register } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const [alertType, setAlertType] = useState<"error" | "success" | "info">("error");

  const handleSubmit = async () => {
    if (!nameRef.current.trim()) {
      setAlertMessage("Please enter your name");
      setAlertType("info");
      setAlertVisible(true);
      return;
    }
    if (!pinRef.current || pinRef.current.length < 4) {
      setAlertMessage("Please enter a 4-digit PIN");
      setAlertType("info");
      setAlertVisible(true);
      return;
    }
    setIsLoading(true);
    const res = await register(nameRef.current, pinRef.current);
    setIsLoading(false);

    if (!res.success) {
      setAlertMessage("Registration failed");
      setAlertVisible(true);
      setAlertType("error");
      return;
    }
    setAlertMessage("Registered successfully!");
    setAlertVisible(true);
    setAlertType("success");
    setTimeout(() => {
      router.navigate("/(auth)/login"); // navigate after showing alert
    }, 1000);
  };

  return (
    <ScreenWrapper>
      <TrendAlert
        visible={alertVisible}
        message={alertMessage}
        type={alertType}
        onClose={() => setAlertVisible(false)}
      />
      <View style={styles.container}>
        <BackButton iconSize={28} />
        <View style={{ gap: 3, marginTop: spacingY._3 }}>
          <Typo size={32} fontWeight={"800"} style={{ lineHeight: 38,  }}>
            Let`s,
          </Typo>
          <Typo size={32} fontWeight={"800"} style={{ lineHeight: 38,  }}>
            Get Started
          </Typo>
        </View>
{/* Underline separator */}
<View
    style={{
      height: 3,
      backgroundColor: colors.primary,
      width: 80,
      marginVertical: spacingY._3,
      borderRadius: 2,
      alignSelf: "flex-start",
    }}
  />
        <View style={styles.form}>
          <Typo size={16} color={colors.textLight}>
            Enter your name and set a 4-digit PIN
          </Typo>
          <Input
            placeholder="Enter your name"
            onChangeText={(value) => (nameRef.current = value)}
            icon={
              <Icon.User
                size={verticalScale(26)}
                color={colors.neutral300}
                weight="fill"
              />
            }
          />
          <Input
            placeholder="Set 4-digit PIN"
            keyboardType="numeric"
            maxLength={4}
            secureTextEntry
            onChangeText={(value) => (pinRef.current = value)}
            icon={
              <Icon.Key
                size={verticalScale(26)}
                color={colors.neutral300}
                weight="fill"
              />
            }
          />

          <Button loading={isLoading} onPress={handleSubmit}>
            <Typo fontWeight={"700"} color={colors.black} size={20}>
              Register
            </Typo>
          </Button>
        </View>

        <View style={styles.footer}>
          <Typo size={14}>Already have an account?</Typo>
          <Pressable onPress={() => router.navigate("/(auth)/login")}>
            <Typo size={15} fontWeight={"700"} color={colors.primary}>
              Login
            </Typo>
          </Pressable>
        </View>
        <View style={styles.securityInfoContainer}>
  <Info size={16} color={colors.textLight} weight="regular" />
  <Typo size={14} color={colors.textLight} style={{ marginLeft: 6, flex: 1 }}>
    Your PIN and biometric data are securely stored and never shared.
  </Typo>
</View>
      </View>
    </ScreenWrapper>
  );
};

export default Register;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacingY._25,
    paddingHorizontal: spacingX._20,
  },
  form: {
    gap: spacingY._20,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
  },
  securityInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacingY._10,
    marginBottom: spacingY._10,
    paddingHorizontal: spacingX._5,
  },
});
