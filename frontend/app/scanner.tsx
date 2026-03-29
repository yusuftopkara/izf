import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Vibration,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { api } from '../src/services/api';
import { LinearGradient } from 'expo-linear-gradient';

export default function ScannerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned || isProcessing) return;
    
    setIsProcessing(true);
    setScanned(true);
    Vibration.vibrate(100);

    try {
      const response = await api.checkTicket(data);
      setResult(response);
      
      if (response.status === 'VALID') {
        Vibration.vibrate([0, 100, 50, 100]);
      } else {
        Vibration.vibrate([0, 300]);
      }
    } catch (error: any) {
      setResult({
        status: 'ERROR',
        message: error.response?.data?.detail || 'Bir hata oluştu'
      });
      Vibration.vibrate([0, 300]);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetScanner = () => {
    setScanned(false);
    setResult(null);
  };

  if (!permission) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.permissionText}>Kamera izni yükleniyor...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Ionicons name="camera-outline" size={64} color="#E91E8C" />
        <Text style={styles.permissionText}>Kamera izni gerekli</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>İzin Ver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.8)', 'transparent', 'transparent', 'rgba(0,0,0,0.8)']}
          style={styles.overlay}
        >
          <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
            <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>QR Tara</Text>
            <View style={{ width: 44 }} />
          </View>

          <View style={styles.scanArea}>
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
            <Text style={styles.scanHint}>QR kodu çerçeve içine hizalayın</Text>
          </View>

          {/* Result Modal */}
          {result && (
            <View style={[styles.resultContainer, { paddingBottom: insets.bottom + 20 }]}>
              <View style={[
                styles.resultCard,
                result.status === 'VALID' && styles.resultValid,
                result.status === 'USED' && styles.resultUsed,
                result.status === 'INVALID' && styles.resultInvalid,
                result.status === 'ERROR' && styles.resultError,
              ]}>
                <Ionicons
                  name={
                    result.status === 'VALID' ? 'checkmark-circle' :
                    result.status === 'USED' ? 'refresh-circle' :
                    'close-circle'
                  }
                  size={64}
                  color={
                    result.status === 'VALID' ? '#4CAF50' :
                    result.status === 'USED' ? '#FF9800' :
                    '#f44336'
                  }
                />
                <Text style={styles.resultStatus}>
                  {result.status === 'VALID' ? 'GEÇERLİ' :
                   result.status === 'USED' ? 'KULLANILMIŞ' :
                   result.status === 'INVALID' ? 'GEÇERSİZ' : 'HATA'}
                </Text>
                <Text style={styles.resultMessage}>{result.message}</Text>
                
                {result.status === 'VALID' && (
                  <View style={styles.ticketInfo}>
                    <Text style={styles.ticketInfoText}>{result.event_title}</Text>
                    <Text style={styles.ticketInfoUser}>{result.user_name}</Text>
                  </View>
                )}

                <TouchableOpacity style={styles.scanAgainButton} onPress={resetScanner}>
                  <Ionicons name="scan" size={20} color="#fff" />
                  <Text style={styles.scanAgainText}>Tekrar Tara</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </LinearGradient>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  scanArea: {
    flex: 1,
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
    width: 40,
    height: 40,
    borderColor: '#E91E8C',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  scanHint: {
    color: '#fff',
    fontSize: 14,
    marginTop: 24,
    opacity: 0.8,
  },
  resultContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  resultCard: {
    backgroundColor: '#1a0a2e',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
  },
  resultValid: {
    borderColor: '#4CAF50',
  },
  resultUsed: {
    borderColor: '#FF9800',
  },
  resultInvalid: {
    borderColor: '#f44336',
  },
  resultError: {
    borderColor: '#f44336',
  },
  resultStatus: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    marginTop: 12,
  },
  resultMessage: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
    textAlign: 'center',
  },
  ticketInfo: {
    marginTop: 16,
    alignItems: 'center',
  },
  ticketInfoText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  ticketInfoUser: {
    color: '#E91E8C',
    fontSize: 14,
    marginTop: 4,
  },
  scanAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E91E8C',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
  },
  scanAgainText: {
    color: '#fff',
    fontWeight: '700',
    marginLeft: 8,
  },
  permissionText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: '#E91E8C',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20,
  },
  permissionButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});

