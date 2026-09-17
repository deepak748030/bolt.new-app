import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { ChevronRight, Wallet, Gavel, HelpCircle, LogOut, Bell, Pencil, FileCheck, Shield, ScrollText, PackageOpen, RotateCcw, ShoppingBag } from 'lucide-react-native';
import { colors, fonts } from '@/lib/theme';
import { userApi, setToken, setStoredUser, getStoredUser } from '@/lib/api';
import { disconnectSocket } from '@/lib/socket';
import BottomSheet from '@/components/BottomSheet';

const ROWS: { icon: any; label: string; route: string }[] = [
  { icon: Wallet, label: 'Wallet & Deposits', route: '/wallet' },
  { icon: Gavel, label: 'My Bids', route: '/my-bids' },
  { icon: FileCheck, label: 'KYC Verification', route: '/kyc' },
  { icon: Bell, label: 'Notifications', route: '/notifications' },
  { icon: HelpCircle, label: 'Help & Support', route: '/help-support' },
];

const POLICY_ROWS: { icon: any; label: string; route: string }[] = [
  { icon: ScrollText, label: 'Terms & Conditions', route: '/terms-and-conditions' },
  { icon: Shield, label: 'Privacy Policy', route: '/privacy-policy' },
  { icon: PackageOpen, label: 'Return Policy', route: '/return-policy' },
  { icon: RotateCcw, label: 'Refund Policy', route: '/refund-policy' },
  { icon: ShoppingBag, label: 'Shopping Policy', route: '/shopping-policy' },
];

type Me = {
  name: string; phone: string; email?: string; city?: string;
  walletBalance: number; totalBids: number; wonAuctions: number; createdAt?: string;
};

function formatJoined(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  } catch { return '—'; }
}

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const load = useCallback(async () => {
    try {
      const cached = await getStoredUser<Me>();
      if (cached) setMe(cached);
      const r = await userApi.me();
      setMe(r.user);
      await setStoredUser(r.user);
    } catch { /* stay with cached */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const doLogout = async () => {
    setLoggingOut(true);
    await setToken(null);
    await setStoredUser(null);
    disconnectSocket();
    setLoggingOut(false);
    setConfirm(false);
    router.replace('/login');
  };

  const displayPhone = me?.phone ? (me.phone.startsWith('+') ? me.phone : `+91 ${me.phone}`) : '';

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{me?.name?.charAt(0) || 'U'}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.name}>{me?.name || (loading ? 'Loading…' : 'Guest')}</Text>
            <Text style={styles.phone}>{displayPhone}</Text>
            <Text style={styles.city}>
              {(me?.city || '—')} · Member since {formatJoined(me?.createdAt)}
            </Text>
          </View>
          <Pressable style={styles.editBtn} onPress={() => router.push('/edit-profile')} hitSlop={8}>
            <Pencil size={14} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{me?.totalBids ?? 0}</Text>
          <Text style={styles.statLabel}>Total Bids</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{me?.wonAuctions ?? 0}</Text>
          <Text style={styles.statLabel}>Won</Text>
        </View>
        <View style={[styles.statBox, { borderRightWidth: 0 }]}>
          <Text style={styles.statValue}>₹{((me?.walletBalance ?? 0) / 1000).toFixed(1)}k</Text>
          <Text style={styles.statLabel}>Wallet</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 + insets.bottom }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
      >
        {loading && !me ? (
          <View style={{ padding: 20, alignItems: 'center' }}><ActivityIndicator color={colors.primary} /></View>
        ) : null}

        <View style={styles.card}>
          {ROWS.map((r, idx) => {
            const Icon = r.icon;
            return (
              <View key={r.label}>
                <Pressable style={styles.row} onPress={() => router.push(r.route as any)}>
                  <Icon size={18} color={colors.foreground} strokeWidth={1.8} />
                  <Text style={styles.rowLabel}>{r.label}</Text>
                  <ChevronRight size={16} color={colors.mutedForeground} />
                </Pressable>
                {idx < ROWS.length - 1 && <View style={styles.divider} />}
              </View>
            );
          })}
        </View>

        <View style={styles.sectionLabelWrap}>
          <Text style={styles.sectionLabel}>Policies & Legal</Text>
        </View>
        <View style={[styles.card, { marginTop: 0 }]}>
          {POLICY_ROWS.map((r, idx) => {
            const Icon = r.icon;
            return (
              <View key={r.label}>
                <Pressable style={styles.row} onPress={() => router.push(r.route as any)}>
                  <Icon size={18} color={colors.primaryDark} strokeWidth={1.8} />
                  <Text style={styles.rowLabel}>{r.label}</Text>
                  <ChevronRight size={16} color={colors.mutedForeground} />
                </Pressable>
                {idx < POLICY_ROWS.length - 1 && <View style={styles.divider} />}
              </View>
            );
          })}
        </View>

        <Pressable style={styles.logoutBtn} onPress={() => setConfirm(true)}>
          <LogOut size={16} color={colors.danger} />
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>

        <Text style={styles.version}>Tractor Wala · v1.0.0</Text>
      </ScrollView>

      <BottomSheet
        visible={confirm}
        variant="warning"
        title="Logout?"
        message="You'll need to sign in again with your mobile number."
        confirmText="Logout"
        cancelText="Cancel"
        loading={loggingOut}
        onConfirm={doLogout}
        onClose={() => !loggingOut && setConfirm(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.primary, paddingHorizontal: 6, paddingBottom: 14 },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 48, height: 48, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderRadius: 3 },
  avatarText: { color: colors.foreground, fontFamily: fonts.extrabold, fontSize: 20 },
  name: { color: '#FFFFFF', fontFamily: fonts.extrabold, fontSize: 16 },
  phone: { color: 'rgba(255,255,255,0.85)', fontFamily: fonts.medium, fontSize: 12, marginTop: -4 },
  city: { color: 'rgba(255,255,255,0.65)', fontFamily: fonts.regular, fontSize: 10, marginTop: -4 },
  editBtn: { width: 30, height: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', alignItems: 'center', justifyContent: 'center', borderRadius: 2 },
  statsRow: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: colors.border },
  statBox: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRightWidth: 1, borderRightColor: colors.border },
  statValue: { color: colors.foreground, fontFamily: fonts.extrabold, fontSize: 17 },
  statLabel: { color: colors.mutedForeground, fontFamily: fonts.medium, fontSize: 10, letterSpacing: 0.4, textTransform: 'uppercase' },
  card: { backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border, marginTop: 6, borderTopWidth: 1, borderTopColor: colors.border },
  sectionLabelWrap: { paddingHorizontal: 6, paddingTop: 12 },
  sectionLabel: { color: colors.mutedForeground, fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 12, gap: 10 },
  rowLabel: { flex: 1, color: colors.foreground, fontFamily: fonts.semibold, fontSize: 13 },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 38 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.danger, paddingVertical: 11, marginHorizontal: 6, marginTop: 10 },
  logoutText: { color: colors.danger, fontFamily: fonts.bold, fontSize: 13 },
  version: { color: colors.mutedForeground, fontFamily: fonts.medium, fontSize: 10, textAlign: 'center', marginTop: 14 },
});
