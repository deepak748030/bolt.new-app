import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { X } from 'lucide-react-native';
import { colors, fonts } from '@/lib/theme';
import { Auction, categories as fallbackCategories } from '@/lib/mockData';
import { auctionApi, categoryApi, normalizeAuction, settingsApi } from '@/lib/api';
import AuctionCard from '@/components/AuctionCard';
import { useRealtime } from '@/lib/socket';

// Tab labels can be changed from the admin panel (Settings → Auctions tab labels);
// these are the fallbacks used until the server sends custom ones.
const DEFAULT_TAB_LABELS: Record<Auction['status'], string> = {
  live: 'Live',
  upcoming: 'Upcoming',
  'pre-approved': 'Pre-Approved',
  ended: 'Ended',
  sold_out: 'Sold',
};
const TABS: Auction['status'][] = ['live', 'upcoming', 'pre-approved', 'ended'];

const PAGE = 4;

export default function AuctionScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ category?: string }>();
  const [tab, setTab] = useState<Auction['status']>('live');
  const [category, setCategory] = useState<string | null>(null);
  const [visible, setVisible] = useState(PAGE);
  const [loadingMore, setLoadingMore] = useState(false);
  const [all, setAll] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState<string[]>(fallbackCategories);
  const [labels, setLabels] = useState<Record<Auction['status'], string>>(DEFAULT_TAB_LABELS);

  useEffect(() => {
    if (params.category) { setCategory(params.category); setVisible(PAGE); }
  }, [params.category]);

  useEffect(() => {
    categoryApi.list().then((r) => { if (r.data?.length) setCategories(r.data.map((x: any) => x.name)); }).catch(() => { });
  }, []);

  // Custom tab labels from the admin panel (falls back to defaults).
  useEffect(() => {
    settingsApi.public()
      .then((r) => {
        const t = r.data?.auctionTabs;
        if (!t) return;
        setLabels({
          ...DEFAULT_TAB_LABELS,
          live: t.live?.trim() || DEFAULT_TAB_LABELS.live,
          upcoming: t.upcoming?.trim() || DEFAULT_TAB_LABELS.upcoming,
          'pre-approved': t.preApproved?.trim() || DEFAULT_TAB_LABELS['pre-approved'],
          ended: t.ended?.trim() || DEFAULT_TAB_LABELS.ended,
        });
      })
      .catch(() => { });
  }, []);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    const req = tab === 'live'
      ? auctionApi.listLiveAndPreApproved({ category: category || undefined })
      : auctionApi.list({ status: tab, category: category || undefined });
    req
      .then((r) => { if (!cancelled) setAll(r.data); })
      .catch(() => { if (!cancelled) setAll([]); })
      .finally(() => { if (!cancelled) { setLoading(false); setRefreshing(false); } });
    return () => { cancelled = true; };
  }, [tab, category]);

  useEffect(() => { const cancel = load(); return cancel; }, [load]);

  // Realtime — patch bid amount/count instantly, reload only for list membership changes.
  useRealtime('auction:created', () => { load(); });
  useRealtime<{ auction: Auction }>('auction:updated', (p) => {
    const a = p?.auction ? normalizeAuction(p.auction) : null;
    const id = String((a as any)?.id || (a as any)?._id || '');
    if (!a || !id) return;
    const statusMatches = tab === 'live' ? (a.status === 'live' || a.status === 'pre-approved') : a.status === tab;
    const categoryMatches = !category || a.category === category;
    const shouldShow = statusMatches && categoryMatches;
    setAll((prev) => {
      const exists = prev.some((item) => String(item.id) === id);
      if (!shouldShow) return prev.filter((item) => String(item.id) !== id);
      if (exists) return prev.map((item) => (String(item.id) === id ? { ...item, ...a } : item));
      return [a, ...prev];
    });
  });
  useRealtime('auction:deleted', () => { load(); });
  useRealtime('auction:closed', () => { load(); });


  const data = all.slice(0, visible);

  const onEnd = useCallback(() => {
    if (loadingMore || visible >= all.length) return;
    setLoadingMore(true);
    setTimeout(() => {
      setVisible(v => Math.min(v + PAGE, all.length));
      setLoadingMore(false);
    }, 250);
  }, [loadingMore, visible, all.length]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.title}>AUCTIONS</Text>
        <Text style={styles.sub}>
          {all.length === 0
            ? `No ${labels[tab].toLowerCase()} auctions yet`
            : `${all.length} ${labels[tab].toLowerCase()} auction${all.length === 1 ? '' : 's'}`}
        </Text>
      </View>
      <View style={styles.tabsWrap}>
        {TABS.map((key) => {
          const active = tab === key;
          return (
            <Pressable
              key={key}
              onPress={() => { setTab(key); setVisible(PAGE); }}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Text
                style={[styles.tabText, active && styles.tabTextActive]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {labels[key]}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.catWrap}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catRow}
          data={['All', ...categories]}
          keyExtractor={(c) => c}
          renderItem={({ item: c }) => {
            const isAll = c === 'All';
            const active = isAll ? !category : category === c;
            return (
              <Pressable
                style={[styles.catChip, active && styles.catChipActive]}
                onPress={() => {
                  setCategory(isAll ? null : (active ? null : c));
                  setVisible(PAGE);
                }}
              >
                <Text style={[styles.catChipText, active && styles.catChipTextActive]}>{c}</Text>
                {active && !isAll ? <X size={11} color="#FFFFFF" /> : null}
              </Pressable>
            );
          }}
        />
      </View>
      <FlatList
        data={data}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => <AuctionCard item={item} />}
        contentContainerStyle={{ paddingBottom: 24 }}
        ItemSeparatorComponent={() => <View style={{ height: 0 }} />}
        onEndReached={onEnd}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} colors={[colors.primary]} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            {loading ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.emptyText}>No {labels[tab].toLowerCase()} auctions</Text>}
          </View>
        }
        ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginTop: 10 }} /> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.primary, paddingHorizontal: 6, paddingBottom: 6 },
  title: { color: '#FFFFFF', fontFamily: fonts.extrabold, fontSize: 18, letterSpacing: 1 },
  sub: { color: 'rgba(255,255,255,0.7)', fontFamily: fonts.medium, fontSize: 11, marginTop: -6 },
  tabsWrap: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingHorizontal: 2, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#0A0A0A' },
  tabText: { color: colors.mutedForeground, fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0 },
  tabTextActive: { color: colors.foreground },
  empty: { padding: 28, alignItems: 'center' },
  emptyText: { color: colors.mutedForeground, fontFamily: fonts.medium, fontSize: 12 },
  catWrap: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: colors.border, height: 50, justifyContent: 'center' },
  catRow: { gap: 6, paddingHorizontal: 6, paddingVertical: 8, alignItems: 'center' },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 2, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  catChipActive: { backgroundColor: colors.primary, borderColor: colors.primaryDark },
  catChipText: { color: colors.foreground, fontFamily: fonts.bold, fontSize: 11 },
  catChipTextActive: { color: '#FFFFFF' },
});
