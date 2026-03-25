import axios, { AxiosInstance } from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';
const API_URL = `${BACKEND_URL}/api`;

class ApiService {
  private axiosInstance: AxiosInstance;
  private authToken: string | null = null;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.axiosInstance.interceptors.request.use((config) => {
      if (this.authToken) {
        config.headers.Authorization = `Bearer ${this.authToken}`;
      }
      return config;
    });
  }

  setAuthToken(token: string | null) {
    this.authToken = token;
  }

  // Auth
  async login(email: string, password: string) {
    const response = await this.axiosInstance.post('/login', { email, password });
    return response.data;
  }

  async register(email: string, password: string, name: string) {
    const response = await this.axiosInstance.post('/register', { email, password, name });
    return response.data;
  }

  async getMe() {
    const response = await this.axiosInstance.get('/me');
    return response.data;
  }

  // Events
  async getEvents(city?: string) {
    const params = city ? { city } : {};
    const response = await this.axiosInstance.get('/events', { params });
    return response.data;
  }

  async getEvent(eventId: string) {
    const response = await this.axiosInstance.get(`/events/${eventId}`);
    return response.data;
  }

  // Tickets
  async buyTicket(eventId: string, quantity: number = 1) {
    const response = await this.axiosInstance.post('/buy-ticket', { event_id: eventId, quantity });
    return response.data;
  }

  // iyzico Payment
  async createPayment(data: {
    event_id: string;
    quantity: number;
    card: {
      card_holder_name: string;
      card_number: string;
      expire_month: string;
      expire_year: string;
      cvc: string;
    };
    buyer: {
      name: string;
      surname: string;
      email: string;
      phone: string;
      identity_number?: string;
      address?: string;
      city?: string;
      country?: string;
      zip_code?: string;
    };
  }) {
    const response = await this.axiosInstance.post('/payment/create', data);
    return response.data;
  }

  async getMyTickets() {
    const response = await this.axiosInstance.get('/my-tickets');
    return response.data;
  }

  async checkTicket(qrToken: string) {
    const response = await this.axiosInstance.post('/check-ticket', { qr_token: qrToken });
    return response.data;
  }

  // Videos
  async getVideos() {
    const response = await this.axiosInstance.get('/videos');
    return response.data;
  }

  async getDailyVideo() {
    const response = await this.axiosInstance.get('/videos/daily');
    return response.data;
  }

  // Challenges
  async getChallenges() {
    const response = await this.axiosInstance.get('/challenges');
    return response.data;
  }

  async completeChallenge(challengeId: string) {
    const response = await this.axiosInstance.post(`/challenges/complete/${challengeId}`);
    return response.data;
  }

  async getMyStreak() {
    const response = await this.axiosInstance.get('/my-streak');
    return response.data;
  }

  // Social
  async getPosts() {
    const response = await this.axiosInstance.get('/posts');
    return response.data;
  }

  async createPost(mediaUrl: string, caption: string) {
    const response = await this.axiosInstance.post('/posts', { media_url: mediaUrl, caption });
    return response.data;
  }

  async likePost(postId: string) {
    const response = await this.axiosInstance.post(`/posts/${postId}/like`);
    return response.data;
  }

  async getComments(eventId: string) {
    const response = await this.axiosInstance.get(`/comments/${eventId}`);
    return response.data;
  }

  async createComment(eventId: string, text: string, rating: number) {
    const response = await this.axiosInstance.post('/comments', { event_id: eventId, text, rating });
    return response.data;
  }

  // QR Ticket Check (for staff)
  async checkTicket(qrToken: string) {
    const response = await this.axiosInstance.post('/check-ticket', { qr_token: qrToken });
    return response.data;
  }

  // Notifications
  async getNotifications() {
    const response = await this.axiosInstance.get('/notifications');
    return response.data;
  }

  async markNotificationRead(notificationId: string) {
    const response = await this.axiosInstance.post(`/notifications/${notificationId}/read`);
    return response.data;
  }

  // Admin
  async getAdminStats() {
    const response = await this.axiosInstance.get('/admin/stats');
    return response.data;
  }

  async sendNotification(title: string, body: string, userId?: string) {
    const response = await this.axiosInstance.post('/admin/notifications', { title, body, user_id: userId });
    return response.data;
  }

  async sendNotificationAdvanced(data: {
    title: string;
    body: string;
    type: 'push' | 'email' | 'both';
    user_id?: string;
  }) {
    const response = await this.axiosInstance.post('/admin/notifications/advanced', data);
    return response.data;
  }

  async getAllUsers() {
    const response = await this.axiosInstance.get('/admin/users');
    return response.data;
  }

  async setUserRole(userId: string, role: string) {
    const response = await this.axiosInstance.post('/admin/set-role-by-id', { user_id: userId, role });
    return response.data;
  }

  async deleteUser(userId: string) {
    const response = await this.axiosInstance.delete(`/admin/users/${userId}`);
    return response.data;
  }

  async createEvent(eventData: {
    title: string;
    description: string;
    city: string;
    location: string;
    date: string;
    capacity: number;
    price: number;
    image_url?: string;
  }) {
    const response = await this.axiosInstance.post('/events', eventData);
    return response.data;
  }

  async updateEvent(eventId: string, eventData: {
    title: string;
    description: string;
    city: string;
    location: string;
    date: string;
    capacity: number;
    price: number;
    image_url?: string;
  }) {
    const response = await this.axiosInstance.put(`/admin/events/${eventId}`, eventData);
    return response.data;
  }

  async deleteEvent(eventId: string) {
    const response = await this.axiosInstance.delete(`/admin/events/${eventId}`);
    return response.data;
  }

  async createVideo(videoData: {
    title: string;
    youtube_url: string;
    thumbnail?: string;
    is_premium: boolean;
    is_daily: boolean;
  }) {
    const response = await this.axiosInstance.post('/videos', videoData);
    return response.data;
  }

  async deleteVideo(videoId: string) {
    const response = await this.axiosInstance.delete(`/admin/videos/${videoId}`);
    return response.data;
  }

  async createChallenge(challengeData: {
    title: string;
    description: string;
    points: number;
  }) {
    const response = await this.axiosInstance.post('/admin/create-challenge', challengeData);
    return response.data;
  }

  // Admin - Create User
  async createUser(userData: {
    email: string;
    password: string;
    name: string;
    role: string;
  }) {
    const response = await this.axiosInstance.post('/admin/create-user', userData);
    return response.data;
  }

  // Admin - Create Post
  async createPost(postData: {
    content: string;
    image_url?: string;
    hashtags?: string[];
  }) {
    const response = await this.axiosInstance.post('/posts', postData);
    return response.data;
  }

  // Seed
  async seedData(force: boolean = false) {
    const response = await this.axiosInstance.post(`/seed?force=${force}`);
    return response.data;
  }

  async forceSeedData() {
    const response = await this.axiosInstance.post('/seed?force=true');
    return response.data;
  }

  // Settings
  async getSettings() {
    const response = await this.axiosInstance.get('/admin/settings');
    return response.data;
  }

  async updateSettings(settings: {
    iyzico_api_key?: string;
    iyzico_secret_key?: string;
    iyzico_base_url?: string;
    firebase_api_key?: string;
    firebase_auth_domain?: string;
    firebase_project_id?: string;
    firebase_storage_bucket?: string;
    firebase_messaging_sender_id?: string;
    firebase_app_id?: string;
    firebase_server_key?: string;
    firebase_service_account_json?: string;
    sendgrid_api_key?: string;
    sendgrid_from_email?: string;
    sendgrid_from_name?: string;
  }) {
    const response = await this.axiosInstance.put('/admin/settings', settings);
    return response.data;
  }

  async testIyzico() {
    const response = await this.axiosInstance.post('/admin/test-iyzico');
    return response.data;
  }

  async testFirebase() {
    const response = await this.axiosInstance.post('/admin/test-firebase');
    return response.data;
  }

  // Push Notification Token Registration
  async registerPushToken(token: string) {
    const response = await this.axiosInstance.post('/me/register-push-token', { push_token: token });
    return response.data;
  }
}

export const api = new ApiService();
