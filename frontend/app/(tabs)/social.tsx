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
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import { api } from '../../src/services/api';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface Post {
  id: string;
  user_id: string;
  user_name: string;
  media_url: string;
  caption: string;
  likes: number;
  liked_by_me: boolean;
  created_at: string;
}

export default function SocialScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newCaption, setNewCaption] = useState('');
  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  const fetchPosts = useCallback(async () => {
    try {
      const data = await api.getPosts();
      setPosts(data);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  const handleLike = async (postId: string) => {
    try {
      const result = await api.likePost(postId);
      setPosts(posts.map(p => 
        p.id === postId 
          ? { ...p, likes: result.likes, liked_by_me: result.liked }
          : p
      ));
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleCreatePost = async () => {
    if (!newCaption.trim()) {
      Alert.alert('Hata', 'Lütfen bir açıklama yazın');
      return;
    }

    setIsPosting(true);
    try {
      const mediaUrl = newMediaUrl.trim() || 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800';
      await api.createPost(mediaUrl, newCaption.trim());
      setShowNewPost(false);
      setNewCaption('');
      setNewMediaUrl('');
      await fetchPosts();
      Alert.alert('Başarılı', 'Paylaşımınız yayınlandı!');
    } catch (error: any) {
      Alert.alert('Hata', error.response?.data?.detail || 'Paylaşım yapılamadı');
    } finally {
      setIsPosting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'd MMM', { locale: tr });
    } catch {
      return '';
    }
  };

  if (isLoading) {
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
          <Text style={styles.headerTitle}>Topluluk</Text>
          {user && (
            <TouchableOpacity
              style={styles.newPostButton}
              onPress={() => setShowNewPost(true)}
            >
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B6B" />
        }
        showsVerticalScrollIndicator={false}
      >
        {posts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="images-outline" size={64} color="#444" />
            <Text style={styles.emptyText}>Henüz paylaşım yok</Text>
            <Text style={styles.emptySubtext}>İlk paylaşımı sen yap!</Text>
          </View>
        ) : (
          posts.map((post) => (
            <View key={post.id} style={styles.postCard}>
              <View style={styles.postHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{post.user_name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.postUserInfo}>
                  <Text style={styles.userName}>{post.user_name}</Text>
                  <Text style={styles.postDate}>{formatDate(post.created_at)}</Text>
                </View>
              </View>
              
              <Image source={{ uri: post.media_url }} style={styles.postImage} />
              
              <View style={styles.postActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleLike(post.id)}
                >
                  <Ionicons
                    name={post.liked_by_me ? 'heart' : 'heart-outline'}
                    size={26}
                    color={post.liked_by_me ? '#FF6B6B' : '#fff'}
                  />
                  <Text style={styles.actionCount}>{post.likes}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <Ionicons name="chatbubble-outline" size={24} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <Ionicons name="share-outline" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.postCaption}>
                <Text style={styles.captionUser}>{post.user_name}</Text>
                <Text style={styles.captionText}>{post.caption}</Text>
              </View>
            </View>
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* New Post Modal */}
      <Modal
        visible={showNewPost}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNewPost(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingTop: insets.top + 20 }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowNewPost(false)}>
                <Text style={styles.cancelButton}>İptal</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Yeni Paylaşım</Text>
              <TouchableOpacity onPress={handleCreatePost} disabled={isPosting}>
                {isPosting ? (
                  <ActivityIndicator size="small" color="#FF6B6B" />
                ) : (
                  <Text style={styles.shareButton}>Paylaş</Text>
                )}
              </TouchableOpacity>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Görsel URL (isteğe bağlı)</Text>
              <TextInput
                style={styles.input}
                placeholder="https://..."
                placeholderTextColor="#666"
                value={newMediaUrl}
                onChangeText={setNewMediaUrl}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Açıklama</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Ne düşünüyorsun?"
                placeholderTextColor="#666"
                value={newCaption}
                onChangeText={setNewCaption}
                multiline
                numberOfLines={4}
              />
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  newPostButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    color: '#666',
    fontSize: 18,
    marginTop: 16,
  },
  emptySubtext: {
    color: '#444',
    fontSize: 14,
    marginTop: 4,
  },
  postCard: {
    backgroundColor: '#1a1a2e',
    marginBottom: 1,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  postUserInfo: {
    marginLeft: 12,
  },
  userName: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  postDate: {
    color: '#666',
    fontSize: 12,
  },
  postImage: {
    width: '100%',
    height: 300,
  },
  postActions: {
    flexDirection: 'row',
    padding: 12,
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionCount: {
    color: '#fff',
    marginLeft: 4,
    fontSize: 14,
  },
  postCaption: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  captionUser: {
    color: '#fff',
    fontWeight: '600',
    marginRight: 6,
  },
  captionText: {
    color: '#ccc',
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  cancelButton: {
    color: '#888',
    fontSize: 16,
  },
  shareButton: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '700',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    color: '#888',
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
});
