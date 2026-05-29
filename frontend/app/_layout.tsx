import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/context/AuthContext';
import { LocaleProvider } from '../src/context/LocaleContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <LocaleProvider>
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: '#1a0a2e' },
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="event/[id]" options={{ headerShown: false, presentation: "modal" }} />
              <Stack.Screen name="ticket/[id]" options={{ headerShown: false, presentation: "modal" }} />
              <Stack.Screen name="scanner" options={{ headerShown: false, presentation: "fullScreenModal" }} />
              <Stack.Screen name="payment-webview" options={{ headerShown: false, presentation: "fullScreenModal", gestureEnabled: false }} />
              <Stack.Screen name="payment-result" options={{ headerShown: false, presentation: "fullScreenModal", gestureEnabled: false }} />
            </Stack>
          </LocaleProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
