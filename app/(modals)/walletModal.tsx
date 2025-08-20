import BackButton from "@/components/BackButton";
import Button from "@/components/Button";
import CurrencyDropdown from "@/components/CurrencyDropdown";
import Header from "@/components/Header";
import ImageUpload from "@/components/ImageUpload";
import ModalWrapper from "@/components/ModalWrapper";
import TrendAlert from "@/components/TrendAlert";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { useAuth } from "@/contexts/authContext";
import { WalletType } from "@/type";
import { verticalScale } from "@/utils/styling";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router"; // <-- useSearchParams
import { useSearchParams } from "expo-router/build/hooks";
import React, { useEffect, useRef, useState } from "react";
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

interface WalletModalProps {
  onClose: () => void;
  onSaved: () => void; // callback to reload wallets in parent
}

const WalletModal: React.FC<WalletModalProps> = ({
  onClose,
  onSaved,
}) => {
  const router = useRouter();
  const params = useSearchParams(); // get query params
  const walletId = params.get("walletId"); // walletId from swipe edit

  const { user } = useAuth();

  const [wallet, setWallet] = useState<WalletType | undefined>();
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [amount, setAmount] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<"error" | "success">("success");

  const translateY = useRef(new RNAnimated.Value(300)).current;
  const opacity = useRef(new RNAnimated.Value(0)).current;

  // Load wallet if editing
  useEffect(() => {
    const loadWallet = async () => {
      if (!walletId) {
        // Reset fields for creating new wallet
        setWallet(undefined);
        setName("");
        setCurrency("USD");
        setAmount("");
        setImage(null);
        return;
      }
  
      const raw = await AsyncStorage.getItem("wallets");
      const allWallets: WalletType[] = raw ? JSON.parse(raw) : [];
      const found = allWallets.find((w) => w.id?.toString() === walletId);
  
      if (found) {
        setWallet(found);
        setName(found.name ?? "");
        setCurrency(found.currency ?? "USD");
        setAmount(found.amount?.toString() ?? "");
        setImage(found.image ?? null);
      }
    };
  
    loadWallet();
  }, [walletId]);
  

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

  const handleSave = async () => {
    setIsLoading(true);
    try {
      if (!name.trim()) throw new Error("Wallet name is empty");

      const numericAmount = parseFloat(amount.replace(/,/g, "")) || 0;
      const storedWalletsRaw = await AsyncStorage.getItem("wallets");
      const storedWallets: WalletType[] = storedWalletsRaw ? JSON.parse(storedWalletsRaw) : [];

      const currentDate = new Date().toISOString();

      let updatedWallets: WalletType[];
      if (wallet?.id) {
        updatedWallets = storedWallets.map((w) =>
          w.id === wallet.id ? { ...w, name: name.trim(), amount: numericAmount, currency, image, updated: currentDate, } : w
        );
      } else {
        const newWallet: WalletType = {
          id: Date.now().toString(),
          name: name.trim(),
          amount: numericAmount,
          currency,
          image,
          created: currentDate,
          updated: currentDate,
        };
        updatedWallets = [...storedWallets, newWallet];
      }

      await AsyncStorage.setItem("wallets", JSON.stringify(updatedWallets));

      setAlertMessage("Wallet saved successfully!");
      setAlertType("success");
      setAlertVisible(true);

      onSaved?.();
      onClose?.();
    } catch (error) {
      console.error("Wallet save error:", error);
      setAlertMessage("Failed to save wallet. Please try again.");
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

  if (walletId && !wallet) {
    return (
      <ModalWrapper bg={colors.black}>
        <Text style={{ color: colors.white, padding: 20 }}>Loading wallet...</Text>
      </ModalWrapper>
    );
  }
  
  return (
    <ModalWrapper bg={colors.black}>
      <TrendAlert
        visible={alertVisible}
        message={alertMessage}
        type={alertType}
        onClose={() => setAlertVisible(false)}
      />
      <RNAnimated.View
        style={[styles.sheet, { transform: [{ translateY }], opacity }]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "android" ? "padding" : undefined}
          style={{ flex: 1, marginTop: spacingY._15 }}
        >
          <Header
            title={wallet ? "Edit Wallet" : "Create Wallet"}
            leftIcon={<BackButton />}
            style={{ marginBottom: spacingY._15 }}
          />
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Wallet Name */}
            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Wallet Name</Text>
              <View style={styles.inputCard}>
                <TextInput
                  placeholder="e.g. My Savings"
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
              <Text style={styles.label}>Currency</Text>
              <CurrencyDropdown selected={currency} onChange={setCurrency} />
            </View>

            {/* Starting Balance */}
            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Starting Balance</Text>
              <View style={styles.inputCardRow}>
                <Text style={styles.currencySymbol}>
                  {getCurrencySymbol(currency)}
                </Text>
                <TextInput
                  placeholder="Enter amount"
                  placeholderTextColor={colors.neutral600}
                  value={amount}
                  onChangeText={(t) => {
                    let cleaned = t.replace(/[^0-9.]/g, "");
                    const parts = cleaned.split(".");
                    if (parts.length > 2) cleaned = parts[0] + "." + parts[1];
                    if (parts[0])
                      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                    setAmount(parts.join("."));
                  }}
                  style={[styles.textInput, { flex: 1 }]}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                />
              </View>
              <Text style={styles.hint}>
                Set the initial balance for this wallet.
              </Text>
            </View>

            {/* Wallet Image */}
            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Wallet Image</Text>
              <ImageUpload
                file={image}
                onSelect={(uri) => setImage(uri)}
                onClear={() => setImage(null)}
                placeholder="Tap to upload image"
              />
            </View>

            <View style={{ height: verticalScale(90) }} />
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.footerShadow} />
            <Button
              loading={isLoading}
              onPress={handleSave}
              style={styles.saveBtn}
            >
              <Text style={styles.saveBtnText}>Save Wallet</Text>
            </Button>
          </View>
        </KeyboardAvoidingView>
      </RNAnimated.View>
    </ModalWrapper>
  );
};

export default WalletModal;

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: colors.black,
    borderTopLeftRadius: radius._20,
    borderTopRightRadius: radius._20,
    paddingHorizontal: spacingX._20,
    paddingBottom: spacingY._10,
  },
  scrollContent: { paddingBottom: spacingY._10, gap: spacingY._20 },
  fieldBlock: { gap: spacingY._7 },
  label: {
    color: colors.textLighter,
    fontSize: verticalScale(15),
    marginLeft: spacingX._3,
    fontWeight: "600",
  },
  hint: { color: colors.neutral400, fontSize: verticalScale(13) },
  inputCard: {
    backgroundColor: colors.neutral900,
    borderRadius: radius._15,
    borderWidth: 1,
    borderColor: colors.neutral600,
    overflow: "hidden",
  },
  textInput: {
    height: verticalScale(52),
    paddingHorizontal: spacingX._15,
    color: colors.white,
    fontSize: verticalScale(15),
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
});
