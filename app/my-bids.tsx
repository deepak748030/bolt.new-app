import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenHeader from '@/components/ScreenHeader';
import { colors, fonts } from '@/lib/theme';
import { bidApi } from '@/lib/api';
import { router } from 'expo-router';
import { Gavel } from 'lucide-react-native';

type BidRow = {
    id: string;          // bid id (used as list key)
    auctionId: string;   // auction id (used for navigation)
    title: string;
    image: string;
    currentBid: number;
    myBid: number;
    leading: boolean;
    ended: boolean;
    isLoss: boolean;
};

export default function MyBidsScreen() {
    const insets = useSafeAreaInsets();
    const [bids, setBids] = useState<BidRow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        bidApi.mine()
            .then((r) => {
                const rows: BidRow[] = (r.data || [])
                    .filter((b: any) => b.auction)
                    .map((b: any) => {
                        const a = b.auction || {};
                        const auctionId = String(a._id || a.id || '');
                        const endsAt = a.endsAt ? new Date(a.endsAt).getTime() : 0;
                        const ended = a.status !== 'live' || (endsAt && endsAt < Date.now());
                        return {
                            id: String(b._id || b.id),
                            auctionId,
                            title: a.title,
                            image: a.image,
                            currentBid: a.currentBid,
                            myBid: b.amount,
                            leading: b.amount >= a.currentBid,
                            ended: !!ended,
                            isLoss: !!(a.reservePrice && b.amount < a.reservePrice),
                        };
                    })
                    .filter((r: BidRow) => r.auctionId);
                setBids(rows);
            })
            .catch(() => setBids([]))
            .finally(() => setLoading(false));
    }, []);

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScreenHeader title="My Bids" />
            <FlatList
                data={bids}
                keyExtractor={(i) => i.id}
                contentContainerStyle={{ paddingBottom: 24 + insets.bottom }}
                ItemSeparatorComponent={() => <View style={styles.sep} />}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        {loading ? <ActivityIndicator color={colors.primary} /> : (
                            <>
                                <Gavel size={28} color={colors.mutedForeground} />
                                <Text style={styles.emptyText}>You haven't placed any bids yet</Text>
                            </>
                        )}
                    </View>
                }
                renderItem={({ item }) => (
                    <Pressable
                        style={styles.row}
                        onPress={() => router.push({ pathname: '/auction-details', params: { id: item.auctionId } })}
                    >
                        <Image source={{ uri: item.image }} style={styles.img} />
                        <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                            <Text style={[styles.meta, { color: item.isLoss ? colors.danger : colors.success, fontFamily: fonts.bold }]}>My bid: ₹{item.myBid.toLocaleString('en-IN')}{item.isLoss ? '  ·  LOSS' : ''}</Text>
                            <Text style={styles.meta}>Current: ₹{item.currentBid.toLocaleString('en-IN')}</Text>
                            {item.ended ? (
                                <View style={[styles.badge, { backgroundColor: '#F3F4F6', borderColor: colors.border }]}>
                                    <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>Ended</Text>
                                </View>
                            ) : (
                                <View style={[styles.badge, { backgroundColor: item.leading ? '#DCFCE7' : '#FEE2E2', borderColor: item.leading ? colors.success : colors.danger }]}>
                                    <Text style={[styles.badgeText, { color: item.leading ? colors.success : colors.danger }]}>
                                        {item.leading ? 'Leading' : 'Outbid'}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </Pressable>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    row: { flexDirection: 'row', backgroundColor: colors.card, paddingHorizontal: 6, paddingVertical: 6 },
    img: { width: 76, height: 76, backgroundColor: colors.border },
    title: { color: colors.foreground, fontFamily: fonts.bold, fontSize: 13 },
    meta: { color: colors.mutedForeground, fontFamily: fonts.medium, fontSize: 11, marginTop: 1 },
    badge: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, marginTop: 4 },
    badgeText: { fontSize: 10, fontFamily: fonts.bold },
    sep: { height: 1, backgroundColor: colors.border },
    empty: { padding: 32, alignItems: 'center' },
    emptyText: { color: colors.mutedForeground, fontFamily: fonts.medium, fontSize: 12, marginTop: 6 },
});
