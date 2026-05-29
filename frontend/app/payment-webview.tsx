import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function PaymentWebViewScreen() {
  const { url, pendingId, eventTitle } = useLocalSearchParams<{
    url: string;
    pendingId: string;
    eventTitle?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);

  const handleNavigationChange = useCallback(
    (navState: { url: string }) => {
      const currentUrl = navState.url;

      // Success redirect detection patterns
      if (
        currentUrl.includes('payment-success') ||
        currentUrl.includes('callback=success') ||
        currentUrl.includes('status=success') ||
        currentUrl.includes('/payment/success') ||
        currentUrl.includes('status=success')
      ) {
        // Navigate to result screen to call /complete
        router.replace({
          pathname: '/payment-result',
          params: { pendingId, eventTitle },
        });
        return;
      }

      // Failure redirect detection patterns
      if (
        currentUrl.includes('payment-error') ||
        currentUrl.includes('callback=error') ||
        currentUrl.includes('status=failure') ||
        currentUrl.includes('/payment/error') ||
        currentUrl.includes('status=failure')
      ) {
        router.replace({
          pathname: '/payment-result',
          params: {
            pendingId,
            eventTitle,
            status: 'failed',
            message: 'Ödeme işlemi başarısız oldu.',
          },
        });
        return;
      }
    },
    [router, pendingId, eventTitle]
  );

  const handleClose = useCallback(() => {
    Alert.alert(
      'Ödemeyi İptal Et',
      'Ödeme sayfasından çıkmak istediğinize emin misiniz?',
      [
        { text: 'Hayır', style: 'cancel' },
        {
          text: 'Evet, Çık',
          style: 'destructive',
          onPress: () => {
            router.back();
          },
        },
      ]
    );
  }, [router]);

  if (!url || !pendingId) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Ionicons name="warning" size={48} color="#FF4444" />
        <Text style={styles.errorText}>Geçersiz ödeme bağlantısı</Text>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.back()}>
          <Text style={styles.actionButtonText}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Decode the URL since it may be encoded when passed as a param
  const decodedUrl = decodeURIComponent(url);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>iyzico ile Ödeme</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* WebView */}
      <WebView
        source={{ uri: decodedUrl }}
        style={styles.webview}
        startInLoadingState
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        onNavigationStateChange={handleNavigationChange}
        renderLoading={() => (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#E91E8C" />
            <Text style={styles.loadingText}>Ödeme sayfası yükleniyor...</Text>
          </View>
        )}
      />

      {/* Inline loader overlay while loading */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#E91E8C" />
          <Text style={styles.loadingText}>Ödeme sayfası yükleniyor...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d1a',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
    backgroundColor: '#0d0d1a',
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  headerPlaceholder: {
    width: 44,
  },
  webview: {
    flex: 1,
    backgroundColor: '#0d0d1a',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0d0d1a',
    zIndex: 10,
  },
  loadingText: {
    color: '#888',
    marginTop: 12,
    fontSize: 14,
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  actionButton: {
    backgroundColor: '#E91E8C',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
