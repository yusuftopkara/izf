import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/context/AuthContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Image, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      await new Promise(resolve => setTimeout(resolve, 2000));
      setAppReady(true);
      await SplashScreen.hideAsync();
    }
    prepare();
  }, []);

  if (!appReady) {
    return (
      <View style={{ flex: 1 }}>
        <Image
          source={require('../assets/images/splash-icon.png')}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
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
            <Stack.Screen name="event/[id]" options={{ headerShown: false, presentation: 'modal' }} />
            <Stack.Screen name="ticket/[id]" options={{ headerShown: false, presentation: 'modal' }} />
            <Stack.Screen name="scanner" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
          </Stack>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
