import BackButton from "@/components/BackButton";
import Button from "@/components/Button";
import Header from "@/components/Header";
import ModalWrapper from "@/components/ModalWrapper";
import TrendAlert from "@/components/TrendAlert";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { UserType, useAuth } from "@/contexts/authContext";
import { verticalScale } from "@/utils/styling";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Bell,
  CalendarBlankIcon,
  CurrencyDollar,
  Lock,
} from "phosphor-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Animated as RNAnimated,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const Settings: React.FC = () => {
  const { user, setUser } = useAuth();

  const [budgetLimit, setBudgetLimit] = useState<string>(
    user?.budgetLimit?.toString() ?? ""
  );

  const budgetInputRef = useRef<TextInput>(null);
  const budgetTextRef = useRef<string>(user?.budgetLimit?.toString() ?? "");

  // 2) helpers
  const formatWithCommas = (value: string) => {
    if (!value) return "";
    const [intPart, decimalPart] = value.split(".");
    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return decimalPart ? `${formattedInt}.${decimalPart}` : formattedInt;
  };
  const sanitize = (t: string) => {
    let cleaned = t.replace(/[^0-9.]/g, "");
    const parts = cleaned.split(".");
    if (parts.length > 2) cleaned = parts[0] + "." + parts[1];
    return cleaned;
  };

  const [privacyMode, setPrivacyMode] = useState(false);
  const [weekStart, setWeekStart] = useState<"Saturday" | "Sunday">("Sunday");
  const [notifications, setNotifications] = useState(true);
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

  const showAlert = (
    message: string,
    type: "success" | "error" = "success"
  ) => {
    setAlertMessage(message);
    setAlertType(type);
    setAlertVisible(true);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const numericBudget =
        parseFloat((budgetTextRef.current || "").replace(/,/g, "")) || 0;

      setUser((prev) => ({
        ...(prev as UserType),
        budgetLimit: numericBudget,
        privacyMode,
        weekStart,
        notifications,
      }));

      const savedUserRaw = await AsyncStorage.getItem("user");
      const saved = savedUserRaw ? JSON.parse(savedUserRaw) : {};
      const merged = {
        ...saved,
        budgetLimit: numericBudget,
        privacyMode,
        weekStart,
        notifications,
      };
      await AsyncStorage.setItem("user", JSON.stringify(merged));

      showAlert("Settings updated successfully!", "success");
    } catch (error) {
      showAlert("Failed to save settings. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (
    key: "privacyMode" | "notifications",
    value: boolean
  ) => {
    setUser((prev) => ({
      ...(prev as UserType),
      [key]: value,
    }));

    const savedUserRaw = await AsyncStorage.getItem("user");
    const saved = savedUserRaw ? JSON.parse(savedUserRaw) : {};
    const merged = {
      ...saved,
      [key]: value,
    };
    await AsyncStorage.setItem("user", JSON.stringify(merged));

    showAlert(
      `${key === "privacyMode" ? "Privacy mode" : "Notifications"} updated`,
      "success"
    );
    if (key === "privacyMode") setPrivacyMode(value);
    if (key === "notifications") setNotifications(value);
  };

  const Card = ({ children }: { children: React.ReactNode }) => (
    <View style={styles.card}>{children}</View>
  );

  const currencySymbols: Record<string, string> = {
    USD: "$",
    GBP: "£",
    IRR: "ریال",
  };

  const getCurrencySymbol = (code: string) => currencySymbols[code] || code;

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
          <Header
            title="Settings"
            leftIcon={<BackButton />}
            style={{ marginBottom: spacingY._15 }}
          />
          <View style={styles.separator} />

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Monthly Budget Limit */}
            <Card>
              <View style={styles.labelRow}>
                <CurrencyDollar size={27} color={colors.primary} />
                <Text style={styles.label}>Monthly Budget Limit</Text>
              </View>
              <View style={styles.inputCardRow}>
                <Text style={styles.currencySymbol}>
                  {getCurrencySymbol(user?.currency ?? "USD")}
                </Text>
                <TextInput
                  ref={budgetInputRef}
                  defaultValue={formatWithCommas(budgetTextRef.current)}
                  placeholder="Enter amount"
                  placeholderTextColor={colors.neutral500}
                  keyboardType={
                    Platform.OS === "ios" ? "decimal-pad" : "numeric"
                  }
                  returnKeyType="done"
                  blurOnSubmit={false}
                  onChangeText={(t) => {
                    // ✅ Allow decimals but only one "."
                    let cleaned = t.replace(/[^0-9.]/g, "");
                    const parts = cleaned.split(".");
                    if (parts.length > 2)
                      cleaned = parts[0] + "." + parts.slice(1).join("");
                    budgetTextRef.current = cleaned;

                    // live update the input while typing
                    budgetInputRef.current?.setNativeProps({ text: cleaned });
                  }}
                  onBlur={() => {
                    // ✅ Format with commas + decimals when leaving input
                    const formatted = formatWithCommas(budgetTextRef.current);
                    budgetTextRef.current = formatted;
                    budgetInputRef.current?.setNativeProps({ text: formatted });
                  }}
                  style={[styles.textInput, { flex: 1 }]}
                />
              </View>
              <Text style={styles.hintText}>
                Set your monthly budget target for tracking.
              </Text>
            </Card>

            {/* Data Privacy */}
            <Card>
              <View style={styles.labelRow}>
                <Lock size={27} color={colors.text} />
                <Text style={styles.label}>Data Privacy</Text>
              </View>
              <View style={styles.switchRow}>
                <Switch
                  value={privacyMode}
                  onValueChange={(val) => handleToggle("privacyMode", val)}
                  trackColor={{
                    false: colors.neutral500,
                    true: colors.primary + "66",
                  }}
                  thumbColor={privacyMode ? colors.primary : colors.neutral200}
                  ios_backgroundColor={colors.neutral500}
                  style={{
                    transform: [{ scale: 1.2 }],
                    shadowColor: privacyMode ? colors.primary : "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: privacyMode ? 0.4 : 0.2,
                    shadowRadius: 3,
                    elevation: 4,
                    borderRadius: 20,
                  }}
                  accessibilityLabel="Toggle Privacy Mode"
                  accessibilityHint="When enabled, your financial data is hidden"
                />
                <Text style={styles.hintTextInline}>
                  Enable to keep your data private.
                </Text>
              </View>
            </Card>

            {/* Week Starts On */}
            <Card>
              <View style={styles.labelRow}>
                <CalendarBlankIcon size={27} color={colors.red} />
                <Text style={styles.label}>Week Starts On</Text>
              </View>
              <View style={styles.weekToggleRow}>
                {(["Saturday", "Sunday"] as const).map((day) => (
                  <TouchableOpacity
                    key={day}
                    onPress={() => {
                      setWeekStart(day);
                      showAlert(`Week starts on ${day}`, "success");
                    }}
                    style={[
                      styles.weekBtn,
                      weekStart === day && { backgroundColor: colors.primary },
                    ]}
                  >
                    <Text
                      style={[
                        styles.weekBtnText,
                        weekStart === day && { color: colors.black },
                      ]}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.hintText}>
                Choose the first day of your week for reports.
              </Text>
            </Card>

            {/* Notifications */}
            <Card>
              <View style={styles.labelRow}>
                <Bell size={27} color={colors.yellow} />
                <Text style={styles.label}>Notifications</Text>
              </View>
              <View style={styles.switchRow}>
                <Switch
                  value={notifications}
                  onValueChange={(val) => handleToggle("notifications", val)}
                  trackColor={{
                    false: colors.neutral500,
                    true: colors.primary + "66",
                  }}
                  thumbColor={
                    notifications ? colors.primary : colors.neutral200
                  }
                  ios_backgroundColor={colors.neutral500}
                  style={{
                    transform: [{ scale: 1.2 }],
                    shadowColor: notifications ? colors.primary : "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: notifications ? 0.4 : 0.2,
                    shadowRadius: 3,
                    elevation: 4,
                    borderRadius: 20,
                  }}
                  accessibilityLabel="Toggle Privacy Mode"
                  accessibilityHint="When enabled, your financial data is hidden"
                />
                <Text style={styles.hintTextInline}>
                  Receive reminders and alerts.
                </Text>
              </View>
            </Card>

            <View style={{ height: verticalScale(90) }} />
          </ScrollView>

          {/* Save button */}
          <View style={styles.footer}>
            <View style={styles.footerShadow} />
            <Button
              loading={isLoading}
              onPress={handleSave}
              style={styles.saveBtn}
            >
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </Button>
          </View>
        </KeyboardAvoidingView>
      </RNAnimated.View>
    </ModalWrapper>
  );
};

