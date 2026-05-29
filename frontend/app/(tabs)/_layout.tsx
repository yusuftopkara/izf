import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { useLocale } from '../../src/context/LocaleContext';

export default function TabLayout() {
  const { user } = useAuth();
  const { t } = useLocale();
  const isStaff = user?.role === 'staff' || user?.role === 'admin';

  return (
    <Tabs
      initialRouteName="events"
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#E91E8C',
        tabBarInactiveTintColor: '#666',
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="events"
        options={{
          title: t('nav.events'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="home"
        options={{
          title: t('nav.videos'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="play-circle" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="challenges"
        options={{
          title: t('nav.challenge'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="flame" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="social"
        options={{
          title: t('nav.social'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('nav.profile'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#1a0a2e',
    borderTopColor: '#2a2a4e',
    borderTopWidth: 1,
    height: 85,
    paddingBottom: 25,
    paddingTop: 10,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
});
