import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../src/services/api';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import QRCode from 'react-native-qrcode-svg';

interface Ticket {
  id: string;
  event_id: string;
  event_title: string;
  event_date: string;
  event_location: string;
  qr_token: string;
  status: string;
}

export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTicket();
  }, [id]);

  const fetchTicket = async () => {
    try {
      const tickets = await api.getMyTickets();
      const foundTicket = tickets.find((t: Ticket) => t.id === id);
      setTicket(foundTicket || null);
    } catch (error) {
      console.error('Error fetching ticket:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'd MMMM yyyy, HH:mm', { locale: tr });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#E91E8C" />
      </View>
    );
  }

  if (!ticket) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>Bilet bulunamadı</Text>
        <TouchableOpacity style={styles.backButtonAlt} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isUsed = ticket.status === 'USED';

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#2d0a4e', '#1a0a2e', '#0f3460']}
        style={[styles.gradient, { paddingTop: insets.top }]}
      >
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>

        <View style={styles.ticketCard}>
          <View style={styles.ticketTop}>
            <View style={[styles.statusBadge, isUsed && styles.statusUsed]}>
              <Ionicons 
                name={isUsed ? 'checkmark-done' : 'ticket'} 
                size={16} 
                color={isUsed ? '#9e9e9e' : '#4CAF50'} 
              />
              <Text style={[styles.statusText, isUsed && styles.statusTextUsed]}>
                {isUsed ? 'Kullanıldı' : 'Geçerli'}
              </Text>
            </View>
            
            <Text style={styles.eventTitle}>{ticket.event_title}</Text>
            
            <View style={styles.eventDetails}>
              <View style={styles.eventDetail}>
                <Ionicons name="calendar-outline" size={18} color="#E91E8C" />
                <Text style={styles.eventDetailText}>{formatDate(ticket.event_date)}</Text>
              </View>
              <View style={styles.eventDetail}>
                <Ionicons name="location-outline" size={18} color="#E91E8C" />
                <Text style={styles.eventDetailText}>{ticket.event_location}</Text>
              </View>
            </View>
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerCircleLeft} />
            <View style={styles.dividerLine} />
            <View style={styles.dividerCircleRight} />
          </View>

          <View style={styles.ticketBottom}>
            <View style={[styles.qrContainer, isUsed && styles.qrContainerUsed]}>
              <QRCode
                value={ticket.qr_token}
                size={200}
                color={isUsed ? '#666' : '#000'}
                backgroundColor="#fff"
              />
              {isUsed && (
                <View style={styles.usedOverlay}>
                  <Ionicons name="checkmark-circle" size={80} color="rgba(76,175,80,0.8)" />
                </View>
              )}
            </View>
            
            <Text style={styles.qrHint}>
              {isUsed 
                ? 'Bu bilet kullanılmıştır' 
                : 'Girişte bu QR kodu gösterin'
              }
            </Text>
          </View>
        </View>

        <View style={styles.instructions}>
          <View style={styles.instructionItem}>
            <Ionicons name="information-circle" size={20} color="#E91E8C" />
            <Text style={styles.instructionText}>
              Etkinlik girişinde bu ekranı görevliye gösterin
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <Ionicons name="time-outline" size={20} color="#E91E8C" />
            <Text style={styles.instructionText}>
              Etkinlik başlamadan 30 dakika önce orada olun
            </Text>
          </View>
        </View>
      </LinearGradient>
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
  gradient: {
    flex: 1,
    padding: 20,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 8,
  },
  ticketCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginTop: 20,
    overflow: 'hidden',
  },
  ticketTop: {
    padding: 24,
    backgroundColor: '#1a1a2e',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76,175,80,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  statusUsed: {
    backgroundColor: 'rgba(158,158,158,0.2)',
  },
  statusText: {
    color: '#4CAF50',
    fontWeight: '600',
    marginLeft: 4,
  },
  statusTextUsed: {
    color: '#9e9e9e',
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginTop: 16,
  },
  eventDetails: {
    marginTop: 16,
    gap: 8,
  },
  eventDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventDetailText: {
    color: '#ccc',
    marginLeft: 8,
    fontSize: 14,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    height: 24,
  },
  dividerCircleLeft: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1a1a2e',
    marginLeft: -12,
  },
  dividerLine: {
    flex: 1,
    height: 2,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dividerCircleRight: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1a1a2e',
    marginRight: -12,
  },
  ticketBottom: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  qrContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  qrContainerUsed: {
    borderColor: '#9e9e9e',
    position: 'relative',
  },
  usedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  qrHint: {
    color: '#666',
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
  },
  instructions: {
    marginTop: 24,
    gap: 12,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  instructionText: {
    color: '#888',
    marginLeft: 10,
    flex: 1,
  },
  errorText: {
    color: '#888',
    fontSize: 18,
  },
  backButtonAlt: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#E91E8C',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
