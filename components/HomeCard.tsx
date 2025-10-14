import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { WalletType } from "@/type";
import { formatnumber } from "@/utils/Formatnumber";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient"; // only if using Expo
import * as Icons from "phosphor-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Modal,
  PanResponder,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Pressable } from "react-native-gesture-handler";
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Typo from "./Typo";

interface WalletSelectorProps {
  wallets: WalletType[];
  currency: string;
  total: number;
  selectedWallet: WalletType | null;
  selectedWalletTotals?: { totalIncome: number; totalExpense: number };
  onWalletSelect?: (wallet: WalletType) => void;
  lastTransaction?: {
    date: string | number | Date;
    type: "income" | "expense";
    category?: string;
    amount?: number;
  };
}

const currencyColors: Record<string, string> = {
  USD: colors.green,
  GBP: colors.primaryLight,
  IRR: colors.yellow,
};

const screenWidth = Dimensions.get("window").width;
const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const WalletSelector: React.FC<WalletSelectorProps> = ({
  wallets,
  currency,
  total,
  selectedWallet,
  selectedWalletTotals,
  onWalletSelect,
  lastTransaction,
}) => {
  const currencies = useMemo(
    () =>
      Array.from(
        new Set(wallets.map((w) => w.currency).filter((c): c is string => !!c))
      ),
    [wallets]
  );

  

  const [selectedCurrency, setSelectedCurrency] = useState<string>(
    currencies[0] || ""
  );
  const [modalVisible, setModalVisible] = useState(false);

  const filteredWallets = wallets.filter(
    (w) => w.currency === selectedCurrency
  );

  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) translateY.setValue(gestureState.dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 150) {
          closeModal();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const openModal = () => {
    setModalVisible(true);
    translateY.setValue(SCREEN_HEIGHT);
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
    Animated.timing(translateY, {
      toValue: 0,
      duration: 400,
      delay: 1,
      useNativeDriver: true,
    }).start();
  };

  const closeModal = () => {
    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setModalVisible(false));
  };

  const getCurrencySymbol = (cur: string) => {
    switch (cur) {
      case "USD":
        return "$";
      case "GBP":
        return "£";
      case "IRR":
        return "﷼";
      default:
        return cur;
    }
  };

  const symbolScale = useSharedValue(1);
  const handleSymbolPress = () => {
    symbolScale.value = withSpring(1.2);
    setTimeout(() => {
      symbolScale.value = withSpring(1);
    }, 200);
  };

  const animatedSymbolStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: symbolScale.value }],
    };
  });

  const indicatorPosition = useRef(new Animated.Value(0)).current;
  const tabWidth = screenWidth / currencies.length - 16; // space between tabs

  useEffect(() => {
    const index = currencies.findIndex((c) => c === selectedCurrency);
    Animated.spring(indicatorPosition, {
      toValue: index * (tabWidth + 8),
      useNativeDriver: true,
    }).start();
  }, [selectedCurrency]);

  const scaleValues = useRef(
    currencies.reduce((acc, cur) => {
      acc[cur] = new Animated.Value(cur === selectedCurrency ? 1.1 : 1);
      return acc;
    }, {} as Record<string, Animated.Value>)
  ).current;

  // Animate scale when selectedCurrency changes
  useEffect(() => {
    currencies.forEach((cur) => {
      Animated.spring(scaleValues[cur], {
        toValue: cur === selectedCurrency ? 1.15 : 1,
        useNativeDriver: true,
        bounciness: 12,
      }).start();
    });
  }, [selectedCurrency]);

  // Animated arrow hint
  const arrowTranslateY = useSharedValue(0);
  useEffect(() => {
    if (!selectedWallet) {
      arrowTranslateY.value = withRepeat(
        withSequence(
          withTiming(-8, { duration: 500 }),
          withTiming(0, { duration: 500 })
        ),
        -1,
        true
      );
    }
  }, [selectedWallet]);

  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -10,
          duration: 600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Animated style
  const arrowAnimatedStyle = {
    transform: [{ translateY: bounceAnim }],
    shadowColor: "#00FFA3",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
  };

  // Helper
  const [isFirstTime, setIsFirstTime] = useState(wallets.length === 0);
  const [showWalletHelper, setShowWalletHelper] = useState(true);
  !selectedWallet && wallets.length > 0;
  useEffect(() => {
    if (selectedWallet) setShowWalletHelper(false);
  }, [selectedWallet]);

  useEffect(() => {
    setIsFirstTime(wallets.length === 0);
    if (wallets.length > 0 && !selectedWallet) setShowWalletHelper(true);
  }, [wallets]);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Compute percentage change between last transaction and previous total
  const getTrend = () => {
    if (!selectedWalletTotals || !lastTransaction) return null;

    const { totalIncome, totalExpense } = selectedWalletTotals;
    let change = 0;
    let type: "income" | "expense" = lastTransaction.type;

    if (type === "income" && totalIncome) {
      // percentage of last transaction vs total income
      change = (lastTransaction.amount! / totalIncome) * 100;
    } else if (type === "expense" && totalExpense) {
      change = (lastTransaction.amount! / totalExpense) * 100;
    }

    const isPositive = type === "income";
    return {
      text: `${isPositive ? "" : ""} ${change.toFixed(1)}% ${
        isPositive ? "of income" : "of expense"
      }`,
      color: isPositive ? colors.green : colors.red,
      icon: isPositive ? (
        <Icons.TrendUp size={20} color={colors.green} />
      ) : (
        <Icons.TrendDown size={20} color={colors.red} />
      ),
    };
  };

  useEffect(() => {
    const migrateWallets = async () => {
      try {
        const raw = await AsyncStorage.getItem("wallets");
        if (!raw) return;
  
        const wallets = JSON.parse(raw);
  
        const fixed = wallets.map((w: any) =>
          w.currency === "POUND" ? { ...w, currency: "GBP" } : w
        );
  
        await AsyncStorage.setItem("wallets", JSON.stringify(fixed));
      } catch (e) {
        console.log("Migration error:", e);
      }
    };
  
    migrateWallets();
  }, []);
  
  return (
    <View style={{ flex: 1, padding: spacingX._3 }}>
      {/* Currency Tabs */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: spacingY._3,
          gap: spacingX._3,
          marginHorizontal: spacingX._40,
          paddingVertical: spacingX._3,
        }}
      >
        {currencies.map((cur) => {
          const isSelected = selectedWallet?.currency === cur;
          const tabColor = currencyColors[cur] || colors.green;

          return (
            <TouchableOpacity
              key={cur}
              activeOpacity={0.8}
              onPress={() => {
                setSelectedCurrency(cur);
                openModal();
              }}
              style={styles.tabWrapper}
            >
              <Animated.View
                style={[
                  styles.tabButton,
                  {
                    backgroundColor: isSelected ? tabColor : colors.neutral800,
                    transform: [{ scale: scaleValues[cur] }],
                    shadowColor: isSelected ? colors.primary : "#000",
                    shadowOpacity: isSelected ? 0.5 : 0.2,
                  },
                ]}
              >
                <Typo
                  size={isSelected ? 16 : 15}
                  fontWeight="700"
                  color={isSelected ? colors.white : colors.neutral400}
                >
                  {getCurrencySymbol(cur)}
                </Typo>
              </Animated.View>
              {isSelected && (
                <View
                  style={[styles.tabIndicator, { backgroundColor: tabColor }]}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      <View
        style={{
          height: 2,
          backgroundColor: colors.neutral600,
          width: "100%",
          marginVertical: spacingY._10,
          borderRadius: 2,
          alignSelf: "center",
        }}
      />

      {/* Global first-time helper */}
      {isFirstTime && (
        <View
          style={{
            marginVertical: spacingY._30,
            marginHorizontal: spacingX._3,
            padding: spacingX._5,
            borderRadius: radius._20,
            backgroundColor: "#1F2937",
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.25,
            shadowRadius: 20,
            elevation: 12,
            overflow: "hidden",
          }}
        >
          {/* Gradient top accent */}
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 6,
              borderTopLeftRadius: radius._20,
              borderTopRightRadius: radius._20,
              backgroundColor: "#3B82F6",
            }}
          />

          {/* Floating wallet icon with pulse */}
          <Animated.View
            style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: "#3B82F6",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: spacingY._7,
              marginVertical: spacingY._10,
              shadowColor: "#3B82F6",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 10,
              elevation: 6,
              transform: [{ scale: pulseAnim }],
            }}
          >
            <Icons.Wallet size={28} color={colors.white} weight="bold" />
          </Animated.View>

          {/* Title */}
          <Typo
            size={18}
            color={colors.white}
            fontWeight="700"
            style={{ textAlign: "center", marginBottom: 6 }}
          >
            Welcome!
          </Typo>

          {/* Description */}
          <Typo
            size={14}
            color={colors.neutral400}
            fontWeight="400"
            style={{
              textAlign: "center",
              lineHeight: 22,
              paddingHorizontal: spacingX._3,
            }}
          >
            You don’t have any wallets yet. Create your first wallet in the
            wallet tab to get started and manage your finances easily.
          </Typo>

          {/* Soft blurred background shapes */}
          <View
            style={{
              position: "absolute",
              width: 100,
              height: 100,
              borderRadius: 50,
              backgroundColor: "#3B82F633",
              top: -30,
              right: -30,
              transform: [{ rotate: "25deg" }],
            }}
          />
          <View
            style={{
              position: "absolute",
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: "#10B98133",
              bottom: -40,
              left: -40,
              transform: [{ rotate: "-15deg" }],
            }}
          />
        </View>
      )}

      {/* Wallet selection helper */}
      {showWalletHelper && (
        <View
          style={{
            marginVertical: spacingY._15,
            marginHorizontal: spacingX._3,
            padding: spacingX._10,
            borderRadius: radius._20,
            backgroundColor: "#1E293B", // dark, soft card
            flexDirection: "row",
            alignItems: "center",
            gap: spacingX._3,
            borderWidth: 1,
            borderColor: "#374151", // subtle border for depth
          }}
        >
          {/* Icon Circle */}
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: "#3B82F6", // trend accent
              justifyContent: "center",
              alignItems: "center",
              marginHorizontal: spacingX._7,
            }}
          >
            <Animated.View style={arrowAnimatedStyle}>
              <Icons.ArrowUp size={22} color={colors.white} weight="bold" />
            </Animated.View>
          </View>

          {/* Text Content */}
          <View style={{ flex: 1 }}>
            <Typo
              size={15}
              fontWeight="600"
              color={colors.white}
              style={{ marginBottom: 3 }}
            >
              Choose a Wallet
            </Typo>
            <Typo size={13} fontWeight="400" color={colors.neutral400}>
              Tap one of the tabs above to view your balance and transactions.
            </Typo>
          </View>

          {/* Right Accent Line */}
          <View
            style={{
              width: 4,
              height: 28,
              borderRadius: 2,
              backgroundColor: "#3B82F6",
            }}
          />
        </View>
      )}

      {selectedWallet && (
        <LinearGradient
          colors={["#0A0C12", "#0F172A", "#111827", "#1E293B"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 3, y: 3 }}
          style={styles.card}
        >
          <View style={styles.header}>
            {/* Left: Wallet info */}
            <View style={styles.walletInfo}>
              <Typo size={11} color="#6B7280" style={styles.walletLabel}>
                Wallet Name
              </Typo>
              <Typo size={18} fontWeight="600" color="#F9FAFB">
                {selectedWallet.name}
              </Typo>
            </View>

            {/* Right: Currency badge */}
            <View
              style={[
                styles.currencyBadge,
                {
                  backgroundColor:
                    currencyColors[selectedWallet.currency || "USD"] + "33",
                },
              ]}
            >
              <Typo
                size={14}
                fontWeight="700"
                color={currencyColors[selectedWallet.currency || "USD"]}
              >
                {selectedWallet.currency}
              </Typo>
            </View>
          </View>

          {/* Balance Section */}
          <View style={styles.balanceSection}>
            <Typo size={15} color="#9CA3AF">
              Available Balance <Icons.Scales size={24} color={colors.white} />
            </Typo>

            <View style={{ position: "relative", marginTop: 8 }}>
              <View style={styles.balanceRow}>
                <Pressable onPress={handleSymbolPress}>
                  <Animated.View style={animatedSymbolStyle}>
                    <Typo
                      size={32}
                      fontWeight="bold"
                      color={currencyColors[selectedWallet.currency || "USD"]}
                    >
                      {getCurrencySymbol(selectedWallet.currency || "")}
                    </Typo>
                  </Animated.View>
                </Pressable>
                <Typo
                  size={30}
                  fontWeight="bold"
                  color={currencyColors[selectedWallet.currency || "USD"]}
                  style={{ marginLeft: 8 }}
                >
                  {(selectedWallet.amount || 0).toLocaleString()}
                </Typo>
              </View>
            </View>
          </View>

          {/* Budget progress bar */}
          {selectedWallet.limit && selectedWallet.used !== undefined && (
            <View style={{ marginTop: 16 }}>
              <View
                style={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: "#1F2937",
                  overflow: "hidden",
                }}
              >
                <Animated.View
                  style={{
                    height: "100%",
                    width: `${Math.min(
                      (selectedWallet.used / selectedWallet.limit) * 100,
                      100
                    )}%`,
                    backgroundColor:
                      currencyColors[selectedWallet.currency || "USD"],
                  }}
                />
              </View>
              <Typo size={12} color="#9CA3AF" style={{ marginTop: 6 }}>
                {selectedWallet.used?.toLocaleString()} /{" "}
                {selectedWallet.limit?.toLocaleString()} spent
              </Typo>
            </View>
          )}
        </LinearGradient>
      )}

      {selectedWallet && (
        <View style={styles.summaryContainer}>
          {/* Income */}
          <LinearGradient
            colors={["#062615", "#0A3A1F"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.summaryItem, { marginRight: 6 }]}
          >
            <View
              style={[
                styles.iconBox,
                {
                  backgroundColor: "rgba(16,185,129,0.2)",
                  shadowColor: "#10B981",
                  shadowOpacity: 0.4,
                  shadowRadius: 8,
                },
              ]}
            >
              <Icons.PiggyBank size={28} color="#10B981" weight="bold" />
            </View>
            <View style={styles.summaryText}>
              <Typo
                size={12}
                color={colors.neutral300}
                style={{ marginBottom: 2 }}
              >
                Income
              </Typo>
              <Typo size={18} fontWeight="700" color="#10B981">
              {formatnumber(selectedWalletTotals?.totalIncome || 0, getCurrencySymbol(selectedWallet.currency || ""))}
              </Typo>
            </View>
          </LinearGradient>

          {/* Expense */}
          <LinearGradient
            colors={["#3A0F0F", "#6B1A1A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.summaryItem}
          >
            <View
              style={[
                styles.iconBox,
                {
                  backgroundColor: "rgba(239,68,68,0.2)",
                  shadowColor: "#EF4444",
                  shadowOpacity: 0.4,
                  shadowRadius: 8,
                },
              ]}
            >
              <Icons.ShoppingBag size={28} color="#EF4444" weight="bold" />
            </View>
            <View style={styles.summaryText}>
              <Typo
                size={12}
                color={colors.neutral300}
                style={{ marginBottom: 2 }}
              >
                Expense
              </Typo>
              <Typo size={18} fontWeight="700" color="#EF4444">
              {formatnumber(selectedWalletTotals?.totalExpense || 0, getCurrencySymbol(selectedWallet.currency || ""))}
              </Typo>
            </View>
          </LinearGradient>
        </View>
      )}

      {/* Saving */}
      {selectedWallet && (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            marginTop: 12,
            paddingHorizontal: 16,
          }}
        >
          <LinearGradient
            colors={["#062645", "#0A3A7F"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.2, y: 0.8 }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 10,
              borderRadius: radius._12,
              shadowColor: "#000",
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 6,
              minWidth: 220,
              backgroundColor: "rgba(255,255,255,0.05)",
            }}
          >
            {/* Icon */}
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: radius._12,
                backgroundColor: "rgba(59,130,246,0.2)",
                justifyContent: "center",
                alignItems: "center",
                marginRight: 16,
                shadowColor: "#3B82F6",
                shadowOpacity: 0.4,
                shadowRadius: 8,
              }}
            >
              <Icons.Bank size={28} color="#3B82F6" weight="bold" />
            </View>

            {/* Text & Value */}
            <View style={{ flex: 1 }}>
              <Typo
                size={12}
                color={colors.neutral300}
                style={{ marginBottom: 2 }}
              >
                Saving
              </Typo>
              <Typo size={18} fontWeight="700" color="#3B82F6">
              {formatnumber(
    (selectedWalletTotals?.totalIncome || 0) - (selectedWalletTotals?.totalExpense || 0),
    getCurrencySymbol(selectedWallet.currency || "")
  )}
              </Typo>

              {/* Progress Bar */}
              <View
                style={{
                  marginTop: 8,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: "rgba(255,255,255,0.15)",
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: "#3B82F6",
                    width: `${Math.min(
                      (((selectedWalletTotals?.totalIncome || 0) -
                        (selectedWalletTotals?.totalExpense || 0)) /
                        (selectedWalletTotals?.totalIncome || 1)) *
                        100,
                      100
                    )}%`,
                  }}
                />
              </View>
            </View>
          </LinearGradient>
        </View>
      )}

    

      {/* Last transaction */}
      {selectedWallet && lastTransaction && (
        <Animated.View style={{ marginTop: 12 }}>
          <Pressable
            android_ripple={{
              color: "rgba(255,255,255,0.1)",
              borderless: true,
            }}
            style={{ borderRadius: 26 }}
          >
            <LinearGradient
              colors={
                lastTransaction.type === "income"
                  ? ["rgba(34,197,94,0.4)", "rgba(34,197,94,0.05)"]
                  : ["rgba(239,68,68,0.4)", "rgba(239,68,68,0.05)"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 0.3, y: 0.8 }}
              style={{
                padding: 12,
                borderRadius: radius._12,
                borderWidth: 1,
                borderColor:
                  lastTransaction.type === "income"
                    ? "rgba(34,197,94,0.4)"
                    : "rgba(239,68,68,0.4)",
                shadowColor:
                  lastTransaction.type === "income" ? colors.green : colors.red,
                shadowOpacity: 0.25,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 8 },
                
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 1,
                }}
              >
                <Typo size={13} fontWeight="500" color={colors.neutral400}>
                  Last Transaction
                </Typo>
                <Icons.ClockClockwise
                  size={20}
                  color={colors.white}
                  style={{ marginLeft: 6 }}
                />
              </View>

              {/* Row */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                {/* Left */}
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  {/* Icon with glow */}
                  <Animated.View
                    style={{
                      width: 58,
                      height: 58,
                      borderRadius: 20,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 14,
                      backgroundColor:
                        lastTransaction.type === "income"
                          ? "rgba(34,197,94,0.18)"
                          : "rgba(239,68,68,0.18)",
                    }}
                  >
                    {lastTransaction.type === "income" ? (
                      <Icons.TrendUp
                        size={30}
                        color={colors.green}
                        weight="fill"
                      />
                    ) : (
                      <Icons.TrendDown
                        size={30}
                        color={colors.red}
                        weight="fill"
                      />
                    )}
                  </Animated.View>

                  {/* Category + Date */}
                  <View>
                    <Typo size={18} fontWeight="600" color={colors.white}>
                      {lastTransaction.category ||
                        (lastTransaction.type === "income"
                          ? "Income"
                          : "Expense")}
                    </Typo>
                    <Typo
                      size={12}
                      color={colors.neutral500}
                      style={{ marginTop: 2 }}
                    >
                      {new Date(lastTransaction.date).toLocaleDateString(
                        undefined,
                        {
                          month: "short",
                          day: "numeric",
                        }
                      )}{" "}
                      ·{" "}
                      {new Date(lastTransaction.date).toLocaleTimeString(
                        undefined,
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </Typo>
                  </View>
                </View>

                {/* Right */}
                <View style={{ alignItems: "flex-end" }}>
                  <Typo
                    size={19}
                    fontWeight="700"
                    color={
                      lastTransaction.type === "income"
                        ? colors.green
                        : colors.red
                    }
                  >
                    {getCurrencySymbol(selectedWallet.currency || "")}{" "}
                    {lastTransaction.amount?.toLocaleString()}
                  </Typo>

                  {/* Status chip */}
                  <View
                    style={{
                      marginTop: 6,
                      paddingHorizontal: 12,
                      paddingVertical: 4,
                      borderRadius: 14,
                      backgroundColor:
                        lastTransaction.type === "income"
                          ? "rgba(34,197,94,0.15)"
                          : "rgba(239,68,68,0.15)",
                    }}
                  >
                    <Typo
                      size={11}
                      fontWeight="600"
                      color={
                        lastTransaction.type === "income"
                          ? colors.green
                          : colors.red
                      }
                    >
                      {lastTransaction.type === "income" ? "Received" : "Spent"}
                    </Typo>
                  </View>

                  {/* Trend insight */}
                  {getTrend() && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginTop: 6,
                      }}
                    >
                      {getTrend()?.icon}
                      <Typo
                        size={11}
                        color={getTrend()?.color}
                        style={{ marginLeft: 5 }}
                      >
                        {getTrend()?.text}
                      </Typo>
                    </View>
                  )}
                </View>
              </View>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      )}

      {/* Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[styles.bottomSheet, { transform: [{ translateY }] }]}
            {...panResponder.panHandlers}
          >
            <View style={styles.borderOverlay} pointerEvents="none" />
            {/* Drag Handle */}
            <View style={styles.dragHandle} />

            {/* Header */}
            <View style={styles.sheetHeader}>
              {/* Left Section: Wallet Icon */}
              <View style={styles.headerLeft}>
                <View style={styles.walletIconWrapper}>
                  <Icons.Wallet size={40} color={colors.primaryDark} />
                </View>
                <View>
                  <Typo size={18} fontWeight="700" color={colors.neutral100}>
                    Select Wallet
                  </Typo>
                  <Typo size={14} color={colors.neutral400}>
                    Available{" "}
                    <Typo size={18} color={currencyColors[selectedCurrency]}>
                      {getCurrencySymbol(selectedCurrency)}
                    </Typo>
                  </Typo>
                </View>
              </View>

              {/* Right Section: Close Button */}
              <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                <Typo size={15} fontWeight="600" color={colors.neutral300}>
                  ✕
                </Typo>
              </TouchableOpacity>
            </View>
            <View
              style={{
                height: 3,
                backgroundColor: colors.neutral500,
                width: "100%",
                marginVertical: spacingY._10,
                borderRadius: 2,
                alignSelf: "center",
              }}
            />

            {/* Total Balance */}
            <View style={styles.totalBalanceContainer}>
              <Typo size={14} color={colors.neutral400}>
                Total Balance
              </Typo>
              <View style={styles.balanceRow}>
                <Typo
                  size={22}
                  fontWeight="700"
                  color={currencyColors[selectedCurrency]}
                >
                  {filteredWallets
                    .reduce((sum, w) => sum + (w.amount || 0), 0)
                    .toLocaleString()}{" "}
                  {getCurrencySymbol(selectedCurrency)}
                </Typo>
              </View>
            </View>

            {/* Wallet List */}
            <FlatList
              data={filteredWallets}
              keyExtractor={(item) => item.id ?? item.name}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: spacingY._3 }}
              renderItem={({ item }) => {
                const isSelected = selectedWallet?.id === item.id;

                return (
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => {
                      onWalletSelect?.(item);
                      closeModal();
                    }}
                    style={[
                      {
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingVertical: spacingY._3,
                        paddingHorizontal: spacingX._5,
                        borderRadius: radius._10,
                        marginBottom: spacingY._10,
                        backgroundColor: isSelected
                          ? currencyColors[item.currency || "USD"]
                          : colors.neutral850,
                        borderWidth: isSelected ? 1 : 0,
                        borderColor: "#ffffff",
                        shadowColor: "#000",
                        shadowOpacity: isSelected ? 0.25 : 0.12,
                        shadowRadius: 10,
                        shadowOffset: { width: 0, height: 5 },
                      },
                    ]}
                  >
                    {/* Left: Wallet name + avatar */}
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <View
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 14,
                          justifyContent: "center",
                          alignItems: "center",
                          backgroundColor: isSelected
                            ? "rgba(255,255,255,0.25)"
                            : "rgba(255,255,255,0.1)",
                        }}
                      >
                        <Typo
                          size={16}
                          fontWeight="700"
                          color={isSelected ? colors.neutral900 : colors.white}
                        >
                          {item.name.charAt(0)}
                        </Typo>
                      </View>
                      <Typo
                        size={16}
                        fontWeight="600"
                        color={isSelected ? colors.neutral900 : colors.white}
                      >
                        {item.name}
                      </Typo>
                    </View>

                    {/* Right: Amount + Checkmark */}
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Typo
                        size={16}
                        fontWeight="700"
                        color={isSelected ? colors.neutral900 : colors.white}
                      >
                        {getCurrencySymbol(item.currency || "")}{" "}
                        {item.amount?.toLocaleString()}
                      </Typo>

                      {isSelected && (
                        <Icons.Check
                          size={23}
                          color={colors.white}
                          style={{
                            backgroundColor: colors.green,
                            borderRadius: 999,
                            padding: 2,
                          }}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

export default WalletSelector;

const styles = StyleSheet.create({
  tab: {
    paddingVertical: spacingY._3,
    paddingHorizontal: spacingX._12,
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  card: {
    borderRadius: radius._20,
    padding: 20,
    marginVertical: 16,
    shadowColor: "#2157a3",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 2,
    borderColor: "#2E3A59",
  },

  header: {
    marginBottom: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  walletInfo: {
    flexDirection: "column",
  },

  walletLabel: {
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 4,
    color: "#9CA3AF",
  },

  currencyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacingY._10,
  },

  balanceSection: {
    marginBottom: 5,
  },

  summaryContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 2,
    paddingHorizontal: spacingX._7,
  },

  summaryItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 5,
    backgroundColor: "rgba(255,255,255,0.05)",
  },

  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  summaryText: {
    flex: 1,
    justifyContent: "center",
  },

  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  borderOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderTopWidth: 5,
    borderLeftWidth: 2,
    borderRightWidth: 0.5,
    borderColor: colors.neutral600,
    borderTopLeftRadius: radius._30,
    borderTopRightRadius: radius._30,
    height: "60%",
    top: 0,
    alignSelf: "center",
  },

  bottomSheet: {
    backgroundColor: colors.neutral900,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: spacingX._20,
    maxHeight: "75%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  dragHandle: {
    width: "15%",
    height: 5,
    backgroundColor: colors.neutral600,
    borderRadius: 5,
    alignSelf: "center",
    marginBottom: spacingY._15,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 0,
    paddingHorizontal: spacingX._3,
    paddingVertical: spacingY._3
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingX._12,
  },

  walletIconWrapper: {
    backgroundColor: colors.neutral800,
    padding: spacingX._3,
    borderRadius: radius._12,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },

  closeButton: {
    backgroundColor: colors.neutral800,
    borderRadius: 50,
    paddingHorizontal: spacingX._7,
    paddingVertical: spacingY._3,
    alignItems: "center",
    justifyContent: "center",
  },

  totalBalanceContainer: {
    marginVertical: spacingY._3,
    paddingVertical: spacingY._3,
    paddingHorizontal: spacingX._5,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },

  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacingY._3,
  },

  tabWrapper: {
    flexDirection: "column",
    alignItems: "center",
  },
  tabButton: {
    paddingVertical: spacingY._7,
    paddingHorizontal: spacingX._30,
    borderRadius: radius._10,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 10,
    elevation: 8,
  },
  tabIndicator: {
    height: 4,
    width: "60%",
    borderRadius: 2,
    backgroundColor: colors.yellow,
    marginTop: 6,
    alignSelf: "center",
  },
  balanceCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 5,
  },
});
