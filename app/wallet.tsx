import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenHeader from '@/components/ScreenHeader';
import BottomSheet from '@/components/BottomSheet';
import { colors, fonts } from '@/lib/theme';
import { userApi, txApi, setStoredUser, type ApiTransaction } from '@/lib/api';
import CashfreeCheckoutSheet from '@/components/CashfreeCheckoutSheet';
import { ArrowDownCircle, ArrowUpCircle, Plus, ShieldCheck } from 'lucide-react-native';

function formatDate(iso: string) {
    try {
        return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch { return iso; }
}

export default function WalletScreen() {
    const insets = useSafeAreaInsets();
    const [balance, setBalance] = useState<number>(0);
    const [txs, setTxs] = useState<ApiTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showAdd, setShowAdd] = useState(false);
    const [showPay, setShowPay] = useState(false);
    const [payAmount, setPayAmount] = useState(0);
    const [amount, setAmount] = useState('500');
    const [done, setDone] = useState<string | null>(null);
    const [err, setErr] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            const [meRes, txRes] = await Promise.all([userApi.me(), txApi.mine(50)]);
            setBalance(meRes.user?.walletBalance || 0);
            setTxs(txRes.data);
            await setStoredUser(meRes.user);
        } catch (e: any) {
            setErr(e?.message || 'Could not load wallet');
        } finally { setLoading(false); setRefreshing(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const submitTopup = async () => {
        const amt = Number(amount);
        if (!amt || amt < 100) { setErr('Enter an amount of ₹100 or more'); return; }
        setPayAmount(amt);
        setShowAdd(false);
        setShowPay(true);
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScreenHeader title="Wallet & Deposits" />
            <View style={styles.balanceCard}>
                <Text style={styles.balLabel}>Available Balance</Text>
                <Text style={styles.balValue}>₹{balance.toLocaleString('en-IN')}</Text>
                <View style={styles.trustRow}>
                    <ShieldCheck size={11} color="#FFFFFF" />
                    <Text style={styles.trustText}>Secured by Tractor Wala · Refundable</Text>
                </View>
                <Pressable style={styles.addBtn} onPress={() => setShowAdd(true)}>
                    <Plus size={14} color="#FFFFFF" /><Text style={styles.addText}>Add Money</Text>
                </Pressable>
            </View>

            <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>Recent Transactions</Text>
            </View>
            <FlatList
                data={txs}
                keyExtractor={(i) => i.id}
                contentContainerStyle={{ paddingBottom: 24 + insets.bottom }}
                ItemSeparatorComponent={() => <View style={styles.sep} />}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
                ListEmptyComponent={
                    loading ? (
                        <View style={{ padding: 20, alignItems: 'center' }}><ActivityIndicator color={colors.primary} /></View>
                    ) : (
                        <View style={{ padding: 20, alignItems: 'center' }}>
                            <Text style={{ color: colors.mutedForeground, fontFamily: fonts.medium, fontSize: 12 }}>No transactions yet.</Text>
                        </View>
                    )
                }
                renderItem={({ item }) => {
                    const credit = item.type === 'credit';
                    const Icon = credit ? ArrowDownCircle : ArrowUpCircle;
                    return (
                        <View style={styles.txRow}>
                            <View style={[styles.txIcon, { backgroundColor: credit ? '#DCFCE7' : '#FEE2E2' }]}>
                                <Icon size={16} color={credit ? colors.success : colors.danger} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.txTitle} numberOfLines={1}>{item.title}</Text>
                                <Text style={styles.txDate}>{formatDate(item.createdAt)}</Text>
                            </View>
                            <Text style={[styles.txAmt, { color: credit ? colors.success : colors.danger }]}>
                                {credit ? '+' : '−'}₹{item.amount.toLocaleString('en-IN')}
                            </Text>
                        </View>
                    );
                }}
            />

            <BottomSheet
                visible={showAdd}
                variant="info"
                title="Add Money"
                message="Enter amount to add to your Tractor Wala wallet."
                confirmText="Pay with Cashfree"
                cancelText="Cancel"
                onConfirm={submitTopup}
                onClose={() => setShowAdd(false)}
            >
                <View style={styles.amountRow}>
                    <Text style={styles.rupeeSign}>₹</Text>
                    <TextInput
                        style={styles.amountInput}
                        value={amount}
                        keyboardType="number-pad"
                        onChangeText={(t) => setAmount(t.replace(/[^0-9]/g, ''))}
                        placeholder="500"
                        placeholderTextColor={colors.mutedForeground}
                    />
                </View>
                <View style={styles.chipsRow}>
                    {[500, 1000, 2000, 5000].map((v) => (
                        <Pressable key={v} style={styles.chip} onPress={() => setAmount(String(v))}>
                            <Text style={styles.chipText}>₹{v}</Text>
                        </Pressable>
                    ))}
                </View>
            </BottomSheet>

            <BottomSheet
                visible={!!done}
                variant="success"
                title="Money added"
                message={done || ''}
                confirmText="Done"
                onClose={() => setDone(null)}
            />
            <BottomSheet
                visible={!!err}
                variant="error"
                title="Something went wrong"
                message={err || ''}
                confirmText="Got it"
                onClose={() => setErr(null)}
            />

            <CashfreeCheckoutSheet
                visible={showPay}
                purpose="wallet_topup"
                amount={payAmount}
                description="Wallet top-up"
                onSuccess={async (result) => {
                    const user = result.user;
                    const credited = result.payment?.amount || payAmount;
                    if (user) {
                        setBalance(user.walletBalance || balance + credited);
                        await setStoredUser(user);
                    }
                    setShowPay(false);
                    setDone(`₹${credited.toLocaleString('en-IN')} has been credited to your wallet.`);
                    try {
                        const txRes = await txApi.mine(50);
                        setTxs(txRes.data);
                    } catch { /* ignore */ }
                }}
                onError={(msg) => setErr(msg)}
                onClose={() => setShowPay(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    balanceCard: { backgroundColor: colors.primary, paddingHorizontal: 6, paddingTop: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.primaryDark },
    balLabel: { color: 'rgba(255,255,255,0.85)', fontFamily: fonts.medium, fontSize: 11 },
    balValue: { color: '#FFFFFF', fontFamily: fonts.extrabold, fontSize: 26, marginTop: 2 },
    trustRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    trustText: { color: 'rgba(255,255,255,0.85)', fontFamily: fonts.medium, fontSize: 10 },
    addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: colors.accent, paddingVertical: 9, marginTop: 8 },
    addText: { color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 12 },
    sectionHead: { paddingHorizontal: 6, paddingTop: 6, paddingBottom: 6, backgroundColor: colors.background },
    sectionTitle: { color: colors.foreground, fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.4, textTransform: 'uppercase' },
    txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 6, backgroundColor: colors.card },
    txIcon: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
    txTitle: { color: colors.foreground, fontFamily: fonts.semibold, fontSize: 12 },
    txDate: { color: colors.mutedForeground, fontFamily: fonts.regular, fontSize: 10, marginTop: 1 },
    txAmt: { fontFamily: fonts.extrabold, fontSize: 13 },
    sep: { height: 1, backgroundColor: colors.border },
    amountRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.inputBorder, backgroundColor: colors.inputBg, paddingHorizontal: 10, marginTop: 6 },
    rupeeSign: { color: colors.primaryDark, fontFamily: fonts.extrabold, fontSize: 16, marginRight: 4 },
    amountInput: { flex: 1, paddingVertical: 8, fontFamily: fonts.extrabold, fontSize: 16, color: colors.foreground },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
    chip: { paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
    chipText: { color: colors.foreground, fontFamily: fonts.semibold, fontSize: 11 },
});
