import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function PrivacyPolicy() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gizlilik Politikası</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Son Güncelleme: Mart 2025</Text>

        <Text style={styles.sectionTitle}>1. Giriş</Text>
        <Text style={styles.paragraph}>
          Istanbul International Zumba Festival (IZF) mobil uygulamasını kullandığınız için teşekkür ederiz. 
          Gizliliğiniz bizim için önemlidir. Bu politika, kişisel bilgilerinizi nasıl topladığımızı, 
          kullandığımızı ve koruduğumuzu açıklar.
        </Text>

        <Text style={styles.sectionTitle}>2. Topladığımız Bilgiler</Text>
        <Text style={styles.paragraph}>
          Uygulamamızı kullanırken aşağıdaki bilgileri toplayabiliriz:
        </Text>
        <Text style={styles.listItem}>• Ad ve e-posta adresi (hesap oluşturma için)</Text>
        <Text style={styles.listItem}>• Ödeme bilgileri (bilet satın alma için - iyzico aracılığıyla işlenir)</Text>
        <Text style={styles.listItem}>• Cihaz bilgileri (push bildirimleri için)</Text>
        <Text style={styles.listItem}>• Konum bilgisi (etkinlik yerini göstermek için, izninizle)</Text>

        <Text style={styles.sectionTitle}>3. Bilgilerin Kullanımı</Text>
        <Text style={styles.paragraph}>
          Topladığımız bilgileri şu amaçlarla kullanırız:
        </Text>
        <Text style={styles.listItem}>• Hesabınızı oluşturmak ve yönetmek</Text>
        <Text style={styles.listItem}>• Etkinlik biletleri satın almanızı sağlamak</Text>
        <Text style={styles.listItem}>• Etkinlik güncellemeleri ve bildirimleri göndermek</Text>
        <Text style={styles.listItem}>• Müşteri desteği sağlamak</Text>
        <Text style={styles.listItem}>• Uygulama deneyimini iyileştirmek</Text>

        <Text style={styles.sectionTitle}>4. Bilgi Güvenliği</Text>
        <Text style={styles.paragraph}>
          Kişisel bilgilerinizi korumak için endüstri standardı güvenlik önlemleri kullanıyoruz. 
          Ödeme işlemleri, güvenli ödeme altyapısı sağlayıcısı iyzico tarafından işlenir ve 
          kredi kartı bilgileriniz sunucularımızda saklanmaz.
        </Text>

        <Text style={styles.sectionTitle}>5. Üçüncü Taraf Hizmetler</Text>
        <Text style={styles.paragraph}>
          Uygulamamız aşağıdaki üçüncü taraf hizmetleri kullanabilir:
        </Text>
        <Text style={styles.listItem}>• iyzico (ödeme işlemleri)</Text>
        <Text style={styles.listItem}>• Firebase (bildirimler)</Text>
        <Text style={styles.listItem}>• YouTube (video içerikleri)</Text>

        <Text style={styles.sectionTitle}>6. Çerezler ve İzleme</Text>
        <Text style={styles.paragraph}>
          Uygulamamız, deneyiminizi iyileştirmek için yerel depolama kullanır. 
          Oturum bilgileriniz cihazınızda güvenli bir şekilde saklanır.
        </Text>

        <Text style={styles.sectionTitle}>7. Çocukların Gizliliği</Text>
        <Text style={styles.paragraph}>
          Uygulamamız 13 yaşın altındaki çocuklardan bilerek kişisel bilgi toplamaz. 
          Eğer çocuğunuzun bize kişisel bilgi verdiğini düşünüyorsanız, lütfen bizimle iletişime geçin.
        </Text>

        <Text style={styles.sectionTitle}>8. Haklarınız</Text>
        <Text style={styles.paragraph}>
          KVKK ve GDPR kapsamında aşağıdaki haklara sahipsiniz:
        </Text>
        <Text style={styles.listItem}>• Bilgilerinize erişim talep etme</Text>
        <Text style={styles.listItem}>• Bilgilerinizin düzeltilmesini isteme</Text>
        <Text style={styles.listItem}>• Bilgilerinizin silinmesini talep etme</Text>
        <Text style={styles.listItem}>• Veri işlemeye itiraz etme</Text>

        <Text style={styles.sectionTitle}>9. Politika Değişiklikleri</Text>
        <Text style={styles.paragraph}>
          Bu gizlilik politikasını zaman zaman güncelleyebiliriz. 
          Değişiklikler uygulama içinde veya e-posta yoluyla bildirilecektir.
        </Text>

        <Text style={styles.sectionTitle}>10. İletişim</Text>
        <Text style={styles.paragraph}>
          Gizlilik politikamız hakkında sorularınız varsa, lütfen bizimle iletişime geçin:
        </Text>
        <Text style={styles.contactInfo}>E-posta: info@izfzumba.com</Text>
        <Text style={styles.contactInfo}>Web: www.izfzumba.com</Text>

        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a0a2e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a0a2e',
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
  content: {
    flex: 1,
    padding: 20,
  },
  lastUpdated: {
    color: '#888',
    fontSize: 12,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginTop: 24,
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 22,
    marginBottom: 12,
  },
  listItem: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 24,
    marginLeft: 8,
  },
  contactInfo: {
    fontSize: 14,
    color: '#E91E8C',
    lineHeight: 24,
  },
});

