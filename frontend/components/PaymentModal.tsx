import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../src/services/api';

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (tickets: any[]) => void;
  event: {
    id: string;
    title: string;
    price: number;
  };
  quantity: number;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

export default function PaymentModal({
  visible,
  onClose,
  onSuccess,
  event,
  quantity,
  user,
}: PaymentModalProps) {
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(false);

  // Card info
  const [cardHolderName, setCardHolderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expireMonth, setExpireMonth] = useState('');
  const [expireYear, setExpireYear] = useState('');
  const [cvc, setCvc] = useState('');

  // Buyer info
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');

  const totalPrice = event.price * quantity;

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    const formatted = cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');
    return formatted.substring(0, 19);
  };

  const handleCardNumberChange = (text: string) => {
    setCardNumber(formatCardNumber(text));
  };

  const validateForm = () => {
    if (!cardHolderName.trim()) {
      Alert.alert('Hata', 'Kart sahibinin adını girin');
      return false;
    }
    
    const cleanCardNumber = cardNumber.replace(/\s/g, '');
    if (cleanCardNumber.length < 15 || cleanCardNumber.length > 16) {
      Alert.alert('Hata', 'Geçerli bir kart numarası girin');
      return false;
    }

    if (!expireMonth || parseInt(expireMonth) < 1 || parseInt(expireMonth) > 12) {
      Alert.alert('Hata', 'Geçerli bir son kullanım ayı girin (01-12)');
      return false;
    }

    const currentYear = new Date().getFullYear() % 100;
    if (!expireYear || parseInt(expireYear) < currentYear) {
      Alert.alert('Hata', 'Geçerli bir son kullanım yılı girin');
      return false;
    }

    if (!cvc || cvc.length < 3) {
      Alert.alert('Hata', 'Geçerli bir CVV/CVC girin');
      return false;
    }

    if (!phone.trim() || phone.length < 10) {
      Alert.alert('Hata', 'Geçerli bir telefon numarası girin');
      return false;
    }

    return true;
  };

  const handlePayment = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // Parse name into first and last name
      const nameParts = user.name.trim().split(' ');
      const firstName = nameParts[0] || 'Ad';
      const lastName = nameParts.slice(1).join(' ') || 'Soyad';

      const paymentData = {
        event_id: event.id,
        quantity: quantity,
        card: {
          card_holder_name: cardHolderName.trim(),
          card_number: cardNumber.replace(/\s/g, ''),
          expire_month: expireMonth.padStart(2, '0'),
          expire_year: expireYear.length === 2 ? `20${expireYear}` : expireYear,
          cvc: cvc,
        },
        buyer: {
          name: firstName,
          surname: lastName,
          email: user.email,
          phone: phone.replace(/\D/g, ''),
          identity_number: '11111111111', // Default TC
          address: address.trim() || 'Türkiye',
          city: city.trim() || 'Istanbul',
          country: 'Turkey',
          zip_code: '34000',
        },
      };

      const response = await api.createPayment(paymentData);

      if (response.success) {
        Alert.alert(
          'Ödeme Başarılı!',
          response.message || `${quantity} adet bilet satın alındı.`,
          [{ text: 'Tamam', onPress: () => onSuccess(response.tickets) }]
        );
      } else {
        Alert.alert('Ödeme Başarısız', response.message || 'Bir hata oluştu.');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Ödeme işlemi başarısız oldu.';
      Alert.alert('Hata', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setCardHolderName('');
    setCardNumber('');
    setExpireMonth('');
    setExpireYear('');
    setCvc('');
    setPhone('');
    setAddress('');
    setCity('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ödeme</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Order Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Sipariş Özeti</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{event.title}</Text>
              <Text style={styles.summaryValue}>{quantity}x</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Bilet Fiyatı</Text>
              <Text style={styles.summaryValue}>₺{event.price.toFixed(2)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Toplam</Text>
              <Text style={styles.totalValue}>₺{totalPrice.toFixed(2)}</Text>
            </View>
          </View>

          {/* Card Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kart Bilgileri</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Kart Sahibinin Adı</Text>
              <TextInput
                style={styles.input}
                placeholder="AD SOYAD"
                placeholderTextColor="#666"
                value={cardHolderName}
                onChangeText={setCardHolderName}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Kart Numarası</Text>
              <View style={styles.cardInputContainer}>
                <Ionicons name="card-outline" size={20} color="#666" style={styles.cardIcon} />
                <TextInput
                  style={styles.cardInput}
                  placeholder="1234 5678 9012 3456"
                  placeholderTextColor="#666"
                  value={cardNumber}
                  onChangeText={handleCardNumberChange}
                  keyboardType="numeric"
                  maxLength={19}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>Ay</Text>
                <TextInput
                  style={styles.input}
                  placeholder="MM"
                  placeholderTextColor="#666"
                  value={expireMonth}
                  onChangeText={(text) => setExpireMonth(text.replace(/\D/g, '').substring(0, 2))}
                  keyboardType="numeric"
                  maxLength={2}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>Yıl</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YY"
                  placeholderTextColor="#666"
                  value={expireYear}
                  onChangeText={(text) => setExpireYear(text.replace(/\D/g, '').substring(0, 2))}
                  keyboardType="numeric"
                  maxLength={2}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>CVV</Text>
                <TextInput
                  style={styles.input}
                  placeholder="123"
                  placeholderTextColor="#666"
                  value={cvc}
                  onChangeText={(text) => setCvc(text.replace(/\D/g, '').substring(0, 4))}
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                />
              </View>
            </View>
          </View>

          {/* Buyer Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>İletişim Bilgileri</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Telefon Numarası</Text>
              <TextInput
                style={styles.input}
                placeholder="05XX XXX XX XX"
                placeholderTextColor="#666"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={15}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Şehir (Opsiyonel)</Text>
              <TextInput
                style={styles.input}
                placeholder="İstanbul"
                placeholderTextColor="#666"
                value={city}
                onChangeText={setCity}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Adres (Opsiyonel)</Text>
              <TextInput
                style={styles.input}
                placeholder="Adres bilgisi"
                placeholderTextColor="#666"
                value={address}
                onChangeText={setAddress}
                multiline
              />
            </View>
          </View>

          {/* Security Note */}
          <View style={styles.securityNote}>
            <Ionicons name="shield-checkmark" size={20} color="#4CAF50" />
            <Text style={styles.securityText}>
              Ödeme işleminiz iyzico güvencesiyle 256-bit SSL ile şifrelenmektedir.
            </Text>
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Pay Button */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
          <TouchableOpacity
            style={styles.payButton}
            onPress={handlePayment}
            disabled={isLoading}
          >
            <LinearGradient
              colors={['#FF6B6B', '#FF8E53']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.payButtonGradient}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="lock-closed" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.payButtonText}>₺{totalPrice.toFixed(2)} Öde</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  closeButton: {
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
  content: {
    flex: 1,
    padding: 16,
  },
  summaryCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    color: '#888',
    fontSize: 14,
  },
  summaryValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#2a2a4e',
    marginVertical: 8,
  },
  totalLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  totalValue: {
    color: '#FF6B6B',
    fontSize: 20,
    fontWeight: '700',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  cardInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  cardIcon: {
    paddingLeft: 14,
  },
  cardInput: {
    flex: 1,
    padding: 14,
    color: '#fff',
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
  },
  securityText: {
    color: '#4CAF50',
    fontSize: 12,
    marginLeft: 10,
    flex: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#0a0a0a',
    borderTopWidth: 1,
    borderTopColor: '#1a1a2e',
  },
  payButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  payButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
