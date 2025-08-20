import { AuthProvider } from '@/contexts/authContext';
import { Stack } from 'expo-router';
import React from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const StackLayout = () => {
  return (
    <Stack screenOptions={{ headerShown: false }}>
    
    </Stack>
  );
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <StackLayout />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({});
