import Confirmation from "@/components/Confirmation";
import ScreenWrapper from "@/components/ScreenWrapper";
import Typo from "@/components/Typo";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { WalletType } from "@/type";
import { verticalScale } from "@/utils/styling";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import * as Icons from "phosphor-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  GestureHandlerRootView,
  Swipeable,
} from "react-native-gesture-handler";

const Wallet = () => {
  const router = useRouter();
  const [wallets, setWallets] = useState<WalletType[]>([]);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [walletToDelete, setWalletToDelete] = useState<WalletType | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);

  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

  const tabScale = useRef(new Animated.Value(1)).current;
  const balanceScale = useRef(new Animated.Value(1)).current;
  const balanceOpacity = useRef(new Animated.Value(1)).current;
  const smallCardsTranslateY = useRef(new Animated.Value(20)).current;
  const smallCardsOpacity = useRef(new Animated.Value(0)).current;
  const listOpacity = useRef(new Animated.Value(0)).current;
  const listTranslateY = useRef(new Animated.Value(30)).current;

  const loadWallets = async () => {
    const storedWalletsRaw = await AsyncStorage.getItem("wallets");
    const storedWallets: WalletType[] = storedWalletsRaw
      ? JSON.parse(storedWalletsRaw)
      : [];
    setWallets(storedWallets);

    if (storedWallets.length > 0 && !selectedCurrency) {
      setSelectedCurrency(storedWallets[0].currency ?? "USD");
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadWallets();
    }, [])
  );

  const getTotalBalancePerCurrency = () => {
    const totals: Record<string, number> = {};
    wallets.forEach((w) => {
      const currency = w.currency ?? "USD";
      totals[currency] = (totals[currency] || 0) + (w.amount ?? 0);
    });
    return totals;
  };

  const totals = getTotalBalancePerCurrency();
  const currencies = Object.keys(totals);

  // Animate tabs and balance when currency changes
  useEffect(() => {
    if (!selectedCurrency) return;

    // Tab & balance animation (already there)
    tabScale.setValue(0.95);
    Animated.spring(tabScale, {
      toValue: 1,
      useNativeDriver: true,
      bounciness: 10,
    }).start();

    balanceScale.setValue(0.95);
    balanceOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(balanceScale, {
        toValue: 1,
        useNativeDriver: true,
        bounciness: 12,
      }),
      Animated.timing(balanceOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();

    //  Small cards reset + animate in
    smallCardsTranslateY.setValue(20);
    smallCardsOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(smallCardsTranslateY, {
        toValue: 0,
        useNativeDriver: true,
      }),
      Animated.timing(smallCardsOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [selectedCurrency]);

  useFocusEffect(
    useCallback(() => {
      loadWallets();

      // Animate small cards + list when screen opens
      Animated.parallel([
        Animated.spring(smallCardsTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 12,
        }),
        Animated.timing(smallCardsOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.spring(listTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 10,
        }),
        Animated.timing(listOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }, [])
  );

  const handleDelete = async () => {
    if (!walletToDelete) return;
    const filtered = wallets.filter((w) => w.id !== walletToDelete.id);
    await AsyncStorage.setItem("wallets", JSON.stringify(filtered));
    setWallets(filtered);
    setConfirmVisible(false);
    swipeableRefs.current.get(walletToDelete.id!)?.close();
    setWalletToDelete(null);
  };

  const handleEdit = (wallet: WalletType) => {
    router.push({
      pathname: "/(modals)/walletModal",
      params: { walletId: wallet.id?.toString() ?? "" },
    });

    swipeableRefs.current.get(wallet.id!)?.close();
  };

  const cancelDelete = () => {
    if (walletToDelete?.id) {
      swipeableRefs.current.get(walletToDelete.id)?.close();
    }
    setConfirmVisible(false);
    setWalletToDelete(null);
  };

  const renderLeftActions = (
    _: any,
    dragX: Animated.AnimatedInterpolation<number>
  ) => (
    <View
      style={[
        styles.swipeActions,
        { backgroundColor: colors.yellow, justifyContent: "flex-start" },
      ]}
    >
      <TouchableOpacity style={styles.actionBtnFull}>
        <Icons.PencilSimpleIcon size={verticalScale(26)} color={colors.white} />
      </TouchableOpacity>
    </View>
  );

  // Render Right Action → Delete
  const renderRightActions = (
    _: any,
    dragX: Animated.AnimatedInterpolation<number>
  ) => (
    <View
      style={[
        styles.swipeActions,
        { backgroundColor: colors.red, justifyContent: "flex-end" },
      ]}
    >
      <TouchableOpacity style={styles.actionBtnFull}>
        <Icons.TrashIcon size={verticalScale(26)} color={colors.white} />
      </TouchableOpacity>
    </View>
  );

  const getCurrencySymbol = (currency: string | undefined) => {
    switch (currency) {
      case "USD":
        return "$";
      case "POUND":
        return "£";
      case "IRR":
        return "﷼";
      default:
        return currency ?? "";
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ScreenWrapper style={{ backgroundColor: colors.black }}>
        <View style={styles.container}>
          {/* Tabs */}
          <View style={styles.balanceView}>
            <View style={styles.tabsContainer}>
              <Animated.ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  paddingHorizontal: spacingX._20,
                  alignItems: "center",
                }}
              >
                {currencies.map((currency) => {
                  let symbol =
                    currency === "USD" ? "$" : currency === "POUND" ? "£" : "﷼";

                  const isActive = selectedCurrency === currency;
                  return (
                    <TouchableOpacity
                      key={currency}
                      style={styles.tabWrapper}
                      activeOpacity={0.8}
                      onPress={() => setSelectedCurrency(currency)}
                    >
                      <Animated.View
                        style={[
                          styles.tabButton,
                          isActive && styles.tabButtonActive,
                          { transform: [{ scale: isActive ? tabScale : 1 }] },
                        ]}
                      >
                        <Typo
                          fontWeight="700"
                          color={
                            isActive ? colors.neutral900 : colors.neutral300
                          }
                          size={isActive ? 16 : 15}
                          style={{ marginRight: 4 }}
                        >
                          {symbol} {currency}
                        </Typo>
                      </Animated.View>
                      {isActive && <View style={styles.tabIndicator} />}
                    </TouchableOpacity>
                  );
                })}
              </Animated.ScrollView>
            </View>

            {/* Balance */}
            {selectedCurrency && (
              <View style={styles.balanceContainer}>
                {/* Top Card: Total Balance */}
                <Animated.View
                  style={[
                    styles.balanceCard,
                    {
                      transform: [{ scale: balanceScale }],
                      opacity: balanceOpacity,
                    },
                  ]}
                >
                  <Typo
                    size={verticalScale(13)}
                    color={colors.neutral300}
                    fontWeight="600"
                    style={{
                      marginTop: spacingY._3,
                      opacity: 0.8,
                    }}
                  >
                    Total Balance
                  </Typo>
                  <View style={styles.balanceTopRow}>
                    <Typo
                      size={38}
                      fontWeight="800"
                      color={
                        selectedCurrency === "USD"
                          ? colors.green
                          : selectedCurrency === "POUND"
                          ? colors.primaryLight
                          : colors.yellow
                      }
                    >
                      {selectedCurrency === "USD"
                        ? "$"
                        : selectedCurrency === "POUND"
                        ? "£"
                        : "﷼"}
                    </Typo>
                    <Typo
                      size={38}
                      fontWeight="700"
                      color={colors.white}
                      style={{ marginLeft: spacingX._3 }}
                    >
                      {totals[selectedCurrency]?.toLocaleString()}
                    </Typo>
                  </View>
                </Animated.View>

                {/* Bottom Row: Two Smaller Cards */}
                <Animated.View
                  style={[
                    styles.smallCardsGrid,
                    {
                      opacity: smallCardsOpacity,
                      transform: [{ translateY: smallCardsTranslateY }],
                    },
                  ]}
                >
                  {/* Left Card: Number of Wallets */}
                  <View
                    style={[
                      styles.smallCard,
                      { position: "relative", overflow: "hidden" },
                    ]}
                  >
                    {/* Background Icon */}
                    <Icons.Wallet
                      color={colors.primaryDark}
                      size={60}
                      style={{
                        position: "absolute",
                        right: "78%",
                        top: "20%",
                        zIndex: 0,
                      }}
                    />

                    {/* Text */}
                    <Typo
                      size={verticalScale(12)}
                      color={colors.neutral400}
                      style={{ zIndex: 1 }}
                    >
                      Wallets
                    </Typo>

                    <Typo
                      size={20}
                      fontWeight="700"
                      color={colors.white}
                      style={{ marginTop: spacingY._3, zIndex: 1 }}
                    >
                      {
                        wallets.filter((w) => w.currency === selectedCurrency)
                          .length
                      }
                    </Typo>
                  </View>

                  {/* Right Card: Last Wallet Trend */}
                  <View style={[styles.smallCard]}>
                    <Typo size={verticalScale(12)} color={colors.neutral400}>
                      Last Wallet
                    </Typo>
                    {wallets.filter((w) => w.currency === selectedCurrency)
                      .length > 1 ? (
                      (() => {
                        const userWallets = wallets.filter(
                          (w) => w.currency === selectedCurrency
                        );
                        const lastAmount =
                          userWallets[userWallets.length - 1].amount ?? 0;
                        const prevAmount =
                          userWallets[userWallets.length - 2].amount ?? 0;
                        const change =
                          prevAmount === 0
                            ? 100
                            : ((lastAmount - prevAmount) / prevAmount) * 100;
                        const isPositive = change >= 0;

                        return (
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "center",
                              paddingHorizontal: spacingX._3,
                              paddingVertical: spacingY._3,
                              borderRadius: radius._15,
                              marginTop: spacingY._3,
                            }}
                          >
                            {isPositive ? (
                              <Icons.TrendUp size={26} color={colors.green2} />
                            ) : (
                              <Icons.TrendDown size={26} color={colors.red} />
                            )}
                            <Typo
                              size={verticalScale(11)}
                              color={isPositive ? colors.green2 : colors.red}
                              style={{ marginLeft: spacingX._3 }}
                            >
                              {change.toFixed(1)}%
                            </Typo>
                          </View>
                        );
                      })()
                    ) : (
                      <Typo
                        size={16}
                        color={colors.neutral500}
                        style={{ marginTop: spacingY._3 }}
                      >
                        <Icons.ExclamationMark
                          color={colors.red}
                          size={verticalScale(28)}
                        />
                      </Typo>
                    )}
                  </View>
                </Animated.View>
              </View>
            )}
          </View>

          {/* Wallet List */}
          <Animated.View
            style={[
              styles.wallets,
              {
                opacity: smallCardsOpacity,
                transform: [{ translateY: smallCardsTranslateY }],
              },
            ]}
          >
            {/* Border Overlay */}
            <View style={styles.borderOverlay} pointerEvents="none" />

            {/* Content */}
            <View style={styles.flexRow}>
              <View style={{ gap: spacingY._5 }}>
                <Typo size={20} fontWeight={"700"}>
                  My Wallets
                </Typo>
                <Typo size={13} color={colors.neutral400}>
                  Swipe left to edit, right to delete
                </Typo>
              </View>
              <TouchableOpacity
                onPress={() => router.push("/(modals)/walletModal")}
              >
                <Icons.PlusCircleIcon
                  weight="fill"
                  color={colors.green2}
                  size={verticalScale(33)}
                />
              </TouchableOpacity>
            </View>

            <FlatList
              showsVerticalScrollIndicator={false}
              data={wallets.filter(
                (w) => w.currency === selectedCurrency || !selectedCurrency
              )}
              keyExtractor={(item) => item.id ?? item.name}
              renderItem={({ item }) => (
                <Swipeable
                  ref={(ref) => {
                    if (ref && item.id) swipeableRefs.current.set(item.id, ref);
                  }}
                  renderLeftActions={renderLeftActions}
                  renderRightActions={renderRightActions}
                  onSwipeableOpen={(direction) => {
                    if (direction === "left") {
                      handleEdit(item); // swipe left → edit
                    } else if (direction === "right") {
                      setWalletToDelete(item);
                      setConfirmVisible(true); // swipe right → delete
                    }
                  }}
                >
                  <View style={styles.walletCard}>
                    {item.image ? (
                      <Image
                        source={{ uri: item.image }}
                        style={styles.walletImage}
                      />
                    ) : (
                      <View style={styles.walletImagePlaceholder}>
                        <Icons.WalletIcon
                          color={colors.neutral400}
                          size={verticalScale(28)}
                        />
                      </View>
                    )}

                    {/* Info and Amount in Row */}
                    <View
                      style={{
                        flex: 1,
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginHorizontal: spacingX._3,
                      }}
                    >
                      {/* Left Side (Name + Date) */}
                      <View
                        style={{
                          flexShrink: 1,
                          marginHorizontal: verticalScale(10),
                        }}
                      >
                        <Typo size={verticalScale(13)} fontWeight="700">
                          {item.name}
                        </Typo>

                        {item.created && (
                          <Typo
                            size={verticalScale(10)}
                            color={colors.neutral400}
                            style={{ marginTop: 1 }}
                          >
                            {new Date(item.created).toLocaleDateString()}
                          </Typo>
                        )}
                      </View>

                      {/* Right Side (Amount) */}
                      <View
                        style={{ alignItems: "flex-end", padding: spacingX._5 }}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "flex-end",
                          }}
                        >
                          {/* Currency Symbol */}
                          <Typo
                            size={18}
                            fontWeight="600"
                            style={{
                              color: colors.white,
                              marginRight: 5,
                            }}
                          >
                            {getCurrencySymbol(item.currency)}
                          </Typo>

                          {/* Amount */}
                          <Typo
                            size={18}
                            fontWeight="700"
                            style={{
                              color: colors.white,
                            }}
                          >
                            {item.amount?.toLocaleString() ?? 0}
                          </Typo>
                        </View>
                      </View>
                    </View>
                  </View>
                </Swipeable>
              )}
              ItemSeparatorComponent={() => (
                <View style={{ height: spacingY._5 }} />
              )}
            />
          </Animated.View>
        </View>

        {walletToDelete && (
          <Confirmation
            visible={confirmVisible}
            message={`Are you sure you want to delete "${walletToDelete.name}"?`}
            onCancel={cancelDelete}
            onConfirm={handleDelete}
            confirmText="Delete"
          />
        )}
      </ScreenWrapper>
    </GestureHandlerRootView>
  );
};

