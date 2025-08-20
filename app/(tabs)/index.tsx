import ScreenWrapper from '@/components/ScreenWrapper'
import Typo from '@/components/Typo'
import { colors, spacingX, spacingY } from '@/constants/theme'
import { useAuth } from "@/contexts/authContext"
import { verticalScale } from '@/utils/styling'
import * as Icons from "phosphor-react-native"
import React from 'react'
import { StyleSheet, TouchableOpacity, View } from 'react-native'

const Home = () => {
  const { user, setUser } = useAuth();

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={{gap: 2}}>
            <Typo size={16} color={colors.neutral400}>Hello,</Typo>
            <Typo size={20} fontWeight={"500"}>{user?.name}</Typo>
          </View>
          <TouchableOpacity>
            <Icons.MagnifyingGlassIcon size={verticalScale(22)} color={colors.neutral200} weight='bold' />
          </TouchableOpacity>
        </View>
      </View>
    </ScreenWrapper>
  )
}

export default Home

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacingX._20,
    marginTop: verticalScale(8)
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacingY._10
  },
  SearchIcon: {
    backgroundColor: colors.neutral700,
    padding: spacingX._10,
    borderRadius: 50,
  },
  floatingButton: {
    height: verticalScale(50),
    width: verticalScale(50),
    borderRadius: 100,
    position: "absolute",
    bottom: verticalScale(30),
    right: verticalScale(30)
  },
  scrollViewStyle: {
    marginTop: spacingY._10,
    paddingBottom: verticalScale(100),
    gap: spacingX._25,
  }
})