import BackButton from "@/components/BackButton";
import Button from "@/components/Button";
import CurrencyDropdown from "@/components/CurrencyDropdown";
import Header from "@/components/Header";
import ModalWrapper from "@/components/ModalWrapper";
import TrendAlert from "@/components/TrendAlert";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { useAuth } from "@/contexts/authContext";
import { verticalScale } from "@/utils/styling";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { WarningCircle } from "phosphor-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Animated as RNAnimated,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const PIN_LENGTH = 4;

const ProfileModal: React.FC = () => {
  const { user, setUser } = useAuth();

  // form state
  const [name, setName] = useState(user?.name ?? "");
  const [currency, setCurrency] = useState(user?.currency ?? "USD");
  const [pinDigits, setPinDigits] = useState<string[]>(
    Array(PIN_LENGTH).fill("")
  );
  const [isLoading, setIsLoading] = useState(false);

  /* TrendAlert */
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<"error" | "success">("success");

  const [savingsGoal, setSavingsGoal] = useState<string>(
    user?.savingsGoal?.toString() ?? ""
  );

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

  // Load saved user data including savingsGoal
  useEffect(() => {
    const loadUserData = async () => {
      const savedUserRaw = await AsyncStorage.getItem("user");
      if (savedUserRaw) {
        const saved = JSON.parse(savedUserRaw);
        if (saved.savingsGoal) {
          const parts = saved.savingsGoal.toString().split(".");
          parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
          setSavingsGoal(parts.join("."));
        }
      }
    };
    loadUserData();
  }, []);

  // refs for PIN inputs to auto-advance focus
  const pinRefs = useMemo(
    () =>
      Array.from({ length: PIN_LENGTH }, () => React.createRef<TextInput>()),
    []
  );

  const handlePinChange = (index: number, val: string) => {
    const next = [...pinDigits];
    const cleaned = val.replace(/\D/g, "").slice(0, 1);
    next[index] = cleaned;
    setPinDigits(next);

    if (cleaned && index < PIN_LENGTH - 1) {
      pinRefs[index + 1].current?.focus();
    } else if (!cleaned && index > 0) {
      pinRefs[index - 1].current?.focus();
    }
  };

  const pinAsString = pinDigits.join("");

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // PIN validation
      if (pinAsString.length > 0 && pinAsString.length < PIN_LENGTH) {
        setAlertMessage("Please enter all 4 PIN digits or leave it empty.");
        setAlertType("error");
        setAlertVisible(true);
        return;
      }
      
      // Convert formatted string to numeric value
      const numericSavings = parseFloat(savingsGoal.replace(/,/g, "")) || 0;

      // update context
      setUser((prev) => ({
        name: name.trim(),
        currency,
        image: prev?.image ?? null,
        savingsGoal: numericSavings,
      }));

      // persist to AsyncStorage
      const savedUserRaw = await AsyncStorage.getItem("user");
      const saved = savedUserRaw ? JSON.parse(savedUserRaw) : {};
      const merged = {
        ...saved,
        name: name.trim(),
        currency,
        savingsGoal: numericSavings,
      };
      await AsyncStorage.setItem("user", JSON.stringify(merged));

      if (pinAsString.length === PIN_LENGTH) {
        await AsyncStorage.setItem("userPin", pinAsString);
      }

      setAlertMessage("Profile updated successfully!");
      setAlertType("success");
      setAlertVisible(true);
    } catch (error) {
      setAlertMessage("Failed to save changes. Please try again.");
      setAlertType("error");
      setAlertVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  const currencySymbols: Record<string, string> = {
    USD: "$",
    POUND: "£",
    ریال: "ریال",
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
      {/* Backdrop subtle fade */}
      <RNAnimated.View
        style={[styles.sheet, { transform: [{ translateY }], opacity }]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "android" ? "padding" : undefined}
          style={{ flex: 1, marginTop: spacingY._15 }}
        >
          <Header
            title="Update Profile"
            leftIcon={<BackButton />}
            style={{ marginBottom: spacingY._15 }}
          />
          <View
            style={{
              height: 3,
              backgroundColor: colors.primary,
              width: "70%",
              marginVertical: spacingY._20,
              borderRadius: 2,
              alignSelf: "center",
            }}
          />
          {/* Content */}
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Name */}
            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Name</Text>
              <View style={styles.inputCard}>
                <TextInput
                  placeholder="Your Name"
                  placeholderTextColor={colors.neutral600}
                  value={name}
                  onChangeText={setName}
                  style={styles.textInput}
                  returnKeyType="done"
                />
              </View>
            </View>

            {/* Currency */}
            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Preferred Currency</Text>
              <View>
                <CurrencyDropdown selected={currency} onChange={setCurrency} />
              </View>
            </View>

            {/* Savings Goal */}
            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Monthly Savings Goal</Text>
              <View style={styles.inputCardRow}>
                <Text style={styles.currencySymbol}>
                  {getCurrencySymbol(currency)}
                </Text>
                <TextInput
                  placeholder="Enter amount"
                  placeholderTextColor={colors.neutral600}
                  value={savingsGoal}
                  onChangeText={(t) => {
                    let cleaned = t.replace(/[^0-9.]/g, "");
                    const parts = cleaned.split(".");
                    if (parts.length > 2) {
                      cleaned = parts[0] + "." + parts[1];
                    }
                    if (parts[0]) {
                      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                    }
                    setSavingsGoal(parts.join("."));
                  }}
                  style={[styles.textInput, { flex: 1 }]}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                />
              </View>
              <Text style={styles.hint}>
                Set a target amount to save each month.
              </Text>
            </View>

            {/* PIN */}
            <View style={styles.fieldBlock}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Change PIN</Text>
                <Text style={styles.hint}>(optional)</Text>
              </View>

              <View style={styles.pinRow}>
                {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                  <TextInput
                    key={i}
                    ref={pinRefs[i]}
                    style={[
                      styles.pinBox,
                      pinDigits[i] ? styles.pinBoxActive : undefined,
                    ]}
                    value={pinDigits[i]}
                    onChangeText={(t) => handlePinChange(i, t)}
                    keyboardType="number-pad"
                    returnKeyType={i === PIN_LENGTH - 1 ? "done" : "next"}
                    maxLength={1}
                    placeholder="•"
                    placeholderTextColor={colors.neutral600}
                  />
                ))}
              </View>

              <View style={styles.pinHelpRow}>
                <WarningCircle size={20} color={colors.rose} />
                <Text style={styles.pinHelpText}>
                  Enter a 4-digit PIN (optional). Each digit will light up as
                  you type.
                </Text>
              </View>
            </View>

            {/* Spacer so content is not hidden behind fixed footer */}
            <View style={{ height: verticalScale(90) }} />
          </ScrollView>

          {/* Bottom fixed Save */}
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

