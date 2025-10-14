import Button from "@/components/Button";
import HomeCard from "@/components/HomeCard";
import ScreenWrapper from "@/components/ScreenWrapper";
import TransactionList from "@/components/TransactionList";
import TrendAlert from "@/components/TrendAlert";
import Typo from "@/components/Typo";
import UsedCategories from "@/components/UsedCategories";
import { colors, spacingX, spacingY } from "@/constants/theme";
import { useAuth } from "@/contexts/authContext";
import { TransactionType, WalletType } from "@/type";
import { verticalScale } from "@/utils/styling";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as Icons from "phosphor-react-native";
import React, { ReactNode, useCallback, useRef, useState } from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeInLeft, FadeInRight, FadeInUp } from "react-native-reanimated";

const SCREEN_WIDTH = Dimensions.get("window").width;

const Home = () => {
  const { user } = useAuth();
  const router = useRouter();

  // State for wallets
  const [wallets, setWallets] = useState<WalletType[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<WalletType | null>(null);
  const [alertVisible, setAlertVisible] = useState(false);

  const [transactions, setTransactions] = useState<TransactionType[]>([]);

  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterVisible, setFilterVisible] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const transactionListRef = useRef<View>(null);

  // Load transactions on focus
  const loadTransactions = async () => {
    const storedRaw = await AsyncStorage.getItem("transactions");
    const stored: TransactionType[] = storedRaw ? JSON.parse(storedRaw) : [];
    setTransactions(stored);
  };

  useFocusEffect(
    useCallback(() => {
      loadWallets();
      loadTransactions();
    }, [])
  );

  //  Load wallets from AsyncStorage
  const loadWallets = async () => {
  const storedWalletsRaw = await AsyncStorage.getItem("wallets");
  const storedWallets: WalletType[] = storedWalletsRaw
    ? JSON.parse(storedWalletsRaw)
    : [];
  setWallets(storedWallets);

  // Load the previously selected wallet
  const savedWalletId = await AsyncStorage.getItem("selectedWalletId");
  if (savedWalletId) {
    const savedWallet = storedWallets.find(w => w.id === savedWalletId);
    if (savedWallet) {
      setSelectedWallet(savedWallet);
      return;
    }
  }
  
  // Fallback: select first wallet if none is saved
  if (storedWallets.length > 0 && !selectedWallet) {
    setSelectedWallet(storedWallets[0]);
  }
};

const handleWalletSelect = (wallet: WalletType) => {
  setSelectedWallet(wallet);
  if (wallet.id) {
    AsyncStorage.setItem("selectedWalletId", wallet.id);
  }
};

  //  Load wallets on screen focus
  useFocusEffect(
    useCallback(() => {
      loadWallets();
      loadTransactions();
      setAnimateKey(prev => prev + 1);
    }, [])
  );

  // Calculate total per currency
  const getTotals = () => {
    const totals: Record<string, number> = {};
    wallets.forEach((w) => {
      const currency = w.currency ?? "USD";
      totals[currency] = (totals[currency] || 0) + (w.amount ?? 0);
    });
    return totals;
  };

  const totals = getTotals();
  const currencies = Object.keys(totals); // ["USD", "GBP", "IRR"] dynamically

  // Calculate total income and expense for the selected wallet
  const getWalletTotals = (walletId?: string) => {
    if (!walletId) return { totalIncome: 0, totalExpense: 0 };
    const walletTransactions = transactions.filter(
      (t) => t.walletId === walletId
    );
    const totalIncome = walletTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + (t.amount ?? 0), 0);
    const totalExpense = walletTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + (t.amount ?? 0), 0);
    return { totalIncome, totalExpense };
  };

  const walletTotals = getWalletTotals(selectedWallet?.id);

  const handleTransactionSaved = async () => {
    await loadWallets();
    await loadTransactions();
  };

  // Helper to normalize the date safely
  const parseDate = (value: string | Date | { toDate: () => Date }): Date => {
    if (value instanceof Date) {
      return value; // already a Date
    } else if (typeof value === "string" || typeof value === "number") {
      return new Date(value); // string or timestamp
    } else if (value && typeof value.toDate === "function") {
      return value.toDate(); // custom object with toDate()
    } else {
      throw new Error("Invalid date value");
    }
  };

  const getLastTransaction = (walletId?: string) => {
    if (!walletId) return null;

    const walletTransactions = transactions
      .filter((t) => t.walletId === walletId)
      .sort(
        (a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime()
      );

    return walletTransactions[0] || null;
  };

  const lastTransaction = getLastTransaction(selectedWallet?.id);

  // Delete a transaction
  const handleDelete = async (item: TransactionType) => {
    try {
      const storedRaw = await AsyncStorage.getItem("transactions");
      const stored: TransactionType[] = storedRaw ? JSON.parse(storedRaw) : [];

      const updated = stored.filter((t) => t.id !== item.id);
      await AsyncStorage.setItem("transactions", JSON.stringify(updated));

      setTransactions(updated);
    } catch (error) {
      console.error("Failed to delete transaction:", error);
    }
  };

  const usedCategories: string[] = Array.from(
    new Set(
      transactions
        .filter((t) => t.walletId === selectedWallet?.id)
        .map((t) => t.category)
        .filter((cat): cat is string => Boolean(cat))
    )
  );

  const [animateKey, setAnimateKey] = useState(0);

useFocusEffect(
  useCallback(() => {
    // Increment key to trigger animation on every focus
    setAnimateKey((prev) => prev + 1);
  }, [])
);

  const SectionSeparator = ({
    label,
    icon,
  }: {
    label?: string;
    icon?: ReactNode;
  }) => (
    <Animated.View>
      <Animated.View
        key={`header-${animateKey}`}
        entering={FadeInRight.duration(600)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginVertical: spacingY._3,
        }}
      >
        {/* Left animated line */}
        <Animated.View
          entering={FadeInLeft.duration(600)}
          style={{
            flex: 1,
            height: 2,
            backgroundColor: colors.neutral700,
            borderRadius: 50,
          }}
        />

        {/* Floating pill label */}
        {label && icon && (
          <Animated.View
            entering={FadeInRight.duration(600).delay(100)}
            key={`header-${animateKey}`}
            style={{
              flexDirection: "row",
              paddingHorizontal: spacingX._12,
              paddingVertical: 4,
              backgroundColor: colors.black,
              borderRadius: 14,
              marginHorizontal: spacingX._10,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 4,
            }}
          >
            {icon}
            <Typo
              size={15}
              color={colors.white}
              fontWeight="700"
              style={{ letterSpacing: 0.6, marginLeft: 6 }}
            >
              {label}
            </Typo>
          </Animated.View>
        )}

        {/* Right animated line */}
        <Animated.View
          entering={FadeInRight.duration(600)}
          style={{
            flex: 1,
            height: 2,
            backgroundColor: colors.neutral700,
            borderRadius: 50,
            opacity: 0.4,
          }}
        />
      </Animated.View>
    </Animated.View>
  );

  const filteredTransactions = searchQuery
    ? transactions.filter(t =>
        t.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.type.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : transactions;

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        {/* Header */}
       <BlurView intensity={80} tint="dark" style={styles.headerGlass}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Animated.View key={`header-${animateKey}-greeting`} entering={FadeInLeft.duration(600)} style={styles.greeting}>
              <View style={styles.greetingRow}>
                <Typo size={14} color="#9CA3AF" style={styles.greetingText}>Hello,</Typo>
                <Icons.HandWavingIcon size={26} color={colors.secondaryPurple} style={{ marginLeft: 6 }} />
              </View>
              <Typo size={20} fontWeight="700" color="#F9FAFB" style={styles.username}>{user?.name || "Guest"}</Typo>
            </Animated.View>

            <Animated.View key={`header-${animateKey}-buttons`} entering={FadeInRight.duration(600)} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <TouchableOpacity
  style={styles.searchButton}
  activeOpacity={0.8}
  onPress={() => {
    setSearchVisible(prev => !prev);

    // Scroll to transactions after a short delay
    setTimeout(() => {
      transactionListRef.current?.measure((x, y, width, height, pageX, pageY) => {
        scrollViewRef.current?.scrollTo({ y: pageY - 100, animated: true });
      });
    }, 100); // delay ensures layout is updated
  }}
>
  <Icons.MagnifyingGlassIcon size={28} color="#F9FAFB" weight="bold" />
</TouchableOpacity>

              <TouchableOpacity style={styles.searchButton} activeOpacity={0.8} onPress={() => setFilterVisible(prev => !prev)}>
                <Icons.FunnelSimple size={28} color="#F9FAFB" weight="bold" />
              </TouchableOpacity>
            </Animated.View>
          </View>

          {searchVisible && (
            <Animated.View entering={FadeInDown.duration(300)} style={styles.searchOverlay}>
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search transactions..."
                placeholderTextColor={colors.neutral400}
                style={styles.searchInput}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.clearButton}>
                  <Icons.XCircle size={24} color={colors.white} />
                </TouchableOpacity>
              )}
            </Animated.View>
          )}
        </BlurView>
        

        {/* Wallet Cards */}
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={{
            ...styles.scrollViewStyle,
            paddingTop: verticalScale(70),
          }}
          showsVerticalScrollIndicator={false}
        >
          {currencies.length > 0 ? (
            <Animated.View key={`wallet-${animateKey}`} entering={FadeInUp.duration(600).delay(100)}>
            <HomeCard
              wallets={wallets}
              currency={currencies[0]}
              total={totals[currencies[0]]}
              selectedWallet={selectedWallet}
              onWalletSelect={handleWalletSelect}
              selectedWalletTotals={walletTotals}
              lastTransaction={
                getLastTransaction(selectedWallet?.id) as
                  | {
                      type: "income" | "expense";
                      category?: string;
                      amount?: number;
                      date: string | number | Date;
                    }
                  | undefined
              }
            />
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInUp.duration(600).delay(100)} style={{ alignItems: 'center' }}>
            <Image
              source={require('@/assets/images/wallet.svg')}
              style={{
                width: SCREEN_WIDTH * 0.6,
                height: SCREEN_WIDTH * 0.4,
                marginBottom: 10,
                resizeMode: 'contain',
              }}
            />
            <Typo size={16} color={colors.neutral400}>
              No wallets yet. Create one to see it here!
            </Typo>
          </Animated.View>
        )}
          <SectionSeparator
            label="Used Categories"
            icon={
              <Icons.PuzzlePiece size={25} color={colors.secondaryPurple} />
            }
          />
          {selectedWallet ? (
            <Animated.View key={`categories-${animateKey}`} entering={FadeInUp.duration(600).delay(200)}>
            <UsedCategories
              title="Used Categories"
              data={transactions.filter(
                (t) => t.walletId === selectedWallet?.id
              )}
              currency={selectedWallet?.currency}
              totalWalletAmount={selectedWallet?.amount}
              onCategoryPress={(cat) => {
                const filtered = transactions.filter(
                  (t) => t.walletId === selectedWallet?.id && t.category === cat
                );
                setTransactions(filtered);
              }}
            />
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInUp.duration(600).delay(200)}
              style={{ alignItems: "center", marginVertical: 20 }}
            >
              <Icons.WalletIcon size={40} color={colors.neutral500} />
              <Typo
                size={16}
                color={colors.neutral400}
                style={{ marginTop: 8, textAlign: "center" }}
              >
                Select a wallet to see used categories
              </Typo>
            </Animated.View>
          )}

          <SectionSeparator
            label="Recent Transactions"
            icon={
              <Icons.ListChecksIcon size={25} color={colors.secondaryPurple} />
            }
          />
          <Animated.View key={`transactions-${animateKey}`} entering={FadeInUp.duration(600).delay(300)} ref={transactionListRef}>
          <TransactionList
            data={filteredTransactions}
            title="Recent Transactions"
            loading={false}
            emptyListMessage="No Transactions added yet!"
            selectedWalletId={selectedWallet?.id}
            currency={selectedWallet?.currency || "USD"}
            onDelete={handleDelete}
          />
          </Animated.View>
        </ScrollView>
        
        <Animated.View key={`button-${animateKey}`} entering={FadeInUp.duration(600).delay(400)}>
        <Button
          style={styles.floatingButton}
          onPress={() => {
            if (!selectedWallet) {
              setAlertVisible(true);
              return;
            }
            router.push({
              pathname: "/(modals)/transactionModal",
              params: { walletId: selectedWallet.id },
            });
            handleTransactionSaved();
          }}
        >
          <Icons.Plus
            color={colors.white}
            weight="bold"
            size={verticalScale(24)}
          />
        </Button>
        </Animated.View>
        <TrendAlert
          visible={alertVisible}
          message="Please select a wallet first"
          type="info"
          onClose={() => setAlertVisible(false)}
        />
      </View>
    </ScreenWrapper>
  );
};

