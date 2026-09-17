import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenHeader from '@/components/ScreenHeader';
import { colors, fonts } from '@/lib/theme';
import { Bell, Gavel, Trophy, AlertTriangle, Wallet, Info, CheckCheck } from 'lucide-react-native';
import { notificationApi, type ApiNotification } from '@/lib/api';

function iconFor(type: ApiNotification['type']) {
    switch (type) {
        case 'auction_won': return { Icon: Trophy, color: colors.success, bg: '#DCFCE7' };
        case 'auction_outbid': return { Icon: AlertTriangle, color: colors.danger, bg: '#FEE2E2' };
        case 'auction_ending': return { Icon: Gavel, color: colors.primary, bg: colors.primaryLight };
        case 'auction_new': return { Icon: Bell, color: colors.accent, bg: colors.accentLight };
        case 'wallet': return { Icon: Wallet, color: colors.success, bg: '#DCFCE7' };
        default: return { Icon: Info, color: colors.mutedForeground, bg: colors.muted };
    }
}

function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.round(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.round(h / 24);
    return `${d}d ago`;
}

export default function NotificationsScreen() {
    const insets = useSafeAreaInsets();
    const [items, setItems] = useState<ApiNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [markingAll, setMarkingAll] = useState(false);

    const load = useCallback(async () => {
        try {
            const r = await notificationApi.mine(100);
            setItems(r.data);
        } catch { /* keep prior list */ }
    }, []);

    useEffect(() => { (async () => { await load(); setLoading(false); })(); }, [load]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    }, [load]);

    const onItemPress = useCallback(async (item: ApiNotification) => {
        if (item.read) return;
        setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
        try { await notificationApi.markRead(item.id); } catch { /* ignore */ }
    }, []);

    const onMarkAll = useCallback(async () => {
        if (markingAll || items.every((i) => i.read)) return;
        setMarkingAll(true);
        setItems((prev) => prev.map((n) => ({ ...n, read: true })));
        try { await notificationApi.markAllRead(); } catch { /* ignore */ }
        setMarkingAll(false);
    }, [items, markingAll]);

    const unread = items.filter((n) => !n.read).length;

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScreenHeader title="Notifications" />
            {unread > 0 && (
                <View style={styles.toolbar}>
                    <Text style={styles.toolbarText}>{unread} unread</Text>
                    <Pressable style={styles.markAllBtn} onPress={onMarkAll} disabled={markingAll}>
                        {markingAll ? <ActivityIndicator size="small" color={colors.primary} /> : (
                            <>
                                <CheckCheck size={12} color={colors.primary} />
                                <Text style={styles.markAllText}>Mark all read</Text>
                            </>
                        )}
                    </Pressable>
                </View>
            )}
            {loading ? (
                <View style={styles.empty}><ActivityIndicator color={colors.primary} /></View>
            ) : (
                <FlatList
                    data={items}
                    keyExtractor={(i) => i.id}
                    contentContainerStyle={{ paddingBottom: 24 + insets.bottom }}
                    ItemSeparatorComponent={() => <View style={styles.sep} />}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Bell size={28} color={colors.mutedForeground} />
                            <Text style={styles.emptyText}>No notifications yet</Text>
                        </View>
                    }
                    renderItem={({ item }) => {
                        const { Icon, color, bg } = iconFor(item.type);
                        return (
                            <Pressable style={[styles.row, !item.read && styles.rowUnread]} onPress={() => onItemPress(item)}>
                                <View style={[styles.iconWrap, { backgroundColor: bg }]}>
                                    <Icon size={16} color={color} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                                    <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
                                    {!item.read && <View style={styles.dot} />}
                                </View>
                            </Pressable>
                        );
                    }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6, paddingVertical: 6, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
    toolbarText: { color: colors.mutedForeground, fontFamily: fonts.semibold, fontSize: 11 },
    markAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: colors.primary, borderRadius: 4 },
    markAllText: { color: colors.primary, fontFamily: fonts.bold, fontSize: 11 },
    row: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.card, paddingHorizontal: 6, paddingVertical: 8 },
    rowUnread: { backgroundColor: colors.primaryLight },
    iconWrap: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', marginRight: 8, borderRadius: 0 },
    title: { color: colors.foreground, fontFamily: fonts.bold, fontSize: 12 },
    body: { color: colors.mutedForeground, fontFamily: fonts.regular, fontSize: 11, marginTop: 1 },
    time: { color: colors.mutedForeground, fontFamily: fonts.medium, fontSize: 10, marginLeft: 6 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginTop: 3 },
    sep: { height: 1, backgroundColor: colors.border },
    empty: { padding: 32, alignItems: 'center' },
    emptyText: { color: colors.mutedForeground, fontFamily: fonts.medium, fontSize: 12, marginTop: 6 },
});
