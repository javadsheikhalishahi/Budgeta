import { colors, radius, spacingX } from "@/constants/theme";
import { InputProps } from "@/type";
import { verticalScale } from "@/utils/styling";
import React from "react";
import { StyleSheet, TextInput, View } from "react-native";

const Input = (props: InputProps) => {
  return (
    <View
      style={[styles.container, props.containerStyle && props.containerStyle]}
    >
     {/* Left icon */}
      {props.icon && <View style={styles.leftIcon}>{props.icon}</View>}

      <TextInput
        style={[styles.input, props.inputStyle]}
        placeholderTextColor={colors.neutral400}
        ref={props.inputRef && props.inputRef}
        {...props}
      />

      {/* Right icon */}
      {props.rightIcon && <View style={styles.rightIcon}>{props.rightIcon}</View>}
    </View>
  );
};

export default Input;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    height: verticalScale(54),
    alignItems: "center",
    justifyContent: "flex-start",
    borderWidth: 1,
    borderColor: colors.neutral300,
    borderRadius: radius._17,
    borderCurve: "continuous",
    paddingHorizontal: spacingX._15,
    gap: spacingX._7,
  },
  input: {
    flex: 1,
    color: colors.white,
    fontSize: verticalScale(14),
  },
  leftIcon: {
    marginRight: spacingX._3,
  },
  rightIcon: {
    marginLeft: spacingX._10,
  },
});
