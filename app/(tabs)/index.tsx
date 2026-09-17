import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { Bell, Flame } from 'lucide-react-native';
import { colors, fonts } from '@/lib/theme';
import { categories as fallbackCategories, user as fallbackUser, type Auction } from '@/lib/mockData';
import { auctionApi, categoryApi, getStoredUser, normalizeAuction, settingsApi } from '@/lib/api';
import { startInAppUpdate } from '@/lib/inAppUpdate';
import AuctionCard from '@/components/AuctionCard';
import HomeBanner from '@/components/HomeBanner';
import { useRealtime } from '@/lib/socket';

const PAGE = 4;
const CURRENT_VERSION = Constants.expoConfig?.version || '1.0.0';

const withAllCategory = (items: string[]) => ['All', ...items.filter((x) => x && x !== 'All')];

function versionLessThan(a: string, b: string) {
  const pa = String(a || '0').split('.').map((x) => Number(x) || 0);
  const pb = String(b || '0').split('.').map((x) => Number(x) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const av = pa[i] || 0;
    const bv = pb[i] || 0;
    if (av < bv) return true;
    if (av > bv) return false;
  }
  return false;
}

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const [live, setLive] = useState<Auction[]>([]);
  const [categories, setCategories] = useState<string[]>(withAllCategory(fallbackCategories));
  const [user, setUser] = useState<{ name: string }>(fallbackUser);
  const [visible, setVisible] = useState(PAGE);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async () => {
    try {
      // maintenance guard
      try {
        const s = await settingsApi.public();
        if (s?.data?.maintenanceMode) { router.replace('/maintenance' as any); return; }
        const belowMinimum = versionLessThan(CURRENT_VERSION, s?.data?.minAppVersion || '0.0.0');
        const belowLatest = versionLessThan(CURRENT_VERSION, s?.data?.appVersion || '0.0.0');
        if (belowMinimum || (s?.data?.forceUpdate && belowLatest)) {
          await startInAppUpdate({ immediate: true, storeUrl: s?.data?.androidStoreUrl });
          router.replace('/update-required' as any);
          return;
        }
        void startInAppUpdate({ immediate: false, storeUrl: s?.data?.androidStoreUrl });
      } catch { /* ignore */ }

      const [a, c, u] = await Promise.all([
        auctionApi.listLiveAndPreApproved(),
        categoryApi.list().catch(() => ({ data: [] as any[] })),
        getStoredUser<{ name: string }>(),
      ]);
      setLive(a.data);
      setCategories(withAllCategory(c.data?.length ? c.data.map((x: any) => x.name) : fallbackCategories));
      if (u?.name) setUser(u);
    } catch {
      /* keep fallbacks */
    } finally {
      setLoading(false);
      setRefreshing(false);
      setVisible(PAGE);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useRealtime<{ auction: Auction }>('auction:updated', (p) => {
    const a = p?.auction ? normalizeAuction(p.auction) : null;
    const id = String((a as any)?.id || (a as any)?._id || '');
    if (!a || !id) return;
    const visibleStatus = a.status === 'live' || a.status === 'pre-approved';
    setLive((prev) => {
      const exists = prev.some((item) => String(item.id) === id);
      if (!visibleStatus) return prev.filter((item) => String(item.id) !== id);
      if (exists) return prev.map((item) => (String(item.id) === id ? { ...item, ...a } : item));
      return [a, ...prev];
    });
  });
  useRealtime('auction:created', () => { load(); });
  useRealtime('auction:deleted', () => { load(); });
  useRealtime('auction:closed', () => { load(); });

  const data = live.slice(0, visible);
  const onEnd = useCallback(() => {
    if (loadingMore || visible >= live.length) return;
    setLoadingMore(true);
    setTimeout(() => {
      setVisible(v => Math.min(v + PAGE, live.length));
      setLoadingMore(false);
    }, 250);
  }, [loadingMore, visible, live.length]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{user.name.charAt(0)}</Text></View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.hello}>Namaste, {user.name.split(' ')[0]} 👋</Text>
            <Text style={styles.subhello}>Find the best tractor deals near you</Text>
          </View>
          <Pressable style={styles.bellBtn} onPress={() => router.push('/notifications')} hitSlop={10}>
            <Bell size={20} color="#FFFFFF" />
            <View style={styles.bellDot} />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={data}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => <AuctionCard item={item} />}
        contentContainerStyle={{ paddingBottom: 24, paddingTop: 6 }}
        onEndReached={onEnd}
        onEndReachedThreshold={0.4}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} colors={[colors.primary]} />}
        ListHeaderComponent={
          <View>
            <HomeBanner />

            <Text style={styles.sectionTitle}>Browse by Category</Text>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={categories}
              keyExtractor={(c) => c}
              contentContainerStyle={{ gap: 6, paddingHorizontal: 6 }}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.chip}
                  onPress={() => router.push({ pathname: '/(tabs)/auction', params: item === 'All' ? {} : { category: item } })}
                >
                  <Text style={styles.chipText}>{item}</Text>
                </Pressable>
              )}
            />

            <View style={styles.sectionHead}>
              <Flame size={16} color={colors.accent} />
              <Text style={[styles.sectionTitle, { marginTop: 0, marginLeft: 4, flex: 1 }]}>Trending Live Auctions</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={{ padding: 24 }}><ActivityIndicator color={colors.primary} /></View>
          ) : (
            <Text style={styles.emptyText}>No live auctions right now. Pull to refresh.</Text>
          )
        }
        ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginTop: 8 }} /> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.primary, paddingHorizontal: 6, paddingBottom: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primaryDark, fontFamily: fonts.extrabold, fontSize: 15 },
  hello: { color: '#FFFFFF', fontSize: 14, fontFamily: fonts.bold },
  subhello: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontFamily: fonts.regular },
  bellBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  bellDot: { position: 'absolute', top: 6, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent, borderWidth: 1, borderColor: colors.primary },

  sectionTitle: { color: colors.foreground, fontFamily: fonts.bold, fontSize: 14, marginTop: 6, marginBottom: 6, paddingHorizontal: 6 },
  chip: { backgroundColor: colors.chipBg, borderWidth: 1, borderColor: colors.primary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 2 },
  chipText: { color: colors.primaryDark, fontSize: 11, fontFamily: fonts.bold },
  sectionHead: { flexDirection: 'row', alignItems: 'center', marginTop: 6, marginBottom: 2, paddingHorizontal: 6 },
  emptyText: { color: colors.mutedForeground, fontFamily: fonts.medium, fontSize: 12, textAlign: 'center', padding: 24 },
});
