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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { api } from '../../src/services/api';

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
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adminStats, setAdminStats] = useState<any>(null);

  const fetchData = useCallback(async () => {
    try {
      const ticketsData = await api.getMyTickets();
      setTickets(ticketsData);
      
      if (user?.role === 'admin') {
        const stats = await api.getAdminStats();
        setAdminStats(stats);
      }
    } catch (error) {
      console.error('Error fetching profile data:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [user?.role]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
    refreshUser();
  };

  const handleLogout = () => {
    Alert.alert(
      'Çıkış',
      'Çıkış yapmak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const handleSeedData = async () => {
    try {
      const result = await api.seedData();
      Alert.alert('Başarılı', result.message);
      fetchData();
    } catch (error: any) {
      Alert.alert('Bilgi', error.response?.data?.message || 'Veri zaten mevcut');
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

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
            <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase() || 'U'}</Text>
          </View>
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>
              {user?.role === 'admin' ? 'Yönetici' : user?.role === 'staff' ? 'Görevli' : 'Kullanıcı'}
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
            <Text style={styles.statNumber}>{user?.streak || 0}</Text>
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
        {user?.role === 'admin' && adminStats && (
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
          {tickets.length === 0 ? (
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
                  <Text style={styles.statusText}>
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
          
          {(user?.role === 'staff' || user?.role === 'admin') && (
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => router.push('/scanner')}
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
});
