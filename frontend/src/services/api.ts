import axios, { AxiosInstance } from 'axios';

const getApiUrl = () => {
  const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';
  return `${backendUrl}/api`;
};

const API_URL = getApiUrl();

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

  async getEvents(city?: string) {
    const params = city ? { city } : {};
    const response = await this.axiosInstance.get('/events', { params });
    return response.data;
  }

  async getEvent(eventId: string) {
    const response = await this.axiosInstance.get(`/events/${eventId}`);
    return response.data;
  }

  async buyTicket(eventId: string, quantity: number = 1) {
    const response = await this.axiosInstance.post('/buy-ticket', { event_id: eventId, quantity });
    return response.data;
  }

  async createPayment(data: any) {
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

  async getVideos() {
    const response = await this.axiosInstance.get('/videos');
    return response.data;
  }

  async getDailyVideo() {
    const response = await this.axiosInstance.get('/videos/daily');
    return response.data;
  }

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

  async getNotifications() {
    const response = await this.axiosInstance.get('/notifications');
    return response.data;
  }

  async markNotificationRead(notificationId: string) {
    const response = await this.axiosInstance.post(`/notifications/${notificationId}/read`);
    return response.data;
  }

  async getAdminStats() {
    const response = await this.axiosInstance.get('/admin/stats');
    return response.data;
  }

  async seedData(force: boolean = false) {
    const response = await this.axiosInstance.post(`/seed?force=${force}`);
    return response.data;
  }

  async getAllUsers() {
    const response = await this.axiosInstance.get('/admin/users');
    return response.data;
  }

  async getSettings() {
    const response = await this.axiosInstance.get('/admin/settings');
    return response.data;
  }

  async updateSettings(settings: any) {
    const response = await this.axiosInstance.put('/admin/settings', settings);
    return response.data;
  }

  async deleteUser(userId: string) {
    const response = await this.axiosInstance.delete(`/admin/users/${userId}`);
    return response.data;
  }

  async updateUserRole(userId: string, role: string) {
    const response = await this.axiosInstance.put(`/admin/users/${userId}/role`, { role });
    return response.data;
  }

  async adminCreateUser(data: { email: string; password: string; name: string; role: string }) {
    const response = await this.axiosInstance.post('/admin/users', data);
    return response.data;
  }

  async sendNotification(title: string, body: string, type: string, targetAll: boolean, targetUserId?: string) {
    const response = await this.axiosInstance.post('/admin/notifications/send', { title, body, type, target_all: targetAll, target_user_id: targetUserId });
    return response.data;
  }

async createEvent(data: any) {
  const response = await this.axiosInstance.post('/events', data);
  return response.data;
  }

  async updateEvent(eventId: string, data: any) {
    const response = await this.axiosInstance.put(`/admin/events/${eventId}`, data);
    return response.data;
  }

  async deleteEvent(eventId: string) {
    const response = await this.axiosInstance.delete(`/admin/events/${eventId}`);
    return response.data;
  }

  async createVideo(data: any) {
    const response = await this.axiosInstance.post('/admin/videos', data);
    return response.data;
  }

  async deleteVideo(videoId: string) {
    const response = await this.axiosInstance.delete(`/admin/videos/${videoId}`);
    return response.data;
  }

  async createChallenge(data: any) {
    const response = await this.axiosInstance.post('/admin/challenges', data);
    return response.data;
  }

  async deleteChallenge(challengeId: string) {
    const response = await this.axiosInstance.delete(`/admin/challenges/${challengeId}`);
    return response.data;
  }
}
async getProfile() {
    const response = await this.axiosInstance.get('/me/profile');
    return response.data;
  }

  async updateProfile(data: { name?: string; phone?: string; city?: string; bio?: string }) {
    const response = await this.axiosInstance.put('/me/profile', data);
    return response.data;
  }
export const api = new ApiService();
