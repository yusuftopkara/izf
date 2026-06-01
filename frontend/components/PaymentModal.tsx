import React, { useState, useCallback } from 'react';
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
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { api } from '../src/services/api';
import { usePayment } from '../src/services/payment';
import { useLocale } from '../src/context/LocaleContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DiscountResult {
  valid: boolean;
  discount_type: string;
  discount_value: number;
  discounted_price: number;
  original_price: number;
}

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onAttemptLogin?: () => void;
  event: {
    id: string;
    title: string;
    price: number;
    tl_price?: number;
    payment_link?: string;
    discounted_payment_link?: string;
    tl_payment_link?: string;
    tl_discount_payment_link?: string;
  };
  quantity: number;
  user: {
    id: string;
    email: string;
    name: string;
    phone?: string;
    country?: string;
  } | null;
}

// ─── Step type ────────────────────────────────────────────────────────────────
type Step = 'choose_method' | 'member_payment' | 'guest_form' | 'processing';

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PaymentModal({
  visible,
  onClose,
  onSuccess,
  onAttemptLogin,
  event,
  quantity,
  user,
}: PaymentModalProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isLoggedIn = !!user && !!user.id;
  const { initPayment, isLoading: isInitLoading } = usePayment();
  const { t, locale } = useLocale();

  // ── Step ──────────────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>(isLoggedIn ? 'member_payment' : 'choose_method');

  // ── Coupon ────────────────────────────────────────────────────────────────
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [discount, setDiscount] = useState<DiscountResult | null>(null);

  // ── Guest form ────────────────────────────────────────────────────────────
  const [guestEmail, setGuestEmail] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestError, setGuestError] = useState('');
  const [kvkkAccepted, setKvkkAccepted] = useState(false);

  // ── Country / Currency ──────────────────────────────────────────────────
  const [country, setCountry] = useState<'TR' | 'OTHER'>(
    user?.country === 'OTHER' ? 'OTHER' : 'TR'
  );
  const isTR = country === 'TR';
  const displayPrice = isTR ? (event.tl_price ?? event.price) : event.price;
  const displayCurrency = isTR ? '₺' : '€';
  const activePaymentLink = isTR 
    ? (event.tl_payment_link ?? 'https://iyzi.link/AKmqOw') 
    : (event.payment_link ?? 'https://iyzi.link/AKkMUg');

  // ── Disable country change when processing ─────────────────────────────────────
  const isProcessing = step === 'processing';
  const canChangeCountry = !isProcessing && step !== 'guest_form';

  // ── Price calculation ──────────────────────────────────────────────────────
  const unitPrice = discount?.valid ? discount.discounted_price : displayPrice;
  const totalPrice = unitPrice * quantity;
  const originalTotal = displayPrice * quantity;

  // ── Coupon validate ────────────────────────────────────────────────────────
  const handleValidateCoupon = useCallback(async () => {
    const trimmed = couponCode.trim().toUpperCase();
    if (!trimmed) {
      setCouponError('Kupon kodu girin');
      return;
    }
    setCouponLoading(true);
    setCouponError('');
    setDiscount(null);
    try {
      const result: DiscountResult = await api.validateDiscount(trimmed, event.id, quantity);
      if (result.valid) {
        setDiscount(result);
      } else {
        setCouponError(t('ticket.couponInvalid'));
      }
    } catch (err: any) {
      setCouponError(err.response?.data?.detail || t('ticket.couponError'));
    } finally {
      setCouponLoading(false);
    }
  }, [couponCode, event.id, quantity]);

  const handleRemoveCoupon = () => {
    setDiscount(null);
    setCouponCode('');
    setCouponError('');
  };

  // ── Start iyzico payment ──────────────────────────────────────────────────
  const startIyzicoPayment = async (buyerEmail: string, buyerName: string, buyerPhone?: string) => {
    // NEW: Use static iyzico PWI link if available (TL or EUR)
    if (activePaymentLink) {
      setStep('processing');
      try {
        await Linking.openURL(activePaymentLink);
        resetAll();
        onClose();
      } catch {
        setStep(isLoggedIn ? 'member_payment' : 'choose_method');
        Alert.alert('Hata', 'Ödeme sayfası açılamadı.');
      }
      return;
    }

    // Legacy API-created payment flow
    setStep('processing');
    try {
      const result = await initPayment({
        event_id: event.id,
        buyer_email: buyerEmail,
        buyer_name: buyerName,
        buyer_phone: buyerPhone || undefined,
        discount_code: discount?.valid ? couponCode : undefined,
        quantity,
      });

      if (result && result.payment_url && result.pending_id) {
        // Close modal and open WebView screen
        resetAll();
        onClose();
        router.push({
          pathname: '/payment-webview',
          params: {
            url: encodeURIComponent(result.payment_url),
            pendingId: result.pending_id,
            eventTitle: event.title,
          },
        });
      } else {
        setStep(isLoggedIn ? 'member_payment' : 'choose_method');
        Alert.alert(t('auth.error'), t('ticket.paymentOpenError'));
      }
    } catch (err: any) {
      setStep(isLoggedIn ? 'member_payment' : 'choose_method');
      Alert.alert(t('auth.error'), err.message || t('ticket.paymentStartError'));
    }
  };

  // ── Member checkout ───────────────────────────────────────────────────────
  const handleMemberCheckout = () => {
    if (!user) {
      Alert.alert(t('auth.error'), t('ticket.userInfoError'));
      return;
    }
    startIyzicoPayment(user.email, user.name, user.phone);
  };

  // ── Guest checkout ────────────────────────────────────────────────────────
  const handleGuestCheckout = () => {
    setStep('guest_form');
  };

  const handleGuestSubmit = () => {
    setGuestError('');
    if (!guestEmail.trim() || !guestName.trim()) {
      setGuestError(t('ticket.fillAllFields'));
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(guestEmail.trim())) {
      setGuestError(t('ticket.invalidEmail'));
      return;
    }
    if (!kvkkAccepted) {
      setGuestError(t('ticket.kvkkRequired'));
      return;
    }
    startIyzicoPayment(guestEmail.trim(), guestName.trim(), guestPhone.trim() || undefined);
  };

  // ── WhatsApp ───────────────────────────────────────────────────────────────
  const handleWhatsApp = () => {
    const message = encodeURIComponent(
      t('ticket.whatsappMessage', { title: event.title, quantity })
    );
    Linking.openURL(`https://wa.me/905337743572?text=${message}`).catch(() => {
      Alert.alert(t('auth.error'), t('ticket.whatsappOpenError'));
    });
  };

  // ── Reset ──────────────────────────────────────────────────────────────────
  const resetAll = () => {
    setStep(isLoggedIn ? 'member_payment' : 'choose_method');
    setCouponCode('');
    setCouponError('');
    setDiscount(null);
    setCouponLoading(false);
    setGuestEmail('');
    setGuestName('');
    setGuestPhone('');
    setGuestError('');
  };

  const handleClose = () => {
    resetAll();
    onClose();
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Shared UI pieces
  // ──────────────────────────────────────────────────────────────────────────

  const renderOrderSummary = () => (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>{t('ticket.orderSummary')}</Text>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>{event.title}</Text>
        <Text style={styles.summaryValue}>{quantity}x</Text>
      </View>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>{t('ticket.unitPrice')}</Text>
        {discount?.valid ? (
          <View style={styles.priceGroup}>
            <Text style={styles.originalPrice}>{displayCurrency}{event.price.toFixed(2)}</Text>
            <Text style={styles.discountedPrice}>{displayCurrency}{discount.discounted_price.toFixed(2)}</Text>
          </View>
        ) : (
          <Text style={styles.summaryValue}>{displayCurrency}{displayPrice.toFixed(2)}</Text>
        )}
      </View>
      {discount?.valid && (
        <View style={styles.discountBanner}>
          <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
          <Text style={styles.discountBannerText}>
            {discount.discount_type === 'percentage'
              ? `%${discount.discount_value} ${t('ticket.discountApplied')}`
              : `${displayCurrency}${discount.discount_value.toFixed(2)} ${t('ticket.discountApplied')}`}
          </Text>
        </View>
      )}
      <View style={styles.divider} />
      <View style={styles.summaryRow}>
        <Text style={styles.totalLabelText}>{t('ticket.total')}</Text>
        {discount?.valid ? (
          <View style={styles.priceGroup}>
            <Text style={styles.originalPriceLarge}>{displayCurrency}{originalTotal.toFixed(2)}</Text>
            <Text style={styles.totalValueGreen}>{displayCurrency}{totalPrice.toFixed(2)}</Text>
          </View>
        ) : (
          <Text style={styles.totalValue}>{displayCurrency}{totalPrice.toFixed(2)}</Text>
        )}
      </View>
    </View>
  );

  // ──────────────────────────────────────────────────────────────────────────
  // Step renderers
  // ──────────────────────────────────────────────────────────────────────────

  const renderChooseMethod = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      {renderOrderSummary()}

      <Text style={styles.methodTitle}>{t('ticket.selectOption')}</Text>

      {/* WhatsApp Info Banner */}
      <View style={styles.whatsappBanner}>
        <Text style={styles.whatsappBannerText}>
          {locale === 'tr' ? '🇹🇷' : '🌍'} {t('ticket.whatsappInfo')}
        </Text>
      </View>

      {/* Login / member */}
      <TouchableOpacity
        style={styles.methodCard}
        onPress={() => { onAttemptLogin?.(); handleClose(); router.push('/(auth)/login'); }}
      >
        <LinearGradient
          colors={['#E91E8C', '#FF6B35']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.methodGradient}
        >
          <Ionicons name="person" size={24} color="#fff" />
          <View style={styles.methodTextContainer}>
            <Text style={styles.methodCardTitle}>{t('ticket.memberBtn')}</Text>
            <Text style={styles.methodCardSubtitle}>{t('ticket.memberSub')}</Text>
          </View>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Guest checkout */}
      <TouchableOpacity style={styles.methodCardOutline} onPress={handleGuestCheckout}>
        <Ionicons name="person-outline" size={24} color="#FF8E53" />
        <View style={styles.methodTextContainer}>
          <Text style={styles.methodCardTitleOutline}>{t('ticket.guestBtn')}</Text>
          <Text style={styles.methodCardSubtitleOutline}>{t('ticket.guestSub')}</Text>
        </View>
        <Ionicons name="arrow-forward" size={20} color="#FF8E53" />
      </TouchableOpacity>

      {/* WhatsApp */}
      <TouchableOpacity style={styles.methodCardWhatsApp} onPress={handleWhatsApp}>
        <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
        <View style={styles.methodTextContainer}>
          <Text style={styles.methodCardTitleWhatsApp}>{t('ticket.whatsappBtn')}</Text>
          <Text style={styles.methodCardSubtitleOutline}>{t('ticket.whatsappSub')}</Text>
        </View>
        <Ionicons name="arrow-forward" size={20} color="#25D366" />
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );

  const renderMemberPayment = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      {renderOrderSummary()}

      {/* Coupon section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('ticket.couponLabel')}</Text>
        {!discount?.valid ? (
          <>
            <View style={styles.couponRow}>
              <TextInput
                style={[styles.couponInput, couponError ? styles.inputError : null]}
                placeholder={t('ticket.couponPlaceholder')}
                placeholderTextColor="#666"
                value={couponCode}
                onChangeText={(t) => { setCouponCode(t.toUpperCase()); setCouponError(''); }}
                autoCapitalize="characters"
              />
              <TouchableOpacity
                style={styles.couponButton}
                onPress={handleValidateCoupon}
                disabled={couponLoading}
              >
                {couponLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.couponButtonText}>{t('ticket.couponApply')}</Text>
                )}
              </TouchableOpacity>
            </View>
            {!!couponError && (
              <View style={styles.couponErrorRow}>
                <Ionicons name="close-circle" size={16} color="#FF4444" />
                <Text style={styles.couponErrorText}>{couponError}</Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.couponSuccess}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <Text style={styles.couponSuccessText}>{couponCode} {t('ticket.couponApplied')}</Text>
            <TouchableOpacity onPress={handleRemoveCoupon} style={styles.removeCouponBtn}>
              <Ionicons name="close" size={18} color="#888" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* iyzico info */}
      <View style={styles.iyzicoInfoCard}>
        <Ionicons name="shield-checkmark" size={22} color="#4CAF50" />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.iyzicoInfoTitle}>{t('ticket.iyzicoSecure')}</Text>
          <Text style={styles.iyzicoInfoText}>
            {discount?.valid
              ? t('ticket.iyzicoCouponInfo')
              : t('ticket.iyzicoRedirectInfo')}
          </Text>
        </View>
      </View>

      {/* WhatsApp alternative */}
      <TouchableOpacity style={styles.whatsappAlt} onPress={handleWhatsApp}>
        <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
        <Text style={styles.whatsappAltText}>{t('ticket.whatsappAlt')}</Text>
      </TouchableOpacity>

      <View style={{ height: 130 }} />

      {/* Pay button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
        <TouchableOpacity style={styles.payButton} onPress={handleMemberCheckout} disabled={isInitLoading}>
          <LinearGradient
            colors={['#FF6B35', '#FF8E53']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.payButtonGradient}
          >
            {isInitLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="lock-closed" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.payButtonText}>
                  {displayCurrency}{totalPrice.toFixed(2)} — {t('ticket.payWithIyzico')}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderGuestForm = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      {renderOrderSummary()}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('ticket.contactInfo')}</Text>
        <TextInput
          style={[styles.input, guestError && !guestName.trim() ? styles.inputError : null]}
          placeholder={t('ticket.namePlaceholder')}
          placeholderTextColor="#666"
          value={guestName}
          onChangeText={setGuestName}
        />
        <TextInput
          style={[styles.input, guestError && !guestEmail.trim() ? styles.inputError : null]}
          placeholder={t('ticket.emailPlaceholder')}
          placeholderTextColor="#666"
          value={guestEmail}
          onChangeText={setGuestEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder={`${t('ticket.phonePlaceholder')} (Opsiyonel)`}
          placeholderTextColor="#666"
          value={guestPhone}
          onChangeText={setGuestPhone}
          keyboardType="phone-pad"
        />

        <TouchableOpacity
          style={styles.kvkkRow}
          onPress={() => setKvkkAccepted(!kvkkAccepted)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, kvkkAccepted && styles.checkboxChecked]}>
            {kvkkAccepted && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
          <Text style={styles.kvkkText}>
            {t('ticket.kvkkText')}
          </Text>
        </TouchableOpacity>
        {!!guestError && (
          <View style={styles.couponErrorRow}>
            <Ionicons name="close-circle" size={16} color="#FF4444" />
            <Text style={styles.couponErrorText}>{guestError}</Text>
          </View>
        )}
      </View>

      <View style={{ height: 130 }} />

      <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
        <TouchableOpacity style={styles.payButton} onPress={handleGuestSubmit} disabled={isInitLoading}>
          <LinearGradient
            colors={['#FF6B35', '#FF8E53']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.payButtonGradient}
          >
            {isInitLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="lock-closed" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.payButtonText}>
                  {displayCurrency}{totalPrice.toFixed(2)} — {t('ticket.payWithIyzico')}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderProcessing = () => (
    <View style={[styles.container, styles.centered]}>
      <ActivityIndicator size="large" color="#E91E8C" />
      <Text style={styles.processingText}>{t('ticket.processingPayment')}</Text>
    </View>
  );

  // ──────────────────────────────────────────────────────────────────────────
  // Header title by step
  // ──────────────────────────────────────────────────────────────────────────

  const headerTitle = () => {
    switch (step) {
      case 'choose_method': return t('ticket.buy');
      case 'member_payment': return t('ticket.paymentTitle');
      case 'guest_form': return t('ticket.guestPaymentTitle');
      case 'processing': return t('ticket.processing');
    }
  };

  const canGoBack = step === 'guest_form';

  const handleBack = () => {
    if (step === 'guest_form') {
      setStep('choose_method');
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
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
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity
            onPress={canGoBack ? handleBack : handleClose}
            style={styles.closeButton}
          >
            <Ionicons name={canGoBack ? 'arrow-back' : 'close'} size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{headerTitle()}</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Content by step */}
        {step === 'choose_method' && renderChooseMethod()}
        {step === 'member_payment' && renderMemberPayment()}
        {step === 'guest_form' && renderGuestForm()}
        {step === 'processing' && renderProcessing()}
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d1a' },

  centered: {
    justifyContent: 'center',
    alignItems: 'center',
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
  closeButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  placeholder: { width: 44 },

  content: { flex: 1, padding: 16 },

  // Summary card
  summaryCard: { backgroundColor: '#1a1a2e', borderRadius: 16, padding: 16, marginBottom: 20 },
  summaryTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  summaryLabel: { color: '#888', fontSize: 14 },
  summaryValue: { color: '#fff', fontSize: 14, fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#2a2a4e', marginVertical: 8 },
  totalLabelText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  totalValue: { color: '#FF6B35', fontSize: 20, fontWeight: '700' },

  // Price display
  priceGroup: { alignItems: 'flex-end' },
  originalPrice: { color: '#666', fontSize: 13, textDecorationLine: 'line-through' },
  discountedPrice: { color: '#4CAF50', fontSize: 14, fontWeight: '600' },
  originalPriceLarge: { color: '#666', fontSize: 14, textDecorationLine: 'line-through' },
  totalValueGreen: { color: '#4CAF50', fontSize: 22, fontWeight: '700' },

  // Discount banner
  discountBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76,175,80,0.12)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 4,
  },
  discountBannerText: { color: '#4CAF50', fontSize: 13, marginLeft: 6 },

  // Method selection
  methodTitle: { color: '#fff', fontSize: 17, fontWeight: '700', marginBottom: 16 },
  whatsappBanner: {
    backgroundColor: 'rgba(37,211,102,0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(37,211,102,0.25)',
    padding: 12,
    marginBottom: 16,
  },
  whatsappBannerText: {
    color: '#ddd',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  methodCard: { borderRadius: 14, overflow: 'hidden', marginBottom: 12 },
  methodGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  methodCardOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#FF8E53',
    paddingHorizontal: 16,
    paddingVertical: 18,
    marginBottom: 12,
  },
  methodCardWhatsApp: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#25D366',
    paddingHorizontal: 16,
    paddingVertical: 18,
    marginBottom: 12,
  },
  methodTextContainer: { flex: 1, marginLeft: 12 },
  methodCardTitle: { color: '#fff', fontWeight: '700', fontSize: 15 },
  methodCardSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  methodCardTitleOutline: { color: '#FF8E53', fontWeight: '700', fontSize: 15 },
  methodCardTitleWhatsApp: { color: '#25D366', fontWeight: '700', fontSize: 15 },
  methodCardSubtitleOutline: { color: '#888', fontSize: 12, marginTop: 2 },

  // Section
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 16 },

  // Coupon
  couponRow: { flexDirection: 'row', gap: 8 },
  couponInput: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 15,
    letterSpacing: 1,
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  couponButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  couponButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  couponErrorRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  couponErrorText: { color: '#FF4444', fontSize: 13, marginLeft: 6 },
  couponSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76,175,80,0.12)',
    borderRadius: 12,
    padding: 14,
  },
  couponSuccessText: { color: '#4CAF50', fontWeight: '600', flex: 1, marginLeft: 8 },
  removeCouponBtn: { padding: 4 },

  // Inputs
  input: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#2a2a4e',
    marginBottom: 12,
  },
  inputError: { borderColor: '#FF4444' },

  // iyzico info card
  iyzicoInfoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(76,175,80,0.1)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  iyzicoInfoTitle: { color: '#4CAF50', fontWeight: '700', fontSize: 14, marginBottom: 4 },
  iyzicoInfoText: { color: '#888', fontSize: 12, lineHeight: 18 },

  // WhatsApp alt
  whatsappAlt: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(37,211,102,0.08)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  whatsappAltText: { color: '#25D366', fontSize: 14, fontWeight: '500' },

  // Footer / pay button
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#0d0d1a',
    borderTopWidth: 1,
    borderTopColor: '#1a1a2e',
  },
  payButton: { borderRadius: 12, overflow: 'hidden' },
  payButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  payButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },

  // Processing
  processingText: { color: '#888', marginTop: 16, fontSize: 15 },

  // KVKK
  kvkkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  kvkkText: {
    flex: 1,
    color: '#aaa',
    fontSize: 12,
    lineHeight: 18,
  },
});
