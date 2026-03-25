import React, { useEffect, useState, useCallback } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/context/AuthContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, Image, StyleSheet, Animated, Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

// Keep splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const fadeAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    async function prepare() {
      try {
        // Short delay to show splash
        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
        // Hide native splash
        await SplashScreen.hideAsync().catch(() => {});
        
        // Start fade out animation for custom splash
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: Platform.OS !== 'web',
        }).start(() => {
          setShowSplash(false);
        });
      }
    }
    prepare();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#1E1432' }}>
      {/* Custom Splash Overlay */}
      {showSplash && (
        <Animated.View style={[styles.splashOverlay, { opacity: fadeAnim }]}>
          <Image
            source={require('../assets/images/izf-logo-original.png')}
            style={styles.splashLogo}
            resizeMode="contain"
          />
        </Animated.View>
      )}
      
      {/* Main App */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <AuthProvider>
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: '#0a0a0a' },
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
    </View>
  );
}

const styles = StyleSheet.create({
  splashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1E1432',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  splashLogo: {
    width: 200,
    height: 200,
  },
});
