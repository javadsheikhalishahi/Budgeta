import BackButton from "@/components/BackButton";
import Button from "@/components/Button";
import Header from "@/components/Header";
import ModalWrapper from "@/components/ModalWrapper";
import TrendAlert from "@/components/TrendAlert";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { UserType, useAuth } from "@/contexts/authContext";
import { verticalScale } from "@/utils/styling";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Eye, Lock } from "phosphor-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Animated as RNAnimated,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

const PrivacyPage: React.FC = () => {
  const { user, setUser } = useAuth();

  const [adPersonalization, setAdPersonalization] = useState(user?.privacyMode ?? false);
  const [tracking, setTracking] = useState(false); 
  const [isLoading, setIsLoading] = useState(false);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<"error" | "success">("success");

  const translateY = useRef(new RNAnimated.Value(300)).current;
  const opacity = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    RNAnimated.parallel([
      RNAnimated.spring(translateY, {
        toValue: 0,
        stiffness: 50,
        damping: 20,
        mass: 5,
        useNativeDriver: true,
      }),
      RNAnimated.timing(opacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const showAlert = (message: string, type: "success" | "error" = "success") => {
    setAlertMessage(message);
    setAlertType(type);
    setAlertVisible(true);
  };

  const handleToggle = async (key: "adPersonalization" | "tracking", value: boolean) => {
    setUser((prev) => ({
      ...(prev as UserType),
      [key]: value,
    }));

    const savedUserRaw = await AsyncStorage.getItem("user");
    const saved = savedUserRaw ? JSON.parse(savedUserRaw) : {};
    const merged = { ...saved, [key]: value };
    await AsyncStorage.setItem("user", JSON.stringify(merged));

    showAlert(`${key === "adPersonalization" ? "Ad Personalization" : "Tracking"} updated`, "success");

    if (key === "adPersonalization") setAdPersonalization(value);
    if (key === "tracking") setTracking(value);
  };

  const Card = ({ children }: { children: React.ReactNode }) => (
    <View style={styles.card}>{children}</View>
  );

  useEffect(() => {
    const loadSettings = async () => {
      const savedUserRaw = await AsyncStorage.getItem("user");
      const saved = savedUserRaw ? JSON.parse(savedUserRaw) : {};
      setAdPersonalization(saved.adPersonalization ?? false);
      setTracking(saved.tracking ?? false);
    };
    loadSettings();
  }, []);
  
  const saveSettings = async () => {
    setIsLoading(true);
    try {
      const merged = { ...user, adPersonalization, tracking };
      await AsyncStorage.setItem("user", JSON.stringify(merged));
      setUser(merged as UserType);
      showAlert("Privacy settings saved!", "success");
    } catch (error) {
      console.log(error);
      showAlert("Failed to save settings", "error");
    } finally {
      setIsLoading(false);
    }
  };
  

  return (
    <ModalWrapper bg={colors.black}>
      <TrendAlert
        visible={alertVisible}
        message={alertMessage}
        type={alertType}
        onClose={() => setAlertVisible(false)}
      />

      <RNAnimated.View
        style={[styles.container, { transform: [{ translateY }], opacity }]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "android" ? "padding" : undefined}
          style={{ flex: 1, marginTop: spacingY._15 }}
        >
          <Header title="Privacy" leftIcon={<BackButton />} style={{ marginBottom: spacingY._15 }} />
          <View style={styles.separator} />

          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Ad Personalization */}
            <Card>
              <View style={styles.labelRow}>
                <Lock size={27} color={colors.text} />
                <Text style={styles.label}>Ad Personalization</Text>
              </View>
              <View style={styles.switchRow}>
                <Switch
                  value={adPersonalization}
                  onValueChange={(val) => setAdPersonalization(val)}
                  trackColor={{ false: colors.neutral500, true: colors.primary + "66" }}
                  thumbColor={adPersonalization ? colors.primary : colors.neutral200}
                  ios_backgroundColor={colors.neutral500}
                  style={styles.switchStyle}
                />
                <Text style={styles.hintTextInline}>
                  Show personalized ads based on your app usage.
                </Text>
              </View>
            </Card>

            {/* App Tracking */}
            <Card>
              <View style={styles.labelRow}>
                <Eye size={27} color={colors.primary} />
                <Text style={styles.label}>App Tracking</Text>
              </View>
              <View style={styles.switchRow}>
                <Switch
                  value={tracking}
                  onValueChange={(val) => handleToggle("tracking", val)}
                  trackColor={{ false: colors.neutral500, true: colors.primary + "66" }}
                  thumbColor={tracking ? colors.primary : colors.neutral200}
                  ios_backgroundColor={colors.neutral500}
                  style={styles.switchStyle}
                />
                <Text style={styles.hintTextInline}>
                  Allow anonymous analytics tracking.
                </Text>
              </View>
            </Card>

            {/* Privacy Policy Explanation */}
            <View style={styles.policyContainer}>
              <Text style={styles.policyTitle}>Privacy Policy</Text>
              <Text style={styles.policyText}>
                Our budget app respects your privacy. We collect data such as spending habits and app usage only to improve your experience, show relevant ads, and provide insights. You can disable ad personalization and tracking using the toggles above. Your financial data is never shared with third parties without consent.
              </Text>
              <Text style={[styles.policyText, { marginTop: spacingY._5 }]}>
                For more details, please review our full{" "}
                <Text style={{ color: colors.primary, textDecorationLine: "underline" }}>
                  Privacy Policy
                </Text>.
              </Text>
            </View>

            <View style={{ height: verticalScale(90) }} />
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.footerShadow} />
            <Button
              loading={isLoading}
              onPress={saveSettings}
              style={styles.saveBtn}
            >
              <Text style={styles.saveBtnText}>Save Privacy Settings</Text>
            </Button>
          </View>
        </KeyboardAvoidingView>
      </RNAnimated.View>
    </ModalWrapper>
  );
};

export default PrivacyPage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
    borderTopLeftRadius: radius._20 ?? 20,
    borderTopRightRadius: radius._20 ?? 20,
    paddingHorizontal: spacingX._20,
    paddingBottom: spacingY._10,
  },
  scrollContent: { paddingBottom: spacingY._10, gap: spacingY._25 },
  card: {
    backgroundColor: colors.neutral800,
    borderRadius: radius._20,
    padding: spacingX._15,
    shadowColor: colors.black,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
    gap: spacingY._5,
    marginTop: spacingY._5,
  },
  labelRow: { flexDirection: "row", alignItems: "center", gap: spacingX._7 },
  label: { color: colors.textLighter, fontSize: verticalScale(15), fontWeight: "600" },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacingY._5,
  },
  switchStyle: {
    transform: [{ scale: 1.2 }],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
    borderRadius: 20,
  },
  hintTextInline: { color: colors.neutral400, fontSize: verticalScale(12), marginTop: spacingY._3 },
  separator: {
    height: 3,
    backgroundColor: colors.primary,
    width: "70%",
    marginVertical: spacingY._20,
    borderRadius: 2,
    alignSelf: "center",
  },
  policyContainer: {
    padding: spacingX._15,
    marginTop: spacingY._10,
    backgroundColor: colors.neutral800,
    borderRadius: radius._15,
  },
  policyTitle: {
    color: colors.textLighter,
    fontSize: verticalScale(16),
    fontWeight: "700",
    marginBottom: spacingY._5,
  },
  policyText: {
    color: colors.neutral400,
    fontSize: verticalScale(13),
    lineHeight: verticalScale(18),
  },
  footer: {
    position: "absolute",
    left: spacingX._20,
    right: spacingX._20,
    bottom: spacingY._15,
  },
  footerShadow: {
    position: "absolute",
    left: -spacingX._20,
    right: -spacingX._20,
    bottom: verticalScale(40),
    height: verticalScale(30),
    backgroundColor: "transparent",
    borderTopWidth: 1,
    borderTopColor: colors.neutral400,
    opacity: 0.45,
  },
  saveBtn: {
    height: verticalScale(52),
    borderRadius: radius._20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: {
    color: colors.black,
    fontWeight: "900",
    fontSize: verticalScale(16),
  },
});
