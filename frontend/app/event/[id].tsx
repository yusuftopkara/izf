import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { api } from '../../src/services/api';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import PaymentModal from '../../components/PaymentModal';

interface Event {
  id: string;
  title: string;
  description: string;
  city: string;
  location: string;
  date: string;
  capacity: number;
  price: number;
  image_url: string | null;
  tickets_sold: number;
}

interface Comment {
  id: string;
  user_name: string;
  text: string;
  rating: number;
  created_at: string;
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuying, setIsBuying] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentRating, setCommentRating] = useState(5);
  const [isCommenting, setIsCommenting] = useState(false);

  const fetchEvent = useCallback(async () => {
    try {
      const [eventData, commentsData] = await Promise.all([
        api.getEvent(id as string),
        api.getComments(id as string),
      ]);
      setEvent(eventData);
      setComments(commentsData);
    } catch (error) {
      console.error('Error fetching event:', error);
      Alert.alert('Hata', 'Etkinlik yüklenemedi');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  const handleBuyTicket = async () => {
    console.log('handleBuyTicket called, user:', user ? user.email : 'null');
    
    if (!user) {
      Alert.alert('Giriş Gerekli', 'Bilet almak için giriş yapmanız gerekiyor.', [
        { text: 'İptal', style: 'cancel' },
        { text: 'Giriş Yap', onPress: () => router.push('/(auth)/login') },
      ]);
      return;
    }

    // Open payment modal instead of direct purchase
    console.log('Opening payment modal...');
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = (tickets: any[]) => {
    setShowPaymentModal(false);
    Alert.alert(
      'Başarılı!',
      `${tickets.length} adet bilet satın alındı. Biletlerinizi Profil sayfasında görebilirsiniz.`,
      [
        { text: 'Tamam' },
        { text: 'Biletlerime Git', onPress: () => router.push('/(tabs)/profile') },
      ]
    );
    fetchEvent();
  };

  const handleAddComment = () => {
    if (!user) {
      Alert.alert('Giriş Gerekli', 'Yorum yapmak için giriş yapmanız gerekiyor.', [
        { text: 'İptal', style: 'cancel' },
        { text: 'Giriş Yap', onPress: () => router.push('/(auth)/login') },
      ]);
      return;
    }
    setShowCommentForm(!showCommentForm);
  };

  const handleComment = async () => {
    if (!commentText.trim()) {
      Alert.alert('Hata', 'Lütfen bir yorum yazın');
      return;
    }

    setIsCommenting(true);
    try {
      await api.createComment(id as string, commentText.trim(), commentRating);
      setCommentText('');
      setCommentRating(5);
      setShowCommentForm(false);
      fetchEvent();
    } catch (error: any) {
      Alert.alert('Hata', error.response?.data?.detail || 'Yorum eklenemedi');
    } finally {
      setIsCommenting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'd MMMM yyyy, EEEE HH:mm', { locale: tr });
    } catch {
      return dateStr;
    }
  };

  if (isLoading || !event) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  const availableTickets = event.capacity - event.tickets_sold;

  return (
    <View style={styles.container}>
      {/* Header Image */}
      <Image
        source={{ uri: event.image_url || 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800' }}
        style={styles.headerImage}
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)', '#0a0a0a']}
        style={styles.headerOverlay}
      />
      
      {/* Back Button */}
      <TouchableOpacity
        style={[styles.backButton, { top: insets.top + 10 }]}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.eventInfo}>
          <View style={styles.cityBadge}>
            <Ionicons name="location" size={14} color="#fff" />
            <Text style={styles.cityBadgeText}>{event.city}</Text>
          </View>
          
          <Text style={styles.eventTitle}>{event.title}</Text>
          
          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Ionicons name="calendar" size={18} color="#FF6B6B" />
              <Text style={styles.detailText}>{formatDate(event.date)}</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="location-outline" size={18} color="#FF6B6B" />
              <Text style={styles.detailText}>{event.location}</Text>
            </View>
          </View>

          <Text style={styles.description}>{event.description}</Text>

          {/* Capacity Info */}
          <View style={styles.capacityCard}>
            <View style={styles.capacityInfo}>
              <Ionicons name="people" size={24} color="#4CAF50" />
              <View style={styles.capacityTextContainer}>
                <Text style={styles.capacityNumber}>{availableTickets}</Text>
                <Text style={styles.capacityLabel}>/ {event.capacity} koltuk müsait</Text>
              </View>
            </View>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${(event.tickets_sold / event.capacity) * 100}%` }
                ]} 
              />
            </View>
          </View>

          {/* Quantity Selector */}
          {availableTickets > 0 && (
            <View style={styles.quantitySection}>
              <Text style={styles.quantityLabel}>Bilet Adedi</Text>
              <View style={styles.quantitySelector}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  <Ionicons name="remove" size={20} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.quantityText}>{quantity}</Text>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => setQuantity(Math.min(availableTickets, quantity + 1))}
                >
                  <Ionicons name="add" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Comments Section */}
          <View style={styles.commentsSection}>
            <View style={styles.commentHeader}>
              <Text style={styles.sectionTitle}>Yorumlar ({comments.length})</Text>
              <TouchableOpacity onPress={handleAddComment}>
                <Ionicons name={showCommentForm ? 'close' : 'add-circle'} size={24} color="#FF6B6B" />
              </TouchableOpacity>
            </View>

            {showCommentForm && (
              <View style={styles.commentForm}>
                <View style={styles.ratingRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => setCommentRating(star)}>
                      <Ionicons
                        name={star <= commentRating ? 'star' : 'star-outline'}
                        size={28}
                        color="#FFC107"
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Yorumunuzu yazın..."
                  placeholderTextColor="#666"
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                />
                <TouchableOpacity
                  style={styles.submitCommentButton}
                  onPress={handleComment}
                  disabled={isCommenting}
                >
                  {isCommenting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.submitCommentText}>Gönder</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {comments.map((comment) => (
              <View key={comment.id} style={styles.commentCard}>
                <View style={styles.commentTop}>
                  <Text style={styles.commentUser}>{comment.user_name}</Text>
                  <View style={styles.ratingDisplay}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Ionicons
                        key={star}
                        name={star <= comment.rating ? 'star' : 'star-outline'}
                        size={14}
                        color="#FFC107"
                      />
                    ))}
                  </View>
                </View>
                <Text style={styles.commentText}>{comment.text}</Text>
              </View>
            ))}
          </View>
        </View>
        
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Buy Button */}
      <View style={[styles.buySection, { paddingBottom: insets.bottom + 10 }]}>
        <View style={styles.priceContainer}>
          <Text style={styles.totalLabel}>Toplam</Text>
          <Text style={styles.totalPrice}>₺{(event.price * quantity).toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.buyButton, availableTickets === 0 && styles.buyButtonDisabled]}
          onPress={handleBuyTicket}
          disabled={availableTickets === 0 || isBuying}
        >
          <LinearGradient
            colors={availableTickets === 0 ? ['#666', '#444'] : ['#FF6B6B', '#FF8E53']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buyButtonGradient}
          >
            {isBuying ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buyButtonText}>
                {availableTickets === 0 ? 'Tükenmiş' : (user ? 'Bilet Al' : 'Giriş Yap ve Al')}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Payment Modal */}
      {event && (
        <PaymentModal
          visible={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
          event={{
            id: event.id,
            title: event.title,
            price: event.price,
          }}
          quantity={quantity}
          user={user ? {
            id: user.id,
            email: user.email,
            name: user.name,
          } : { id: '', email: '', name: '' }}
        />
      )}
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
  headerImage: {
    width: '100%',
    height: 300,
    position: 'absolute',
    top: 0,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 350,
  },
  backButton: {
    position: 'absolute',
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  content: {
    flex: 1,
    marginTop: 250,
  },
  eventInfo: {
    padding: 20,
  },
  cityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  cityBadgeText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 4,
  },
  eventTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginTop: 12,
  },
  detailsRow: {
    marginTop: 16,
    gap: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    color: '#ccc',
    marginLeft: 8,
    fontSize: 14,
  },
  description: {
    color: '#888',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 20,
  },
  capacityCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
  },
  capacityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  capacityTextContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginLeft: 12,
  },
  capacityNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4CAF50',
  },
  capacityLabel: {
    color: '#888',
    marginLeft: 4,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    marginTop: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF6B6B',
    borderRadius: 3,
  },
  quantitySection: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 4,
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginHorizontal: 20,
  },
  commentsSection: {
    marginTop: 24,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  commentForm: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 12,
  },
  commentInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitCommentButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  submitCommentText: {
    color: '#fff',
    fontWeight: '700',
  },
  commentCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  commentTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentUser: {
    color: '#fff',
    fontWeight: '600',
  },
  ratingDisplay: {
    flexDirection: 'row',
  },
  commentText: {
    color: '#ccc',
    fontSize: 14,
  },
  buySection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#2a2a4e',
  },
  priceContainer: {
    marginRight: 16,
  },
  totalLabel: {
    color: '#888',
    fontSize: 12,
  },
  totalPrice: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  buyButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  buyButtonDisabled: {
    opacity: 0.5,
  },
  buyButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  buyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
