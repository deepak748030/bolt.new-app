import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, ActivityIndicator, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenHeader from '@/components/ScreenHeader';
import BottomSheet from '@/components/BottomSheet';
import { colors, fonts } from '@/lib/theme';
import { userApi, setStoredUser, getStoredUser } from '@/lib/api';
import { router } from 'expo-router';
import { ShieldCheck } from 'lucide-react-native';

type Field = { key: 'name' | 'email' | 'city'; label: string; placeholder: string; keyboardType?: any };

const FIELDS: Field[] = [
    { key: 'name', label: 'Full Name', placeholder: 'Enter your name' },
    { key: 'email', label: 'Email', placeholder: 'name@example.com', keyboardType: 'email-address' },
    { key: 'city', label: 'City', placeholder: 'City, State' },
];

export default function EditProfileScreen() {
    const insets = useSafeAreaInsets();
    const [phone, setPhone] = useState<string>('');
    const [form, setForm] = useState({ name: '', email: '', city: '' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [done, setDone] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            const cached = await getStoredUser<any>();
            if (cached) {
                setForm({ name: cached.name || '', email: cached.email || '', city: cached.city || '' });
                setPhone(cached.phone || '');
            }
            try {
                const r = await userApi.me();
                setForm({ name: r.user?.name || '', email: r.user?.email || '', city: r.user?.city || '' });
                setPhone(r.user?.phone || '');
                await setStoredUser(r.user);
            } catch { /* keep cached */ }
            finally { setLoading(false); }
        })();
    }, []);

    const onSave = async () => {
        if (!form.name.trim()) return setErr('Name is required');
        if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) return setErr('Enter a valid email');
        setSaving(true);
        try {
            const r = await userApi.update({
                name: form.name.trim(),
                email: form.email.trim(),
                city: form.city.trim(),
            });
            await setStoredUser(r.user);
            setDone(true);
        } catch (e: any) {
            setErr(e?.message || 'Could not save changes');
        } finally { setSaving(false); }
    };

    const displayPhone = phone ? (phone.startsWith('+') ? phone : `+91 ${phone}`) : '—';

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScreenHeader title="Edit Profile" />
            <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
                <ScrollView contentContainerStyle={{ paddingBottom: 24 + insets.bottom }} keyboardShouldPersistTaps="handled">
                    <View style={styles.phoneCard}>
                        <View style={styles.avatar}><Text style={styles.avatarText}>{form.name.charAt(0) || 'U'}</Text></View>
                        <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={styles.phoneLabel}>Mobile Number</Text>
                            <Text style={styles.phone}>{displayPhone}</Text>
                            <View style={styles.verifiedRow}>
                                <ShieldCheck size={10} color={colors.success} />
                                <Text style={styles.phoneHint}>Verified · Cannot be changed</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.sep} />

                    {loading ? (
                        <View style={{ padding: 20, alignItems: 'center' }}><ActivityIndicator color={colors.primary} /></View>
                    ) : (
                        <View style={styles.formWrap}>
                            {FIELDS.map((f) => (
                                <View key={f.key} style={styles.field}>
                                    <Text style={styles.label}>{f.label}</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={form[f.key]}
                                        onChangeText={(t) => setForm({ ...form, [f.key]: t })}
                                        placeholder={f.placeholder}
                                        placeholderTextColor={colors.mutedForeground}
                                        keyboardType={f.keyboardType}
                                        autoCapitalize={f.key === 'email' ? 'none' : 'words'}
                                    />
                                </View>
                            ))}

                            <Pressable style={styles.saveBtn} onPress={onSave} disabled={saving}>
                                {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveText}>Save Changes</Text>}
                            </Pressable>
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>

            <BottomSheet
                visible={done}
                variant="success"
                title="Profile updated"
                message="Your details have been saved successfully."
                confirmText="Done"
                onConfirm={() => { setDone(false); router.back(); }}
                onClose={() => { setDone(false); router.back(); }}
            />
            <BottomSheet
                visible={!!err}
                variant="error"
                title="Something went wrong"
                message={err || ''}
                confirmText="Got it"
                onClose={() => setErr(null)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    phoneCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, paddingHorizontal: 6, paddingVertical: 10 },
    avatar: { width: 48, height: 48, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
    avatarText: { color: colors.primaryDark, fontFamily: fonts.extrabold, fontSize: 20 },
    phoneLabel: { color: colors.mutedForeground, fontFamily: fonts.medium, fontSize: 10 },
    phone: { color: colors.foreground, fontFamily: fonts.bold, fontSize: 14, marginTop: 1 },
    verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
    phoneHint: { color: colors.success, fontFamily: fonts.medium, fontSize: 10 },
    sep: { height: 1, backgroundColor: colors.border },
    formWrap: { paddingHorizontal: 6, paddingTop: 6 },
    field: { marginTop: 6 },
    label: { color: colors.mutedForeground, fontFamily: fonts.semibold, fontSize: 11, marginBottom: 3 },
    input: { backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.inputBorder, paddingHorizontal: 8, paddingVertical: 7, fontFamily: fonts.medium, fontSize: 13, color: colors.foreground },
    saveBtn: { backgroundColor: colors.primary, paddingVertical: 11, alignItems: 'center', marginTop: 12 },
    saveText: { color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 13 },
});
