import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/services/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  streak: number;
}

interface Event {
  id: string;
  title: string;
  city: string;
  date: string;
  price: number;
  capacity: number;
  tickets_sold: number;
}

interface Video {
  id: string;
  title: string;
  youtube_url: string;
  is_premium: boolean;
  is_daily: boolean;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  points: number;
}

type TabType = 'stats' | 'users' | 'events' | 'videos' | 'challenges' | 'notifications';

export default function AdminPanel() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, token, isLoading: authLoading } = useAuth();
  
  const [activeTab, setActiveTab] = useState<TabType>('stats');
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  // Data
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  
  // Modals
  const [showEventModal, setShowEventModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  
  // Form states
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    city: 'Istanbul',
    location: '',
    date: '',
    capacity: '',
    price: '',
    image_url: '',
  });
  
  const [videoForm, setVideoForm] = useState({
    title: '',
    youtube_url: '',
    is_premium: false,
    is_daily: false,
  });
  
  const [notificationForm, setNotificationForm] = useState({
    title: '',
    body: '',
  });

  const [challengeForm, setChallengeForm] = useState({
    title: '',
    description: '',
    points: '',
  });

  // Check admin access - only redirect after auth is loaded
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      const timer = setTimeout(() => {
        router.replace('/(tabs)/profile');
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [user, authLoading]);

  const fetchData = useCallback(async () => {
    if (!user || user.role !== 'admin' || !token) return;
    
    // Ensure token is set before making requests
    api.setAuthToken(token);
    
    setIsLoading(true);
    setFetchError(null);
    try {
      const [statsData, usersData, eventsData, videosData, challengesData] = await Promise.all([
        api.getAdminStats(),
        api.getAllUsers(),
        api.getEvents(),
        api.getVideos(),
        api.getChallenges(),
      ]);
      setStats(statsData);
      setUsers(usersData);
      setEvents(eventsData);
      setVideos(videosData);
      setChallenges(challengesData);
    } catch (error: any) {
      console.error('Error fetching admin data:', error);
      setFetchError(error.response?.data?.detail || 'Veriler yüklenemedi');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [user, token]);

  useEffect(() => {
    if (user && user.role === 'admin' && token) {
      fetchData();
    }
  }, [user, token, fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const confirmAction = (title: string, message: string, onConfirm: () => void) => {
    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n\n${message}`)) {
        onConfirm();
      }
    } else {
      Alert.alert(title, message, [
        { text: 'İptal', style: 'cancel' },
        { text: 'Onayla', style: 'destructive', onPress: onConfirm },
      ]);
    }
  };

  // Event handlers
  const handleCreateEvent = async () => {
    if (!eventForm.title || !eventForm.location || !eventForm.date) {
      showAlert('Hata', 'Lütfen gerekli alanları doldurun');
      return;
    }
    
    try {
      await api.createEvent({
        title: eventForm.title,
        description: eventForm.description || eventForm.title,
        city: eventForm.city,
        location: eventForm.location,
        date: new Date(eventForm.date).toISOString(),
        capacity: parseInt(eventForm.capacity) || 100,
        price: parseFloat(eventForm.price) || 0,
        image_url: eventForm.image_url || undefined,
      });
      showAlert('Başarılı', 'Etkinlik oluşturuldu');
      setShowEventModal(false);
      setEventForm({ title: '', description: '', city: 'Istanbul', location: '', date: '', capacity: '', price: '', image_url: '' });
      fetchData();
    } catch (error: any) {
      showAlert('Hata', error.response?.data?.detail || 'Etkinlik oluşturulamadı');
    }
  };

  const handleDeleteEvent = (eventId: string) => {
    confirmAction('Etkinliği Sil', 'Bu etkinliği silmek istediğinize emin misiniz?', async () => {
      try {
        await api.deleteEvent(eventId);
        fetchData();
      } catch (error) {
        showAlert('Hata', 'Etkinlik silinemedi');
      }
    });
  };

  const handleCreateVideo = async () => {
    if (!videoForm.title || !videoForm.youtube_url) {
      showAlert('Hata', 'Lütfen gerekli alanları doldurun');
      return;
    }
    
    try {
      // Extract video ID from YouTube URL to create thumbnail
      const videoId = videoForm.youtube_url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/)?.[1];
      const thumbnail = videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : undefined;
      
      await api.createVideo({
        title: videoForm.title,
        youtube_url: videoForm.youtube_url,
        thumbnail,
        is_premium: videoForm.is_premium,
        is_daily: videoForm.is_daily,
      });
      showAlert('Başarılı', 'Video eklendi');
      setShowVideoModal(false);
      setVideoForm({ title: '', youtube_url: '', is_premium: false, is_daily: false });
      fetchData();
    } catch (error: any) {
      showAlert('Hata', error.response?.data?.detail || 'Video eklenemedi');
    }
  };

  const handleDeleteVideo = (videoId: string) => {
    confirmAction('Videoyu Sil', 'Bu videoyu silmek istediğinize emin misiniz?', async () => {
      try {
        await api.deleteVideo(videoId);
        fetchData();
      } catch (error) {
        showAlert('Hata', 'Video silinemedi');
      }
    });
  };

  const handleSendNotification = async () => {
    if (!notificationForm.title || !notificationForm.body) {
      showAlert('Hata', 'Lütfen başlık ve içerik girin');
      return;
    }
    
    try {
      await api.sendNotification(notificationForm.title, notificationForm.body);
      showAlert('Başarılı', 'Bildirim gönderildi');
      setShowNotificationModal(false);
      setNotificationForm({ title: '', body: '' });
    } catch (error) {
      showAlert('Hata', 'Bildirim gönderilemedi');
    }
  };

  const handleChangeRole = async (newRole: string) => {
    if (!selectedUser) return;
    
    try {
      await api.setUserRole(selectedUser.id, newRole);
      showAlert('Başarılı', `Kullanıcı rolü ${newRole} olarak güncellendi`);
      setShowRoleModal(false);
      setSelectedUser(null);
      fetchData();
    } catch (error) {
      showAlert('Hata', 'Rol güncellenemedi');
    }
  };

  const handleDeleteUser = (userId: string) => {
    confirmAction('Kullanıcıyı Sil', 'Bu kullanıcıyı silmek istediğinize emin misiniz?', async () => {
      try {
        await api.deleteUser(userId);
        fetchData();
      } catch (error: any) {
        showAlert('Hata', error.response?.data?.detail || 'Kullanıcı silinemedi');
      }
    });
  };

  const handleCreateChallenge = async () => {
    if (!challengeForm.title || !challengeForm.description) {
      showAlert('Hata', 'Lütfen gerekli alanları doldurun');
      return;
    }
    
    try {
      await api.createChallenge({
        title: challengeForm.title,
        description: challengeForm.description,
        points: parseInt(challengeForm.points) || 10,
      });
      showAlert('Başarılı', 'Challenge oluşturuldu');
      setShowChallengeModal(false);
      setChallengeForm({ title: '', description: '', points: '' });
      fetchData();
    } catch (error: any) {
      showAlert('Hata', error.response?.data?.detail || 'Challenge oluşturulamadı');
    }
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setEventForm({
      title: event.title,
      description: '',
      city: event.city,
      location: '',
      date: event.date.split('T')[0],
      capacity: event.capacity.toString(),
      price: event.price.toString(),
      image_url: '',
    });
    setShowEventModal(true);
  };

  const handleUpdateEvent = async () => {
    if (!editingEvent) return;
    
    try {
      await api.updateEvent(editingEvent.id, {
        title: eventForm.title,
        description: eventForm.description || eventForm.title,
        city: eventForm.city,
        location: eventForm.location || eventForm.city,
        date: new Date(eventForm.date).toISOString(),
        capacity: parseInt(eventForm.capacity) || 100,
        price: parseFloat(eventForm.price) || 0,
        image_url: eventForm.image_url || undefined,
      });
      showAlert('Başarılı', 'Etkinlik güncellendi');
      setShowEventModal(false);
      setEditingEvent(null);
      setEventForm({ title: '', description: '', city: 'Istanbul', location: '', date: '', capacity: '', price: '', image_url: '' });
      fetchData();
    } catch (error: any) {
      showAlert('Hata', error.response?.data?.detail || 'Etkinlik güncellenemedi');
    }
  };

  const tabs: { id: TabType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'stats', label: 'İstatistik', icon: 'stats-chart' },
    { id: 'users', label: 'Kullanıcı', icon: 'people' },
    { id: 'events', label: 'Etkinlik', icon: 'calendar' },
    { id: 'videos', label: 'Video', icon: 'videocam' },
    { id: 'challenges', label: 'Challenge', icon: 'flash' },
    { id: 'notifications', label: 'Bildirim', icon: 'notifications' },
  ];

  const renderStats = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Genel İstatistikler</Text>
      {stats && (
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="people" size={28} color="#FF6B6B" />
            <Text style={styles.statNumber}>{stats.total_users}</Text>
            <Text style={styles.statLabel}>Kullanıcı</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="calendar" size={28} color="#4CAF50" />
            <Text style={styles.statNumber}>{stats.total_events}</Text>
            <Text style={styles.statLabel}>Etkinlik</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="ticket" size={28} color="#2196F3" />
            <Text style={styles.statNumber}>{stats.total_tickets}</Text>
            <Text style={styles.statLabel}>Bilet</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="checkmark-done" size={28} color="#9C27B0" />
            <Text style={styles.statNumber}>{stats.tickets_used}</Text>
            <Text style={styles.statLabel}>Kullanılan</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="chatbubbles" size={28} color="#FF9800" />
            <Text style={styles.statNumber}>{stats.total_posts}</Text>
            <Text style={styles.statLabel}>Paylaşım</Text>
          </View>
        </View>
      )}
    </View>
  );

  const renderUsers = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Kullanıcılar ({users.length})</Text>
      {users.map((u) => (
        <View key={u.id} style={styles.listItem}>
          <View style={styles.listItemInfo}>
            <Text style={styles.listItemTitle}>{u.name}</Text>
            <Text style={styles.listItemSubtitle}>{u.email}</Text>
            <View style={[styles.roleBadge, u.role === 'admin' && styles.adminBadge, u.role === 'staff' && styles.staffBadge]}>
              <Text style={styles.roleText}>{u.role === 'admin' ? 'Yönetici' : u.role === 'staff' ? 'Görevli' : 'Kullanıcı'}</Text>
            </View>
          </View>
          <View style={styles.listItemActions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                setSelectedUser(u);
                setShowRoleModal(true);
              }}
            >
              <Ionicons name="shield" size={20} color="#2196F3" />
            </TouchableOpacity>
            {u.role !== 'admin' && (
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleDeleteUser(u.id)}>
                <Ionicons name="trash" size={20} color="#f44336" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}
    </View>
  );

  const renderEvents = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Etkinlikler ({events.length})</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => {
          setEditingEvent(null);
          setEventForm({ title: '', description: '', city: 'Istanbul', location: '', date: '', capacity: '', price: '', image_url: '' });
          setShowEventModal(true);
        }}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      {events.map((event) => (
        <View key={event.id} style={styles.listItem}>
          <View style={styles.listItemInfo}>
            <Text style={styles.listItemTitle}>{event.title}</Text>
            <Text style={styles.listItemSubtitle}>{event.city} • ₺{event.price}</Text>
            <Text style={styles.listItemMeta}>{event.tickets_sold}/{event.capacity} bilet satıldı</Text>
          </View>
          <View style={styles.listItemActions}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleEditEvent(event)}>
              <Ionicons name="pencil" size={20} color="#2196F3" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleDeleteEvent(event.id)}>
              <Ionicons name="trash" size={20} color="#f44336" />
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );

  const renderVideos = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Videolar ({videos.length})</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowVideoModal(true)}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      {videos.map((video) => (
        <View key={video.id} style={styles.listItem}>
          <View style={styles.listItemInfo}>
            <Text style={styles.listItemTitle}>{video.title}</Text>
            <View style={styles.videoBadges}>
              {video.is_premium && (
                <View style={styles.premiumBadge}>
                  <Text style={styles.badgeText}>Premium</Text>
                </View>
              )}
              {video.is_daily && (
                <View style={styles.dailyBadge}>
                  <Text style={styles.badgeText}>Günlük</Text>
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleDeleteVideo(video.id)}>
            <Ionicons name="trash" size={20} color="#f44336" />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );

  const renderChallenges = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Challenges ({challenges.length})</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowChallengeModal(true)}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      {challenges.map((challenge) => (
        <View key={challenge.id} style={styles.listItem}>
          <View style={styles.listItemInfo}>
            <Text style={styles.listItemTitle}>{challenge.title}</Text>
            <Text style={styles.listItemSubtitle}>{challenge.description}</Text>
            <View style={styles.pointsBadge}>
              <Text style={styles.pointsText}>+{challenge.points} puan</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  const renderNotifications = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Bildirim Gönder</Text>
      <TouchableOpacity
        style={styles.sendNotificationBtn}
        onPress={() => setShowNotificationModal(true)}
      >
        <LinearGradient
          colors={['#FF6B6B', '#FF8E53']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.sendNotificationGradient}
        >
          <Ionicons name="notifications" size={24} color="#fff" />
          <Text style={styles.sendNotificationText}>Tüm Kullanıcılara Bildirim Gönder</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  if (authLoading || !user || user.role !== 'admin') {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a1a2e', '#16213e']}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Admin Panel</Text>
          <View style={{ width: 24 }} />
        </View>
      </LinearGradient>

      {/* Tabs - 2 rows for mobile */}
      <View style={styles.tabsWrapper}>
        <View style={styles.tabRow}>
          {tabs.slice(0, 3).map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.tabActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Ionicons
                name={tab.icon}
                size={18}
                color={activeTab === tab.id ? '#FF6B6B' : '#666'}
              />
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.tabRow}>
          {tabs.slice(3).map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.tabActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Ionicons
                name={tab.icon}
                size={18}
                color={activeTab === tab.id ? '#FF6B6B' : '#666'}
              />
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B6B" />
        }
      >
        {isLoading ? (
          <ActivityIndicator size="large" color="#FF6B6B" style={{ marginTop: 40 }} />
        ) : (
          <>
            {activeTab === 'stats' && renderStats()}
            {activeTab === 'users' && renderUsers()}
            {activeTab === 'events' && renderEvents()}
            {activeTab === 'videos' && renderVideos()}
            {activeTab === 'challenges' && renderChallenges()}
            {activeTab === 'notifications' && renderNotifications()}
          </>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Event Modal */}
      <Modal visible={showEventModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingEvent ? 'Etkinlik Düzenle' : 'Yeni Etkinlik'}</Text>
            <ScrollView style={styles.modalScroll}>
              <TextInput
                style={styles.input}
                placeholder="Etkinlik Adı"
                placeholderTextColor="#666"
                value={eventForm.title}
                onChangeText={(t) => setEventForm({ ...eventForm, title: t })}
              />
              <TextInput
                style={styles.input}
                placeholder="Açıklama"
                placeholderTextColor="#666"
                value={eventForm.description}
                onChangeText={(t) => setEventForm({ ...eventForm, description: t })}
                multiline
              />
              <TextInput
                style={styles.input}
                placeholder="Şehir"
                placeholderTextColor="#666"
                value={eventForm.city}
                onChangeText={(t) => setEventForm({ ...eventForm, city: t })}
              />
              <TextInput
                style={styles.input}
                placeholder="Konum"
                placeholderTextColor="#666"
                value={eventForm.location}
                onChangeText={(t) => setEventForm({ ...eventForm, location: t })}
              />
              <TextInput
                style={styles.input}
                placeholder="Tarih (YYYY-MM-DD)"
                placeholderTextColor="#666"
                value={eventForm.date}
                onChangeText={(t) => setEventForm({ ...eventForm, date: t })}
              />
              <TextInput
                style={styles.input}
                placeholder="Kapasite"
                placeholderTextColor="#666"
                value={eventForm.capacity}
                onChangeText={(t) => setEventForm({ ...eventForm, capacity: t })}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                placeholder="Fiyat (₺)"
                placeholderTextColor="#666"
                value={eventForm.price}
                onChangeText={(t) => setEventForm({ ...eventForm, price: t })}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                placeholder="Görsel URL (opsiyonel)"
                placeholderTextColor="#666"
                value={eventForm.image_url}
                onChangeText={(t) => setEventForm({ ...eventForm, image_url: t })}
              />
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => {
                setShowEventModal(false);
                setEditingEvent(null);
              }}>
                <Text style={styles.cancelBtnText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={editingEvent ? handleUpdateEvent : handleCreateEvent}>
                <Text style={styles.saveBtnText}>{editingEvent ? 'Güncelle' : 'Oluştur'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Video Modal */}
      <Modal visible={showVideoModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Yeni Video</Text>
            <TextInput
              style={styles.input}
              placeholder="Video Başlığı"
              placeholderTextColor="#666"
              value={videoForm.title}
              onChangeText={(t) => setVideoForm({ ...videoForm, title: t })}
            />
            <TextInput
              style={styles.input}
              placeholder="YouTube URL"
              placeholderTextColor="#666"
              value={videoForm.youtube_url}
              onChangeText={(t) => setVideoForm({ ...videoForm, youtube_url: t })}
            />
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setVideoForm({ ...videoForm, is_premium: !videoForm.is_premium })}
            >
              <Ionicons
                name={videoForm.is_premium ? 'checkbox' : 'square-outline'}
                size={24}
                color="#FF6B6B"
              />
              <Text style={styles.checkboxLabel}>Premium Video</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setVideoForm({ ...videoForm, is_daily: !videoForm.is_daily })}
            >
              <Ionicons
                name={videoForm.is_daily ? 'checkbox' : 'square-outline'}
                size={24}
                color="#FF6B6B"
              />
              <Text style={styles.checkboxLabel}>Günün Videosu</Text>
            </TouchableOpacity>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowVideoModal(false)}>
                <Text style={styles.cancelBtnText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleCreateVideo}>
                <Text style={styles.saveBtnText}>Ekle</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Notification Modal */}
      <Modal visible={showNotificationModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Bildirim Gönder</Text>
            <TextInput
              style={styles.input}
              placeholder="Bildirim Başlığı"
              placeholderTextColor="#666"
              value={notificationForm.title}
              onChangeText={(t) => setNotificationForm({ ...notificationForm, title: t })}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Bildirim İçeriği"
              placeholderTextColor="#666"
              value={notificationForm.body}
              onChangeText={(t) => setNotificationForm({ ...notificationForm, body: t })}
              multiline
              numberOfLines={4}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowNotificationModal(false)}>
                <Text style={styles.cancelBtnText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSendNotification}>
                <Text style={styles.saveBtnText}>Gönder</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Role Modal */}
      <Modal visible={showRoleModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rol Değiştir</Text>
            <Text style={styles.modalSubtitle}>{selectedUser?.name} - {selectedUser?.email}</Text>
            <TouchableOpacity style={styles.roleOption} onPress={() => handleChangeRole('user')}>
              <Ionicons name="person" size={24} color="#4CAF50" />
              <Text style={styles.roleOptionText}>Kullanıcı</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.roleOption} onPress={() => handleChangeRole('staff')}>
              <Ionicons name="shield-checkmark" size={24} color="#2196F3" />
              <Text style={styles.roleOptionText}>Görevli (QR Tarayabilir)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.roleOption} onPress={() => handleChangeRole('admin')}>
              <Ionicons name="shield" size={24} color="#FF6B6B" />
              <Text style={styles.roleOptionText}>Yönetici</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtnFull} onPress={() => setShowRoleModal(false)}>
              <Text style={styles.cancelBtnText}>İptal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Challenge Modal */}
      <Modal visible={showChallengeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Yeni Challenge</Text>
            <TextInput
              style={styles.input}
              placeholder="Challenge Başlığı"
              placeholderTextColor="#666"
              value={challengeForm.title}
              onChangeText={(t) => setChallengeForm({ ...challengeForm, title: t })}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Açıklama"
              placeholderTextColor="#666"
              value={challengeForm.description}
              onChangeText={(t) => setChallengeForm({ ...challengeForm, description: t })}
              multiline
              numberOfLines={3}
            />
            <TextInput
              style={styles.input}
              placeholder="Puan"
              placeholderTextColor="#666"
              value={challengeForm.points}
              onChangeText={(t) => setChallengeForm({ ...challengeForm, points: t })}
              keyboardType="numeric"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowChallengeModal(false)}>
                <Text style={styles.cancelBtnText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleCreateChallenge}>
                <Text style={styles.saveBtnText}>Oluştur</Text>
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
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  tabsContainer: {
    maxHeight: 60,
    backgroundColor: '#1a1a2e',
  },
  tabsContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tabsWrapper: {
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 6,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginHorizontal: 2,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  tabActive: {
    backgroundColor: 'rgba(255,107,107,0.2)',
  },
  tabText: {
    color: '#666',
    marginLeft: 4,
    fontSize: 11,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#FF6B6B',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '47%',
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
  },
  listItem: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  listItemInfo: {
    flex: 1,
  },
  listItemTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  listItemSubtitle: {
    color: '#888',
    fontSize: 13,
    marginTop: 2,
  },
  listItemMeta: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
  listItemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleBadge: {
    backgroundColor: 'rgba(76,175,80,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  adminBadge: {
    backgroundColor: 'rgba(255,107,107,0.2)',
  },
  staffBadge: {
    backgroundColor: 'rgba(33,150,243,0.2)',
  },
  roleText: {
    color: '#4CAF50',
    fontSize: 11,
    fontWeight: '600',
  },
  pointsBadge: {
    backgroundColor: 'rgba(255,193,7,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  pointsText: {
    color: '#FFC107',
    fontSize: 11,
    fontWeight: '600',
  },
  videoBadges: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  premiumBadge: {
    backgroundColor: 'rgba(255,193,7,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  dailyBadge: {
    backgroundColor: 'rgba(76,175,80,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  sendNotificationBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  sendNotificationGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  sendNotificationText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalScroll: {
    maxHeight: 300,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 16,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  checkboxLabel: {
    color: '#fff',
    fontSize: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtnFull: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  cancelBtnText: {
    color: '#888',
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#FF6B6B',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  roleOptionText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
});
