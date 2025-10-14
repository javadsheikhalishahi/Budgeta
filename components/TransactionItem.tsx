import { expenseCategories, incomeCategories } from "@/constants/data";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { TransactionItemProps } from "@/type";
import { verticalScale } from "@/utils/styling";
import { Timestamp } from "firebase/firestore";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import Typo from "./Typo";

const typeColors: Record<"income" | "expense", string> = {
  income: colors.green,
  expense: colors.red,
};

const TransactionItem = ({
  item,
  index,
  handleClick,
  currency,
}: TransactionItemProps) => {
  const category =
    item.type === "expense"
      ? expenseCategories[item.category || "car"]
      : incomeCategories[item.category || "salary"];
  const IconComponent = category?.icon;
  const color = typeColors[item.type as "income" | "expense"];

  const displayCurrency = item.currency || currency || "USD";
  
  // Then use displayCurrency for showing the symbol
  const getSymbol = (cur: string) => {
    switch (cur) {
      case "USD": return "$";
      case "GBP": return "£";
      case "IRR": return "﷼";
      default: return cur;
    }
  };

  // --- Time & Date Helpers ---
  const getDateLabel = (date: string | Date | Timestamp) => {
    let dt: Date;
    if (date instanceof Date) dt = date;
    else if (typeof date === "string") dt = new Date(date);
    else if (date instanceof Timestamp) dt = date.toDate();
    else return "";

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (dt.toDateString() === today.toDateString()) return "Today";
    if (dt.toDateString() === yesterday.toDateString()) return "Yesterday";
    return dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const getRelativeTime = (date: string | Date | Timestamp) => {
    const dt =
      date instanceof Date
        ? date
        : date instanceof Timestamp
        ? date.toDate()
        : new Date(date);

    const now = new Date();
    const diff = now.getTime() - dt.getTime();

    const minutes = Math.floor(diff / (60 * 1000));
    const hours = Math.floor(diff / (60 * 60 * 1000));
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));

    if (diff < 60 * 1000) return "Just now";
    if (diff < 60 * 60 * 1000) return `${minutes} min ago`;
    if (diff < 24 * 60 * 60 * 1000)
      return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    return `${days} day${days > 1 ? "s" : ""} ago`;
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

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 70)
        .springify()
        .damping(14)}
    >
      <TouchableOpacity
        style={[styles.row, { borderLeftColor: color }]}
        onPress={() => handleClick(item)}
      >
        {/* Icon */}
        <View
          style={[
            styles.icon,
            { backgroundColor: category?.bgColor || colors.neutral800 },
          ]}
        >
          {IconComponent && (
            <IconComponent
              size={verticalScale(32)}
              weight="duotone"
              color={colors.white}
            />
          )}
        </View>

        {/* Category, Description, and Date */}
        <View style={styles.leftContent}>
          <Typo size={15} fontWeight="600">
            {category?.label}
          </Typo>
          <Typo
            size={12}
            color={colors.neutral400}
            textProps={{ numberOfLines: 1 }}
          >
            {item.description || "-"}
          </Typo>

          {/* Date + Relative Time */}
          <View style={styles.dateRow}>
            <View
              style={[
                styles.dateBadge,
                {
                  backgroundColor:
                    item.type === "income"
                      ? colors.green + "20"
                      : colors.red + "20",
                },
              ]}
            >
              <Typo
                size={12}
                fontWeight="600"
                color={item.type === "income" ? colors.green : colors.red}
              >
                {getDateLabel(item.date)}
              </Typo>
            </View>
            <Typo size={12} color={colors.neutral500}>
              {new Date(
                item.date instanceof Timestamp ? item.date.toDate() : item.date
              ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </Typo>
          </View>
        </View>

        {/* Amount */}
        <View style={styles.rightContent}>
          <View style={styles.amountRow}>
            {item.type === "income" ? (
              <Typo size={15} color={colors.green}>
                +
              </Typo>
            ) : (
              <Typo size={15} color={colors.red}>
                -
              </Typo>
            )}

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginLeft: 1,
              }}
            >
              <Typo fontWeight="bold" color={color} size={18}>
                {getSymbol(displayCurrency)} 
              </Typo>
              <Typo
                fontWeight="600"
                color={color}
                size={18}
                style={{ marginLeft: 4 }}
              >
                {item.amount?.toLocaleString() ?? 0}
              </Typo>
            </View>
          </View>

          <Typo
            size={12}
            color={colors.neutral500}
            style={{ marginTop: 4, textAlign: "right" }}
          >
            Completed
          </Typo>
          <Typo size={11} color={colors.neutral500}>
            ({getRelativeTime(item.date)})
          </Typo>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default TransactionItem;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacingX._12,
    marginBottom: spacingY._3,
    backgroundColor: colors.black,
    padding: spacingY._10,
    borderRadius: radius._15,
    borderLeftWidth: 6,
    borderTopWidth: 2,
    borderTopColor: colors.neutral700,
    borderRightWidth: 3,
    borderRightColor: colors.neutral800,
  },
  icon: {
    height: verticalScale(46),
    width: verticalScale(46),
    justifyContent: "center",
    alignItems: "center",
    borderRadius: radius._10,
  },
  leftContent: {
    flex: 1,
    justifyContent: "center",
    gap: 1,
  },
  rightContent: {
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 1,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 1,
  },
  dateBadge: {
    paddingHorizontal: spacingX._3,
    paddingVertical: spacingY._3,
    borderRadius: radius._20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
});
