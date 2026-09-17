import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, ActivityIndicator, Image } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '@/lib/theme';
import { getToken, settingsApi } from '@/lib/api';
import { startInAppUpdate } from '@/lib/inAppUpdate';
import Constants from 'expo-constants';

const ONBOARDING_KEY = 'tractorwala_onboarded_v1';
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

export default function SplashScreen() {
    const scale = useRef(new Animated.Value(0.6)).current;
    const fade = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(scale, { toValue: 1, duration: 600, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }),
            Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }),
        ]).start();

        const t = setTimeout(async () => {
            // 1. Settings checks first
            try {
                const s = await settingsApi.public();
                if (s?.data?.maintenanceMode) {
                    router.replace('/maintenance' as any);
                    return;
                }
                const belowMinimum = versionLessThan(CURRENT_VERSION, s?.data?.minAppVersion || '0.0.0');
                const belowLatest = versionLessThan(CURRENT_VERSION, s?.data?.appVersion || '0.0.0');
                if (belowMinimum || (s?.data?.forceUpdate && belowLatest)) {
                    const storeUrl = s?.data?.androidStoreUrl;
                    await startInAppUpdate({ immediate: true, storeUrl });
                    router.replace('/update-required' as any);
                    return;
                }
                // Play Store has a newer build — download/install inside the app.
                void startInAppUpdate({ immediate: false, storeUrl: s?.data?.androidStoreUrl });
            } catch { /* offline: continue */ }

            // 2. If token is stored, decide where to send the user.
            const token = await getToken();
            if (token) {
                try {
                    const { kycApi } = await import('@/lib/api');
                    const r = await kycApi.mine();
                    const st = r.data.status;
                    if (st === 'approved') { router.replace('/(tabs)'); return; }
                    if (st === 'pending' || st === 'in_progress') { router.replace('/payment-pending' as any); return; }
                    // not_started or rejected → KYC form
                    router.replace('/kyc' as any); return;
                } catch { /* ignore — fall through to tabs */ }
                router.replace('/(tabs)');
                return;
            }


            // 3. Otherwise route based on onboarding flag.
            let seen = false;
            try { seen = (await AsyncStorage.getItem(ONBOARDING_KEY)) === '1'; } catch { }
            router.replace(seen ? '/login' : '/onboarding');
        }, 1200);
        return () => clearTimeout(t);
    }, [scale, fade]);

    return (
        <View style={styles.root}>
            <Animated.View style={{ transform: [{ scale }], opacity: fade, alignItems: 'center' }}>
                <Image source={require('../assets/images/icon.png')} style={styles.logo} resizeMode="contain" />
                <Text style={styles.brand}>Tractor Wala</Text>
                <Text style={styles.tag}>Bid Smart · Win Big</Text>
            </Animated.View>
            <View style={styles.bottom}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.small}>India's #1 Tractor Bidding Platform</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, backgroundColor: colors.background },
    logo: { width: 140, height: 140 },
    brand: { color: colors.primaryDark, fontSize: 28, fontWeight: '800', letterSpacing: 0.8, marginTop: 12 },
    tag: { color: colors.mutedForeground, fontSize: 13, marginTop: 4, fontWeight: '600', letterSpacing: 0.5 },
    bottom: { position: 'absolute', bottom: 40, alignItems: 'center', gap: 6 },
    small: { color: colors.mutedForeground, fontSize: 11, fontWeight: '600' },
});
