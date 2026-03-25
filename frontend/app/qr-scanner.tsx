import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/services/api';

export default function QRScanner() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<{
    status: string;
    message: string;
    event_title?: string;
    user_name?: string;
  } | null>(null);
  
  // Manual QR input (for web testing)
  const [manualQR, setManualQR] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  // Check if user is staff or admin
  useEffect(() => {
    if (user && user.role !== 'staff' && user.role !== 'admin') {
      Alert.alert('Yetkisiz Erişim', 'Bu sayfaya sadece görevliler erişebilir.');
      router.back();
    }
  }, [user]);

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned || isProcessing) return;
    
    setScanned(true);
    setIsProcessing(true);
    
    try {
      const result = await api.checkTicket(data);
      setLastResult(result);
      
      // Play sound or vibrate based on result
      if (result.status === 'VALID') {
        // Success feedback
      } else {
        // Error feedback
      }
    } catch (error: any) {
      setLastResult({
        status: 'ERROR',
        message: error.response?.data?.detail || 'Bilet kontrol edilemedi'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualCheck = async () => {
    if (!manualQR.trim()) {
      Alert.alert('Hata', 'QR kod giriniz');
      return;
    }
    
    setIsProcessing(true);
    try {
      const result = await api.checkTicket(manualQR.trim());
      setLastResult(result);
      setScanned(true);
    } catch (error: any) {
      setLastResult({
        status: 'ERROR',
        message: error.response?.data?.detail || 'Bilet kontrol edilemedi'
      });
      setScanned(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetScanner = () => {
    setScanned(false);
    setLastResult(null);
    setManualQR('');
  };

  const getResultColor = () => {
    if (!lastResult) return '#666';
    switch (lastResult.status) {
      case 'VALID': return '#4CAF50';
      case 'USED': return '#FF9800';
      case 'INVALID': return '#f44336';
      case 'ERROR': return '#f44336';
      default: return '#666';
    }
  };

  const getResultIcon = () => {
    if (!lastResult) return 'scan';
    switch (lastResult.status) {
      case 'VALID': return 'checkmark-circle';
      case 'USED': return 'alert-circle';
      case 'INVALID': return 'close-circle';
      case 'ERROR': return 'warning';
      default: return 'scan';
    }
  };

  // Web fallback or no camera permission
  if (Platform.OS === 'web' || !permission?.granted) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>QR Bilet Tarayıcı</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.webContainer}>
          <Ionicons name="qr-code" size={80} color="#666" />
          <Text style={styles.webTitle}>Manuel QR Kontrolü</Text>
          <Text style={styles.webSubtitle}>
            {Platform.OS === 'web' 
              ? 'Web ortamında kamera kullanılamaz. QR kodunu manuel girin.'
              : 'Kamera izni gerekli. İzin verin veya manuel giriş yapın.'}
          </Text>

          {Platform.OS !== 'web' && !permission?.granted && (
            <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
              <Text style={styles.permissionButtonText}>Kamera İzni Ver</Text>
            </TouchableOpacity>
          )}

          <View style={styles.manualInputContainer}>
            <TextInput
              style={styles.manualInput}
              placeholder="QR kod değerini yapıştırın"
              placeholderTextColor="#666"
              value={manualQR}
              onChangeText={setManualQR}
              autoCapitalize="none"
            />
            <TouchableOpacity 
              style={styles.checkButton} 
              onPress={handleManualCheck}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Ionicons name="checkmark" size={24} color="#fff" />
              )}
            </TouchableOpacity>
          </View>

          {lastResult && (
            <View style={[styles.resultCard, { borderColor: getResultColor() }]}>
              <Ionicons name={getResultIcon()} size={50} color={getResultColor()} />
              <Text style={[styles.resultStatus, { color: getResultColor() }]}>
                {lastResult.status === 'VALID' ? 'GEÇERLİ' :
                 lastResult.status === 'USED' ? 'KULLANILMIŞ' :
                 lastResult.status === 'INVALID' ? 'GEÇERSİZ' : 'HATA'}
              </Text>
              <Text style={styles.resultMessage}>{lastResult.message}</Text>
              {lastResult.event_title && (
                <Text style={styles.resultDetail}>Etkinlik: {lastResult.event_title}</Text>
              )}
              {lastResult.user_name && (
                <Text style={styles.resultDetail}>Kullanıcı: {lastResult.user_name}</Text>
              )}
              <TouchableOpacity style={styles.resetButton} onPress={resetScanner}>
                <Text style={styles.resetButtonText}>Yeni Tarama</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  }

  // Camera view for mobile
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>QR Bilet Tarayıcı</Text>
        <TouchableOpacity onPress={() => setShowManualInput(!showManualInput)} style={styles.backButton}>
          <Ionicons name="keypad" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {!scanned ? (
        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          />
          <View style={styles.overlay}>
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            <Text style={styles.scanText}>QR kodu çerçeveye yerleştirin</Text>
          </View>
        </View>
      ) : (
        <View style={styles.resultContainer}>
          <View style={[styles.resultCard, { borderColor: getResultColor() }]}>
            <Ionicons name={getResultIcon()} size={80} color={getResultColor()} />
            <Text style={[styles.resultStatus, { color: getResultColor() }]}>
              {lastResult?.status === 'VALID' ? 'GEÇERLİ' :
               lastResult?.status === 'USED' ? 'KULLANILMIŞ' :
               lastResult?.status === 'INVALID' ? 'GEÇERSİZ' : 'HATA'}
            </Text>
            <Text style={styles.resultMessage}>{lastResult?.message}</Text>
            {lastResult?.event_title && (
              <Text style={styles.resultDetail}>Etkinlik: {lastResult.event_title}</Text>
            )}
            {lastResult?.user_name && (
              <Text style={styles.resultDetail}>Kullanıcı: {lastResult.user_name}</Text>
            )}
          </View>
          
          <TouchableOpacity style={styles.scanAgainButton} onPress={resetScanner}>
            <LinearGradient
              colors={['#FF6B6B', '#FF8E53']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.scanAgainGradient}
            >
              <Ionicons name="scan" size={24} color="#fff" />
              <Text style={styles.scanAgainText}>Yeni Tarama</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {showManualInput && (
        <View style={styles.manualOverlay}>
          <View style={styles.manualCard}>
            <Text style={styles.manualTitle}>Manuel QR Girişi</Text>
            <TextInput
              style={styles.manualInput}
              placeholder="QR kod değerini yapıştırın"
              placeholderTextColor="#666"
              value={manualQR}
              onChangeText={setManualQR}
              autoCapitalize="none"
            />
            <View style={styles.manualButtons}>
              <TouchableOpacity 
                style={styles.manualCancelButton} 
                onPress={() => setShowManualInput(false)}
              >
                <Text style={styles.manualCancelText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.manualCheckButton} 
                onPress={() => {
                  setShowManualInput(false);
                  handleManualCheck();
                }}
              >
                <Text style={styles.manualCheckText}>Kontrol Et</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  placeholder: {
    width: 44,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#FF6B6B',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  scanText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 20,
    textAlign: 'center',
  },
  resultContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  resultCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderWidth: 3,
    width: '100%',
    maxWidth: 320,
  },
  resultStatus: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 16,
  },
  resultMessage: {
    fontSize: 16,
    color: '#ccc',
    marginTop: 8,
    textAlign: 'center',
  },
  resultDetail: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
  },
  scanAgainButton: {
    marginTop: 30,
    borderRadius: 12,
    overflow: 'hidden',
  },
  scanAgainGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 16,
    gap: 10,
  },
  scanAgainText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  webContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  webTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginTop: 20,
  },
  webSubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 30,
  },
  permissionButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  permissionButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  manualInputContainer: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 400,
    gap: 10,
  },
  manualInput: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 14,
  },
  checkButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetButton: {
    marginTop: 20,
    backgroundColor: '#333',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  resetButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  manualOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  manualCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 320,
  },
  manualTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  manualButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  manualCancelButton: {
    flex: 1,
    backgroundColor: '#333',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  manualCancelText: {
    color: '#fff',
    fontWeight: '600',
  },
  manualCheckButton: {
    flex: 1,
    backgroundColor: '#FF6B6B',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  manualCheckText: {
    color: '#fff',
    fontWeight: '600',
  },
});
