import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../src/theme';

export default function AdminLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: theme.bg, borderTopColor: theme.borderLight, borderTopWidth: 1, height: 70, paddingTop: 10, paddingBottom: 14 },
        tabBarActiveTintColor: theme.gold,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarLabelStyle: { fontSize: 10, letterSpacing: 0.5 },
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard', tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="bookings" options={{ title: 'Bookings', tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="staff" options={{ title: 'Staff', tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="services" options={{ title: 'Services', tabBarIcon: ({ color, size }) => <Ionicons name="cut-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="revenue" options={{ title: 'Revenue', tabBarIcon: ({ color, size }) => <Ionicons name="trending-up-outline" color={color} size={size} /> }} />
      <Tabs.Screen name="promos" options={{ title: 'Promos', tabBarIcon: ({ color, size }) => <Ionicons name="pricetag-outline" color={color} size={size} /> }} />
    </Tabs>
  );
}
