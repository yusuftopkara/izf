import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image,
  Modal,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { api } from '../../src/services/api';

const LOGO_URL = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR86xQQVC5BJOg6hzF8RrhjJDnu2UwKTBsnpw&s';

interface Ticket {
  id: string;
  event_id: string;
  event_title: string;
  event_date: string;
  event_location: string;
  qr_token: string;
  status: string;
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout, refreshUser } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [adminStats, setAdminStats] = useState<any>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      setRefreshing(false);
      return;
    }
    
    try {
      const ticketsData = await api.getMyTickets();
      setTickets(ticketsData);
      
      if (user.role === 'admin') {
        const stats = await api.getAdminStats();
        setAdminStats(stats);
      }
    } catch (error) {
      console.error('Error fetching profile data:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      fetchData();
    } else {
      setTickets([]);
      setAdminStats(null);
    }
  }, [user, fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
    if (user) refreshUser();
  };

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      setShowLogoutModal(true);
    } else {
      Alert.alert(
        'Çıkış',
        'Çıkış yapmak istediğinize emin misiniz?',
        [
          { text: 'İptal', style: 'cancel' },
          {
            text: 'Çıkış Yap',
            style: 'destructive',
            onPress: performLogout,
          },
        ]
      );
    }
  };

  const performLogout = async () => {
    try {
      await logout();
      setTickets([]);
      setAdminStats(null);
      setShowLogoutModal(false);
      router.replace('/(tabs)/home');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleSeedData = async () => {
    try {
      const result = await api.seedData();
      Alert.alert('Başarılı', result.message);
      if (user) fetchData();
    } catch (error: any) {
      Alert.alert('Bilgi', error.response?.data?.message || 'Veri zaten mevcut');
    }
  };

  // Not logged in state
  if (!user) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#1a1a2e', '#16213e']}
          style={[styles.header, { paddingTop: insets.top + 10 }]}
        >
          <Text style={styles.headerTitle}>Profil</Text>
        </LinearGradient>

        <View style={styles.guestContainer}>
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={['#FF6B6B', '#FF8E53']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoGradient}
            >
              <Image source={{ uri: LOGO_URL }} style={styles.guestLogo} />
            </LinearGradient>
          </View>
          <Text style={styles.guestTitle}>IZF'a Giriş Yapın</Text>
          <Text style={styles.guestText}>
            Biletlerinizi görmek, challenge'lara katılmak ve daha fazlası için giriş yapın.
          </Text>
          
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push('/(auth)/login')}
          >
            <LinearGradient
              colors={['#FF6B6B', '#FF8E53']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.loginButtonGradient}
            >
              <Text style={styles.loginButtonText}>Giriş Yap</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.registerButton}
            onPress={() => router.push('/(auth)/register')}
          >
            <Text style={styles.registerButtonText}>Hesap Oluştur</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.seedButton} onPress={handleSeedData}>
            <Ionicons name="cloud-download" size={18} color="#2196F3" />
            <Text style={styles.seedButtonText}>Demo Veri Yükle</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Logged in state
  const validTickets = tickets.filter(t => t.status === 'VALID');
  const usedTickets = tickets.filter(t => t.status === 'USED');

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a1a2e', '#16213e']}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user.name?.charAt(0).toUpperCase() || 'U'}</Text>
          </View>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>
              {user.role === 'admin' ? 'Yönetici' : user.role === 'staff' ? 'Görevli' : 'Kullanıcı'}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B6B" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="flame" size={24} color="#FF6B6B" />
            <Text style={styles.statNumber}>{user.streak || 0}</Text>
            <Text style={styles.statLabel}>Streak</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="ticket" size={24} color="#4CAF50" />
            <Text style={styles.statNumber}>{validTickets.length}</Text>
            <Text style={styles.statLabel}>Aktif Bilet</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="checkmark-done" size={24} color="#2196F3" />
            <Text style={styles.statNumber}>{usedTickets.length}</Text>
            <Text style={styles.statLabel}>Kullanılan</Text>
          </View>
        </View>

        {/* Admin Stats */}
        {user.role === 'admin' && adminStats && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Admin İstatistikleri</Text>
            <View style={styles.adminStatsGrid}>
              <View style={styles.adminStatCard}>
                <Text style={styles.adminStatNumber}>{adminStats.total_users}</Text>
                <Text style={styles.adminStatLabel}>Kullanıcı</Text>
              </View>
              <View style={styles.adminStatCard}>
                <Text style={styles.adminStatNumber}>{adminStats.total_events}</Text>
                <Text style={styles.adminStatLabel}>Etkinlik</Text>
              </View>
              <View style={styles.adminStatCard}>
                <Text style={styles.adminStatNumber}>{adminStats.total_tickets}</Text>
                <Text style={styles.adminStatLabel}>Bilet</Text>
              </View>
              <View style={styles.adminStatCard}>
                <Text style={styles.adminStatNumber}>{adminStats.total_posts}</Text>
                <Text style={styles.adminStatLabel}>Paylaşım</Text>
              </View>
            </View>
          </View>
        )}

        {/* My Tickets */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Biletlerim</Text>
          {isLoading ? (
            <ActivityIndicator size="small" color="#FF6B6B" />
          ) : tickets.length === 0 ? (
            <View style={styles.emptyTickets}>
              <Ionicons name="ticket-outline" size={48} color="#444" />
              <Text style={styles.emptyText}>Henüz biletiniz yok</Text>
            </View>
          ) : (
            tickets.slice(0, 3).map((ticket) => (
              <TouchableOpacity
                key={ticket.id}
                style={styles.ticketCard}
                onPress={() => router.push(`/ticket/${ticket.id}`)}
              >
                <View style={styles.ticketInfo}>
                  <Text style={styles.ticketTitle}>{ticket.event_title}</Text>
                  <Text style={styles.ticketLocation}>{ticket.event_location}</Text>
                </View>
                <View style={[styles.statusBadge, ticket.status === 'USED' && styles.statusUsed]}>
                  <Text style={[styles.statusText, ticket.status === 'USED' && styles.statusTextUsed]}>
                    {ticket.status === 'VALID' ? 'Geçerli' : 'Kullanıldı'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>İşlemler</Text>
          
          {/* Profile Settings - for all users */}
          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => router.push('/profile-settings')}
          >
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(156,39,176,0.2)' }]}>
              <Ionicons name="person-circle" size={22} color="#9C27B0" />
            </View>
            <Text style={styles.actionText}>Profil Ayarları</Text>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
          
          {user.role === 'admin' && (
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => router.push('/admin')}
            >
              <View style={[styles.actionIcon, { backgroundColor: 'rgba(255,107,107,0.2)' }]}>
                <Ionicons name="settings" size={22} color="#FF6B6B" />
              </View>
              <Text style={styles.actionText}>Admin Panel</Text>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          )}
          
          {(user.role === 'staff' || user.role === 'admin') && (
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => router.push('/qr-scanner')}
            >
              <View style={[styles.actionIcon, { backgroundColor: 'rgba(76,175,80,0.2)' }]}>
                <Ionicons name="qr-code" size={22} color="#4CAF50" />
              </View>
              <Text style={styles.actionText}>QR Tara</Text>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={styles.actionItem} onPress={handleSeedData}>
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(33,150,243,0.2)' }]}>
              <Ionicons name="cloud-download" size={22} color="#2196F3" />
            </View>
            <Text style={styles.actionText}>Demo Veri Yükle</Text>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/privacy-policy')}>
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(100,100,255,0.2)' }]}>
              <Ionicons name="shield-checkmark" size={22} color="#6464FF" />
            </View>
            <Text style={styles.actionText}>Gizlilik Politikası</Text>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionItem} onPress={handleLogout}>
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(244,67,54,0.2)' }]}>
              <Ionicons name="log-out" size={22} color="#f44336" />
            </View>
            <Text style={[styles.actionText, { color: '#f44336' }]}>Çıkış Yap</Text>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Logout Confirmation Modal for Web */}
      <Modal
        visible={showLogoutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Çıkış</Text>
            <Text style={styles.modalText}>Çıkış yapmak istediğinize emin misiniz?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.modalCancelText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalLogoutButton]}
                onPress={performLogout}
              >
                <Text style={styles.modalLogoutText}>Çıkış Yap</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  guestContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  logoContainer: {
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 24,
  },
  logoGradient: {
    width: 110,
    height: 110,
    borderRadius: 55,
    padding: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestLogo: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  guestTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  guestText: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  loginButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  loginButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  registerButton: {
    width: '100%',
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  registerButtonText: {
    color: '#FF6B6B',
    fontSize: 17,
    fontWeight: '600',
  },
  seedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 32,
    padding: 12,
  },
  seedButtonText: {
    color: '#2196F3',
    fontSize: 14,
    marginLeft: 8,
  },
  profileSection: {
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  userEmail: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  roleBadge: {
    backgroundColor: 'rgba(255,107,107,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  roleText: {
    color: '#FF6B6B',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  adminStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  adminStatCard: {
    width: '47%',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  adminStatNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FF6B6B',
  },
  adminStatLabel: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
  },
  emptyTickets: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    fontSize: 14,
    marginTop: 12,
  },
  ticketCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ticketInfo: {
    flex: 1,
  },
  ticketTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  ticketLocation: {
    color: '#888',
    fontSize: 13,
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: 'rgba(76,175,80,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusUsed: {
    backgroundColor: 'rgba(158,158,158,0.2)',
  },
  statusText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextUsed: {
    color: '#9e9e9e',
  },
  actionItem: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionText: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalText: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  modalCancelText: {
    color: '#888',
    fontWeight: '600',
  },
  modalLogoutButton: {
    backgroundColor: '#f44336',
  },
  modalLogoutText: {
    color: '#fff',
    fontWeight: '700',
  },
});
