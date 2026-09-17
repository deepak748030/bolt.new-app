import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView, Linking, RefreshControl, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Clock, Mail, RefreshCw, ShieldCheck, CheckCircle2, LogOut } from 'lucide-react-native';
import { colors, fonts, radius } from '@/lib/theme';
import { kycApi, setToken, setStoredUser } from '@/lib/api';

const APP_NAME = 'Tractor Wala';
const SUPPORT_EMAIL = 'support@tractorwaladealers.in';
const POLL_MS = 15000;

export default function PaymentPendingScreen() {
    const insets = useSafeAreaInsets();
    const [refreshing, setRefreshing] = useState(false);
    const [checking, setChecking] = useState(false);
    const [loading, setLoading] = useState(true);
    const [deposit, setDeposit] = useState(0);
    const [paymentId, setPaymentId] = useState('');
    const [paidAt, setPaidAt] = useState<string | null>(null);
    const [submittedAt, setSubmittedAt] = useState<string | null>(null);
    const [rejected, setRejected] = useState<string | null>(null);

    const check = useCallback(async (userTriggered = false) => {
        if (userTriggered) setChecking(true);
        try {
            const r = await kycApi.mine();
            const k = r.data;
            setDeposit(k.depositAmount || r.depositAmount || 0);
            setPaymentId(k.depositPaymentId || '');
            setPaidAt(k.depositPaidAt || null);
            setSubmittedAt(k.submittedAt || null);
            if (k.status === 'approved') { router.replace('/(tabs)'); return; }
            if (k.status === 'rejected') {
                setRejected(k.rejectionReason || 'Please re-submit your documents.');
                return;
            }
        } catch { /* offline — retry next tick */ }
        finally { setChecking(false); setRefreshing(false); setLoading(false); }
    }, []);

    useEffect(() => { check(); const t = setInterval(() => check(), POLL_MS); return () => clearInterval(t); }, [check]);

    const contactSupport = () => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=KYC%20Verification%20-%20${paymentId || 'Tractor Wala'}`).catch(() => { });

    const restartKyc = () => router.replace('/kyc');

    const logout = async () => {
        await setToken(null); await setStoredUser(null);
        router.replace('/login');
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={[styles.hero, { paddingTop: insets.top + 12 }]}>
                <Image source={require('../assets/images/icon.png')} style={styles.logo} resizeMode="contain" />
                <Text style={styles.brand}>{APP_NAME}</Text>
                <Text style={styles.heroSub}>Verification in progress</Text>
            </View>

            <ScrollView
                contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 16 }]}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); check(true); }} tintColor={colors.primary} />}
            >
                <View style={styles.statusIconRing}>
                    {rejected
                        ? <ShieldCheck size={38} color={colors.danger} />
                        : <Clock size={38} color={colors.primaryDark} />}
                </View>

                <Text style={styles.title}>
                    {rejected ? 'Verification Rejected' : 'Payment received — awaiting verification'}
                </Text>
                <Text style={styles.subtitle}>
                    {rejected
                        ? rejected
                        : `Your security deposit and documents were submitted successfully. Our team will verify your account within 24–48 hours.`}
                </Text>

                <View style={styles.card}>
                    <View style={styles.row}>
                        <Text style={styles.label}>Amount paid</Text>
                        <Text style={styles.value}>₹{deposit.toLocaleString('en-IN')}</Text>
                    </View>
                    {paymentId ? (
                        <>
                            <View style={styles.divider} />
                            <View style={styles.row}>
                                <Text style={styles.label}>Transaction ID</Text>
                                <Text style={[styles.value, { fontFamily: fonts.medium, fontSize: 11 }]}>{paymentId}</Text>
                            </View>
                        </>
                    ) : null}
                    {paidAt ? (
                        <>
                            <View style={styles.divider} />
                            <View style={styles.row}>
                                <Text style={styles.label}>Paid on</Text>
                                <Text style={styles.value}>{new Date(paidAt).toLocaleString('en-IN')}</Text>
                            </View>
                        </>
                    ) : null}
                    {submittedAt ? (
                        <>
                            <View style={styles.divider} />
                            <View style={styles.row}>
                                <Text style={styles.label}>Submitted</Text>
                                <Text style={styles.value}>{new Date(submittedAt).toLocaleString('en-IN')}</Text>
                            </View>
                        </>
                    ) : null}
                </View>

                {!rejected && (
                    <View style={styles.timeline}>
                        <TimelineDot ok label="Documents uploaded" />
                        <TimelineLine ok />
                        <TimelineDot ok label="Payment received" />
                        <TimelineLine active />
                        <TimelineDot active label="Admin verification" />
                        <TimelineLine />
                        <TimelineDot label="Start bidding" />
                    </View>
                )}

                {rejected ? (
                    <Pressable style={styles.primaryBtn} onPress={restartKyc}>
                        <Text style={styles.primaryText}>Re-submit documents</Text>
                    </Pressable>
                ) : (
                    <Pressable style={styles.primaryBtn} onPress={() => check(true)} disabled={checking}>
                        {checking
                            ? <ActivityIndicator color="#FFFFFF" />
                            : (<><RefreshCw size={15} color="#FFFFFF" /><Text style={styles.primaryText}>Check Status</Text></>)}
                    </Pressable>
                )}

                <Pressable style={styles.secondaryBtn} onPress={contactSupport}>
                    <Mail size={14} color={colors.primaryDark} />
                    <Text style={styles.secondaryText}>Contact Support</Text>
                </Pressable>

                <Pressable style={styles.tertiaryBtn} onPress={logout}>
                    <LogOut size={12} color={colors.mutedForeground} />
                    <Text style={styles.tertiaryText}>Log out</Text>
                </Pressable>

                {loading ? null : (
                    <Text style={styles.tip}>Tip: You'll be signed in automatically once the admin approves your account.</Text>
                )}
            </ScrollView>
        </View>
    );
}

function TimelineDot({ ok, active, label }: { ok?: boolean; active?: boolean; label: string }) {
    return (
        <View style={styles.tlItem}>
            <View style={[
                styles.tlDot,
                ok && { backgroundColor: colors.primary, borderColor: colors.primary },
                active && { backgroundColor: '#FFFFFF', borderColor: colors.primary, borderWidth: 2 },
            ]}>
                {ok ? <CheckCircle2 size={12} color="#FFFFFF" /> : active ? <View style={styles.pulse} /> : null}
            </View>
            <Text style={[styles.tlLabel, (ok || active) && { color: colors.foreground, fontFamily: fonts.bold }]}>{label}</Text>
        </View>
    );
}

function TimelineLine({ ok, active }: { ok?: boolean; active?: boolean }) {
    return <View style={[styles.tlLine, (ok || active) && { backgroundColor: colors.primary }]} />;
}

const styles = StyleSheet.create({
    hero: { backgroundColor: colors.primary, alignItems: 'center', paddingHorizontal: 6, paddingBottom: 20 },
    logo: { width: 56, height: 56 },
    brand: { color: '#FFFFFF', fontFamily: fonts.extrabold, fontSize: 18, marginTop: 6, letterSpacing: 0.5 },
    heroSub: { color: 'rgba(255,255,255,0.9)', fontFamily: fonts.medium, fontSize: 12, marginTop: 2 },
    body: { paddingHorizontal: 6, paddingTop: 14, alignItems: 'center' },
    statusIconRing: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.primaryLight, borderWidth: 2, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    title: { color: colors.foreground, fontFamily: fonts.extrabold, fontSize: 18, textAlign: 'center', marginTop: 10, paddingHorizontal: 6 },
    subtitle: { color: colors.mutedForeground, fontFamily: fonts.regular, fontSize: 12, textAlign: 'center', marginTop: 6, lineHeight: 18, paddingHorizontal: 6 },
    card: { width: '100%', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, marginTop: 14 },
    row: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 9 },
    label: { color: colors.mutedForeground, fontFamily: fonts.medium, fontSize: 11 },
    value: { color: colors.foreground, fontFamily: fonts.bold, fontSize: 12 },
    divider: { height: 1, backgroundColor: colors.border },
    timeline: { width: '100%', flexDirection: 'row', alignItems: 'center', marginTop: 14 },
    tlItem: { alignItems: 'center', width: 62 },
    tlDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
    pulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
    tlLabel: { color: colors.mutedForeground, fontFamily: fonts.medium, fontSize: 9, marginTop: 4, textAlign: 'center' },
    tlLine: { flex: 1, height: 2, backgroundColor: colors.border, marginBottom: 20 },
    primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.primary, paddingVertical: 12, borderRadius: radius.sm, width: '100%', marginTop: 14 },
    primaryText: { color: '#FFFFFF', fontFamily: fonts.extrabold, fontSize: 14, letterSpacing: 0.3 },
    secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primaryLight, paddingVertical: 10, borderRadius: radius.sm, width: '100%', marginTop: 6 },
    secondaryText: { color: colors.primaryDark, fontFamily: fonts.bold, fontSize: 13 },
    tertiaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, marginTop: 4 },
    tertiaryText: { color: colors.mutedForeground, fontFamily: fonts.bold, fontSize: 11 },
    tip: { color: colors.mutedForeground, fontFamily: fonts.regular, fontSize: 10, marginTop: 14, textAlign: 'center', paddingHorizontal: 6 },
});
