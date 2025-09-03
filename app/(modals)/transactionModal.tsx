import BackButton from "@/components/BackButton";
import Button from "@/components/Button";
import CustomDatePicker from "@/components/CustomDatePicker";
import DropdownData from "@/components/DropdownData";
import Header from "@/components/Header";
import ModalWrapper from "@/components/ModalWrapper";
import TrendAlert from "@/components/TrendAlert";
import { expenseCategories, incomeCategories } from "@/constants/data";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { TransactionType } from "@/type";
import { verticalScale } from "@/utils/styling";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSearchParams } from "expo-router/build/hooks";
import * as Icons from "phosphor-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Animated as RNAnimated,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface TransactionModalProps {
  onClose: () => void;
  onSaved: () => void;
  transactionId?: string;
  walletId: string;
}

const currencyColors: Record<string, string> = {
  USD: colors.green,
  POUND: colors.primaryLight,
  IRR: colors.yellow,
};

const getCurrencySymbol = (cur: string) => {
  switch (cur) {
    case "USD":
      return "$";
    case "POUND":
      return "£";
    case "IRR":
      return "﷼";
    default:
      return cur;
  }
};

const typeColors: Record<"income" | "expense", string> = {
  income: colors.green2,
  expense: colors.red,
};

const TransactionModal: React.FC<TransactionModalProps> = ({
  onClose,
  onSaved,
  transactionId,
}) => {
  const [transaction, setTransaction] = useState<TransactionType | undefined>();
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [wallet, setWallet] = useState<{
    amount: number;
    currency: string;
  } | null>(null);

  const [balance, setBalance] = useState<number>(0);
  const animatedBalance = useRef(new RNAnimated.Value(0)).current;

  const params = useSearchParams();
  const walletId = params.get("walletId");
  if (!walletId)
    throw new Error("WalletId is missing, cannot save transaction.");

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<"error" | "success">("success");

  const translateY = useRef(new RNAnimated.Value(300)).current;
  const opacity = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    const loadWallet = async () => {
      const walletsRaw = await AsyncStorage.getItem("wallets");
      const wallets = walletsRaw ? JSON.parse(walletsRaw) : [];
      const selected = wallets.find((w: any) => w.id === walletId);
      if (selected) {
        setWallet(selected);
        setBalance(selected.balance ?? 0);
        animatedBalance.setValue(selected.balance ?? 0);
      }
    };
    loadWallet();
  }, [walletId]);

  // remaining Balance
  useEffect(() => {
    if (!wallet) return;

    const numericAmount = parseFloat(amount.replace(/,/g, "")) || 0;
    const newBalance =
      type === "income"
        ? wallet.amount + numericAmount
        : wallet.amount - numericAmount;

    RNAnimated.timing(animatedBalance, {
      toValue: newBalance,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [amount, type, wallet]);

  // Listen to animated value and update display
  const [displayBalance, setDisplayBalance] = useState<number>(0);

  useEffect(() => {
    const id = animatedBalance.addListener(({ value }) => {
      setDisplayBalance(value);
    });
    return () => animatedBalance.removeListener(id);
  }, [animatedBalance]);

  useEffect(() => {
    const loadTransaction = async () => {
      if (!transactionId) return;
      const raw = await AsyncStorage.getItem("transactions");
      const all: TransactionType[] = raw ? JSON.parse(raw) : [];
      const found = all.find((t) => t.id === transactionId);
      if (found) {
        setTransaction(found);
        setType(found.type as "income" | "expense");
        setAmount(found.amount.toString());
        setCategory(found.category ?? "");
        setDescription(found.description ?? "");
        // Normalize date here
        let transactionDate: Date;
        if (found.date instanceof Date) transactionDate = found.date;
        else if (typeof found.date === "string")
          transactionDate = new Date(found.date);
        else if ("toDate" in found.date) transactionDate = found.date.toDate();
        else transactionDate = new Date();

        setDate(transactionDate);
      }
    };
    loadTransaction();
  }, [transactionId]);

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
      if (!type.trim()) throw new Error("choose a type");
      if (!amount.trim()) throw new Error("Amount is empty");
      if (!category.trim()) throw new Error("Category is required");

      const numericAmount = parseFloat(amount.replace(/,/g, "")) || 0;
      const storedRaw = await AsyncStorage.getItem("transactions");
      const stored: TransactionType[] = storedRaw ? JSON.parse(storedRaw) : [];

      let updatedTransactions: TransactionType[];
      if (transaction?.id) {
        updatedTransactions = stored.map((t) =>
          t.id === transaction.id
            ? {
                ...t,
                type,
                amount: numericAmount,
                category,
                description,
                date,
                walletId,
              }
            : t
        );
      } else {
        const newTransaction: TransactionType = {
          id: Date.now().toString(),
          type,
          amount: numericAmount,
          category,
          description,
          date,
          walletId,
        };
        updatedTransactions = [...stored, newTransaction];
      }

      await AsyncStorage.setItem(
        "transactions",
        JSON.stringify(updatedTransactions)
      );
      // Update wallet balance
      const walletsRaw = await AsyncStorage.getItem("wallets");
      const wallets = walletsRaw ? JSON.parse(walletsRaw) : [];
      const updatedWallets = wallets.map((w: any) => {
        if (w.id === walletId) {
          const newBalance =
            type === "income"
              ? w.amount + numericAmount
              : w.amount - numericAmount;
          return { ...w, amount: newBalance, balance: newBalance }; // Update balance
        }
        return w;
      });
      await AsyncStorage.setItem("wallets", JSON.stringify(updatedWallets));

      onSaved?.();

      setAlertMessage("Transaction saved successfully!");
      setAlertType("success");
      setAlertVisible(true);
      onClose?.();
    } catch (error: any) {
      console.error("Transaction save error:", error);
      setAlertMessage(error.message || "Failed to save transaction");
      setAlertType("error");
      setAlertVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  const animatedValue = useRef(new Animated.Value(0)).current;
  const [formattedBalance, setFormattedBalance] = useState("0.00");

  useEffect(() => {
    // Add listener to update formatted value
    const listenerId = animatedValue.addListener(({ value }) => {
      setFormattedBalance(
        value.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      );
    });

    // Animate
    Animated.timing(animatedValue, {
      toValue: displayBalance,
      duration: 1000,
      useNativeDriver: false,
    }).start();

    // Cleanup
    return () => {
      animatedValue.removeListener(listenerId);
    };
  }, [displayBalance]);

  const color =
    displayBalance > 5000
      ? colors.green
      : displayBalance > 0
      ? "orange"
      : "red";

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
            title={transaction ? "Edit Transaction" : "Add Transaction"}
            leftIcon={<BackButton />}
            style={{ marginBottom: spacingY._15 }}
          />

          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Type Selector */}
            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Type</Text>
              <View style={styles.row}>
                {["income", "expense"].map((t) => {
                  const isActive = type === t;
                  const color = typeColors[t as "income" | "expense"];

                  return (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.typeBtn,
                        isActive && {
                          backgroundColor: color + "50",
                          borderColor: color,
                          borderWidth: 1.5,
                        },
                      ]}
                      onPress={() => setType(t as "income" | "expense")}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 7,
                        }}
                      >
                        {t === "income" ? (
                          <Icons.TrendUp
                            size={25}
                            weight="bold"
                            color={color}
                          />
                        ) : (
                          <Icons.TrendDown
                            size={25}
                            weight="bold"
                            color={color}
                          />
                        )}
                        <Text
                          style={[
                            styles.typeText,
                            isActive && {
                              color: color,
                              fontWeight: "bold",
                            },
                          ]}
                        >
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Amount */}
            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Amount</Text>
              <View style={styles.amountInputCard}>
                <Text
                  style={[
                    styles.currencySymbol,
                    {
                      color: wallet
                        ? currencyColors[wallet.currency] || colors.primary
                        : colors.primary,
                    },
                  ]}
                >
                  {wallet ? getCurrencySymbol(wallet.currency) : "$"}
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
                  style={[styles.textInput, { color: typeColors[type] }]}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                />
              </View>
              <View
                style={{
                  marginTop: 5,
                }}
              >
                <View
                  style={{
                    alignItems: "center",
                    padding: 1,
                    elevation: 5,
                  }}
                >
                  <Icons.ArrowsMerge
                    size={28}
                    color={colors.white}
                    style={{ marginBottom: 5 }}
                  />
                  {/* Label */}
                  <Text
                    style={{
                      fontSize: verticalScale(13),
                      color: colors.neutral100,
                      letterSpacing: 0.5,
                      fontWeight: "bold",
                    }}
                  >
                    Remaining Balance Wallet
                  </Text>

                  {/* Balance */}
                  <View
                    style={{ flexDirection: "row", alignItems: "flex-end" }}
                  >
                    <Text
                      style={{
                        fontSize: verticalScale(22),
                        fontWeight: "600",
                        color: wallet
                          ? currencyColors[wallet.currency] || colors.primary
                          : colors.primary,
                        marginRight: 7,
                      }}
                    >
                      {getCurrencySymbol(wallet?.currency || "USD")}
                    </Text>

                    <Text
                      style={{ fontSize: 26, fontWeight: "bold", color: color }}
                    >
                      {formattedBalance}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Category */}
            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Category</Text>
              <DropdownData
                items={
                  type === "expense"
                    ? Object.values(expenseCategories)
                    : Object.values(incomeCategories)
                }
                selectedValue={category}
                onSelect={setCategory}
                placeholder="Select category"
              />
            </View>

            {/* Date Picker */}
            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Date</Text>
              <CustomDatePicker value={date} onChange={setDate} />
            </View>

            {/* Description */}
            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Description</Text>
              <View style={styles.inputCard}>
                <TextInput
                  placeholder="Optional note"
                  placeholderTextColor={colors.neutral600}
                  value={description}
                  onChangeText={setDescription}
                  style={[styles.textInput1, { height: verticalScale(70) }]}
                  multiline
                />
              </View>
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
              <Text style={styles.saveBtnText}>Save Transaction</Text>
            </Button>
          </View>
        </KeyboardAvoidingView>
      </RNAnimated.View>
    </ModalWrapper>
  );
};

