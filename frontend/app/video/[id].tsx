import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import YoutubePlayer from 'react-native-youtube-iframe';
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

export default function VideoPlayerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [video, setVideo] = useState<Video | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVideo = useCallback(async () => {
    try {
      const videos = await api.getVideos();
      const found = videos.find((v: Video) => v.id === id);
      if (found) {
        setVideo(found);
      } else {
        setError('Video bulunamadı');
      }
    } catch (err) {
      setError('Video yüklenirken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchVideo();
  }, [fetchVideo]);

  const getYoutubeVideoId = (url: string): string | null => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
    return match ? match[1] : null;
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#E91E8C" />
      </View>
    );
  }

  if (error || !video) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Ionicons name="alert-circle" size={64} color="#E91E8C" />
        <Text style={styles.errorText}>{error || 'Video bulunamadı'}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const videoId = getYoutubeVideoId(video.youtube_url);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#2d0a4e', '#1a0a2e']}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {video.title}
          </Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content}>
        <View style={styles.playerContainer}>
          {videoId ? (
            Platform.OS === 'web' ? (
              <View style={{ width: '100%', height: width * 9 / 16 }}>
                {/* @ts-ignore */}
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ border: 'none' }}
                />
              </View>
            ) : (
              <YoutubePlayer
                height={width * 9 / 16}
                width={width}
                videoId={videoId}
                play={true}
              />
            )
          ) : (
            <View style={[styles.playerPlaceholder, { height: width * 9 / 16 }]}>
              <Ionicons name="play-circle" size={64} color="#E91E8C" />
              <Text style={styles.placeholderText}>Video yüklenemedi</Text>
            </View>
          )}
        </View>

        <View style={styles.videoInfo}>
          <View style={styles.titleRow}>
            <Text style={styles.videoTitle}>{video.title}</Text>
          </View>

          <View style={styles.badgeRow}>
            {video.is_premium && (
              <View style={styles.premiumBadge}>
                <Ionicons name="diamond" size={14} color="#FFC107" />
                <Text style={styles.premiumText}>Premium</Text>
              </View>
            )}
            {video.is_daily && (
              <View style={styles.dailyBadge}>
                <Ionicons name="star" size={14} color="#4CAF50" />
                <Text style={styles.dailyText}>Günlük Video</Text>
              </View>
            )}
          </View>

          <View style={styles.relatedSection}>
            <Text style={styles.sectionTitle}>Diğer Videolar</Text>
            <TouchableOpacity
              style={styles.moreVideosButton}
              onPress={() => router.push('/(tabs)/home')}
            >
              <Text style={styles.moreVideosText}>Tüm Videolara Git</Text>
              <Ionicons name="arrow-forward" size={20} color="#E91E8C" />
            </TouchableOpacity>
          </View>
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
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginHorizontal: 10,
  },
  content: {
    flex: 1,
  },
  playerContainer: {
    backgroundColor: '#000',
  },
  playerPlaceholder: {
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#888',
    marginTop: 10,
    fontSize: 14,
  },
  videoInfo: {
    padding: 20,
  },
  titleRow: {
    marginBottom: 12,
  },
  videoTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,193,7,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  premiumText: {
    color: '#FFC107',
    fontSize: 13,
    fontWeight: '600',
  },
  dailyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76,175,80,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  dailyText: {
    color: '#4CAF50',
    fontSize: 13,
    fontWeight: '600',
  },
  relatedSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  moreVideosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,107,107,0.1)',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  moreVideosText: {
    color: '#E91E8C',
    fontSize: 15,
    fontWeight: '600',
  },
  errorText: {
    color: '#888',
    fontSize: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#E91E8C',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});