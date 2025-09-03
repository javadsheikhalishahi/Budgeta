import { colors } from "@/constants/theme";
import { verticalScale } from "@/utils/styling";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import * as Icons from "phosphor-react-native";
import React, { useEffect, useRef } from "react";
import { Animated, Platform, StyleSheet, TouchableOpacity, View } from "react-native";

export default function CustomTabs({ state, descriptors, navigation }: BottomTabBarProps) {
  const animatedValues = useRef(
    state.routes.map((_, i) => new Animated.Value(state.index === i ? 1.2 : 1))
  ).current;

  const tabbarIcons: any = {
    index: (isFocused: boolean) => (
      <Icons.House
        size={verticalScale(28)}
        weight={isFocused ? "fill" : "regular"}
        color={isFocused ? colors.yellow : colors.neutral400}
      />
    ),
    statistics: (isFocused: boolean) => (
      <Icons.ChartLineUp
        size={verticalScale(28)}
        weight={isFocused ? "fill" : "regular"}
        color={isFocused ? colors.primaryLight : colors.neutral400}
      />
    ),
    wallet: (isFocused: boolean) => (
      <Icons.Wallet
        size={verticalScale(28)}
        weight={isFocused ? "fill" : "regular"}
        color={isFocused ? colors.green2 : colors.neutral400}
      />
    ),
    profile: (isFocused: boolean) => (
      <Icons.UserCheck
        size={verticalScale(28)}
        weight={isFocused ? "fill" : "regular"}
        color={isFocused ? colors.primaryBlue : colors.neutral400}
      />
    ),
  };

  useEffect(() => {
    state.routes.forEach((_, i) => {
      Animated.spring(animatedValues[i], {
        toValue: state.index === i ? 1.2 : 1,
        useNativeDriver: true,
      }).start();
    });
  }, [state.index]);

  return (
    <View style={styles.wrapper}>
      <BlurView intensity={50} tint="dark" style={styles.tabbar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: "tabLongPress",
              target: route.key,
            });
          };

          return (
            <TouchableOpacity
              key={route.name}
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarButtonTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tabbarItem}
              activeOpacity={0.8}
            >
              <Animated.View style={{ transform: [{ scale: animatedValues[index] }] }}>
                {tabbarIcons[route.name] && tabbarIcons[route.name](isFocused)}
              </Animated.View>
              {isFocused && <View style={styles.activeDot} />}
            </TouchableOpacity>
          );
        })}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? verticalScale(15) : verticalScale(5),
    width: "100%",
    alignItems: "center",
  },
  tabbar: {
    flexDirection: "row",
    width: "90%",
    borderRadius: 30,
    paddingVertical: verticalScale(10),
    justifyContent: "space-around",
    alignItems: "center",
    overflow: "hidden",
    backgroundColor: colors.neutral900 + "90",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  tabbarItem: {
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.green,
    marginTop: 4,
  },
});
