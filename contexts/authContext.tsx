import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import { router } from "expo-router";
import React, { createContext, useContext, useEffect, useState } from "react";

export type UserType = {
  name: string | null;
  image: string | null;
  currency?: string | null;
  savingsGoal?: number;
  budgetLimit?: number;
  privacyMode?: boolean;
  weekStart?: string;
  notifications?: boolean;
};

type AuthContextType = {
  user: UserType | null;
  setUser: React.Dispatch<React.SetStateAction<UserType | null>>;
  register: (
    name: string,
    pin: string,
    currency?: string,
  ) => Promise<{ success: boolean; msg?: string }>;
  loginWithBiometrics: () => Promise<{ success: boolean; msg?: string }>;
  loginWithPin: (pin: string) => Promise<{ success: boolean; msg?: string }>;
  logout: () => Promise<void>;
  fullReset: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<UserType | null>(null);

  // Always require authentication on app launch
  useEffect(() => {
    const checkLogin = async () => {
      const savedUser = await AsyncStorage.getItem("user");
      if (savedUser) {
        // User exists, but do NOT set state yet — force login
        setUser(null);
      }
    };
    checkLogin();
  }, []);

  const register = async (
    name: string,
    pin: string,
    image?: string,
    currency?: string,
    savingsGoal?: number
  ) => {
    if (!name.trim()) return { success: false, msg: "Name cannot be empty" };
    if (!pin || pin.length < 4)
      return { success: false, msg: "PIN must be at least 4 digits" };

    const userData: UserType = {
      name: name.trim(),
      image: image || null,
      currency: currency || null,
      savingsGoal: savingsGoal ?? 0, 
    };

    try {
      await AsyncStorage.setItem("user", JSON.stringify(userData));
      await AsyncStorage.setItem("userPin", pin); // save PIN
      setUser(userData);
      return { success: true };
    } catch (e) {
      return { success: false, msg: "Failed to save user data" };
    }
  };

  const loginWithBiometrics = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware)
        return { success: false, msg: "Biometric hardware not available" };

      const savedUser = await AsyncStorage.getItem("user");
      if (!savedUser)
        return { success: false, msg: "No user found, please register" };

      const bioAuth = await LocalAuthentication.authenticateAsync({
        promptMessage: "Authenticate to login",
        fallbackLabel: "Use PIN",
      });

      if (bioAuth.success) {
        setUser(JSON.parse(savedUser));
        return { success: true };
      } else {
        return { success: false, msg: "Biometric authentication failed" };
      }
    } catch (e) {
      return { success: false, msg: "Authentication error" };
    }
  };

  const loginWithPin = async (pin: string) => {
    try {
      const storedPin = await AsyncStorage.getItem("userPin");
      const savedUser = await AsyncStorage.getItem("user");
      if (!storedPin || !savedUser)
        return { success: false, msg: "No user or PIN found" };
      if (pin === storedPin) {
        setUser(JSON.parse(savedUser));
        return { success: true };
      }
      return { success: false, msg: "Incorrect PIN" };
    } catch {
      return { success: false, msg: "Login failed" };
    }
  };

  // Logout: just exit session but keep PIN & user for next login
  const logout = async () => {
    setUser(null);
  };

  // Full reset: remove all saved data
  const fullReset = async () => {
    setUser(null);
    await AsyncStorage.removeItem("user");
    await AsyncStorage.removeItem("userPin");
    router.replace("/register");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        register,
        loginWithBiometrics,
        loginWithPin,
        logout,
        fullReset,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