export default Home;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacingX._15,
    marginTop: verticalScale(8),
  },
  headerGlass: { position: "absolute", left: spacingX._7, right: spacingX._7, borderRadius: 20, backgroundColor: "transparent", overflow: "hidden", zIndex: 99, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 10, padding: spacingX._5 },

  greeting: {
    flexDirection: "column",
    gap: 4,
  },

  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  greetingText: {
    fontWeight: "500",
    letterSpacing: 0.5,
    color: "#9CA3AF",
  },

  username: {
    marginTop: 2,
    letterSpacing: 0.3,
    color: "#F9FAFB",
  },

  searchButton: {
    backgroundColor: "#1F2937",
    padding: spacingX._7,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },

  scrollViewStyle: {
    marginTop: spacingY._10,
    paddingBottom: verticalScale(100),
    gap: spacingX._25,
  },
  floatingButton: {
    height: verticalScale(50),
    width: verticalScale(50),
    borderRadius: 100,
    position: "absolute",
    bottom: verticalScale(70),
    right: verticalScale(5),
    backgroundColor: colors.green,
  },
  searchOverlay: { marginTop: 10, backgroundColor: "#1F2937", borderRadius: 12, flexDirection: "row", alignItems: "center", paddingHorizontal: spacingX._5, paddingVertical: 6, width: "100%", zIndex: 100 },
  searchInput: { flex: 1, color: colors.white, fontSize: 16, height: 40 },
  clearButton: { marginLeft: 8 },
});
