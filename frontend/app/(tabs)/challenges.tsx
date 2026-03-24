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

interface Challenge {
  id: string;
  title: string;
  description: string;
  points: number;
  completed: boolean;
}

export default function ChallengesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const fetchChallenges = useCallback(async () => {
    try {
      const data = await api.getChallenges();
      setChallenges(data);
    } catch (error) {
      console.error('Error fetching challenges:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchChallenges();
  };

  const completeChallenge = async (challengeId: string) => {
    if (!user) {
      Alert.alert(
        'Giriş Gerekli',
        'Challenge tamamlamak için giriş yapmanız gerekiyor.',
        [
          { text: 'İptal', style: 'cancel' },
          { text: 'Giriş Yap', onPress: () => router.push('/(auth)/login') },
        ]
      );
      return;
    }

    setCompletingId(challengeId);
    try {
      const result = await api.completeChallenge(challengeId);
      Alert.alert(
        'Tebrikler!',
        `Challenge tamamlandı! +${result.points} puan kazandınız.\nYeni streak: ${result.new_streak} gün`
      );
      await fetchChallenges();
      await refreshUser();
    } catch (error: any) {
      Alert.alert('Hata', error.response?.data?.detail || 'Challenge tamamlanamadı');
    } finally {
      setCompletingId(null);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  const completedCount = challenges.filter((c) => c.completed).length;
  const totalPoints = challenges.filter((c) => c.completed).reduce((sum, c) => sum + c.points, 0);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a1a2e', '#16213e']}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Günlük Challenge</Text>
          {!user && (
            <TouchableOpacity
              style={styles.loginBadge}
              onPress={() => router.push('/(auth)/login')}
            >
              <Ionicons name="person" size={16} color="#fff" />
              <Text style={styles.loginBadgeText}>Giriş</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Streak Card */}
        <View style={styles.streakCard}>
          <LinearGradient
            colors={['#FF6B6B', '#FF8E53']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.streakGradient}
          >
            <View style={styles.streakContent}>
              <Ionicons name="flame" size={48} color="#fff" />
              <View style={styles.streakInfo}>
                <Text style={styles.streakNumber}>{user?.streak || 0}</Text>
                <Text style={styles.streakLabel}>Gün Streak</Text>
              </View>
            </View>
            <View style={styles.streakStats}>
              <View style={styles.streakStat}>
                <Text style={styles.streakStatNumber}>{completedCount}/{challenges.length}</Text>
                <Text style={styles.streakStatLabel}>Tamamlanan</Text>
              </View>
              <View style={styles.streakDivider} />
              <View style={styles.streakStat}>
                <Text style={styles.streakStatNumber}>{totalPoints}</Text>
                <Text style={styles.streakStatLabel}>Puan</Text>
              </View>
            </View>
          </LinearGradient>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B6B" />
        }
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Bugünkü Görevler</Text>
        
        {challenges.map((challenge) => (
          <View key={challenge.id} style={styles.challengeCard}>
            <View style={styles.challengeHeader}>
              <View style={[styles.challengeIcon, challenge.completed && styles.challengeIconCompleted]}>
                <Ionicons
                  name={challenge.completed ? 'checkmark' : 'flash'}
                  size={24}
                  color={challenge.completed ? '#fff' : '#FF6B6B'}
                />
              </View>
              <View style={styles.challengeInfo}>
                <Text style={styles.challengeTitle}>{challenge.title}</Text>
                <Text style={styles.challengeDescription}>{challenge.description}</Text>
              </View>
              <View style={styles.challengePoints}>
                <Text style={styles.pointsNumber}>+{challenge.points}</Text>
                <Text style={styles.pointsLabel}>puan</Text>
              </View>
            </View>
            
            {!challenge.completed && (
              <TouchableOpacity
                style={styles.completeButton}
                onPress={() => completeChallenge(challenge.id)}
                disabled={completingId === challenge.id}
              >
                {completingId === challenge.id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.completeButtonText}>
                      {user ? 'Tamamla' : 'Giriş Yap ve Tamamla'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            
            {challenge.completed && (
              <View style={styles.completedBadge}>
                <Ionicons name="checkmark-done" size={16} color="#4CAF50" />
                <Text style={styles.completedText}>Tamamlandı</Text>
              </View>
            )}
          </View>
        ))}

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
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  loginBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  loginBadgeText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
    marginLeft: 4,
  },
  streakCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  streakGradient: {
    padding: 20,
  },
  streakContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakInfo: {
    marginLeft: 16,
  },
  streakNumber: {
    fontSize: 48,
    fontWeight: '900',
    color: '#fff',
  },
  streakLabel: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: -4,
  },
  streakStats: {
    flexDirection: 'row',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  streakStat: {
    flex: 1,
    alignItems: 'center',
  },
  streakStatNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  streakStatLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  streakDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginTop: 24,
    marginBottom: 16,
  },
  challengeCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  challengeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,107,107,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  challengeIconCompleted: {
    backgroundColor: '#4CAF50',
  },
  challengeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  challengeDescription: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  challengePoints: {
    alignItems: 'center',
  },
  pointsNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFC107',
  },
  pointsLabel: {
    fontSize: 11,
    color: '#888',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 12,
  },
  completeButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    marginLeft: 6,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 12,
  },
  completedText: {
    color: '#4CAF50',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6,
  },
});
