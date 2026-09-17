import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, ActivityIndicator, KeyboardAvoidingView, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Upload, Check, ShieldCheck, Clock, Mail, CreditCard, Lock, X as XIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors, fonts, radius } from '@/lib/theme';
import BottomSheet from '@/components/BottomSheet';
import CashfreeCheckoutSheet from '@/components/CashfreeCheckoutSheet';
import { kycApi, uploadApi } from '@/lib/api';


type StepKey = 1 | 2 | 3 | 4 | 5;

const APP_NAME = 'Tractor Wala';
const DEPOSIT_AMOUNT = 5000;

export default function KycScreen() {
    const insets = useSafeAreaInsets();
    const [step, setStep] = useState<StepKey>(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [toast, setToast] = useState<string | null>(null);
    const [hydrating, setHydrating] = useState(true);

    // Step 1 - Profile
    const [name, setName] = useState('');
    const [dealership, setDealership] = useState('');
    const [dealerId, setDealerId] = useState('');
    const [contact, setContact] = useState('');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');

    // Step 2 - Personal docs (store the uploaded URL, not just a boolean)
    const [aadharFront, setAadharFront] = useState('');
    const [aadharBack, setAadharBack] = useState('');
    const [pan, setPan] = useState('');
    const [photo, setPhoto] = useState('');

    // Step 3 - Dealership / bank docs
    const [passbook, setPassbook] = useState('');
    const [cheque, setCheque] = useState('');
    const [dealerCert, setDealerCert] = useState('');
    const [certType, setCertType] = useState<'MSME' | 'Shop Act' | 'GST'>('GST');


    // Step 4 - Security deposit via Cashfree
    const [paid, setPaid] = useState(false);
    const [paymentId, setPaymentId] = useState<string | null>(null);
    const [showCashfree, setShowCashfree] = useState(false);

    // Hydrate any existing KYC record so users resume where they left off.
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const r = await kycApi.mine();
                if (!alive) return;
                const k = r.data;
                if (k.name) setName(k.name);
                if (k.dealership) setDealership(k.dealership);
                if (k.dealerId) setDealerId(k.dealerId);
                if (k.contact) setContact(k.contact);
                if (k.address) setAddress(k.address);
                if (k.city) setCity(k.city);
                if (k.state) setState(k.state);
                const d = k.docs || {};
                if (d.aadharFront) setAadharFront(d.aadharFront);
                if (d.aadharBack) setAadharBack(d.aadharBack);
                if (d.pan) setPan(d.pan);
                if (d.photo) setPhoto(d.photo);
                if (d.passbook) setPassbook(d.passbook);
                if (d.cheque) setCheque(d.cheque);
                if (d.dealerCert) setDealerCert(d.dealerCert);
                if (d.certType) setCertType(d.certType);

                if (k.depositPaymentId) { setPaid(true); setPaymentId(k.depositPaymentId); }
                if (k.status === 'pending' || k.status === 'rejected') { router.replace('/payment-pending' as any); return; }
                if (k.status === 'approved') { router.replace('/(tabs)'); return; }

            } catch { /* first-time user or offline; keep defaults */ }
            finally { if (alive) setHydrating(false); }
        })();
        return () => { alive = false; };
    }, []);

    const validateStep1 = () => {
        if (!name.trim()) return 'Name is required';
        if (!dealership.trim()) return 'Dealership name is required';
        if (!/^[6-9]\d{9}$/.test(contact)) return 'Enter a valid 10-digit contact number';
        if (!address.trim()) return 'Full address is required';
        if (!city.trim()) return 'City is required';
        if (!state.trim()) return 'State is required';
        return null;
    };

    const next = async () => {
        if (step === 1) {
            const err = validateStep1();
            if (err) { setError(err); return; }
        }
        if (step === 4 && !paid) { setError('Please complete the security deposit payment'); return; }
        setLoading(true);
        try {
            if (step === 1) {
                await kycApi.saveProfile({ name, dealership, dealerId, contact, address, city, state });
            } else if (step === 2) {
                await kycApi.saveDocs({
                    aadharFront: aadharFront || '',
                    aadharBack: aadharBack || '',
                    pan: pan || '',
                    photo: photo || '',
                });
            } else if (step === 3) {
                await kycApi.saveDocs({
                    passbook: passbook || '',
                    cheque: cheque || '',
                    dealerCert: dealerCert || '',
                    certType,
                });
            } else if (step === 4) {

                await kycApi.submit();
                router.replace('/payment-pending' as any);
                return;
            }
            setStep((s) => (Math.min(5, (s + 1)) as StepKey));
        } catch (e: any) {
            setError(e?.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };


    const skip = () => setStep((s) => (Math.min(5, (s + 1)) as StepKey));

    return (
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior="padding">
            <View style={[styles.hero, { paddingTop: insets.top + 8 }]}>
                <View style={styles.brandRow}>
                    <Image source={require('../assets/images/icon.png')} style={styles.brandLogo} resizeMode="contain" />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.brand}>{APP_NAME}</Text>
                        <Text style={styles.heroSub}>{step === 5 ? 'Verification status' : `KYC · Step ${step} of 4`}</Text>
                    </View>
                </View>
                {step <= 4 && (
                    <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${(step / 4) * 100}%` }]} />
                    </View>
                )}
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 6, paddingTop: 6, paddingBottom: insets.bottom + 16 }} keyboardShouldPersistTaps="handled">
                {step === 1 && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Profile details</Text>
                        <Text style={styles.cardSub}>Tell us about your dealership</Text>
                        <View style={styles.sep} />
                        <Field label="Name" required value={name} onChangeText={setName} placeholder="Full name" />
                        <Field label="Dealership Name" required value={dealership} onChangeText={setDealership} placeholder="Business name" />
                        <Field label="Dealer Id" value={dealerId} onChangeText={setDealerId} placeholder="Optional" />
                        <Field label="Dealer Contact No" required value={contact} onChangeText={(t: string) => setContact(t.replace(/[^0-9]/g, ''))} placeholder="10-digit mobile" keyboardType="number-pad" maxLength={10} />
                        <Field label="Full Address" required value={address} onChangeText={setAddress} placeholder="Street, area, landmark" multiline />
                        <Field label="City" required value={city} onChangeText={setCity} placeholder="City" />
                        <Field label="State" required value={state} onChangeText={setState} placeholder="State" />
                    </View>
                )}

                {step === 2 && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Personal documents</Text>
                        <Text style={styles.cardSub}>Upload clear photos for verification</Text>
                        <View style={styles.sep} />
                        <UploadField label="Aadhar Card – Front" value={aadharFront} onChange={setAadharFront} onError={setError} />
                        <UploadField label="Aadhar Card – Back" value={aadharBack} onChange={setAadharBack} onError={setError} />
                        <UploadField label="PAN Card" value={pan} onChange={setPan} onError={setError} />
                        <UploadField label="Passport Size Photo" value={photo} onChange={setPhoto} onError={setError} />

                    </View>
                )}

                {step === 3 && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Bank & dealership documents</Text>
                        <Text style={styles.cardSub}>Bank proof and any one business certificate</Text>
                        <View style={styles.sep} />
                        <UploadField label="Bank Passbook" value={passbook} onChange={setPassbook} onError={setError} />
                        <UploadField label="Cancelled Cheque" value={cheque} onChange={setCheque} onError={setError} />

                        <Text style={[styles.label, { marginTop: 6 }]}>Dealer Certificate (any 1)</Text>
                        <View style={styles.segRow}>
                            {(['MSME', 'Shop Act', 'GST'] as const).map((t) => (
                                <Pressable
                                    key={t}
                                    style={[styles.segBtn, certType === t && styles.segBtnActive]}
                                    onPress={() => setCertType(t)}
                                >
                                    <Text style={[styles.segText, certType === t && styles.segTextActive]}>{t}</Text>
                                </Pressable>
                            ))}
                        </View>
                        <UploadField label={`Upload ${certType} Certificate`} value={dealerCert} onChange={setDealerCert} onError={setError} />

                    </View>
                )}

                {step === 4 && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Security deposit</Text>
                        <Text style={styles.cardSub}>Refundable amount to activate bidding</Text>
                        <View style={styles.sep} />

                        <View style={styles.amountBox}>
                            <Text style={styles.amountLabel}>Pay amount</Text>
                            <Text style={styles.amountValue}>₹ {DEPOSIT_AMOUNT.toLocaleString('en-IN')}</Text>
                        </View>

                        <View style={styles.rzpInfoRow}>
                            <View style={styles.rzpLogo}><Text style={styles.rzpLogoText}>C</Text></View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.rzpTitle}>Pay securely via Cashfree</Text>
                                <Text style={styles.rzpSub}>UPI · Cards · Net Banking · Wallets</Text>
                            </View>
                            <View style={styles.testTag}>
                                <Text style={styles.testTagText}>SECURE</Text>
                            </View>
                        </View>

                        {paid ? (
                            <View style={styles.paidBox}>
                                <View style={styles.paidIcon}><Check size={14} color="#FFFFFF" /></View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.paidTitle}>Payment Received</Text>
                                    <Text style={styles.paidSub}>Txn ID: {paymentId}</Text>
                                </View>
                            </View>
                        ) : (
                            <Pressable style={styles.rzpBtn} onPress={() => setShowCashfree(true)}>
                                <CreditCard size={14} color="#FFFFFF" />
                                <Text style={styles.rzpBtnText}>Pay ₹{DEPOSIT_AMOUNT.toLocaleString('en-IN')}</Text>
                            </Pressable>
                        )}

                        <View style={styles.secureRow}>
                            <Lock size={10} color={colors.mutedForeground} />
                            <Text style={styles.secureText}>100% safe payments. Refundable on KYC closure.</Text>
                        </View>
                    </View>
                )}

                {step === 5 && (
                    <View style={[styles.card, { alignItems: 'center' }]}>
                        <View style={styles.statusIcon}>
                            <Clock size={26} color={colors.accentDark} />
                        </View>
                        <Text style={styles.statusTitle}>Application submitted</Text>
                        <Text style={styles.statusBadge}>Status: Pending approval</Text>
                        <Text style={styles.statusMsg}>
                            Thanks! Aapka ₹{DEPOSIT_AMOUNT.toLocaleString('en-IN')} security deposit aur documents humein mil gaye hain.
                            {APP_NAME} team aapki details 24–48 ghante mein verify karke approval degi.
                        </Text>

                        <Pressable style={styles.supportBtn} onPress={() => setToast('Mail draft opened')}>
                            <Mail size={12} color="#FFFFFF" />
                            <Text style={styles.supportText}>Support on Mail</Text>
                        </Pressable>

                        <Pressable style={styles.outlineBtn} onPress={() => router.replace('/(tabs)')}>
                            <ShieldCheck size={12} color={colors.primary} />
                            <Text style={styles.outlineText}>Continue to App</Text>
                        </Pressable>
                    </View>
                )}

                {step <= 4 && (
                    <View style={styles.actionRow}>
                        <Pressable style={[styles.primaryBtn, loading && { opacity: 0.85 }]} onPress={next} disabled={loading}>
                            {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryBtnText}>{step === 4 ? 'Submit' : 'Next'}</Text>}
                        </Pressable>
                        {(step === 2 || step === 3) && !loading && (
                            <Pressable style={styles.skipBtn} onPress={skip}>
                                <Text style={styles.skipText}>Skip</Text>
                            </Pressable>
                        )}
                    </View>
                )}
            </ScrollView>

            <BottomSheet
                visible={!!error}
                variant="error"
                title="Please check"
                message={error || ''}
                confirmText="OK"
                onClose={() => setError(null)}
            />
            <BottomSheet
                visible={!!toast}
                variant="success"
                title={toast || ''}
                confirmText="Done"
                onClose={() => setToast(null)}
            />

            <CashfreeCheckoutSheet
                visible={showCashfree}
                purpose="kyc_deposit"
                amount={DEPOSIT_AMOUNT}
                description="Security deposit · Refundable"
                onSuccess={(result) => {
                    const id = result.payment?.gatewayPaymentId || '';
                    setPaid(true);
                    setPaymentId(id);
                    setShowCashfree(false);
                    setToast('Payment successful');
                }}
                onError={(msg) => setError(msg)}
                onClose={() => setShowCashfree(false)}
            />
        </KeyboardAvoidingView>
    );
}

function Field({ label, required, multiline, ...rest }: any) {
    return (
        <View style={styles.field}>
            <Text style={styles.label}>{label}{required ? <Text style={{ color: colors.danger }}> *</Text> : null}</Text>
            <TextInput
                {...rest}
                placeholderTextColor={colors.mutedForeground}
                style={[styles.input, multiline && { height: 52, textAlignVertical: 'top', paddingTop: 6 }]}
                multiline={!!multiline}
            />
        </View>
    );
}

function UploadField({
    label, value, onChange, onError,
}: {
    label: string;
    value: string;
    onChange: (url: string) => void;
    onError: (msg: string) => void;
}) {
    const [busy, setBusy] = useState(false);
    const selected = !!value;

    const pick = async () => {
        if (busy) return;
        try {
            const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!perm.granted) {
                onError('Please allow photo library access to upload documents.');
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: false,
                quality: 0.7,
                exif: false,
            });
            if (result.canceled || !result.assets?.[0]) return;
            const asset = result.assets[0];
            setBusy(true);
            const res = await uploadApi.upload(
                { uri: asset.uri, name: asset.fileName || 'document.jpg', type: asset.mimeType || 'image/jpeg' },
                'image'
            );
            onChange(res.url);
        } catch (e: any) {
            onError(e?.message || 'Upload failed. Please try again.');
        } finally {
            setBusy(false);
        }
    };

    const remove = () => onChange('');

    return (
        <View style={styles.field}>
            <Text style={styles.label}>{label}</Text>
            <Pressable
                style={[styles.uploadBox, selected && styles.uploadBoxSelected, busy && { opacity: 0.7 }]}
                onPress={pick}
                disabled={busy}
            >
                {busy ? (
                    <ActivityIndicator color={colors.primary} size="small" />
                ) : selected ? (
                    <>
                        <Image source={{ uri: value }} style={styles.uploadThumb} />
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.uploadText, { color: colors.primaryDark, fontFamily: fonts.bold }]}>
                                Uploaded
                            </Text>
                            <Text style={styles.uploadHint} numberOfLines={1}>Tap to change</Text>
                        </View>
                        <Pressable onPress={remove} hitSlop={8} style={styles.removeBtn}>
                            <XIcon size={12} color={colors.danger} />
                        </Pressable>
                    </>
                ) : (
                    <>
                        <View style={styles.uploadIcon}>
                            <Upload size={12} color={colors.primary} />
                        </View>
                        <Text style={styles.uploadText}>Choose file</Text>
                    </>
                )}
            </Pressable>
        </View>
    );
}


const styles = StyleSheet.create({
    hero: { backgroundColor: colors.primary, paddingHorizontal: 6, paddingBottom: 10 },
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    brandLogo: { width: 34, height: 34 },
    brand: { color: '#FFFFFF', fontFamily: fonts.extrabold, fontSize: 15, letterSpacing: 0.3 },
    heroSub: { color: 'rgba(255,255,255,0.9)', fontFamily: fonts.medium, fontSize: 11, marginTop: 1 },
    progressTrack: { marginTop: 8, height: 4, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden', borderRadius: radius.pill },
    progressFill: { height: '100%', backgroundColor: colors.primaryGlow, borderRadius: radius.pill },

    card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, padding: 8, borderRadius: radius.md },
    cardTitle: { color: colors.foreground, fontFamily: fonts.extrabold, fontSize: 14 },
    cardSub: { color: colors.mutedForeground, fontFamily: fonts.regular, fontSize: 11, marginTop: 1 },
    sep: { height: 1, backgroundColor: colors.border, marginTop: 6 },

    field: { marginTop: 6 },
    label: { color: colors.foreground, fontFamily: fonts.semibold, fontSize: 12, marginBottom: 3 },
    input: { borderWidth: 1, borderColor: colors.inputBorder, backgroundColor: colors.inputBg, paddingHorizontal: 8, paddingVertical: 6, fontFamily: fonts.medium, fontSize: 13, color: colors.foreground, borderRadius: radius.sm, minHeight: 34 },

    uploadBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.inputBorder, borderStyle: 'dashed', backgroundColor: colors.inputBg, paddingHorizontal: 8, paddingVertical: 10, borderRadius: radius.sm, minHeight: 46 },
    uploadBoxSelected: { borderStyle: 'solid', backgroundColor: colors.primaryLight, borderColor: colors.primary },
    uploadIcon: { width: 24, height: 24, borderRadius: radius.xs, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
    uploadThumb: { width: 34, height: 34, borderRadius: radius.xs, backgroundColor: colors.border, borderWidth: 1, borderColor: colors.border },
    uploadText: { color: colors.mutedForeground, fontFamily: fonts.medium, fontSize: 12 },
    uploadHint: { color: colors.mutedForeground, fontFamily: fonts.regular, fontSize: 10, marginTop: 1 },
    removeBtn: { width: 24, height: 24, borderRadius: radius.xs, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FCA5A5' },


    segRow: { flexDirection: 'row', gap: 6, marginTop: 4, marginBottom: 2 },
    segBtn: { flex: 1, paddingVertical: 6, alignItems: 'center', borderWidth: 1, borderColor: colors.inputBorder, backgroundColor: colors.card, borderRadius: radius.sm },
    segBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    segText: { color: colors.foreground, fontFamily: fonts.bold, fontSize: 11 },
    segTextActive: { color: '#FFFFFF' },

    amountBox: { marginTop: 6, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primaryLight, paddingHorizontal: 8, paddingVertical: 8, alignItems: 'center', borderRadius: radius.sm },
    amountLabel: { color: colors.primaryDark, fontFamily: fonts.semibold, fontSize: 11 },
    amountValue: { color: colors.primaryDark, fontFamily: fonts.extrabold, fontSize: 22, marginTop: 2 },

    helper: { color: colors.mutedForeground, fontFamily: fonts.regular, fontSize: 11, marginTop: 6, textAlign: 'center' },

    upiRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: colors.background, borderRadius: radius.sm },
    upiLabel: { color: colors.mutedForeground, fontFamily: fonts.medium, fontSize: 10 },
    upiId: { color: colors.foreground, fontFamily: fonts.bold, fontSize: 13 },
    copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.sm },
    copyText: { color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 11 },

    qrBox: { alignItems: 'center', marginTop: 6, padding: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, borderRadius: radius.sm },
    qrInner: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm },
    qrCaption: { color: colors.mutedForeground, fontFamily: fonts.medium, fontSize: 10, marginTop: 6 },

    actionRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
    primaryBtn: { flex: 1, backgroundColor: colors.primary, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
    primaryBtnText: { color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 13 },
    skipBtn: { paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
    skipText: { color: colors.foreground, fontFamily: fonts.bold, fontSize: 12 },

    statusIcon: { width: 52, height: 52, borderRadius: radius.sm, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.primary, marginTop: 4 },
    statusTitle: { color: colors.foreground, fontFamily: fonts.extrabold, fontSize: 15, marginTop: 8 },
    statusBadge: { marginTop: 4, color: colors.primaryDark, fontFamily: fonts.bold, fontSize: 11, backgroundColor: colors.primaryLight, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: colors.primary, borderRadius: radius.pill },
    statusMsg: { color: colors.mutedForeground, fontFamily: fonts.regular, fontSize: 12, marginTop: 8, textAlign: 'center', lineHeight: 17 },
    supportBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.sm },
    supportText: { color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 12 },
    outlineBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, borderWidth: 1, borderColor: colors.primary, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.card, borderRadius: radius.sm },
    outlineText: { color: colors.primary, fontFamily: fonts.bold, fontSize: 12 },


    rzpInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, padding: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, borderRadius: radius.sm },
    rzpLogo: { width: 30, height: 30, backgroundColor: '#072654', alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
    rzpLogoText: { color: '#FFFFFF', fontFamily: fonts.extrabold, fontSize: 16 },
    rzpTitle: { color: colors.foreground, fontFamily: fonts.bold, fontSize: 12 },
    rzpSub: { color: colors.mutedForeground, fontFamily: fonts.medium, fontSize: 10, marginTop: 1 },
    testTag: { borderWidth: 1, borderColor: colors.accent, backgroundColor: colors.accentLight, paddingHorizontal: 5, paddingVertical: 2, borderRadius: radius.xs },
    testTagText: { color: colors.accentDark, fontFamily: fonts.extrabold, fontSize: 9, letterSpacing: 0.6 },

    rzpBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8, backgroundColor: colors.primary, paddingVertical: 11, borderRadius: radius.sm },
    rzpBtnText: { color: '#FFFFFF', fontFamily: fonts.extrabold, fontSize: 14 },

    paidBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, padding: 8, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primaryLight, borderRadius: radius.sm },
    paidIcon: { width: 26, height: 26, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
    paidTitle: { color: colors.primaryDark, fontFamily: fonts.extrabold, fontSize: 13 },
    paidSub: { color: colors.primaryDark, fontFamily: fonts.medium, fontSize: 10, marginTop: 1 },

    secureRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 6 },
    secureText: { color: colors.mutedForeground, fontFamily: fonts.medium, fontSize: 10 },
});
