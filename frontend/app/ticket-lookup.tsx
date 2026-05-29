import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import QRCode from 'react-native-qrcode-svg';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://refreshing-determination-production.up.railway.app';

interface Ticket {
  ticket_id: string;
  event_title: string;
  quantity: number;
  qr_token: string;
  created_at: string;
  status: string;
}

export default function TicketLookupScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!email.trim()) return;
    if (!buyerName.trim()) {
      setError('Ad soyad bilgisi gereklidir.');
      return;
    }
    setLoading(true);
    setError('');
    setTickets([]);
    setSearched(true);
    try {
      const res = await axios.get(`${API_URL}/api/tickets/by-email`, { params: { email: email.trim(), buyer_name: buyerName.trim() } });
      setTickets(res.data.tickets || []);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Bilet bulunamadı');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Bilet Sorgula</Text>
        <Text style={styles.subtitle}>Ad soyad ve e-posta adresinizle biletlerinizi görüntüleyin</Text>

        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Ad Soyad"
            placeholderTextColor="#666"
            value={buyerName}
            onChangeText={setBuyerName}
            autoCapitalize="words"
          />
        </View>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="E-posta adresiniz"
            placeholderTextColor="#666"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        <View style={styles.inputRow}>
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch} disabled={loading}>
            <LinearGradient colors={['#FF6B6B', '#FF8E53']} style={styles.searchGradient}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="search" size={20} color="#fff" />}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {searched && !loading && tickets.length === 0 && !error && (
          <Text style={styles.noResult}>Bu e-posta ile bilet bulunamadı.</Text>
        )}

        {tickets.map((ticket) => (
          <View key={ticket.ticket_id} style={styles.ticketCard}>
            <Text style={styles.ticketTitle}>{ticket.event_title}</Text>
            <Text style={styles.ticketInfo}>{ticket.quantity} bilet • {new Date(ticket.created_at).toLocaleDateString('tr-TR')}</Text>
            <View style={styles.qrBox}>
              <QRCode value={ticket.qr_token} size={160} backgroundColor="#fff" color="#000" />
            </View>
            <Text style={styles.statusBadge}>{ticket.status === 'active' ? '✓ Aktif' : ticket.status}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  backButton: { position: 'absolute', top: 50, left: 16, zIndex: 10, padding: 8 },
  content: { padding: 24, paddingTop: 80 },
  title: { color: '#fff', fontSize: 28, fontWeight: '800', marginBottom: 8 },
  subtitle: { color: '#aaa', fontSize: 15, marginBottom: 24 },
  inputRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  input: {
    flex: 1, backgroundColor: '#1a1a2e', borderRadius: 12, padding: 14,
    color: '#fff', fontSize: 16, borderWidth: 1, borderColor: '#2a2a4e',
  },
  searchButton: { borderRadius: 12, overflow: 'hidden' },
  searchGradient: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#FF6B6B', textAlign: 'center', marginBottom: 16 },
  noResult: { color: '#888', textAlign: 'center', marginTop: 20 },
  ticketCard: {
    backgroundColor: '#1a1a2e', borderRadius: 16, padding: 20,
    marginBottom: 16, alignItems: 'center', borderWidth: 1, borderColor: '#2a2a4e',
  },
  ticketTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 6 },
  ticketInfo: { color: '#aaa', fontSize: 14, marginBottom: 16 },
  qrBox: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12 },
  statusBadge: { color: '#4CAF50', fontSize: 14, fontWeight: '600' },
});