export default ProfileModal;

const styles = StyleSheet.create({
  // dim backdrop (in case ModalWrapper is plain)
  backdropShim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },

  // bottom sheet look
  sheet: {
    flex: 1,
    backgroundColor: colors.black,
    borderTopLeftRadius: radius._20 ?? 20,
    borderTopRightRadius: radius._20 ?? 20,
    paddingHorizontal: spacingX._20,
    paddingBottom: spacingY._10,
  },

  scrollContent: {
    paddingBottom: spacingY._10,
    gap: spacingY._20,
  },

  fieldBlock: {
    gap: spacingY._7,
  },

  labelRow: { flexDirection: "row", alignItems: "center", gap: spacingX._7 },

  label: {
    color: colors.textLighter,
    fontSize: verticalScale(15),
    marginLeft: spacingX._3,
    fontWeight: "600",
  },

  hint: {
    color: colors.neutral400,
    fontSize: verticalScale(13),
  },

  inputCard: {
    backgroundColor: colors.neutral900,
    borderRadius: radius._15,
    borderWidth: 1,
    borderColor: colors.neutral600,
    overflow: "hidden",
  },

  inputCardPadded: {
    backgroundColor: colors.neutral900,
    borderRadius: radius._15,
    borderWidth: 1,
    borderColor: colors.neutral800,
    paddingHorizontal: spacingX._10,
    paddingVertical: spacingY._5,
  },

  textInput: {
    height: verticalScale(52),
    paddingHorizontal: spacingX._15,
    color: colors.white,
    fontSize: verticalScale(15),
  },

  pinRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacingX._10,
  },

  pinBox: {
    flex: 1,
    height: verticalScale(56),
    borderRadius: radius._15,
    backgroundColor: colors.neutral900,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "700",
    color: colors.primary,
    borderWidth: 1,
    borderColor: colors.neutral600,
  },

  pinBoxActive: {
    backgroundColor: colors.neutral800,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },

  pinHelpRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingX._7,
    marginTop: spacingY._7,
    marginLeft: spacingX._3,
  },

  pinHelpText: {
    color: colors.rose,
    fontSize: verticalScale(12),
    flexShrink: 1,
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
    bottom: verticalScale(60),
    height: verticalScale(40),
    backgroundColor: "transparent",
    borderTopWidth: 1,
    borderTopColor: colors.neutral400,
    opacity: 0.45,
  },

  saveBtn: {
    height: verticalScale(52),
    borderRadius: radius._15,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  saveBtnText: {
    color: colors.black,
    fontWeight: "900",
    fontSize: verticalScale(16),
  },
  inputCardRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.neutral900,
    borderRadius: radius._15,
    borderWidth: 1,
    borderColor: colors.neutral600,
    overflow: "hidden",
    paddingHorizontal: spacingX._10,
  },
  currencySymbol: {
    color: colors.white,
    fontSize: verticalScale(16),
    marginRight: spacingX._5,
  },
});