export default Settings;

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
  label: {
    color: colors.textLighter,
    fontSize: verticalScale(15),
    fontWeight: "600",
  },
  inputCardRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.neutral800,
    borderRadius: radius._15,
    borderWidth: 1,
    borderColor: colors.neutral600,
    paddingHorizontal: spacingX._10,
    marginTop: spacingY._5,
  },
  currencySymbol: {
    color: colors.white,
    fontSize: verticalScale(16),
    marginRight: spacingX._5,
  },
  textInput: {
    flex: 1,
    height: verticalScale(50),
    color: colors.white,
    fontSize: verticalScale(15),
    backgroundColor: colors.neutral800,
    borderRadius: radius._15,
    paddingHorizontal: spacingX._12,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacingY._5,
  },
  hintText: {
    color: colors.neutral400,
    fontSize: verticalScale(12),
    marginTop: spacingY._3,
  },
  hintTextInline: {
    color: colors.neutral400,
    fontSize: verticalScale(13),
    marginTop: spacingY._3,
  },
  weekToggleRow: {
    flexDirection: "row",
    gap: spacingX._10,
    marginTop: spacingY._5,
  },
  weekBtn: {
    flex: 1,
    paddingVertical: verticalScale(10),
    borderRadius: radius._15,
    borderWidth: 1,
    borderColor: colors.neutral600,
    backgroundColor: colors.neutral900,
    alignItems: "center",
  },
  weekBtnText: {
    color: colors.textLight,
    fontSize: verticalScale(14),
    fontWeight: "500",
  },
  separator: {
    height: 3,
    backgroundColor: colors.primary,
    width: "70%",
    marginVertical: spacingY._20,
    borderRadius: 2,
    alignSelf: "center",
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