export default Wallet;

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "space-between" },
  balanceView: {
    height: verticalScale(270),
    backgroundColor: colors.black,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  tabWrapper: {
    flexDirection: "column",
    backgroundColor: colors.neutral800,
    borderRadius: radius._10,
    alignItems: "center",
    marginRight: spacingX._7,
    marginTop: spacingY._20,
  },
  tabButton: {
    paddingVertical: spacingY._7,
    paddingHorizontal: spacingX._20,
    borderRadius: radius._10,
    backgroundColor: colors.neutral800,
  },
  tabButtonActive: {
    backgroundColor: colors.green2,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  tabIndicator: {
    height: 4,
    width: "40%",
    borderRadius: 2,
    backgroundColor: colors.yellow,
    marginTop: 6,
  },
  balanceCard: {
    marginTop: spacingY._10,
    width: "92%",
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
    overflow: "hidden",
  },

  balanceTopRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacingX._3,
  },

  balanceTrend: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacingY._5,
    paddingHorizontal: spacingX._7,
    paddingVertical: spacingY._3,
    backgroundColor: "rgba(0,255,0,0.08)",
    borderRadius: radius._10,
  },

  flexRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacingY._20,
  },
  wallets: {
    flex: 0.95,
    backgroundColor: colors.neutral900,
    borderTopRightRadius: radius._30,
    borderTopLeftRadius: radius._30,
    padding: spacingX._20,
    paddingTop: spacingY._25,
    paddingBottom: spacingY._40,
    overflow: "hidden",
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
  walletCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.neutral850,
    marginTop: spacingY._3,
    padding: spacingX._3,
    borderRadius: radius._20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  smallCard: {
    flex: 1,
    backgroundColor: "transparent",
    borderRadius: radius._15,
    paddingVertical: spacingY._5,
    paddingHorizontal: spacingX._3,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  tabsContainer: {
    width: "100%",
    paddingVertical: spacingY._7,
    paddingHorizontal: spacingX._20,
  },

  balanceContainer: {
    width: "100%",
    alignItems: "center",
    marginVertical: verticalScale(25),
  },

  smallCardsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "90%",
    marginTop: spacingY._20,
    gap: spacingX._7,
    paddingHorizontal: spacingX._20,
  },

  walletImage: {
    width: verticalScale(70),
    height: verticalScale(70),
    borderRadius: radius._20,
  },

  walletImagePlaceholder: {
    width: verticalScale(70),
    height: verticalScale(70),
    borderRadius: radius._20,
    backgroundColor: colors.neutral700,
    justifyContent: "center",
    alignItems: "center",
  },

  swipeActions: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacingY._5,
    borderRadius: radius._20,
    paddingHorizontal: spacingX._10,
  },
  actionBtnFull: {
    width: verticalScale(65),
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: radius._20,
  },
});