export default TransactionModal;

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: colors.black,
    borderTopLeftRadius: radius._20,
    borderTopRightRadius: radius._20,
    paddingHorizontal: spacingX._20,
    paddingBottom: spacingY._10,
  },
  scrollContent: { paddingTop: spacingY._10, gap: spacingY._20 },
  fieldBlock: { gap: spacingY._5 },
  label: {
    color: colors.textLighter,
    fontSize: verticalScale(15),
    marginLeft: spacingX._3,
    fontWeight: "600",
    marginBottom: spacingY._3,
  },
  amountInputCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.neutral900,
    borderRadius: radius._12,
    borderWidth: 1,
    borderColor: colors.neutral700,
    paddingHorizontal: spacingX._15,
    height: verticalScale(52),
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  currencySymbol: {
    fontSize: verticalScale(20),
    fontWeight: "bold",
    color: colors.primary,
  },
  inputCard: {
    backgroundColor: colors.neutral900,
    borderRadius: radius._10,
    borderWidth: 1,
    borderColor: colors.neutral600,
    overflow: "hidden",
  },
  dateInputCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacingX._15,
    height: verticalScale(52),
    backgroundColor: colors.neutral900,
    borderRadius: radius._10,
    borderWidth: 1,
    borderColor: colors.neutral600,
    justifyContent: "flex-start",
  },
  textInput: {
    height: verticalScale(52),
    paddingHorizontal: spacingX._15,
    color: colors.white,
    fontSize: verticalScale(17),
    fontWeight: "bold",
  },
  textInput1: {
    height: verticalScale(52),
    paddingHorizontal: spacingX._15,
    color: colors.white,
    fontSize: verticalScale(15),
    fontWeight: "bold",
  },
  row: { flexDirection: "row", gap: spacingX._10 },
  typeBtn: {
    flex: 1,
    height: verticalScale(40),
    borderRadius: radius._10,
    borderWidth: 1,
    borderColor: colors.neutral600,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.neutral800,
  },
  typeText: { color: colors.white, fontWeight: "600", fontSize: 19 },
  footer: {
    position: "absolute",
    left: spacingX._20,
    right: spacingX._20,
    bottom: spacingY._3,
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
