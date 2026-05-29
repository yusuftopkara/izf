import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { useLocale } from '../../src/context/LocaleContext';
import { api } from '../../src/services/api';

const { width } = Dimensions.get('window');

interface Video {
  id: string;
  title: string;
  youtube_url: string;
  thumbnail: string | null;
  is_premium: boolean;
  is_daily: boolean;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { locale, setLocale, t } = useLocale();
  const [dailyVideo, setDailyVideo] = useState<Video | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [dailyRes, videosRes] = await Promise.all([
        api.getDailyVideo(),
        api.getVideos(),
      ]);
      setDailyVideo(dailyRes);
      setVideos(videosRes.filter((v: Video) => !v.is_daily));
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const openVideo = (video: Video) => {
    if (video.is_premium && !user) {
      Alert.alert(
        t('home.premiumContent'),
        t('home.premiumPrompt'),
        [
          { text: t('home.cancel'), style: 'cancel' },
          { text: t('nav.login'), onPress: () => router.push('/(auth)/login') },
        ]
      );
      return;
    }
    router.push(`/video/${video.id}`);
  };

  const getYoutubeThumbnail = (url: string) => {
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/)?.[1];
    return videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null;
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#E91E8C" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a0a2e', '#16213e']}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>{t('nav.videos')}</Text>
          <View style={styles.headerButtons}>
            <View style={styles.langSwitcher}>
              <TouchableOpacity
                style={[styles.langBtn, locale === 'tr' && styles.langBtnActive]}
                onPress={() => setLocale('tr')}
              >
                <Text style={[styles.langBtnText, locale === 'tr' && styles.langBtnTextActive]}>TR</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.langBtn, locale === 'en' && styles.langBtnActive]}
                onPress={() => setLocale('en')}
              >
                <Text style={[styles.langBtnText, locale === 'en' && styles.langBtnTextActive]}>EN</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => router.push('/ticket-lookup')}
            >
              <Ionicons name="qr-code-outline" size={16} color="#FF8E53" />
              <Text style={styles.headerBtnText}>{t('nav.ticketLookup')}</Text>
            </TouchableOpacity>
            {!user ? (
              <>
                <TouchableOpacity
                  style={styles.loginBadge}
                  onPress={() => router.push('/(auth)/login')}
                >
                  <Ionicons name="person" size={16} color="#fff" />
                  <Text style={styles.loginBadgeText}>{t('nav.login')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.loginBadge, { backgroundColor: '#E91E8C' }]}
                  onPress={() => router.push('/(auth)/register')}
                >
                  <Ionicons name="person-add" size={16} color="#fff" />
                  <Text style={styles.loginBadgeText}>{t('nav.register')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.streakBadge}>
                <Ionicons name="flame" size={20} color="#E91E8C" />
                <Text style={styles.streakText}>{user.streak || 0}</Text>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E91E8C" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Daily Video */}
        {dailyVideo && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('home.dailyVideo')}</Text>
            <TouchableOpacity
              style={styles.dailyVideoCard}
              onPress={() => openVideo(dailyVideo)}
            >
              <Image
                source={{ uri: dailyVideo.thumbnail || getYoutubeThumbnail(dailyVideo.youtube_url) || 'https://via.placeholder.com/400x225' }}
                style={styles.dailyVideoImage}
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={styles.dailyVideoOverlay}
              >
                <View style={styles.playButton}>
                  <Ionicons name="play" size={32} color="#fff" />
                </View>
                <Text style={styles.dailyVideoTitle}>{dailyVideo.title}</Text>
              </LinearGradient>
              <View style={styles.dailyBadge}>
                <Ionicons name="star" size={14} color="#FFC107" />
                <Text style={styles.dailyBadgeText}>{t('home.daily')}</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Video List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('home.allVideos')}</Text>
          {videos.map((video) => (
            <TouchableOpacity
              key={video.id}
              style={styles.videoCard}
              onPress={() => openVideo(video)}
            >
              <Image
                source={{ uri: video.thumbnail || getYoutubeThumbnail(video.youtube_url) || 'https://via.placeholder.com/120x68' }}
                style={styles.videoThumbnail}
              />
              <View style={styles.videoInfo}>
                <Text style={styles.videoTitle} numberOfLines={2}>{video.title}</Text>
                {video.is_premium && (
                  <View style={styles.premiumBadge}>
                    <Ionicons name="diamond" size={12} color="#FFC107" />
                    <Text style={styles.premiumText}>{t('home.premium')}</Text>
                  </View>
                )}
              </View>
              <Ionicons name="play-circle" size={36} color="#E91E8C" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a0a2e',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoContainer: {
    marginRight: 12,
  },
  logoGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
  },
  greeting: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  subtitle: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,107,107,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  streakText: {
    color: '#E91E8C',
    fontWeight: '700',
    fontSize: 16,
    marginLeft: 4,
  },
  loginBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E91E8C',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  loginBadgeText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  dailyVideoCard: {
    borderRadius: 16,
    overflow: 'hidden',
    height: 200,
  },
  dailyVideoImage: {
    width: '100%',
    height: '100%',
  },
  dailyVideoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    justifyContent: 'flex-end',
    padding: 16,
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -30 }, { translateY: -50 }],
    backgroundColor: 'rgba(255,107,107,0.9)',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dailyVideoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  dailyBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dailyBadgeText: {
    color: '#FFC107',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  videoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a0a2e',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  videoThumbnail: {
    width: 120,
    height: 68,
    borderRadius: 8,
  },
  videoInfo: {
    flex: 1,
    marginLeft: 12,
  },
  videoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  premiumText: {
    color: '#FFC107',
    fontSize: 12,
    marginLeft: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    maxWidth: '70%',
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,142,83,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,142,83,0.3)',
    gap: 4,
  },
  headerBtnText: {
    color: '#FF8E53',
    fontSize: 12,
    fontWeight: '600',
  },
  langSwitcher: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    overflow: 'hidden',
  },
  langBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  langBtnActive: {
    backgroundColor: '#E91E8C',
  },
  langBtnText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '700',
  },
  langBtnTextActive: {
    color: '#fff',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
});

