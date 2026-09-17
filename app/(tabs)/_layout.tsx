import React, { useEffect } from 'react';
import { Tabs, router } from 'expo-router';
import { Compass, Gavel, Trophy, Search, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '@/lib/theme';
import { kycApi, getToken } from '@/lib/api';
import { useRealtime, getSocket } from '@/lib/socket';
import { refreshMyBids } from '@/lib/useMyBids';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) { router.replace('/login' as any); return; }
      // Ensure the socket connects with the current token so realtime events flow.
      getSocket().catch(() => { /* offline — fine */ });
      refreshMyBids();
      try {
        const r = await kycApi.mine();
        const st = r.data.status;
        if (st === 'approved') return;
        if (st === 'pending' || st === 'in_progress') { router.replace('/payment-pending' as any); return; }
        router.replace('/kyc' as any);
      } catch { /* ignore */ }
    })();
  }, []);

  // Realtime — react instantly when admin approves/rejects KYC.
  useRealtime<{ status: string; reason?: string }>('kyc:updated', (p) => {
    if (p.status === 'approved') router.replace('/(tabs)' as any);
    else if (p.status === 'rejected') router.replace('/kyc' as any);
    else if (p.status === 'pending' || p.status === 'in_progress') router.replace('/payment-pending' as any);
  });

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom + 4,
          paddingTop: 4,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: '#0A0A0A',
        tabBarInactiveTintColor: '#9A9A99',
        tabBarLabelStyle: { fontSize: 10, fontFamily: fonts.bold, marginTop: 2, letterSpacing: 0.3 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Explore', tabBarIcon: ({ color }) => <Compass size={22} color={color} strokeWidth={2} /> }} />
      <Tabs.Screen name="auction" options={{ title: 'Auction', tabBarIcon: ({ color }) => <Gavel size={22} color={color} strokeWidth={2} /> }} />
      <Tabs.Screen name="orders" options={{ title: 'Result', tabBarIcon: ({ color }) => <Trophy size={22} color={color} strokeWidth={2} /> }} />
      <Tabs.Screen name="search" options={{ title: 'Search', tabBarIcon: ({ color }) => <Search size={22} color={color} strokeWidth={2} /> }} />
      <Tabs.Screen name="account" options={{ title: 'Account', tabBarIcon: ({ color }) => <User size={22} color={color} strokeWidth={2} /> }} />
    </Tabs>
  );
}
