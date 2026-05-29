import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

export default function Index() {
  const router = useRouter();
  const { isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      router.replace('/(tabs)/home');
    }
  }, [isLoading]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a0a2e', '#2d0a4e', '#1a0a2e']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <Text style={styles.logoText}>IZF</Text>
          <Text style={styles.subtitle}>Istanbul Zumba Festival</Text>
          <ActivityIndicator size="large" color="#E91E8C" style={styles.loader} />
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logoText: {
    fontSize: 72,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 4,
    textShadowColor: '#E91E8C',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    marginTop: 8,
    opacity: 0.8,
    letterSpacing: 2,
  },
  loader: {
    marginTop: 40,
  },
});

