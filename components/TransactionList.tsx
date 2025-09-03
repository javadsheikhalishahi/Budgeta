import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { TransactionListType } from "@/type";
import { verticalScale } from "@/utils/styling";
import { FlashList } from "@shopify/flash-list";
import { Image } from "expo-image";
import * as Icons from "phosphor-react-native";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, StyleSheet, TouchableOpacity, View } from "react-native";
import {
  GestureHandlerRootView,
  Swipeable,
} from "react-native-gesture-handler";
import AnimatedReanimated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Confirmation from "./Confirmation";
import Loading from "./Loading";
import TransactionItem from "./TransactionItem";
import Typo from "./Typo";

const SCREEN_WIDTH = Dimensions.get("window").width;

const TransactionList = ({
  data,
  title,
  loading,
  emptyListMessage,
  selectedWalletId,
  currency,
  onDelete,
}: TransactionListType & {
  selectedWalletId?: string;
  onDelete?: (item: any) => void;
}) => {
  const filteredData = selectedWalletId
    ? data.filter((item) => item.walletId === selectedWalletId)
    : data;

  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [txToDelete, setTxToDelete] = useState<any | null>(null);

  //  Show all or only 3
  const [showAll, setShowAll] = useState(false);
  const displayedData = showAll ? filteredData : filteredData.slice(0, 3);

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
        <Icons.Trash size={verticalScale(24)} color={colors.white} />
      </TouchableOpacity>
    </View>
  );

  const confirmDelete = (item: any) => {
    setTxToDelete(item);
    setConfirmVisible(true);
  };

  const handleDelete = () => {
    if (!txToDelete) return;
    onDelete?.(txToDelete);
    swipeableRefs.current.get(txToDelete.id)?.close();
    setTxToDelete(null);
    setConfirmVisible(false);
  };

  const cancelDelete = () => {
    if (txToDelete?.id) {
      swipeableRefs.current.get(txToDelete.id)?.close();
    }
    setConfirmVisible(false);
    setTxToDelete(null);
  };

  //  Pulse animation for swipe hint
  const pulseAnim = useSharedValue(0);
  useEffect(() => {
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 500 }),
        withTiming(4, { duration: 500 })
      ),
      -1,
      true
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pulseAnim.value }],
  }));

  const starAnim = useSharedValue(1);
useEffect(() => {
  starAnim.value = withRepeat(
    withSequence(
      withTiming(1.3, { duration: 400 }),
      withTiming(1, { duration: 400 })
    ),
    -1,
    true
  );
}, []);

const starPulseStyle = useAnimatedStyle(() => ({
  transform: [{ scale: starAnim.value }],
}));

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
      {filteredData.length > 0 && (
  <View style={styles.header}>
    {/* Left: Star + count */}
    <Animated.View style={[styles.starCard, starPulseStyle]}>
      <Icons.Star size={18} color={colors.yellow} weight="fill" />
      <Typo size={12} color={colors.neutral100} style={{ marginLeft: 6 }}>
        {filteredData.length} items
      </Typo>
    </Animated.View>

    {/* Right: View All / View Less */}
    {filteredData.length > 3 && (
      <TouchableOpacity
        onPress={() => setShowAll((prev) => !prev)}
        style={styles.viewAllBtn}
      >
        <Typo size={13} fontWeight="600" color={colors.green}>
          {showAll ? "View Less" : "View All"}
        </Typo>
      </TouchableOpacity>
    )}
  </View>
)}

        <View style={styles.list}>
          <FlashList
            data={displayedData}
            renderItem={({ item, index }) => (
              <Swipeable
                ref={(ref) => {
                  if (ref && item.id) swipeableRefs.current.set(item.id, ref);
                }}
                renderRightActions={renderRightActions}
                friction={1}
                leftThreshold={1000}
                onSwipeableOpen={(direction) => {
                  if (direction === "right") {
                    confirmDelete(item);
                  }
                }}
              >
                <AnimatedReanimated.View entering={FadeIn.duration(300)}>
                  <TransactionItem
                    item={item}
                    index={index}
                    handleClick={() => {}}
                    currency={currency}
                  />
                </AnimatedReanimated.View>
              </Swipeable>
            )}
            estimatedItemSize={75}
            ItemSeparatorComponent={() => (
              <View style={{ height: spacingY._15 }} />
            )}
            ListFooterComponent={<View style={{ height: spacingY._3 }} />}
          />
        </View>
        {/* Swipe hint */}
        {filteredData.length > 0 && (
          <Animated.View style={[styles.swipeHint, pulseStyle]}>
            <Icons.HandSwipeLeft size={24} color={colors.neutral400} />
            <Typo size={12} color={colors.neutral400} style={{ marginLeft: 5 }}>
              Swipe left to delete
            </Typo>
          </Animated.View>
        )}

        {!loading && filteredData.length === 0 && (
         <AnimatedReanimated.View
         entering={FadeIn.duration(500)}
         style={styles.emptyState}
       >
         <Image
           source={require('@/assets/images/ops.svg')} 
           style={{
             width: SCREEN_WIDTH * 0.6,
             height: SCREEN_WIDTH * 0.4,
             marginBottom: 10,
             resizeMode: "contain",
             alignSelf: "center",
           }}
         />
         
         <Typo
           size={14}
           color={colors.neutral400}
           style={{
             textAlign: "center",
             marginTop: spacingY._5,
             lineHeight: 20,
           }}
         >
           {emptyListMessage || "No transactions yet"}
         </Typo>
       </AnimatedReanimated.View>
       
        )}

        {loading && (
          <View style={styles.loading}>
            <Loading />
          </View>
        )}

        {txToDelete && (
          <Confirmation
            visible={confirmVisible}
            message={`Delete this transaction?`}
            onCancel={cancelDelete}
            onConfirm={handleDelete}
            confirmText="Delete"
          />
        )}
      </View>
    </GestureHandlerRootView>
  );
};

export default TransactionList;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacingY._17,
    paddingHorizontal: spacingX._5,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: spacingY._3,
    marginVertical: spacingY._3,
  },
  starCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.neutral800,
    paddingHorizontal: spacingX._5,
    paddingVertical: spacingY._3,
    borderRadius: radius._12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  list: {
    flex: 1,
    minHeight: 3,
  },
  viewAllBtn: {
    marginTop: spacingY._3,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius._10,
    backgroundColor: colors.neutral900,
  },
  emptyState: {
    alignItems: "center",
    marginTop: verticalScale(12),
  },
  loading: {
    marginTop: verticalScale(100),
    alignItems: "center",
  },
  swipeActions: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacingY._5,
    borderRadius: radius._15,
    paddingHorizontal: spacingX._3,
  },
  actionBtnFull: {
    width: verticalScale(65),
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: radius._12,
  },
  swipeHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: spacingY._5,
    backgroundColor: colors.neutral900 + "cc",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius._12,
    alignSelf: "center",
  },
});
