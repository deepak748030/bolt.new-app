import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, Dimensions, ActivityIndicator, RefreshControl, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Trophy, ChevronRight } from 'lucide-react-native';
import { colors, fonts } from '@/lib/theme';
import { Order } from '@/lib/mockData';
import { orderApi } from '@/lib/api';
import { useRealtime } from '@/lib/socket';

const W = Dimensions.get('window').width;

const STATUS: Record<Order['status'], { label: string; color: string }> = {
  pending: { label: 'Awaiting Approval', color: '#CA8A04' },
  won: { label: 'Won', color: '#0A0A0A' },
  shipped: { label: 'In Transit', color: '#1D4ED8' },
  delivered: { label: 'Delivered', color: '#15803D' },
  lost: { label: 'Lost', color: '#B91C1C' },
  cancelled: { label: 'Cancelled', color: '#6B7280' },
};

const fallbackStatus = STATUS.won;

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    orderApi.mine()
      .then((r) => setOrders(Array.isArray(r.data) ? (r.data.filter(Boolean) as any) : []))
      .catch(() => setOrders([]))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  // Realtime — new won order (auction closed in your favour / buy-now) or auction update.
  useRealtime('order:new', () => { load(); });
  useRealtime('order:updated', () => { load(); });
  useRealtime('auction:closed', () => { load(); });


  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.title}>MY RESULTS</Text>
        <Text style={styles.sub}>{orders.length} total results</Text>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(i, index) => String((i as any).id || (i as any)._id || index)}
        contentContainerStyle={{ paddingBottom: 24 }}
        ItemSeparatorComponent={() => <View style={{ height: 0 }} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} colors={[colors.primary]} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            {loading ? <ActivityIndicator color={colors.primary} /> : (
              <>
                <Trophy size={40} color={colors.mutedForeground} />
                <Text style={styles.emptyText}>No results yet</Text>
                <Text style={styles.emptyHint}>Bid on live auctions — your win/loss results will appear here automatically.</Text>
              </>
            )}

          </View>
        }
        renderItem={({ item }) => {
          const statusKey = (item.status || 'won') as Order['status'];
          const s = STATUS[statusKey] || fallbackStatus;
          const orderId = String((item as any).id || (item as any)._id || 'order');
          const amount = Number(item.finalBid || 0);
          const auctionId = String((item as any).auctionId || '');
          const snap = (item as any).snapshot;
          const isWon = statusKey === 'won' || statusKey === 'shipped' || statusKey === 'delivered';
          return (
            <Pressable
              style={styles.card}
              onPress={() => { if (auctionId) router.push({ pathname: '/auction-details', params: { id: auctionId } }); }}
            >
              <Image source={{ uri: item.image || 'https://images.pexels.com/photos/4577178/pexels-photo-4577178.jpeg?auto=compress&cs=tinysrgb&w=800' }} style={styles.img} resizeMode="cover" />
              <View style={[styles.statusTag, { backgroundColor: s.color }]}>
                <Text style={styles.statusText}>{String(s.label || 'Won').toUpperCase()}</Text>
              </View>
              {(item as any).kind === 'buy_now' && (
                <View style={[styles.statusTag, { top: 32, backgroundColor: '#0369A1' }]}>
                  <Text style={styles.statusText}>PRE-APPROVED</Text>
                </View>
              )}
              <View style={styles.body}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.title || 'Auction Order'}</Text>
                {snap ? (
                  <Text style={styles.date}>
                    {[snap.hp && `${snap.hp} HP`, snap.year, snap.location].filter(Boolean).join(' · ')}
                  </Text>
                ) : null}
                <View style={styles.divider} />
                <View style={styles.bottom}>
                  <View>
                    <Text style={styles.amountLabel}>{isWon ? 'Final Price' : 'Final Bid'}</Text>
                    <Text style={[styles.amount, { color: isWon ? colors.success : colors.foreground }]}>₹{amount.toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.orderId}>
                    <Text style={styles.orderIdLabel}>View full details</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                      <Text style={styles.orderIdValue}>Photos · Videos · Report</Text>
                      <ChevronRight size={12} color={colors.foreground} />
                    </View>
                  </View>
                </View>

              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.primary, paddingHorizontal: 6, paddingBottom: 6 },
  title: { color: '#FFFFFF', fontFamily: fonts.extrabold, fontSize: 18, letterSpacing: 1 },
  sub: { color: 'rgba(255,255,255,0.7)', fontFamily: fonts.medium, fontSize: 11, marginTop: -6 },
  card: { backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  img: { width: W, height: W * 0.5, backgroundColor: '#EAEAE8' },
  statusTag: { position: 'absolute', top: 6, right: 6, paddingHorizontal: 6, paddingVertical: 3 },
  statusText: { color: '#FFFFFF', fontFamily: fonts.extrabold, fontSize: 10, letterSpacing: 0.5 },
  body: { paddingHorizontal: 6, paddingVertical: 6 },
  cardTitle: { color: colors.foreground, fontFamily: fonts.bold, fontSize: 15 },
  date: { color: colors.mutedForeground, fontFamily: fonts.medium, fontSize: 11, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 6 },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  amountLabel: { color: colors.mutedForeground, fontFamily: fonts.medium, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 },
  amount: { color: colors.foreground, fontFamily: fonts.extrabold, fontSize: 17 },
  orderId: { alignItems: 'flex-end' },
  orderIdLabel: { color: colors.mutedForeground, fontFamily: fonts.medium, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 },
  orderIdValue: { color: colors.foreground, fontFamily: fonts.bold, fontSize: 12 },
  empty: { padding: 40, alignItems: 'center', gap: 8 },
  emptyText: { color: colors.foreground, fontFamily: fonts.bold, fontSize: 14 },
  emptyHint: { color: colors.mutedForeground, fontFamily: fonts.medium, fontSize: 11, textAlign: 'center', paddingHorizontal: 20 },
});
