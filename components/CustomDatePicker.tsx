import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { verticalScale } from "@/utils/styling";
import * as Icons from "phosphor-react-native";
import React, { useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface CustomDatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
}

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({ value, onChange }) => {
  const [show, setShow] = useState(false);
  const [selectedDate, setSelectedDate] = useState(value);
  const translateX = useRef(new Animated.Value(0)).current;

  // Generate days of current month
  const getDaysInMonth = (date: Date) => {
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  
    // All days of the month
    const days: number[] = Array.from({ length: endOfMonth.getDate() }, (_, i) => i + 1);
  
    // Determine first day of week (0=Sun, 6=Sat)
    const startDay = startOfMonth.getDay();
  
    // Prepend nulls for empty slots
    const paddedDays: (number | null)[] = [...Array(startDay).fill(null), ...days];
  
    return paddedDays;
  };
  

  const [daysInMonth, setDaysInMonth] = useState(getDaysInMonth(selectedDate));

  // Animate swipe transition
  const animateMonth = (direction: "left" | "right") => {
    translateX.setValue(direction === "left" ? 300 : -300);
    Animated.timing(translateX, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  // Swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 20,
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -50) handleNextMonth();
        else if (gestureState.dx > 50) handlePrevMonth();
      },
    })
  ).current;

  const handlePrevMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(selectedDate.getMonth() - 1);
    setSelectedDate(newDate);
    setDaysInMonth(getDaysInMonth(newDate));
    animateMonth("right");
  };

  const handleNextMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(selectedDate.getMonth() + 1);
    setSelectedDate(newDate);
    setDaysInMonth(getDaysInMonth(newDate));
    animateMonth("left");
  };

  const handleSelectDay = (day: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(day);
    setSelectedDate(newDate);
    onChange(newDate);
    setShow(false);
  };

  return (
    <View>
      <TouchableOpacity
        style={[styles.inputCard, styles.dateInputCard]}
        onPress={() => setShow(true)}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Icons.CalendarBlank size={28} color={colors.neutral400} />
          <Text style={[styles.textInput]}>
            {value.toLocaleDateString()}
          </Text>
        </View>
      </TouchableOpacity>

      <Modal visible={show} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Animated.View
            {...panResponder.panHandlers}
            style={[styles.calendarContainer, { transform: [{ translateX }] }]}
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={handlePrevMonth} style={styles.navBtn}>
                <Icons.CaretLeft size={24} color={colors.primary} />
              </TouchableOpacity>

              <Text style={styles.headerText}>
                {selectedDate.toLocaleString("default", { month: "long", year: "numeric" })}
              </Text>

              <TouchableOpacity onPress={handleNextMonth} style={styles.navBtn}>
                <Icons.CaretRight size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Weekdays */}
            <View style={styles.weekDays}>
              {weekdays.map((day) => (
                <View key={day} style={styles.weekDayPill}>
                  <Text style={styles.weekDayText}>{day}</Text>
                </View>
              ))}
            </View>

            {/* Days */}
            <FlatList
              data={daysInMonth}
              numColumns={7}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => {
                if (!item) {
                  // Empty slot
                  return <View style={[styles.dayContainer]} />;
                }

                const isSelected =
                item === selectedDate.getDate() &&
                selectedDate.getMonth() === value.getMonth() &&
                selectedDate.getFullYear() === value.getFullYear();

                return (
                  <TouchableOpacity
                    style={[styles.dayContainer, isSelected && styles.selectedDay]}
                    onPress={() => handleSelectDay(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.dayText, isSelected && styles.selectedDayText]}>
                      {item}
                    </Text>
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

export default CustomDatePicker;

const styles = StyleSheet.create({
  inputCard: {
    backgroundColor: colors.neutral900,
    borderRadius: radius._10,
    borderWidth: 1,
    borderColor: colors.neutral700,
    overflow: "hidden",
  },
  dateInputCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacingX._10,
    height: verticalScale(52),
    justifyContent: "flex-start",
    borderRadius: radius._10,
    borderWidth: 1,
    borderColor: colors.neutral700,
    backgroundColor: colors.neutral900,
  },
  textInput: {
    flex: 1,
    paddingHorizontal: spacingX._7,
    paddingVertical: spacingY._12,
    color: colors.white,
    fontSize: verticalScale(15),
  
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "#000000AA",
    justifyContent: "center",
    alignItems: "center",
  },
  calendarContainer: {
    backgroundColor: colors.neutral850,
    borderRadius: radius._10,
    padding: spacingX._15,
    width: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 10,
    borderWidth: 1,
    borderColor: colors.neutral700
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacingY._15,
  },
  headerText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: verticalScale(16),
  },
  navBtn: {
    padding: 6,
  },
  weekDays: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: spacingY._7,
  },
  weekDayPill: {
    backgroundColor: colors.neutral700,
    borderRadius: radius._10,
    paddingVertical: spacingY._3,
    paddingHorizontal: spacingY._3,
    width: `${100 / 7 - 2}%`,
    alignItems: "center",
  },
  weekDayText: {
    color: colors.neutral300,
    fontWeight: "600",
    fontSize: verticalScale(12),
  },
  dayContainer: {
    width: `${100 / 7}%`,
    paddingVertical: spacingY._10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacingY._3,
  },
  dayText: {
    color: colors.white,
    fontSize: verticalScale(14),
    fontWeight: "500",
  },
  selectedDay: {
    backgroundColor: colors.primary,
    borderRadius: radius._10,
    paddingVertical: spacingY._5,
    marginVertical: spacingY._3,
    marginHorizontal: spacingX._3,
  },
  selectedDayText: {
    color: colors.black,
    fontWeight: "bold",
  },
});
