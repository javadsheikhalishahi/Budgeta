import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { verticalScale } from "@/utils/styling";
import { LinearGradient } from "expo-linear-gradient";
import * as Icons from "phosphor-react-native";
import React, { useRef, useState } from "react";
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

interface DropdownItem {
  label: string;
  value: string;
  icon?: React.ElementType;
  bgColor?: string;
}

interface DropdownProps {
  items: DropdownItem[];
  selectedValue: string;
  onSelect: (value: string) => void;
  placeholder?: string;
}

const DropdownData: React.FC<DropdownProps> = ({ items, selectedValue, onSelect, placeholder }) => {
  const [open, setOpen] = useState(false);
  const [showScrollArrow, setShowScrollArrow] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const animationHeight = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current; // For arrow rotation

  const selectedItem = items.find((i) => i.value === selectedValue);

  const handleScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    setShowScrollArrow(contentOffset.y + layoutMeasurement.height < contentSize.height);
  };

  const toggleDropdown = () => {
    const newOpen = !open;
    setOpen(newOpen);

    // Animate dropdown height
    Animated.spring(animationHeight, {
      toValue: newOpen ? verticalScale(200) : 0,
      useNativeDriver: false,
      friction: 3,
      tension: 40,
    }).start();

    // Animate arrow rotation
    Animated.timing(rotateAnim, {
      toValue: newOpen ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  // Interpolate rotation for the arrow
  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <TouchableWithoutFeedback onPress={() => open && setOpen(false)}>
      <View style={{ marginBottom: spacingY._3 }}>
        <TouchableOpacity style={styles.dropdownHeader} onPress={toggleDropdown}>
          {selectedItem?.icon && (
            <selectedItem.icon
              size={33}
              color={selectedItem.bgColor || colors.white}
              style={{ marginRight: spacingX._7 }}
            />
          )}
          <Text style={styles.headerText}>
            {selectedItem ? selectedItem.label : placeholder || "Select"}
          </Text>
          <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
            <Icons.CaretDown size={20} color={colors.white} />
          </Animated.View>
        </TouchableOpacity>

        <Animated.View style={{ maxHeight: animationHeight, overflow: "hidden" }}>
          {open && (
            <View style={{ position: "relative" }}>
              <ScrollView
                ref={scrollRef}
                contentContainerStyle={{ paddingVertical: spacingY._5 }}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
                onScroll={handleScroll}
                scrollEventThrottle={16}
              >
                {items.map((item) => {
                  const isSelected = selectedValue === item.value;
                  return (
                    <TouchableOpacity
                      key={item.value}
                      style={[styles.listItem, isSelected && styles.selectedItem]}
                      onPress={() => {
                        onSelect(item.value);
                        setOpen(false);
                      }}
                    >
                      {item.icon && (
                        <item.icon
                          size={30}
                          color={item.bgColor || colors.white}
                          style={{ marginRight: spacingX._10 }}
                        />
                      )}
                      <Text style={styles.itemText}>{item.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {showScrollArrow && (
                <LinearGradient
                  colors={["transparent", colors.neutral900]}
                  style={styles.fadeOverlay}
                >
                  <Icons.CaretDown size={20} color={colors.neutral400} />
                </LinearGradient>
              )}
            </View>
          )}
        </Animated.View>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  dropdownHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.neutral900,
    borderRadius: radius._10,
    paddingHorizontal: spacingX._12,
    paddingVertical: spacingY._10,
    borderWidth: 1,
    borderColor: colors.neutral600,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  headerText: { color: colors.white, fontSize: verticalScale(15), fontWeight:'bold' },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacingY._10,
    paddingHorizontal: spacingX._12,
    borderRadius: radius._10,
    marginHorizontal: spacingX._5,
    marginVertical: spacingY._3,
  },
  selectedItem: {
    backgroundColor: colors.neutral800,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 7,
    
  },
  itemText: { color: colors.white, fontSize: verticalScale(15),fontWeight: "600" },
  fadeOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: verticalScale(35),
    justifyContent: "center",
    alignItems: "center",
  },
});

export default DropdownData;
