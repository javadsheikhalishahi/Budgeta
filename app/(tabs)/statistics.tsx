import ScreenWrapper from "@/components/ScreenWrapper";
import Typo from "@/components/Typo";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { formatamount } from "@/utils/formatAmount";
import { scale } from "@/utils/styling";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import * as Icons from "phosphor-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { BarChart, LineChart, PieChart } from "react-native-gifted-charts";

const screenWidth = Dimensions.get("window").width;
const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const formatNumber = (num: number) => {
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + "B";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
  return num.toString();
};

type Transaction = {
  id: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  date: string;
  walletId: string;
};

type Wallet = {
  id: string;
  name: string;
  amount: number;
  currency: "USD" | "GBP" | "IRR" | string;
};

const filters = ["Daily", "Weekly", "Monthly", "Yearly"];
const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const currencyColors: Record<string, string> = {
  USD: colors.green,
  GBP: colors.primaryLight,
  IRR: colors.yellow,
};

const getSymbol = (cur: string) =>
  cur === "USD" ? "$" : cur === "GBP" ? "£" : cur === "IRR" ? "﷼" : cur;

const Statistics = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);

  // Tabs / modal state
  const currencies = useMemo(
    () => Array.from(new Set(wallets.map((w) => w.currency).filter(Boolean))),
    [wallets]
  );
  const [selectedCurrency, setSelectedCurrency] = useState<string>("");
  const [walletModalVisible, setWalletModalVisible] = useState(false);

  // Filter + charts
  const [activeFilter, setActiveFilter] = useState("Monthly");
  const [barData, setBarData] = useState<any[]>([]);
  const [lineData, setLineData] = useState<{
    incomeData: any[];
    expenseData: any[];
  }>({ incomeData: [], expenseData: [] });
  const [pieData, setPieData] = useState<any[]>([]);
  const [selectedChart, setSelectedChart] = useState<"bar" | "line" | "pie">(
    "bar"
  );

  // Bottom sheet anim
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    const loadData = async () => {
      const rawTx = await AsyncStorage.getItem("transactions");
      const rawWallets = await AsyncStorage.getItem("wallets");
      if (rawTx) setTransactions(JSON.parse(rawTx));
      if (rawWallets) {
        const ws = JSON.parse(rawWallets);
        setWallets(ws);
        // Only set if not already set
        if (ws.length && !selectedCurrency)
          setSelectedCurrency((prev) => prev || ws[0].currency);
      }
    };
    loadData();
  }, [selectedCurrency]);

  // Open/close bottom sheet
  const openWalletModal = (currency: string) => {
    setSelectedCurrency(currency);
    setWalletModalVisible(true);
    translateY.setValue(SCREEN_HEIGHT);
    Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
  };
  const closeWalletModal = () => {
    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 280,
      useNativeDriver: true,
    }).start(() => setWalletModalVisible(false));
  };

  // Charts derivation
  useEffect(() => {
    if (!selectedWallet) return;

    const now = new Date();
    let filtered = transactions.filter((t) => t.walletId === selectedWallet.id);

    switch (activeFilter) {
      case "Daily":
        filtered = filtered.filter(
          (t) => new Date(t.date).toDateString() === now.toDateString()
        );
        break;
      case "Weekly": {
        const start = new Date(now);
        start.setDate(now.getDate() - now.getDay());
        filtered = filtered.filter((t) => new Date(t.date) >= start);
        break;
      }
      case "Monthly":
        filtered = filtered.filter(
          (t) =>
            new Date(t.date).getMonth() === now.getMonth() &&
            new Date(t.date).getFullYear() === now.getFullYear()
        );
        break;
      case "Yearly":
        filtered = filtered.filter(
          (t) => new Date(t.date).getFullYear() === now.getFullYear()
        );
        break;
    }

    const grouped: Record<string, { income: number; expense: number }> = {};

    if (activeFilter === "Weekly") {
      weekDays.forEach((d) => (grouped[d] = { income: 0, expense: 0 }));
      filtered.forEach((t) => {
        const key = weekDays[new Date(t.date).getDay()];
        if (!grouped[key]) grouped[key] = { income: 0, expense: 0 };
        grouped[key][t.type] += t.amount;
      });
    } else if (activeFilter === "Monthly" || activeFilter === "Yearly") {
      monthNames.forEach((m) => (grouped[m] = { income: 0, expense: 0 }));
      filtered.forEach((t) => {
        const key = monthNames[new Date(t.date).getMonth()];
        if (!grouped[key]) grouped[key] = { income: 0, expense: 0 };
        grouped[key][t.type] += t.amount;
      });
    } else {
      // For daily, get ALL unique categories first
      const allCategories = [
        ...new Set(transactions.map((t) => t.category || "Other")),
      ];
      allCategories.forEach(
        (cat) => (grouped[cat] = { income: 0, expense: 0 })
      );

      filtered.forEach((t) => {
        const key = t.category || "Other";
        if (!grouped[key]) grouped[key] = { income: 0, expense: 0 };
        grouped[key][t.type] += t.amount;
      });
    }

    // Transform for BarChart (two bars per label)
    const barDataArr: any[] = [];
    Object.keys(grouped).forEach((k) => {
      barDataArr.push({
        label: k,
        value: grouped[k].income,
        frontColor: colors.green,
        spacing: 6,
      });
      barDataArr.push({
        value: grouped[k].expense,
        frontColor: colors.red,
      });
    });

    setBarData(
      barDataArr.length
        ? barDataArr
        : [{ value: 0, frontColor: colors.neutral600 }]
    );

    const formatNumber = (value: number): string => {
      if (value >= 1000000000) {
        return (value / 1000000000).toFixed(1) + "B";
      } else if (value >= 1000000) {
        return (value / 1000000).toFixed(1) + "M";
      } else if (value >= 1000) {
        return (value / 1000).toFixed(1) + "K";
      } else {
        return value.toString();
      }
    };

    const incomeDataArr: any[] = [];
    const expenseDataArr: any[] = [];

    if (activeFilter === "Weekly") {
      weekDays.forEach((day, index) => {
        incomeDataArr.push({
          value: grouped[day]?.income || 0,
          label: day,
          dataPointText: formatNumber(grouped[day]?.income || 0).toString(),
        });
        expenseDataArr.push({
          value: grouped[day]?.expense || 0,
          label: day,
          dataPointText: formatNumber(grouped[day]?.expense || 0).toString(),
        });
      });
    } else if (activeFilter === "Monthly" || activeFilter === "Yearly") {
      monthNames.forEach((month, index) => {
        incomeDataArr.push({
          value: grouped[month]?.income || 0,
          label: month,
          dataPointText: formatNumber(grouped[month]?.income || 0).toString(),
        });
        expenseDataArr.push({
          value: grouped[month]?.expense || 0,
          label: month,
          dataPointText: formatNumber(grouped[month]?.expense || 0).toString(),
        });
      });
    } else {
      // For daily, ensure we have consistent data structure
      Object.keys(grouped).forEach((category) => {
        incomeDataArr.push({
          value: grouped[category]?.income || 0,
          label: category.substring(0, 10), // Even shorter label for daily
          dataPointText: formatNumber(grouped[category]?.income || 0),
          // Add consistent properties
          textShiftY: -8,
          textColor: colors.white,
          textFontSize: 10,
        });
        expenseDataArr.push({
          value: grouped[category]?.expense || 0,
          label: category.substring(0, 10), // Even shorter label for daily
          dataPointText: formatNumber(grouped[category]?.expense || 0),
          // Add consistent properties
          textShiftY: -8,
          textColor: colors.white,
          textFontSize: 10,
        });
      });

      // If no data, add a default point
      if (incomeDataArr.length === 0) {
        incomeDataArr.push({
          value: 0,
          label: "No Data",
          dataPointText: "0",
          textShiftY: -8,
          textColor: colors.white,
          textFontSize: 10,
        });
        expenseDataArr.push({
          value: 0,
          label: "No Data",
          dataPointText: "0",
          textShiftY: -8,
          textColor: colors.white,
          textFontSize: 10,
        });
      }
    }

    setLineData({
      incomeData: incomeDataArr.length
        ? incomeDataArr
        : [{ value: 0, dataPointText: formatNumber(0) }],
      expenseData: expenseDataArr.length
        ? expenseDataArr
        : [{ value: 0, dataPointText: formatNumber(0) }],
    });

    const categoryGrouped: Record<
      string,
      { value: number; type: "income" | "expense" }
    > = {};

    filtered.forEach((t) => {
      const key = t.category || "Other";
      if (!categoryGrouped[key])
        categoryGrouped[key] = { value: 0, type: t.type };
      categoryGrouped[key].value += t.amount;
    });

    setPieData(
      Object.keys(categoryGrouped).length
        ? Object.keys(categoryGrouped).map((k) => ({
            value: categoryGrouped[k].value,
            type: categoryGrouped[k].type, // store type!
            text: k,
          }))
        : [{ value: 1, type: "expense", text: "No data" }]
    );
  }, [activeFilter, transactions, selectedWallet]);

  const filteredWallets = wallets.filter(
    (w) => w.currency === selectedCurrency
  );

  const [walletSummary, setWalletSummary] = useState<{
    income: number;
    expense: number;
    total: number;
  }>({
    income: 0,
    expense: 0,
    total: 0,
  });

  useEffect(() => {
    if (!selectedWallet) return;
    const filtered = transactions.filter(
      (t) => t.walletId === selectedWallet.id
    );
    const income = filtered
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = filtered
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
    setWalletSummary({
      income,
      expense,
      total: income - expense,
    });
  }, [selectedWallet, transactions]);

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

  const getTableData = () => {
    if (!selectedWallet) return [];

    const now = new Date();
    let filtered = transactions.filter((t) => t.walletId === selectedWallet.id);
    const table: { label: string; income: number; expense: number }[] = [];

    switch (activeFilter) {
      case "Daily":
        filtered = filtered.filter(
          (t) => new Date(t.date).toDateString() === now.toDateString()
        );
        // For daily, just return each transaction as a row
        return filtered.map((t) => ({
          label: t.category,
          income: t.type === "income" ? t.amount : 0,
          expense: t.type === "expense" ? t.amount : 0,
        }));

      case "Weekly": {
        // Show week dates like "Sun 3/8"
        weekDays.forEach((day, idx) => {
          const date = new Date(now);
          date.setDate(now.getDate() - now.getDay() + idx);
          table.push({
            label: `${day} ${date.getMonth() + 1}/${date.getDate()}`,
            income: 0,
            expense: 0,
          });
        });

        filtered.forEach((t) => {
          const tDate = new Date(t.date);
          const dayIdx = tDate.getDay();
          table[dayIdx][t.type] += t.amount;
        });
        break;
      }

      case "Monthly": {
        // Group by week with date range
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const weeks = Math.ceil(endOfMonth.getDate() / 7);

        for (let i = 0; i < weeks; i++) {
          const weekStart = new Date(
            now.getFullYear(),
            now.getMonth(),
            i * 7 + 1
          );
          const weekEnd = new Date(
            now.getFullYear(),
            now.getMonth(),
            Math.min((i + 1) * 7, endOfMonth.getDate())
          );
          table.push({
            label: `${weekStart.getMonth() + 1}/${weekStart.getDate()} - ${
              weekEnd.getMonth() + 1
            }/${weekEnd.getDate()}`,
            income: 0,
            expense: 0,
          });
        }

        filtered.forEach((t) => {
          const date = new Date(t.date).getDate();
          const weekIndex = Math.floor((date - 1) / 7);
          table[weekIndex][t.type] += t.amount;
        });
        break;
      }

      case "Yearly":
        monthNames.forEach((month, idx) => {
          table.push({
            label: `${month} ${now.getFullYear()}`,
            income: 0,
            expense: 0,
          });
        });

        filtered.forEach((t) => {
          const month = new Date(t.date).getMonth();
          table[month][t.type] += t.amount;
        });
        break;
    }

    return table;
  };

  //animation swipe
  const [swipeAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animateSwipe = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(swipeAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(swipeAnim, {
            toValue: 0,
            duration: 600,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.delay(500), // small pause at start position
        ])
      ).start();
    };

    animateSwipe();

    return () => swipeAnim.stopAnimation();
  }, []);

  // Smooth left-right slide
  const swipeInterpolate = swipeAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -10, 0],
  });

  // Gentle opacity pulse
  const opacityInterpolate = swipeAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.6, 1],
  });

  // animation heart
  const [pulseAnim] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const animatePulse = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3, // scale up
            duration: 500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1, // scale back down
            duration: 500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    animatePulse();

    return () => pulseAnim.stopAnimation();
  }, []);

  //animation bar
  const targetScore =
    walletSummary.income > 0
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round((walletSummary.total / walletSummary.income) * 100 + 50)
          )
        )
      : 50;

  const animatedWidth = useRef(new Animated.Value(0)).current;

  // Animate bar when targetScore changes
  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: targetScore,
      duration: 1200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [targetScore]);

  // Animate bar Flow
  const incomeAnim = useRef(new Animated.Value(0)).current;
  const expenseAnim = useRef(new Animated.Value(0)).current;

  const incomeTarget =
    walletSummary.income > 0
      ? Math.min(
          100,
          (walletSummary.income /
            (walletSummary.income + walletSummary.expense)) *
            100
        )
      : 0;

  const expenseTarget =
    walletSummary.expense > 0
      ? Math.min(
          100,
          (walletSummary.expense /
            (walletSummary.income + walletSummary.expense)) *
            100
        )
      : 0;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(incomeAnim, {
        toValue: incomeTarget,
        duration: 1000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(expenseAnim, {
        toValue: expenseTarget,
        duration: 1000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  }, [incomeTarget, expenseTarget]);

  // animate person & money
  const personAnim = useRef(new Animated.Value(0)).current;
  const moneyAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.parallel([
        // Person animation (diagonal wave)
        Animated.sequence([
          Animated.timing(personAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(personAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
        // Money animation opposite (diagonal wave)
        Animated.sequence([
          Animated.timing(moneyAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(moneyAnim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    loop.start();
  }, []);

  const personTranslateX = personAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 20],
  });

  const personTranslateY = personAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -5],
  });

  const moneyTranslateX = moneyAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -25],
  });

  const moneyTranslateY = moneyAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 5],
  });

  // animate divider
  const shimmerAnim = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const translateX = shimmerAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-screenWidth, screenWidth],
  });

  const formatAmount = (amount: number) => {
    if (amount >= 1_000_000_000)
      return (amount / 1_000_000_000).toFixed(1) + "B";
    if (amount >= 1_000_000) return (amount / 1_000_000).toFixed(1) + "M";
    if (amount >= 1_000) return (amount / 1_000).toFixed(0) + "K";
    return amount.toString();
  };

  // Render the selected chart
  const renderChart = () => {
    switch (selectedChart) {
      case "bar":
        return (
          <BarChart
            data={barData}
            width={screenWidth - 90}
            height={260}
            barWidth={30}
            barBorderRadius={20}
            spacing={20}
            hideRules
            labelWidth={60}
            noOfSections={3}
            scrollToIndex={barData.findIndex((item) => item.value > 0)}
            scrollAnimation={true}
            isAnimated
            xAxisLabelTextStyle={{
              color: colors.white,
              fontWeight: "700",
              fontSize: 15,
              textAlign: "center",
            }}
            yAxisTextStyle={{ color: colors.white }}
            renderTooltip={(item: any) => (
              <View
                style={{
                  position: "absolute",
                  bottom: item.height + 25,
                  left: -5,
                  backgroundColor: colors.secondaryPurple,
                  paddingVertical: 5,
                  paddingHorizontal: 9,
                  borderRadius: 6,
                  shadowColor: "#000",
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 8,
                }}
              >
                <Typo
                  size={12}
                  color={colors.white}
                  style={{ fontWeight: "600" }}
                >
                  {formatAmount(item.value)}
                </Typo>
              </View>
            )}
          />
        );
      case "line":
        return (
          <View style={{ marginTop: 10 }}>
            <LineChart
              xAxisLabelsVerticalShift={10}
              thickness={3}
              data={lineData.incomeData}
              data2={lineData.expenseData}
              width={screenWidth - 60}
              height={280}
              spacing={80}
              noOfSections={3}
              curved
              curvature={0.32}
              noOfSectionsBelowXAxis={0.38}
              initialSpacing={35}
              // Line colors
              color={colors.green}
              color2={colors.red}
              isAnimated
              animateOnDataChange
              onDataChangeAnimationDuration={600}
              textFontSize={activeFilter === "Daily" ? 12 : 15}
              textColor={colors.neutral400}
              overflowTop={2}
              textShiftY={-5}
              overflowBottom={20}
              // Data point styles
              dataPointsColor={colors.green}
              dataPointsColor2={colors.red}
              dataPointsRadius={activeFilter === "Daily" ? 3 : 5}
              // Enable area chart shading
              areaChart
              startFillColor={colors.green}
              startOpacity={0.25}
              endFillColor={colors.green}
              endOpacity={0.05}
              startFillColor2={colors.red}
              startOpacity2={0.25}
              endFillColor2={colors.red}
              endOpacity2={0.05}
              // Axis styles
              xAxisLabelTextStyle={{
                color: colors.white,
                fontWeight: "600",
                fontSize: activeFilter === "Daily" ? 13 : 15,
              }}
              yAxisTextStyle={{
                color: colors.white,
                fontSize: activeFilter === "Daily" ? 13 : 15,
              }}
              hideRules
              yAxisOffset={20}
            />

            <View style={styles.legendContainer}>
              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendColor,
                    { backgroundColor: colors.green },
                  ]}
                />
                <Typo style={styles.legendText}>Income</Typo>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[styles.legendColor, { backgroundColor: colors.red }]}
                />
                <Typo style={styles.legendText}>Expense</Typo>
              </View>
            </View>
          </View>
        );
      case "pie":
        return (
          <View style={{ alignItems: "center", paddingVertical: 5 }}>
            <PieChart
              data={pieData.map((item) => ({
                ...item,
                color: item.type === "income" ? "#10B981" : "#F43F5E",
                text: `${Math.round(
                  (item.value / pieData.reduce((sum, d) => sum + d.value, 0)) *
                    100
                )}%`,
                textColor: colors.white,
                textSize: 15,
                tooltipText: `${item.text}: ${formatNumber(item.value)}`,
              }))}
              radius={140}
              donut
              innerRadius={75}
              innerCircleColor={colors.white}
              showGradient
              gradientCenterColor={colors.neutral800}
              focusOnPress
              toggleFocusOnPress
              extraRadius={20}
              edgesPressable
              isThreeD={false}
              shadow
              shadowColor={"rgba(0,0,0,0.1)"}
              strokeWidth={1}
              strokeColor={"#E5E7EB"}
              showText
              isAnimated
              animationDuration={1200}
              labelsPosition="outward"
              showTooltip
              showValuesAsTooltipText
              tooltipBackgroundColor={"rgba(17,24,39,0.9)"}
              tooltipBorderRadius={8}
              centerLabelComponent={({
                selectedIndex,
              }: {
                selectedIndex: number;
              }) => {
                const total = pieData.reduce(
                  (sum, item) => sum + item.value,
                  0
                );
                const hasSelection =
                  selectedIndex !== -1 && selectedIndex < pieData.length;
                const current = hasSelection
                  ? pieData[selectedIndex].value
                  : total;
                const label = hasSelection
                  ? pieData[selectedIndex].text
                  : "Total";

                return (
                  <View style={{ alignItems: "center", padding: 6 }}>
                    <Typo
                      size={14}
                      fontWeight="600"
                      style={{ color: "#6B7280" }}
                    >
                      {label}
                    </Typo>
                    <Typo
                      size={22}
                      fontWeight="700"
                      style={{ color: "#111827" }}
                    >
                      {formatNumber(current)}
                    </Typo>
                  </View>
                );
              }}
            />

            {/* Modern Legend */}
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "center",
                marginTop: 10,
                gap: 12,
              }}
            >
              {pieData.map((item, i) => (
                <View
                  key={i}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 5,
                    paddingVertical: 4,
                    borderRadius: 12,
                    shadowColor: "#000",
                    shadowOpacity: 0.05,
                    shadowOffset: { width: 0, height: 2 },
                    shadowRadius: 4,
                    marginBottom: 1,
                  }}
                >
                  <View
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 7,
                      backgroundColor:
                        item.type === "income" ? "#10B981" : "#F43F5E",
                      marginRight: 6,
                    }}
                  />
                  <Typo size={13} style={{ color: "#fff", fontWeight: "500" }}>
                    {item.text}
                  </Typo>
                </View>
              ))}
            </View>
          </View>
        );
      default:
        return (
          <BarChart
            data={barData}
            width={screenWidth - 90}
            height={260}
            barWidth={30}
            barBorderRadius={20}
            spacing={20}
            hideRules
            labelWidth={60}
            noOfSections={3}
            scrollToIndex={barData.findIndex((item) => item.value > 0)}
            scrollAnimation={true}
            xAxisLabelTextStyle={{
              color: colors.white,
              fontWeight: "700",
              fontSize: 15,
              textAlign: "center",
            }}
            yAxisTextStyle={{ color: colors.white }}
            renderTooltip={(item: any) => (
              <View
                style={{
                  position: "absolute",
                  bottom: item.height + 25,
                  left: -5,
                  backgroundColor: colors.secondaryPurple,
                  paddingVertical: 5,
                  paddingHorizontal: 9,
                  borderRadius: 6,
                  shadowColor: "#000",
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 8,
                }}
              >
                <Typo
                  size={12}
                  color={colors.white}
                  style={{ fontWeight: "600" }}
                >
                  {formatAmount(item.value)}
                </Typo>
              </View>
            )}
          />
        );
    }
  };

  return (
    <ScreenWrapper>
      <View
        style={{
          borderBottomLeftRadius: radius._30,
          borderBottomRightRadius: radius._30,
          borderBottomColor: colors.neutral800,
          borderLeftColor: colors.black,
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderBottomWidth: 3,
          paddingVertical: spacingY._5,
        }}
      >
        <Typo style={{ alignSelf: "center", paddingTop: 3 }} size={20}>
          Statistics
        </Typo>
        {/* Modern Currency Tabs */}
        {currencies.length > 0 && (
          <View style={styles.tabsContainer}>
            <View style={styles.tabsRow}>
              {currencies.map((cur) => {
                const isSelectedCur = selectedWallet?.currency === cur;
                const tabColor = currencyColors[cur] || colors.green;
                return (
                  <TouchableOpacity
                    key={cur}
                    activeOpacity={0.7}
                    onPress={() => openWalletModal(cur)}
                    style={styles.tabWrapper}
                  >
                    <View
                      style={[
                        styles.tabButton,
                        isSelectedCur && {
                          backgroundColor: tabColor + "20",
                          borderColor: tabColor,
                          transform: [{ scale: 1 }],
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.currencyIcon,
                          {
                            backgroundColor: isSelectedCur
                              ? tabColor
                              : colors.neutral700,
                          },
                        ]}
                      >
                        <Typo
                          size={14}
                          fontWeight="700"
                          color={
                            isSelectedCur ? colors.white : colors.neutral300
                          }
                        >
                          {getSymbol(cur)}
                        </Typo>
                      </View>
                      <Typo
                        size={isSelectedCur ? 13 : 12}
                        fontWeight={isSelectedCur ? "700" : "500"}
                        color={isSelectedCur ? tabColor : colors.neutral400}
                        style={styles.currencyText}
                      >
                        {cur}
                      </Typo>
                    </View>

                    {/* Animated indicator */}
                    {isSelectedCur && (
                      <Animated.View
                        style={[
                          styles.tabIndicator,
                          {
                            backgroundColor: tabColor,
                            width: "60%",
                            opacity: 1,
                          },
                        ]}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </View>

      {/* If no wallet picked yet */}
      {!selectedWallet && (
        <View style={styles.helperCard}>
          <Icons.ArrowUp size={22} color={colors.white} />
          <Typo size={14} color={colors.neutral300} style={{ marginLeft: 8 }}>
            Pick a wallet from a currency tab to view charts
          </Typo>
        </View>
      )}

      {selectedWallet && (
        <FlatList
          data={[{ key: "main-content" }]}
          renderItem={() => (
            <View>
              <View style={styles.walletContainer}>
                {/* Modern Wallet Card */}
                <LinearGradient
                  colors={["#0a0a23", "#1e1e3f"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 2, y: 3 }}
                  style={styles.modernWalletCard}
                >
                  {/* Header with wallet info and quick actions */}
                  <View style={styles.cardHeader}>
                    <View style={styles.walletInfo}>
                      <View style={styles.walletTitleRow}>
                        <Typo size={16} fontWeight="700" color={colors.white}>
                          {selectedWallet.name}
                        </Typo>
                      </View>
                      <Typo size={13} color="rgba(255,255,255,0.7)">
                        Available Balance
                      </Typo>
                    </View>

                    <View
                      style={[
                        styles.currencyChip,
                        {
                          backgroundColor:
                            currencyColors[selectedWallet.currency] + "30",
                        },
                      ]}
                    >
                      <Typo
                        size={11}
                        fontWeight="700"
                        color={currencyColors[selectedWallet.currency]}
                      >
                        {selectedWallet.currency}
                      </Typo>
                    </View>
                  </View>

                  {/* Balance Amount */}
                  <Typo
                    size={30}
                    fontWeight="800"
                    color={colors.white}
                    style={styles.balanceText}
                  >
                    {getSymbol(selectedWallet.currency)}{" "}
                    {selectedWallet.amount?.toLocaleString()}
                  </Typo>

                  {/* Financial Summary Row */}
                  <View style={styles.financialSummaryRow}>
                    <View style={styles.summaryItem}>
                      <View
                        style={[
                          styles.summaryIcon,
                          { backgroundColor: "rgba(16, 185, 129, 0.15)" },
                        ]}
                      >
                        <Icons.ArrowUp
                          size={16}
                          color="#10B981"
                          weight="bold"
                        />
                      </View>
                      <View>
                        <Typo size={11} color="rgba(255,255,255,0.7)">
                          Income
                        </Typo>
                        <Typo size={14} fontWeight="600" color="#10B981">
                          {formatamount(
                            walletSummary.income,
                            getSymbol(selectedWallet.currency)
                          )}
                        </Typo>
                      </View>
                    </View>

                    <View style={styles.summaryItem}>
                      <View
                        style={[
                          styles.summaryIcon,
                          { backgroundColor: "rgba(239, 68, 68, 0.15)" },
                        ]}
                      >
                        <Icons.ArrowDown
                          size={16}
                          color="#EF4444"
                          weight="bold"
                        />
                      </View>
                      <View>
                        <Typo size={11} color="rgba(255,255,255,0.7)">
                          Expense
                        </Typo>
                        <Typo size={14} fontWeight="600" color="#EF4444">
                          {formatamount(
                            walletSummary.expense,
                            getSymbol(selectedWallet.currency)
                          )}
                        </Typo>
                      </View>
                    </View>

                    <View style={styles.summaryItem}>
                      <View
                        style={[
                          styles.summaryIcon,
                          {
                            backgroundColor:
                              walletSummary.total >= 0
                                ? "rgba(59, 130, 246, 0.15)"
                                : "rgba(239, 68, 68, 0.15)",
                          },
                        ]}
                      >
                        {walletSummary.total >= 0 ? (
                          <Icons.TrendUp
                            size={16}
                            color="#3B82F6"
                            weight="bold"
                          />
                        ) : (
                          <Icons.TrendDown
                            size={16}
                            color="#EF4444"
                            weight="bold"
                          />
                        )}
                      </View>
                      <View>
                        <Typo size={11} color="rgba(255,255,255,0.7)">
                          Net Flow
                        </Typo>
                        <Typo
                          size={14}
                          fontWeight="600"
                          color={
                            walletSummary.total >= 0 ? "#3B82F6" : "#EF4444"
                          }
                        >
                          {getSymbol(selectedWallet.currency)}
                          {formatamount(Math.abs(walletSummary.total))}
                        </Typo>
                      </View>
                    </View>
                  </View>
                </LinearGradient>

                {/* Financial Health Score */}
                <View style={styles.healthScoreCard}>
                  <View style={styles.healthScoreHeader}>
                    <View style={styles.healthTitle}>
                      <Animated.View
                        style={{ transform: [{ scale: pulseAnim }] }}
                      >
                        <Icons.Heartbeat
                          size={26}
                          color="#EC4899"
                          weight="fill"
                        />
                      </Animated.View>
                      <Typo
                        size={15}
                        fontWeight="600"
                        color={colors.white}
                        style={{ marginLeft: 8 }}
                      >
                        Financial Health
                      </Typo>
                    </View>

                    <View style={styles.scoreContainer}>
                      <Typo size={13} fontWeight="700" color="#EC4899">
                        {walletSummary.income > 0
                          ? Math.max(
                              0,
                              Math.min(
                                100,
                                Math.round(
                                  (walletSummary.total / walletSummary.income) *
                                    100 +
                                    50
                                )
                              )
                            )
                          : 50}
                        /100
                      </Typo>
                    </View>
                  </View>

                  <View style={styles.scoreBar}>
                    <Animated.View
                      style={{
                        width: animatedWidth.interpolate({
                          inputRange: [0, 100],
                          outputRange: ["0%", "100%"],
                        }),
                        height: "100%",
                        borderRadius: 8,
                        overflow: "hidden",
                      }}
                    >
                      <LinearGradient
                        colors={["#EC4899", "#F472B6"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{ flex: 1 }}
                      />
                    </Animated.View>
                  </View>

                  <View style={styles.healthTips}>
                    <Typo size={12} color={colors.neutral400}>
                      {walletSummary.total >= 0
                        ? "You're saving well! Keep it up."
                        : "Try to reduce expenses this month."}
                    </Typo>
                  </View>
                </View>

                {/* Financial Overview Section */}
                <View style={styles.financialOverview}>
                  <View style={styles.sectionHeader}>
                    <Typo size={18} fontWeight="700" color={colors.white}>
                      Monthly Averages & Metrics
                    </Typo>
                    <Animated.View
                      style={{
                        transform: [{ translateX: swipeInterpolate }],
                        opacity: opacityInterpolate,
                      }}
                    >
                      <Icons.HandSwipeLeft
                        size={28}
                        color={colors.secondaryPurple}
                      />
                    </Animated.View>
                  </View>

                  {/* Average Metrics Cards */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.metricsScrollContainer}
                  >
                    {/* Average Income Card */}
                    <View style={styles.metricCard}>
                      <View style={styles.metricHeader}>
                        <View
                          style={[
                            styles.metricIconContainer,
                            { backgroundColor: "rgba(16, 185, 129, 0.2)" },
                          ]}
                        >
                          <Icons.ArrowUp
                            size={14}
                            color="#10B981"
                            weight="bold"
                          />
                        </View>
                        <Typo size={11} fontWeight="600" color="#10B981">
                          AVG INCOME
                        </Typo>
                      </View>
                      <Typo
                        size={16}
                        fontWeight="bold"
                        color="#10B981"
                        style={styles.metricValue}
                      >
                        {getSymbol(selectedWallet.currency)}
                        {(walletSummary.income / 12).toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}
                      </Typo>
                      <Typo
                        size={10}
                        color="rgba(255,255,255,0.6)"
                        style={styles.metricSubtext}
                      >
                        Monthly Average
                      </Typo>
                    </View>

                    {/* Average Expense Card */}
                    <View style={styles.metricCard}>
                      <View style={styles.metricHeader}>
                        <View
                          style={[
                            styles.metricIconContainer,
                            { backgroundColor: "rgba(239, 68, 68, 0.2)" },
                          ]}
                        >
                          <Icons.ArrowDown
                            size={14}
                            color="#EF4444"
                            weight="bold"
                          />
                        </View>
                        <Typo size={11} fontWeight="600" color="#EF4444">
                          AVG EXPENSE
                        </Typo>
                      </View>
                      <Typo
                        size={16}
                        fontWeight="700"
                        color="#EF4444"
                        style={styles.metricValue}
                      >
                        {getSymbol(selectedWallet.currency)}
                        {(walletSummary.expense / 12).toLocaleString(
                          undefined,
                          {
                            maximumFractionDigits: 2,
                          }
                        )}
                      </Typo>
                      <Typo
                        size={10}
                        color="rgba(255,255,255,0.6)"
                        style={styles.metricSubtext}
                      >
                        Monthly Average
                      </Typo>
                    </View>

                    {/* Savings Card */}
                    <View style={styles.metricCard}>
                      <View style={styles.metricHeader}>
                        <View
                          style={[
                            styles.metricIconContainer,
                            { backgroundColor: "rgba(59, 130, 246, 0.2)" },
                          ]}
                        >
                          <Icons.PiggyBank
                            size={14}
                            color="#3B82F6"
                            weight="fill"
                          />
                        </View>
                        <Typo size={11} fontWeight="600" color="#3B82F6">
                          SAVINGS
                        </Typo>
                      </View>
                      <Typo
                        size={16}
                        fontWeight="700"
                        color="#3B82F6"
                        style={styles.metricValue}
                      >
                        {getSymbol(selectedWallet.currency)}
                        {Math.max(0, walletSummary.total).toLocaleString()}
                      </Typo>
                      <Typo
                        size={10}
                        color="rgba(255,255,255,0.6)"
                        style={styles.metricSubtext}
                      >
                        {walletSummary.income > 0
                          ? (
                              (Math.max(0, walletSummary.total) /
                                walletSummary.income) *
                              100
                            ).toFixed(1)
                          : 0}
                        % Rate
                      </Typo>
                    </View>

                    {/* Net Flow Card */}
                    <View
                      style={[
                        styles.metricCard,
                        walletSummary.total >= 0
                          ? styles.positiveNetFlow
                          : styles.negativeNetFlow,
                      ]}
                    >
                      <View style={styles.metricHeader}>
                        <View
                          style={[
                            styles.metricIconContainer,
                            {
                              backgroundColor:
                                walletSummary.total >= 0
                                  ? "rgba(34, 197, 94, 0.2)"
                                  : "rgba(239, 68, 68, 0.2)",
                            },
                          ]}
                        >
                          {walletSummary.total >= 0 ? (
                            <Icons.TrendUp
                              size={14}
                              color="#22C55E"
                              weight="bold"
                            />
                          ) : (
                            <Icons.TrendDown
                              size={14}
                              color="#EF4444"
                              weight="bold"
                            />
                          )}
                        </View>
                        <Typo
                          size={11}
                          fontWeight="600"
                          color={
                            walletSummary.total >= 0 ? "#22C55E" : "#EF4444"
                          }
                        >
                          NET FLOW
                        </Typo>
                      </View>
                      <Typo
                        size={16}
                        fontWeight="700"
                        color={walletSummary.total >= 0 ? "#22C55E" : "#EF4444"}
                        style={styles.metricValue}
                      >
                        {getSymbol(selectedWallet.currency)}
                        {Math.abs(walletSummary.total).toLocaleString()}
                      </Typo>
                      <Typo
                        size={10}
                        color="rgba(255,255,255,0.6)"
                        style={styles.metricSubtext}
                      >
                        {walletSummary.total >= 0
                          ? "Monthly Surplus"
                          : "Monthly Deficit"}
                      </Typo>
                    </View>
                  </ScrollView>

                  {/* Monthly Flow Visualization */}
                  <View style={styles.flowContainer}>
                    <View style={styles.flowHeader}>
                      <Typo size={14} fontWeight="700" color={colors.white}>
                        Monthly Cash Flow
                      </Typo>
                    </View>

                    <View style={styles.flowVisualization}>
                      <View style={styles.flowBar}>
                        {/* Animated Income Bar */}
                        <Animated.View
                          style={[
                            styles.incomeBar,
                            {
                              width: incomeAnim.interpolate({
                                inputRange: [0, 100],
                                outputRange: ["0%", "100%"],
                              }),
                            },
                          ]}
                        />

                        {/* Animated Expense Bar */}
                        <Animated.View
                          style={[
                            styles.expenseBar,
                            {
                              width: expenseAnim.interpolate({
                                inputRange: [0, 100],
                                outputRange: ["0%", "100%"],
                              }),
                            },
                          ]}
                        />
                      </View>

                      {/* Labels */}
                      <View style={styles.flowLabels}>
                        <View style={styles.flowLabel}>
                          <View
                            style={[
                              styles.colorIndicator,
                              { backgroundColor: "#10B981" },
                            ]}
                          />
                          <Typo size={12} color="rgba(255,255,255,0.7)">
                            Income: {getSymbol(selectedWallet.currency)}
                            {walletSummary.income.toLocaleString()}
                          </Typo>
                        </View>

                        <View style={styles.flowLabel}>
                          <View
                            style={[
                              styles.colorIndicator,
                              { backgroundColor: "#EF4444" },
                            ]}
                          />
                          <Typo size={12} color="rgba(255,255,255,0.7)">
                            Expense: {getSymbol(selectedWallet.currency)}
                            {walletSummary.expense.toLocaleString()}
                          </Typo>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              </View>

              {/* Filter tabs */}
              <View style={styles.filterRow}>
                {filters.map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={styles.filterBtnWrapper}
                    onPress={() => setActiveFilter(f)}
                    activeOpacity={0.8}
                  >
                    <Typo
                      size={14}
                      fontWeight="600"
                      color={
                        activeFilter === f ? colors.white : colors.neutral400
                      }
                    >
                      {f}
                    </Typo>
                    {activeFilter === f && <View style={styles.underline} />}
                  </TouchableOpacity>
                ))}
              </View>

              <View>
                {barData.length === 0 ? (
                  <Typo
                    size={14}
                    color={colors.neutral400}
                    style={{ marginTop: 40, textAlign: "center" }}
                  >
                    No data available for {activeFilter}
                  </Typo>
                ) : (
                  <View style={{ width: screenWidth - 5 }}>
                    {/* Bar Chart Card */}
                    <LinearGradient
                      colors={["#000", "#000000"]}
                      style={styles.chartCard}
                    >
                      <Typo
                        size={16}
                        fontWeight="700"
                        color={colors.white}
                        style={{ marginBottom: 20, alignSelf: "center" }}
                      >
                        {activeFilter} Transactions
                      </Typo>
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          marginBottom: 24,
                          marginHorizontal: spacingX._10,
                        }}
                      >
                        {(["bar", "line", "pie"] as const).map((type) => {
                          // Define icon per type
                          const IconComponent =
                            type === "bar"
                              ? Icons.ChartBar
                              : type === "line"
                              ? Icons.ChartLine
                              : Icons.ChartPieSlice;

                          const isActive = selectedChart === type;

                          return (
                            <TouchableOpacity
                              key={type}
                              style={{
                                flex: 1,
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "center",
                                paddingVertical: 10,
                                marginHorizontal: 6,
                                borderRadius: 20,
                                backgroundColor: isActive
                                  ? "#6366F1"
                                  : colors.neutral800,
                              }}
                              onPress={() => setSelectedChart(type)}
                            >
                              <IconComponent
                                size={20}
                                weight="bold"
                                color={isActive ? "#fff" : "#D1D5DB"}
                                style={{ marginRight: 6 }}
                              />
                              <Typo
                                size={14}
                                fontWeight="600"
                                color={isActive ? "#fff" : "#D1D5DB"}
                              >
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                              </Typo>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      {/* Render the selected chart */}
                      <View style={styles.chartContainer}>{renderChart()}</View>
                    </LinearGradient>
                    <View style={styles.container}>
                      {/* Base line */}
                      <View style={styles.baseLine} />

                      {/* Shimmer overlay */}
                      <Animated.View
                        style={[
                          styles.shimmer,
                          { transform: [{ translateX }] },
                        ]}
                      >
                        <LinearGradient
                          colors={[
                            "transparent",
                            "rgba(255,255,255,0.4)",
                            "transparent",
                          ]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={{ flex: 1 }}
                        />
                      </Animated.View>
                    </View>

                    <LinearGradient
                      colors={["#000", "#000000"]}
                      style={[
                        styles.chartCard,
                        { borderRadius: 32, overflow: "hidden", flex: 1 },
                      ]}
                    >
                      <View>
                        {/* Header Section */}
                        <View
                          style={{
                            paddingHorizontal: spacingX._7,
                            paddingTop: 5,
                            paddingBottom: 16,
                          }}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 16,
                            }}
                          >
                            <View>
                              <Typo
                                size={14}
                                fontWeight="600"
                                color={colors.neutral400}
                                style={{
                                  marginBottom: 4,
                                  textTransform: "uppercase",
                                  letterSpacing: 0.5,
                                }}
                              >
                                Financial Overview
                              </Typo>
                              <Typo
                                size={26}
                                fontWeight="800"
                                color={colors.white}
                                style={{ letterSpacing: -0.5 }}
                              >
                                Budget Summary
                              </Typo>
                            </View>
                            <TouchableOpacity
                              style={{
                                backgroundColor: "rgba(99, 102, 241, 0.12)",
                                paddingHorizontal: 16,
                                paddingVertical: 8,
                                borderRadius: 20,
                                borderWidth: 1,
                                borderColor: "rgba(99, 102, 241, 0.2)",
                                flexDirection: "row",
                                alignItems: "center",
                              }}
                              activeOpacity={0.8}
                            >
                              <Typo
                                size={14}
                                fontWeight="600"
                                color={colors.primaryLight}
                              >
                                {activeFilter}
                              </Typo>
                              <Icons.HandCoins
                                size={22}
                                color={colors.primaryLight}
                                style={{ marginLeft: 4 }}
                              />
                            </TouchableOpacity>
                          </View>

                          {/* Stats Summary Cards */}
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={{ marginBottom: 8 }}
                          >
                            <View
                              style={{
                                flexDirection: "row",
                                paddingVertical: 8,
                              }}
                            >
                              <View
                                style={{
                                  width: 170,
                                  backgroundColor: "rgba(16, 185, 129, 0.1)",
                                  padding: 20,
                                  borderRadius: 20,
                                  marginRight: 12,
                                  borderWidth: 1,
                                  borderColor: "rgba(16, 185, 129, 0.15)",
                                }}
                              >
                                <View
                                  style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    marginBottom: 8,
                                  }}
                                >
                                  <View
                                    style={{
                                      width: 27,
                                      height: 27,
                                      borderRadius: 12,
                                      backgroundColor:
                                        "rgba(16, 185, 129, 0.2)",
                                      justifyContent: "center",
                                      alignItems: "center",
                                      marginRight: 8,
                                    }}
                                  >
                                    <Icons.TrendUp
                                      size={20}
                                      color={colors.green}
                                      weight="fill"
                                    />
                                  </View>
                                  <Typo
                                    size={13}
                                    fontWeight="600"
                                    color={colors.neutral400}
                                  >
                                    Income
                                  </Typo>
                                </View>
                                <Typo
                                  size={20}
                                  fontWeight="800"
                                  color={colors.green}
                                >
                                  {formatamount(
                                    getTableData().reduce(
                                      (a, r) => a + r.income,
                                      0
                                    ),
                                    getSymbol(selectedWallet.currency)
                                  )}
                                </Typo>
                              </View>

                              <View
                                style={{
                                  width: 170,
                                  backgroundColor: "rgba(239, 68, 68, 0.1)",
                                  padding: 20,
                                  borderRadius: 20,
                                  marginRight: 12,
                                  borderWidth: 1,
                                  borderColor: "rgba(239, 68, 68, 0.15)",
                                }}
                              >
                                <View
                                  style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    marginBottom: 8,
                                  }}
                                >
                                  <View
                                    style={{
                                      width: 27,
                                      height: 27,
                                      borderRadius: 12,
                                      backgroundColor: "rgba(239, 68, 68, 0.2)",
                                      justifyContent: "center",
                                      alignItems: "center",
                                      marginRight: 8,
                                    }}
                                  >
                                    <Icons.TrendDown
                                      size={20}
                                      color={colors.red}
                                      weight="fill"
                                    />
                                  </View>
                                  <Typo
                                    size={13}
                                    fontWeight="600"
                                    color={colors.neutral400}
                                  >
                                    Expenses
                                  </Typo>
                                </View>
                                <Typo
                                  size={20}
                                  fontWeight="800"
                                  color={colors.red}
                                >
                                  {formatamount(
                                    getTableData().reduce(
                                      (a, r) => a + r.expense,
                                      0
                                    ),
                                    getSymbol(selectedWallet.currency)
                                  )}
                                </Typo>
                              </View>

                              <View
                                style={{
                                  width: 170,
                                  backgroundColor: "rgba(99, 102, 241, 0.1)",
                                  padding: 20,
                                  borderRadius: 20,
                                  borderWidth: 1,
                                  borderColor: "rgba(99, 102, 241, 0.15)",
                                }}
                              >
                                <View
                                  style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    marginBottom: 8,
                                  }}
                                >
                                  <View
                                    style={{
                                      width: 27,
                                      height: 27,
                                      borderRadius: 12,
                                      backgroundColor:
                                        "rgba(99, 102, 241, 0.2)",
                                      justifyContent: "center",
                                      alignItems: "center",
                                      marginRight: 8,
                                    }}
                                  >
                                    <Icons.Bank
                                      size={22}
                                      color={colors.primaryLight}
                                    />
                                  </View>
                                  <Typo
                                    size={13}
                                    fontWeight="600"
                                    color={colors.neutral400}
                                  >
                                    Saved
                                  </Typo>
                                </View>
                                <Typo
                                  size={20}
                                  fontWeight="800"
                                  color={colors.primaryLight}
                                >
                                  {getSymbol(selectedWallet.currency)}
                                  {formatamount(
                                    getTableData().reduce(
                                      (a, r) => a + (r.income - r.expense),
                                      0
                                    )
                                  )}
                                </Typo>
                              </View>
                            </View>
                          </ScrollView>
                        </View>
                      </View>
                      {/* Content Section with subtle divider */}
                      <View
                        style={{
                          backgroundColor: "rgba(255, 255, 255, 0.03)",
                          borderTopLeftRadius: 32,
                          borderTopRightRadius: 32,
                          paddingTop: 24,
                        }}
                      >
                        <View
                          style={{
                            paddingHorizontal: 20,
                            marginBottom: 16,
                          }}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                              }}
                            >
                              <Typo
                                size={18}
                                fontWeight="700"
                                color={colors.white}
                              >
                                History
                              </Typo>
                              <Icons.ClockCounterClockwise
                                size={28}
                                color={colors.white}
                                style={{ marginLeft: 6 }}
                              />
                            </View>

                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 16,
                              }}
                            >
                              <Animated.View
                                style={{
                                  transform: [
                                    { translateX: personTranslateX },
                                    { translateY: personTranslateY },
                                  ],
                                }}
                              >
                                <Icons.PersonSimpleRun
                                  size={25}
                                  color="#10B981"
                                  weight="fill"
                                />
                              </Animated.View>
                              <Animated.View
                                style={{
                                  transform: [
                                    { translateX: moneyTranslateX },
                                    { translateY: moneyTranslateY },
                                  ],
                                }}
                              >
                                <Icons.CurrencyDollar
                                  size={25}
                                  color="#F43F5E"
                                />
                              </Animated.View>
                            </View>
                          </View>
                        </View>

                        {/* Category List */}
                        <View
                          style={{
                            paddingHorizontal: spacingX._3,
                            paddingBottom: 24,
                          }}
                        >
                          {getTableData().map((row, idx) => {
                            const total = row.income + row.expense;
                            const incomeWidth = total
                              ? (row.income / total) * 100
                              : 0;
                            const expenseWidth = total
                              ? (row.expense / total) * 100
                              : 0;
                            const saveAmount = row.income - row.expense;
                            const savePercentage =
                              row.income > 0
                                ? (saveAmount / row.income) * 100
                                : 0;

                            return (
                              <TouchableOpacity
                                key={idx}
                                style={{
                                  backgroundColor: "rgba(255, 255, 255, 0.04)",
                                  padding: 20,
                                  borderRadius: radius._20,
                                  marginBottom: 12,
                                  borderWidth: 2,
                                  borderColor: "rgba(255, 255, 255, 0.08)",
                                }}
                                activeOpacity={0.7}
                              >
                                <View
                                  style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    marginBottom: 14,
                                  }}
                                >
                                  <View
                                    style={{
                                      width: 52,
                                      height: 52,
                                      borderRadius: 20,
                                      backgroundColor:
                                        saveAmount >= 0
                                          ? "rgba(16, 185, 129, 0.15)"
                                          : "rgba(239, 68, 68, 0.15)",
                                      justifyContent: "center",
                                      alignItems: "center",
                                      marginRight: 16,
                                      borderWidth: 2,
                                      borderColor:
                                        saveAmount >= 0
                                          ? "rgba(16, 185, 129, 0.3)"
                                          : "rgba(239, 68, 68, 0.3)",
                                    }}
                                  >
                                    <Typo
                                      size={17}
                                      fontWeight="700"
                                      color={
                                        saveAmount >= 0
                                          ? colors.green
                                          : colors.red
                                      }
                                    >
                                      {row.label.charAt(0)}
                                    </Typo>
                                  </View>
                                  <View style={{ flex: 1 }}>
                                    <Typo
                                      size={16}
                                      fontWeight="600"
                                      color={colors.white}
                                    >
                                      {row.label}
                                    </Typo>
                                    <Typo
                                      size={13}
                                      fontWeight="500"
                                      color={colors.neutral500}
                                    >
                                      {incomeWidth.toFixed(0)}% income •{" "}
                                      {expenseWidth.toFixed(0)}% expense
                                    </Typo>
                                  </View>
                                  <Typo
                                    size={16}
                                    fontWeight="700"
                                    color={
                                      saveAmount >= 0
                                        ? colors.primaryLight
                                        : colors.red
                                    }
                                  >
                                    {getSymbol(selectedWallet.currency)}
                                    {Math.abs(saveAmount).toLocaleString()}
                                  </Typo>
                                </View>

                                {/* Progress bar */}
                                <View style={{ marginBottom: 8 }}>
                                  <View
                                    style={{
                                      flexDirection: "row",
                                      height: 6,
                                      borderRadius: 3,
                                      overflow: "hidden",
                                      backgroundColor:
                                        "rgba(255, 255, 255, 0.08)",
                                      marginBottom: 12,
                                    }}
                                  >
                                    {incomeWidth > 0 && (
                                      <LinearGradient
                                        colors={["#10B981", "#69e0bf"]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={{
                                          width: `${incomeWidth}%`,
                                          height: "100%",
                                        }}
                                      />
                                    )}
                                    {expenseWidth > 0 && (
                                      <LinearGradient
                                        colors={["#EF4444", "#F87171"]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={{
                                          width: `${expenseWidth}%`,
                                          height: "100%",
                                        }}
                                      />
                                    )}
                                  </View>

                                  <View
                                    style={{
                                      flexDirection: "row",
                                      justifyContent: "space-between",
                                    }}
                                  >
                                    <View
                                      style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                      }}
                                    >
                                      <View
                                        style={{
                                          width: 10,
                                          height: 10,
                                          borderRadius: 5,
                                          backgroundColor: "#10B981",
                                          marginRight: 8,
                                        }}
                                      />
                                      <Typo size={12} color={colors.neutral400}>
                                        {getSymbol(selectedWallet.currency)}
                                        {row.income.toLocaleString()}
                                      </Typo>
                                    </View>
                                    <View
                                      style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                      }}
                                    >
                                      <View
                                        style={{
                                          width: 10,
                                          height: 10,
                                          borderRadius: 5,
                                          backgroundColor: "#EF4444",
                                          marginRight: 8,
                                        }}
                                      />
                                      <Typo size={12} color={colors.neutral400}>
                                        {getSymbol(selectedWallet.currency)}
                                        {row.expense.toLocaleString()}
                                      </Typo>
                                    </View>
                                  </View>
                                </View>

                                {/* Savings indicator */}
                                {saveAmount > 0 && (
                                  <View
                                    style={{
                                      flexDirection: "row",
                                      alignItems: "center",
                                      backgroundColor:
                                        "rgba(99, 102, 241, 0.1)",
                                      paddingHorizontal: 12,
                                      paddingVertical: 6,
                                      borderRadius: 12,
                                      alignSelf: "flex-start",
                                      marginTop: 4,
                                    }}
                                  >
                                    <Icons.Bank
                                      size={20}
                                      color={colors.primaryLight}
                                      style={{ marginRight: 4 }}
                                    />
                                    <Typo
                                      size={12}
                                      fontWeight="700"
                                      color={colors.primaryLight}
                                    >
                                      {savePercentage.toFixed(0)}% saved
                                    </Typo>
                                  </View>
                                )}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    </LinearGradient>
                  </View>
                )}
              </View>
            </View>
          )}
          keyExtractor={(item) => item.key}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Wallet Picker Modal (bottom sheet) */}
      <Modal
        visible={walletModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeWalletModal}
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[styles.bottomSheet, { transform: [{ translateY }] }]}
          >
            <View style={styles.dragHandle} />
            <View style={styles.sheetHeader}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                <View style={styles.walletIconWrap}>
                  <Icons.Wallet size={28} color={colors.primaryDark} />
                </View>
                <View>
                  <Typo size={18} fontWeight="700" color={colors.neutral100}>
                    Select Wallet
                  </Typo>
                  <Typo size={14} color={colors.neutral400}>
                    Currency:{" "}
                    <Typo
                      size={16}
                      color={currencyColors[selectedCurrency] || colors.white}
                    >
                      {getSymbol(selectedCurrency)}
                    </Typo>
                  </Typo>
                </View>
              </View>
              <TouchableOpacity
                onPress={closeWalletModal}
                style={styles.closeBtn}
              >
                <Typo size={15} fontWeight="600" color={colors.neutral300}>
                  ✕
                </Typo>
              </TouchableOpacity>
            </View>

            <FlatList
              data={filteredWallets}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: spacingY._5 }}
              renderItem={({ item }) => {
                const isSel = selectedWallet?.id === item.id;
                return (
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => {
                      setSelectedWallet(item);
                      closeWalletModal();
                    }}
                    style={[
                      styles.walletRow,
                      {
                        backgroundColor: isSel
                          ? currencyColors[item.currency] || colors.green
                          : colors.neutral850,
                        borderColor: isSel ? "#ffffff" : "transparent",
                      },
                    ]}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <View
                        style={[
                          styles.walletAvatar,
                          {
                            backgroundColor: isSel
                              ? "rgba(255,255,255,0.25)"
                              : "rgba(255,255,255,0.1)",
                          },
                        ]}
                      >
                        <Typo
                          size={16}
                          fontWeight="700"
                          color={isSel ? colors.neutral900 : colors.white}
                        >
                          {item.name.charAt(0)}
                        </Typo>
                      </View>
                      <Typo
                        size={16}
                        fontWeight="600"
                        color={isSel ? colors.neutral900 : colors.white}
                      >
                        {item.name}
                      </Typo>
                    </View>

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
                        color={isSel ? colors.neutral900 : colors.white}
                      >
                        {getSymbol(item.currency)}{" "}
                        {item.amount?.toLocaleString()}
                      </Typo>
                      {isSel && (
                        <Icons.Check
                          size={22}
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
    </ScreenWrapper>
  );
};

export default Statistics;

const styles = StyleSheet.create({
  // Tabs
  tabsContainer: {
    marginTop: 10,
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  tabsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.neutral950,
    borderRadius: 16,
    padding: 6,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tabWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 4,
  },
  tabButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "transparent",
    width: "100%",
  },
  currencyIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  currencyText: {
    marginTop: 1,
  },
  tabIndicator: {
    height: 3,
    borderRadius: 3,
    marginTop: 4,
    alignSelf: "center",
  },

  helperCard: {
    marginHorizontal: spacingX._10,
    marginTop: spacingY._10,
    padding: spacingX._7,
    borderRadius: radius._12,
    backgroundColor: "#1E293B",
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },

  // Filter tabs
  filterRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: spacingY._3,
    width: "100%",
  },
  filterBtnWrapper: {
    alignItems: "center",
    paddingVertical: 1,
    paddingHorizontal: 10,
  },
  underline: {
    marginTop: 4,
    height: 4,
    width: "100%",
    borderRadius: 2,
    backgroundColor: colors.secondaryPurple,
  },

  // Chart cards
  chartCard: {
    borderRadius: radius._20,
    padding: 16,
    marginVertical: 15,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },

  // Modal / bottom sheet
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
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
    marginBottom: spacingY._10,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacingY._5,
  },
  walletIconWrap: {
    backgroundColor: colors.neutral800,
    padding: spacingX._3,
    borderRadius: radius._12,
  },
  closeBtn: {
    backgroundColor: colors.neutral800,
    borderRadius: 50,
    paddingHorizontal: spacingX._7,
    paddingVertical: spacingY._3,
  },

  walletRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacingY._5,
    paddingHorizontal: spacingX._5,
    borderRadius: radius._12,
    marginBottom: spacingY._7,
    borderWidth: 1,
  },
  walletAvatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },

  walletContainer: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  modernWalletCard: {
    padding: 20,
    borderRadius: 20,
    marginTop: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  walletInfo: {
    flex: 1,
  },
  walletTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  currencyChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 12,
  },
  balanceText: {
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  financialSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.01)",
    flex: 1,
    marginHorizontal: 4,
  },
  summaryIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  healthScoreCard: {
    padding: 16,
    borderRadius: radius._20,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    marginBottom: 20,
  },
  healthScoreHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  healthTitle: {
    flexDirection: "row",
    alignItems: "center",
  },
  scoreContainer: {
    backgroundColor: "rgba(236, 72, 153, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scoreBar: {
    height: 6,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 8,
  },
  scoreProgress: {
    height: "100%",
    borderRadius: 3,
  },
  healthTips: {
    flexDirection: "row",
    alignItems: "center",
  },
  financialOverview: {
    marginBottom: 5,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  metricsScrollContainer: {
    paddingHorizontal: 4,
    gap: 12,
    paddingBottom: 1,
  },
  metricCard: {
    width: 200,
    borderRadius: 16,
    padding: 16,
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  positiveNetFlow: {
    borderLeftWidth: 3,
    borderLeftColor: "#22C55E",
  },
  negativeNetFlow: {
    borderLeftWidth: 3,
    borderLeftColor: "#EF4444",
  },
  metricHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  metricIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  metricValue: {
    marginBottom: 5,
  },
  metricSubtext: {
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  flowContainer: {
    marginTop: 10,
    padding: 16,
    borderRadius: radius._20,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  flowHeader: {
    marginBottom: 14,
  },
  flowVisualization: {
    marginBottom: 2,
  },
  flowBar: {
    height: 8,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 4,
    flexDirection: "row",
    overflow: "hidden",
    marginBottom: 12,
  },
  incomeBar: {
    height: "100%",
    backgroundColor: "#10B981",
  },
  expenseBar: {
    height: "100%",
    backgroundColor: "#EF4444",
  },
  flowLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  flowLabel: {
    flexDirection: "row",
    alignItems: "center",
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: radius._20,
    marginRight: 6,
  },
  chartSelector: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: spacingY._5,
  },
  chartButton: {
    paddingHorizontal: spacingX._7,
    paddingVertical: spacingY._3,
    marginHorizontal: spacingX._3,
    borderRadius: radius._10,
    backgroundColor: colors.neutral950,
  },
  chartButtonActive: {
    backgroundColor: colors.primaryBlue,
  },
  chartButtonText: {
    color: colors.white,
  },
  chartButtonTextActive: {
    color: colors.neutral900,
    fontWeight: "bold",
  },
  chartContainer: {
    alignItems: "center",
    marginVertical: spacingY._10,
  },
  legendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 5,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 10,
  },
  legendColor: {
    width: 15,
    height: 15,
    borderRadius: radius._20,
    marginRight: 5,
  },
  legendText: {
    color: colors.white,
    fontSize: scale(12),
  },

  container: {
    width: "90%",
    alignSelf: "center",
    marginVertical: 16,
    height: 4,
    borderRadius: 10,
    overflow: "hidden",
  },
  baseLine: {
    flex: 1,
    backgroundColor: "rgba(107,114,128,0.2)",
    borderRadius: 10,
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
  },
});
