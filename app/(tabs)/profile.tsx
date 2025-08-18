import Confirmation from "@/components/Confirmation";
import Header from "@/components/Header";
import ScreenWrapper from "@/components/ScreenWrapper";
import TrendAlert from "@/components/TrendAlert";
import Typo from "@/components/Typo";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { UserType, useAuth } from "@/contexts/authContext";
import { accountOptionType } from "@/type";
import { verticalScale } from "@/utils/styling";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import * as Icons from "phosphor-react-native";
import React, { useState } from "react";
import { Pressable, StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

const Profile = () => {
  const { user, setUser } = useAuth();
  const [alertType, setAlertType] = useState<"error" | "success" | "info">("error");
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertConfirmVisible, setAlertConfirmVisible] = useState(false);
  const router = useRouter();
  const { fullReset } = useAuth();
  
  const accountOptions: accountOptionType[] = [
    {
      title: "Edit Profile",
      icon: <Icons.User size={30} color={colors.white} weight="fill" />,
      routeName: "/(modals)/profileModal",
      bgColor: "#6366f1",
    },
    {
      title: "Settings",
      icon: <Icons.Gear size={30} color={colors.white} weight="fill" />,
      routeName: "/(modals)/settingsModal",
      bgColor: "#059669",
    },
    {
      title: "Privacy Policy",
      icon: <Icons.LockKey size={30} color={colors.white} weight="fill" />,
      routeName: "/(modals)/privacyModal",
      bgColor: colors.neutral600,
    },
    {
      title: "Logout",
      icon: <Icons.Power size={30} color={colors.white} weight="fill" />,
      bgColor: "#f00a21",
    },
  ];

  const pickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      alert("Permission to access gallery is required!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      allowsEditing: true,
      legacy: true,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;

      const updatedUser: UserType = {
        name: user?.name ?? "",
        image: uri,
      };

      await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
    }
  };

  const handleLogout = async () => {
    try {
      await fullReset();
      console.log("App fully reset after logout");
    } catch (e) {
      console.error("Full reset failed", e);
    }
  };
 
  const showLogoutAlert = () => {
    setAlertType("error");
    setAlertMessage("Logging out will delete your PIN, profile, and all stored data. This cannot be undone.");
    setAlertConfirmVisible(true);
  };

  const handlePress = (item: accountOptionType) => {
     if (item.title == 'Logout'){
      showLogoutAlert();
     }

     if (item.routeName) router.push(item.routeName)
  };

  return (
    <ScreenWrapper>
      <TrendAlert
        visible={alertVisible}
        message={alertMessage}
        type={alertType}
        onClose={() => setAlertVisible(false)}
      />

      {/* Confirmation Modal */}
<Confirmation
  visible={alertConfirmVisible}
  title="Logout"
  message="Logging out will delete your PIN, profile, and all stored data. This cannot be undone."
  confirmText="Logout"
  cancelText="Cancel"
  icon={<Icons.WarningCircleIcon size={40} color={colors.red} weight="fill" />}
  onConfirm={() => {
    setAlertConfirmVisible(false);
    handleLogout();
  }}
  onCancel={() => setAlertConfirmVisible(false)}
/>
      
      <View style={styles.container}>
        <Header title="Profile" style={{ marginVertical: spacingY._12 }} />

        {/* Info */}
        <View style={styles.userInfo}>
          <View style={styles.avatarContainer}>
            <Pressable onPress={pickImage}>
              <Image
                source={{
                  uri: user?.image || "https://via.placeholder.com/150",
                }}
                style={styles.avatar}
                contentFit="cover"
                transition={100}
              />
              <View style={styles.editIcon}>
                <Icons.Pencil size={18} color={colors.neutral700} />
              </View>
            </Pressable>
          </View>
          <View style={styles.nameContainer}>
            <Typo size={21} fontWeight={"600"} color={colors.neutral100}>
              {user?.name}
            </Typo>
          </View>
        </View>
        {/* options */}
        <View style={styles.accountOptions}>
            {
              accountOptions.map((item, index) => {
                 return (
                  <Animated.View entering={FadeInDown.delay(index * 50).springify().damping(15)} key={index.toString()} style={styles.listItem}>
                     <TouchableOpacity style={styles.flexRow} onPress={() => handlePress(item)}>
                         {/*icons list */}
                         <View style={[
                            styles.listIcon,
                            {
                              backgroundColor: item?.bgColor,
                            },
                         ]}>
                          {item.icon && item.icon}
                         </View>
                         <Typo size={16} style={{ flex: 1}} fontWeight={'500'}>{item.title}</Typo>
                         <Icons.CaretRight
                           size={verticalScale(20)}
                           weight="bold"
                           color={colors.white}
                         />
                     </TouchableOpacity>
                  </Animated.View>
                 )
              })
            }
        </View>
      </View>
    </ScreenWrapper>
  );
};

export default Profile;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacingX._20,
  },
  userInfo: {
    marginTop: verticalScale(30),
    alignItems: "center",
    gap: spacingY._15,
  },
  avatarContainer: {
    position: "relative",
    alignSelf: "center",
  },
  avatar: {
    alignSelf: "center",
    backgroundColor: colors.neutral300,
    height: verticalScale(135),
    width: verticalScale(135),
    borderRadius: verticalScale(135) / 2,
  },
  editIcon: {
    position: "absolute",
    bottom: 5,
    right: 8,
    borderRadius: 50,
    backgroundColor: colors.neutral100,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 0 },
    elevation: 20,
    padding: 5,
  },
  nameContainer: {
    gap: verticalScale(4),
    alignItems: "center",
  },
  listIcon: {
    height: verticalScale(44),
    width: verticalScale(44),
    backgroundColor: colors.neutral500,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius._15,
    borderCurve: "continuous",
  },
  listItem: {
    marginBottom: verticalScale(17),
  },
  accountOptions: {
    marginTop: spacingY._35,
  },
  flexRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingX._10,
  },
});
