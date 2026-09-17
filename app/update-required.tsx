import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Linking, Platform, Image, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Download, RefreshCw, Sparkles } from 'lucide-react-native';
import { router } from 'expo-router';
import { colors, fonts, radius } from '@/lib/theme';
import { settingsApi } from '@/lib/api';
import { defaultStoreUrl, startInAppUpdate } from '@/lib/inAppUpdate';
import Constants from 'expo-constants';

const CURRENT_VERSION = Constants.expoConfig?.version || '1.0.0';

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

export default function UpdateRequiredScreen() {
    const insets = useSafeAreaInsets();
    const [checking, setChecking] = useState(false);
    const [opening, setOpening] = useState(false);
    const [storeUrl, setStoreUrl] = useState(defaultStoreUrl());
    const [latest, setLatest] = useState('1.0.0');

    const check = async () => {
        setChecking(true);
        try {
            const r = await settingsApi.public();
            const s = r.data;
            const belowMinimum = versionLessThan(CURRENT_VERSION, s.minAppVersion || '0.0.0');
            const belowLatest = versionLessThan(CURRENT_VERSION, s.appVersion || '0.0.0');
            const mustUpdate = belowMinimum || (!!s.forceUpdate && belowLatest);
            setLatest(s.appVersion || '1.0.0');
            setStoreUrl((Platform.OS === 'ios' ? s.iosStoreUrl : s.androidStoreUrl) || defaultStoreUrl());
            if (!mustUpdate) router.replace('/splash');
        } catch { /* stay on screen */ }
        finally { setChecking(false); }
    };

    useEffect(() => { check(); }, []);

    const openStore = async () => {
        setOpening(true);
        try {
            const started = await startInAppUpdate({ immediate: true, storeUrl, openStoreFallback: true });
            if (!started && storeUrl) await Linking.openURL(storeUrl);
        } catch { /* ignore */ }
        finally { setOpening(false); }
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={[styles.hero, { paddingTop: insets.top + 12 }]}>
                <Image source={require('../assets/images/icon.png')} style={styles.logo} resizeMode="contain" />
                <Text style={styles.brand}>Tractor Wala</Text>
                <Text style={styles.heroSub}>Update required</Text>
            </View>

            <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 16 }]}>
                <View style={styles.iconRing}>
                    <Download size={38} color={colors.primaryDark} />
                </View>
                <Text style={styles.title}>New version available</Text>
                <Text style={styles.subtitle}>A newer app version is ready. Please update to continue bidding on live tractor auctions.</Text>

                <View style={styles.card}>
                    <View style={styles.row}><Text style={styles.label}>Current Version</Text><Text style={styles.value}>v{CURRENT_VERSION}</Text></View>
                    <View style={styles.divider} />
                    <View style={styles.row}>
                        <Text style={styles.label}>Latest Version</Text>
                        <View style={styles.latestRow}>
                            <Sparkles size={11} color={colors.primary} />
                            <Text style={[styles.value, { color: colors.primaryDark }]}>v{latest}</Text>
                        </View>
                    </View>
                </View>

                <Pressable style={[styles.primaryBtn, !storeUrl && { opacity: 0.6 }]} onPress={openStore} disabled={opening || !storeUrl}>
                    {opening
                        ? <ActivityIndicator color="#FFFFFF" />
                        : (<><Download size={15} color="#FFFFFF" /><Text style={styles.primaryText}>Update Now</Text></>)}
                </Pressable>
                <Pressable style={styles.secondaryBtn} onPress={check} disabled={checking}>
                    {checking
                        ? <ActivityIndicator color={colors.primaryDark} />
                        : (<><RefreshCw size={14} color={colors.primaryDark} /><Text style={styles.secondaryText}>Check Again</Text></>)}
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
    card: { width: '100%', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, marginTop: 14 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 10 },
    label: { color: colors.mutedForeground, fontFamily: fonts.medium, fontSize: 11 },
    value: { color: colors.foreground, fontFamily: fonts.bold, fontSize: 12 },
    latestRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    divider: { height: 1, backgroundColor: colors.border },
    primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.primary, paddingVertical: 12, borderRadius: radius.sm, width: '100%', marginTop: 14 },
    primaryText: { color: '#FFFFFF', fontFamily: fonts.extrabold, fontSize: 14, letterSpacing: 0.3 },
    secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primaryLight, paddingVertical: 10, borderRadius: radius.sm, width: '100%', marginTop: 6 },
    secondaryText: { color: colors.primaryDark, fontFamily: fonts.bold, fontSize: 13 },
});
