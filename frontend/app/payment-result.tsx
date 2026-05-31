import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import QRCode from 'react-native-qrcode-svg';
import { api } from '../src/services/api';

export default function PaymentResultScreen() {
  const { pendingId, eventTitle, status: initialStatus, message: initialMessage } =
    useLocalSearchParams<{
      pendingId: string;
      eventTitle?: string;
      status?: string;
      message?: string;
    }>();

  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>(
    initialStatus === 'failed' ? 'failed' : 'loading'
  );
  const [resultData, setResultData] = useState<{
    ticket_id?: string;
    event_title?: string;
    quantity?: number;
    qr_token?: string;
    message?: string;
  }>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(
    initialStatus === 'failed' ? initialMessage || 'Ödeme işlemi başarısız oldu.' : null
  );

  useEffect(() => {
    if (initialStatus === 'failed' || !pendingId) return;

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let pollAttempts = 0;
    const MAX_ATTEMPTS = 60; // 60 × 3s = 180s = 3 dakika
    const POLL_INTERVAL_MS = 3000; // 3 saniye

    const pollPaymentStatus = async () => {
      try {
        pollAttempts++;

        const result = await api.getPaymentStatus(pendingId);
        
        if (cancelled) return;

        if (result.status === 'completed') {
          setStatus('success');
          setResultData({
            ticket_id: result.ticket_id,
            event_title: result.event_title || eventTitle,
            quantity: result.quantity || 1,
            qr_token: result.qr_token,
          });
          if (intervalId) clearInterval(intervalId);
        } else if (pollAttempts >= MAX_ATTEMPTS) {
          // Timeout: 3 dakika sonra hata
          setStatus('failed');
          setErrorMessage('Ödeme durumu kontrol süresi aşıldı. Lütfen daha sonra tekrar deneyin.');
          if (intervalId) clearInterval(intervalId);
        }
        // Diğer durumlar (pending, vb.) → devam poll et
      } catch (err: any) {
        if (cancelled) return;
        
        if (pollAttempts >= MAX_ATTEMPTS) {
          setStatus('failed');
          setErrorMessage(err.response?.data?.detail || 'Ödeme durumu alınamadı.');
          if (intervalId) clearInterval(intervalId);
        }
        // Hata ama denemelere hala izin varsa → devam et
      }
    };

    // İlk çağrı hemen yapılsın
    pollPaymentStatus();

    // Sonrasında her 3 saniyede çağır
    intervalId = setInterval(pollPaymentStatus, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [pendingId, initialStatus, eventTitle]);

  const handleGoToTickets = () => {
    router.push('/(tabs)/profile');
  };

  const handleGoHome = () => {
    router.push('/(tabs)/home');
  };

  const handleRetry = () => {
    router.back();
  };

  // ── Loading state ──
  if (status === 'loading') {
    return (
      <View style={[styles.container, styles.centered]}>
        <StatusBar style="light" />
        <View style={styles.spinnerWrap}>
          <ActivityIndicator size="large" color="#E91E8C" />
        </View>
        <Text style={styles.pollingTitle}>Ödemeniz doğrulanıyor...</Text>
        <Text style={styles.pollingSubtitle}>
          Bu işlem birkaç saniye sürebilir. Lütfen bekleyin.
        </Text>
        {eventTitle ? (
          <Text style={styles.pollingEventTitle}>{eventTitle}</Text>
        ) : null}
      </View>
    );
  }

  // ── Failed state ──
  if (status === 'failed') {
    const msg = errorMessage || 'Ödeme işlemi başarısız oldu.';
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar style="light" />
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.centered}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.iconWrapError}>
            <Ionicons name="close-circle" size={80} color="#FF4444" />
          </View>

          <Text style={styles.resultTitleError}>Ödeme Başarısız</Text>
          <Text style={styles.resultMessage}>{msg}</Text>

          <View style={styles.buttonGroup}>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <LinearGradient
                colors={['#FF6B35', '#FF8E53']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientButton}
              >
                <Ionicons name="refresh" size={20} color="#fff" />
                <Text style={styles.buttonText}>Tekrar Dene</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.homeButton} onPress={handleGoHome}>
              <Text style={styles.homeButtonText}>Ana Sayfa</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── Success state ──
  const displayTitle = resultData.event_title || eventTitle || 'Etkinliğiniz';
  const quantity = resultData.quantity ?? 1;
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.centered}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconWrapSuccess}>
          <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
        </View>

        <Text style={styles.resultTitleSuccess}>Ödeme Alındı!</Text>
        <Text style={styles.resultSubtitle}>
          Biletiniz hazır: {displayTitle}
        </Text>

        <View style={styles.ticketSummary}>
          <Ionicons name="ticket" size={28} color="#FF8E53" />
          <Text style={styles.ticketSummaryText}>
            {quantity} adet bilet oluşturuldu
          </Text>
        </View>

        {resultData.qr_token && (
          <View style={styles.qrContainer}>
            <Text style={styles.qrLabel}>Giriş QR Kodunuz</Text>
            <View style={styles.qrBox}>
              <QRCode value={resultData.qr_token} size={180} backgroundColor="#fff" color="#000" />
            </View>
            <Text style={styles.qrTokenText}>17-18 October 2026 • Green Park Hotel Pendik</Text>
          </View>
        )}

        <View style={styles.buttonGroup}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleGoToTickets}>
            <LinearGradient
              colors={['#E91E8C', '#FF6B35']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <Ionicons name="ticket" size={20} color="#fff" />
              <Text style={styles.buttonText}>Biletlerime Git</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.homeButton} onPress={handleGoHome}>
            <Text style={styles.homeButtonText}>Ana Sayfa</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d1a',
  },
  content: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 80,
  },
  spinnerWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(233,30,140,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  pollingTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  pollingSubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 8,
  },
  pollingEventTitle: {
    fontSize: 16,
    color: '#FF8E53',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
  iconWrapSuccess: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(76,175,80,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  iconWrapError: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,68,68,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  resultTitleSuccess: {
    fontSize: 26,
    fontWeight: '700',
    color: '#4CAF50',
    marginBottom: 10,
    textAlign: 'center',
  },
  resultTitleError: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FF4444',
    marginBottom: 10,
    textAlign: 'center',
  },
  resultSubtitle: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 8,
  },
  resultMessage: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 32,
  },
  ticketSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,142,83,0.12)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 40,
  },
  ticketSummaryText: {
    color: '#FF8E53',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 10,
  },
  buttonGroup: {
    width: '100%',
    gap: 12,
    marginTop: 8,
  },
  primaryButton: {
    borderRadius: 14,
    overflow: 'hidden',
    width: '100%',
  },
  retryButton: {
    borderRadius: 14,
    overflow: 'hidden',
    width: '100%',
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  homeButton: {
    width: '100%',
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#2a2a4e',
  },
  homeButtonText: {
    color: '#ccc',
    fontSize: 16,
    fontWeight: '600',
  },
  qrContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  qrLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  qrBox: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
  },
  qrTokenText: {
    color: '#888',
    fontSize: 12,
    marginTop: 8,
  },
});
