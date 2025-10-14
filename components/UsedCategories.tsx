import { expenseCategories, incomeCategories } from "@/constants/data";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { TransactionType } from "@/type";
import { verticalScale } from "@/utils/styling";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import * as Icons from "phosphor-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming
} from "react-native-reanimated";
import { Circle, Svg } from "react-native-svg";
import Typo from "./Typo";

const SCREEN_WIDTH = Dimensions.get("window").width;

interface CategorySummaryProps {
  data: TransactionType[];
  title?: string;
  currency?: string;
  totalWalletAmount?: number;
  onCategoryPress?: (category: string) => void;
}

interface CategoryCardProps {
  category: string;
  label: string;
  total: number;
  count: number;
  type: "income" | "expense";
  IconComponent: React.ElementType;
  bgColor: string;
  currency: string;
  totalWalletAmount: number;
  onPress?: (category: string) => void;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  label,
  total,
  count,
  type,
  IconComponent,
  bgColor,
  currency,
  totalWalletAmount,
}) => {
  const usagePercent =
    totalWalletAmount > 0
      ? Math.min((total / totalWalletAmount) * 100, 100)
      : 0;

  const animatedProgress = useSharedValue(0);
  const cardScale = useSharedValue(1);

  useFocusEffect(
    React.useCallback(() => {
      animatedProgress.value = withTiming(usagePercent, { duration: 1000 });
      return () => {
        animatedProgress.value = 0;
      };
    }, [usagePercent])
  );

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset =
      2 * Math.PI * 40 * (1 - animatedProgress.value / 100);
    return {
      strokeDashoffset,
    };
  });

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const amountColor = type === "income" ? colors.green : colors.red;

  return (
    <Animated.View style={[styles.card, cardAnimatedStyle]}>
      <TouchableOpacity
        style={styles.cardInner}
        activeOpacity={1}
      >
        <LinearGradient
          colors={[colors.neutral950, colors.black]}
          style={styles.gradientBackground}
        >
          {/* Circular Progress Bar with Icon */}
          <View style={styles.iconContainer}>
            <Svg height="90" width="90" viewBox="0 0 100 100">
              {/* Background circle */}
              <Circle
                cx="50"
                cy="50"
                r="40"
                stroke={colors.neutral700}
                strokeWidth="8"
                fill="transparent"
              />
              {/* Foreground animated circle */}
              <AnimatedCircle
                cx="50"
                cy="50"
                r="40"
                stroke={bgColor}
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 40}
                strokeLinecap="round"
                animatedProps={animatedProps}
              />
            </Svg>
            <View style={styles.absoluteIconWrapper}>
              <IconComponent
                size={verticalScale(30)}
                color={bgColor}
                weight="bold"
              />
            </View>
          </View>

          {/* Text Content */}
          <Text style={styles.categoryText}>{label}</Text>
          <Text style={[styles.amountText, { color: amountColor }]}>
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: currency,
              minimumFractionDigits: 0,
            }).format(total)}
          </Text>
          <Text style={styles.countText}>
            {count} {count > 1 ? "Transactions" : "Transaction"}
          </Text>
          <Text style={[styles.usagePercentText, { color: bgColor }]}>
  {usagePercent.toFixed(1)}%
</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const UsedCategories: React.FC<CategorySummaryProps> = ({
  data,
  title,
  currency = "USD",
  totalWalletAmount = 0,
  onCategoryPress,
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
  }).current;

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentPage(viewableItems[0].index);
    }
  }).current;

  const categories = useMemo(() => {
    const map: Record<
      string,
      { total: number; count: number; type: "income" | "expense" }
    > = {};
    data.forEach((tx) => {
      if (!tx.category) return;
      if (!map[tx.category]) {
        map[tx.category] = {
          total: 0,
          count: 0,
          type: tx.type as "income" | "expense",
        };
      }
      map[tx.category].total += tx.amount ?? 0;
      map[tx.category].count += 1;
    });

    return Object.entries(map).map(([category, info]) => {
      const catData =
        info.type === "expense"
          ? expenseCategories[category as keyof typeof expenseCategories]
          : incomeCategories[category as keyof typeof incomeCategories];

      return {
        category,
        total: info.total,
        count: info.count,
        type: info.type,
        IconComponent: catData?.icon || Icons.Tag,
        bgColor: catData?.bgColor || colors.secondaryPurple,
        label: catData?.label || category,
      };
    });
  }, [data]);

  const starAnim = useSharedValue(1);
  useEffect(() => {
    starAnim.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 2000 }),
        withTiming(1, { duration: 2000 })
      ),
      -1,
      true
    );
  }, []);
  
    const starPulseStyle = useAnimatedStyle(() => ({
      transform: [{ scale: starAnim.value }],
    }));
    
  if (categories.length === 0) return null;

  const pages = [];
  for (let i = 0; i < categories.length; i += 2) {
    pages.push(categories.slice(i, i + 2));
  }

 

  return (
    <View style={styles.container}>
      {title && (
        <View style={styles.header}>
           <Animated.View
          style={[styles.starCard, starPulseStyle]}
        >
          <Icons.Star size={18} color={colors.yellow} weight="fill" />
          <Typo size={12} color={colors.neutral100} style={{ marginLeft: 6 }}>{categories.length} items</Typo> 
          </Animated.View>
          {pages.length > 1 && (
            <View style={styles.pagination}>
              {pages.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    currentPage === index && styles.activeDot,
                  ]}
                />
              ))}
            </View>
          )}
        </View>
      )}

      <FlatList
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        data={pages}
        keyExtractor={(_, index) => `page-${index}`}
        renderItem={({ item: page }) => (
          <View style={styles.page}>
            {page.map((cat, index) => (
              <CategoryCard
                key={cat.category}
                {...cat}
                currency={currency}
                totalWalletAmount={totalWalletAmount}
                onPress={onCategoryPress}
              />
            ))}
          </View>
        )}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
      />
    </View>
  );
};

export default UsedCategories;

const styles = StyleSheet.create({
  container: {
    marginVertical: spacingY._3,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacingY._20,
    paddingHorizontal: spacingX._7,
  },
  starCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.neutral800,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius._12,
  },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textLighter,
  },
  activeDot: {
    width: 12,
    backgroundColor: colors.green2,
  },
  page: {
    width: SCREEN_WIDTH - spacingX._30,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: spacingX._15,
  },
  card: {
    width: "48%",
    marginBottom: spacingY._3,
    borderWidth:1,
    borderColor:colors.glassBorder,
    borderRadius: radius._10,
    overflow: "hidden",
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 9,
  },
  cardInner: {
    width: "100%",
    borderRadius: 20,
    alignItems: "center",
  },
  gradientBackground: {
    width: "100%",
    paddingVertical: spacingY._10,
    paddingHorizontal: spacingX._5,
    alignItems: "center",
  },
  iconContainer: {
    position: "relative",
    width: 90,
    height: 90,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacingY._5,
  },
  absoluteIconWrapper: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  categoryText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: verticalScale(15),
    textAlign: "center",
    marginBottom: 0,
  },
  amountText: {
    fontWeight: "bold",
    fontSize: verticalScale(15),
    textAlign: "center",
    marginBottom: 6,
  },
  countText: {
    color: colors.neutral300,
    fontSize: verticalScale(10),
    textAlign: "center",
  },
  usagePercentText: {
    fontSize: verticalScale(15),
    fontWeight: "700",
    textAlign: "justify",
  },
});
