import { colors, radius, spacingX } from "@/constants/theme";
import { verticalScale } from "@/utils/styling";
import * as Icon from "phosphor-react-native";
import React, { useRef, useState } from "react";
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

type CurrencyDropdownProps = {
  selected: string;
  onChange: (value: string) => void;
};

const currencies = [
  { label: "USD", value: "USD", color: colors.primary, icon: Icon.CurrencyDollar },
  { label: "POUND", value: "POUND", color: colors.primaryDark, icon: Icon.CurrencyGbp },
  { label: "IRR", value: "IRR", color: colors.yellow, icon: Icon.CurrencyDollar },
];

const CurrencyDropdown: React.FC<CurrencyDropdownProps> = ({ selected, onChange }) => {
  const [open, setOpen] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;

  const toggleDropdown = () => {
    Animated.timing(animation, {
      toValue: open ? 0 : 1,
      duration: 250,
      useNativeDriver: false,
    }).start();
    setOpen(!open);
  };

  const dropdownScale = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1],
  });

  const dropdownOpacity = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const rotateArrow = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const selectedCurrency = currencies.find(c => c.value === selected);

  return (
    <View style={{ zIndex: 1000 }}>
      {/* Pressable input */}
      <Pressable onPress={toggleDropdown} style={styles.inputWrapper}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacingX._10 }}>
          {selectedCurrency?.icon && React.createElement(selectedCurrency.icon, {
            size: verticalScale(26),
            color: selectedCurrency?.color || colors.neutral100,
            weight: "fill"
          })}
          <Text style={styles.selectedText}>{selected}</Text>
        </View>
        <Animated.View style={{ transform: [{ rotate: rotateArrow }] }}>
          <Icon.CaretDown size={verticalScale(20)} color={colors.white} weight="bold" />
        </Animated.View>
      </Pressable>

      {/* Animated Dropdown */}
      <Animated.View
        style={[
          styles.dropdown,
          {
            opacity: dropdownOpacity,
            transform: [{ scaleY: dropdownScale }],
            height: open ? currencies.length * verticalScale(50) : 0,
          },
        ]}
      >
        <ScrollView>
          {currencies.map((item) => {
            const IconComp = item.icon;
            const isSelected = item.value === selected;
            return (
              <Pressable
                key={item.value}
                style={({ pressed }) => [
                  styles.dropdownItem,
                  {
                    backgroundColor: pressed
                      ? colors.neutral800
                      : isSelected
                      ? colors.neutral700
                      : colors.neutral900,
                  },
                ]}
                onPress={() => {
                  onChange(item.value);
                  toggleDropdown();
                }}
              >
                <IconComp
                  size={verticalScale(26)}
                  color={item.color}
                  weight="fill"
                />
                <Text style={styles.dropdownItemText}>{item.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </Animated.View>
    </View>
  );
};

export default CurrencyDropdown;

const styles = StyleSheet.create({
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.neutral300,
    borderRadius: radius._17,
    paddingHorizontal: spacingX._15,
    height: verticalScale(50),
    backgroundColor: colors.neutral900,
    gap: spacingX._7,
  },
  selectedText: {
    color: colors.white,
    fontSize: verticalScale(16),
  },
  dropdown: {
    overflow: "hidden",
    borderRadius: radius._17,
    backgroundColor: colors.neutral900,
    marginTop: 4,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    height: verticalScale(50),
    paddingHorizontal: spacingX._15,
    gap: spacingX._5,
  },
  dropdownItemText: {
    color: colors.white,
    fontSize: 16,
    marginLeft: 8,
  },
});
