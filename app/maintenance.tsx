import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Image, Pressable, ActivityIndicator, RefreshControl, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Wrench, RefreshCw, Mail } from 'lucide-react-native';
import { colors, fonts, radius } from '@/lib/theme';
import { settingsApi } from '@/lib/api';

export default function MaintenanceScreen() {
    const insets = useSafeAreaInsets();
    const [message, setMessage] = useState('We are performing scheduled maintenance. Please check back soon.');
    const [refreshing, setRefreshing] = useState(false);
    const [checking, setChecking] = useState(false);

    const check = useCallback(async (fromUser = false) => {
        if (fromUser) setChecking(true);
        try {
            const r = await settingsApi.public();
            setMessage(r.data.maintenanceMessage || message);
            if (!r.data.maintenanceMode) {
                const { router } = await import('expo-router');
                router.replace('/splash');
            }
        } catch { /* ignore */ }
        finally { setChecking(false); setRefreshing(false); }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => { check(); const t = setInterval(() => check(), 20000); return () => clearInterval(t); }, [check]);

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={[styles.hero, { paddingTop: insets.top + 12 }]}>
                <Image source={require('../assets/images/icon.png')} style={styles.logo} resizeMode="contain" />
                <Text style={styles.brand}>Tractor Wala</Text>
                <Text style={styles.heroSub}>Under maintenance</Text>
            </View>

            <ScrollView
                contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 16 }]}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); check(true); }} tintColor={colors.primary} />}
            >
                <View style={styles.iconRing}>
                    <Wrench size={38} color={colors.primaryDark} />
                </View>
                <Text style={styles.title}>We'll be right back</Text>
                <Text style={styles.subtitle}>{message}</Text>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>What's happening?</Text>
                    <Text style={styles.cardText}>Our team is upgrading the app for a smoother bidding experience. This usually takes just a few minutes.</Text>
                </View>

                <Pressable style={styles.primaryBtn} onPress={() => check(true)} disabled={checking}>
                    {checking
                        ? <ActivityIndicator color="#FFFFFF" />
                        : (<><RefreshCw size={15} color="#FFFFFF" /><Text style={styles.primaryText}>Check Again</Text></>)}
                </Pressable>

                <Pressable style={styles.secondaryBtn}>
                    <Mail size={14} color={colors.primaryDark} />
                    <Text style={styles.secondaryText}>support@tractorwaladealers.in</Text>
                </Pressable>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    hero: { backgroundColor: colors.primary, alignItems: 'center', paddingHorizontal: 6, paddingBottom: 20 },
    logo: { width: 56, height: 56 },
    brand: { color: '#FFFFFF', fontFamily: fonts.extrabold, fontSize: 18, marginTop: 6, letterSpacing: 0.5 },
    heroSub: { color: 'rgba(255,255,255,0.9)', fontFamily: fonts.medium, fontSize: 12, marginTop: 2 },
    body: { paddingHorizontal: 6, paddingTop: 14, alignItems: 'center' },
    iconRing: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.primaryLight, borderWidth: 2, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    title: { color: colors.foreground, fontFamily: fonts.extrabold, fontSize: 18, textAlign: 'center', marginTop: 10 },
    subtitle: { color: colors.mutedForeground, fontFamily: fonts.regular, fontSize: 12, textAlign: 'center', marginTop: 6, lineHeight: 18, paddingHorizontal: 6 },
    card: { width: '100%', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 10, marginTop: 14 },
    cardTitle: { color: colors.foreground, fontFamily: fonts.bold, fontSize: 13 },
    cardText: { color: colors.mutedForeground, fontFamily: fonts.regular, fontSize: 12, marginTop: 4, lineHeight: 18 },
    primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.primary, paddingVertical: 12, borderRadius: radius.sm, width: '100%', marginTop: 14 },
    primaryText: { color: '#FFFFFF', fontFamily: fonts.extrabold, fontSize: 14, letterSpacing: 0.3 },
    secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primaryLight, paddingVertical: 10, borderRadius: radius.sm, width: '100%', marginTop: 6 },
    secondaryText: { color: colors.primaryDark, fontFamily: fonts.bold, fontSize: 12 },
});
