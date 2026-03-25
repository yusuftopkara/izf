import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';
import { 
  registerForPushNotificationsAsync, 
  registerPushTokenWithBackend,
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener
} from '../services/notifications';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  streak: number;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  // Setup notification listeners
  useEffect(() => {
    const notificationListener = addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    const responseListener = addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      // Handle notification tap - navigate to relevant screen based on data
    });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  // Register push token when user is authenticated
  useEffect(() => {
    if (user && token) {
      registerPushNotifications();
    }
  }, [user, token]);

  const registerPushNotifications = async () => {
    try {
      const pushToken = await registerForPushNotificationsAsync();
      if (pushToken) {
        await registerPushTokenWithBackend(pushToken);
      }
    } catch (error) {
      console.error('Error registering push notifications:', error);
    }
  };

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      const storedUser = await AsyncStorage.getItem('user');
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        api.setAuthToken(storedToken);
      }
    } catch (error) {
      console.error('Error loading auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await api.login(email, password);
    const { access_token, user: userData } = response;
    
    await AsyncStorage.setItem('token', access_token);
    await AsyncStorage.setItem('user', JSON.stringify(userData));
    
    setToken(access_token);
    setUser(userData);
    api.setAuthToken(access_token);
  };

  const register = async (email: string, password: string, name: string) => {
    const response = await api.register(email, password, name);
    const { access_token, user: userData } = response;
    
    await AsyncStorage.setItem('token', access_token);
    await AsyncStorage.setItem('user', JSON.stringify(userData));
    
    setToken(access_token);
    setUser(userData);
    api.setAuthToken(access_token);
  };

  const logout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    setToken(null);
    setUser(null);
    api.setAuthToken(null);
  };

  const refreshUser = async () => {
    if (token) {
      try {
        const userData = await api.getMe();
        setUser(userData);
        await AsyncStorage.setItem('user', JSON.stringify(userData));
      } catch (error) {
        console.error('Error refreshing user:', error);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
