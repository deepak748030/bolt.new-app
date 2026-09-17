import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator, KeyboardAvoidingView, ScrollView, BackHandler } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft, Eye, EyeOff } from 'lucide-react-native';
import { colors, radius, fonts } from '@/lib/theme';
import { authApi, setToken, setStoredUser, kycApi } from '@/lib/api';
import BottomSheet from '@/components/BottomSheet';

type Step = 'login' | 'forgot-id' | 'forgot-otp' | 'signup-phone' | 'signup-otp' | 'details';
const OTP_LEN = 6;

// Shared post-login routing — send the user wherever their KYC status needs them.
async function completeLogin(token: string, user: any) {
  await setToken(token);
  await setStoredUser(user);
  try {
    const k = await kycApi.mine();
    const st = k.data.status;
    if (st === 'approved') { router.replace('/(tabs)'); return; }
    if (st === 'pending' || st === 'in_progress') { router.replace('/payment-pending' as any); return; }
    // not_started or rejected → fill KYC form
    router.replace('/kyc');
  } catch {
    router.replace('/kyc');
  }
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();

  // login step
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // forgot password steps
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // signup / otp steps
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSentMsg, setOtpSentMsg] = useState('');

  // signup details
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [dealerName, setDealerName] = useState('');
  const [dealerCode, setDealerCode] = useState('');

  const [step, setStep] = useState<Step>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const otpRef = useRef<TextInput | null>(null);

  const phoneValid = /^[6-9]\d{9}$/.test(phone);
  const idFilled = identifier.trim().length > 0;
  const newPassValid = newPassword.length >= 6;
  const detailsValid = !!name.trim() && !!address.trim() && !!dealerName.trim() && !!dealerCode.trim();

  useEffect(() => {
    if (step !== 'forgot-otp' && step !== 'signup-otp') return;
    setResendIn(45);
    const id = setInterval(() => setResendIn((s) => (s > 0 ? s - 1 : 0)), 1000);
    const t = setTimeout(() => otpRef.current?.focus(), 250);
    return () => { clearInterval(id); clearTimeout(t); };
  }, [step]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step === 'login') return false;
      setError(null);
      if (step === 'forgot-otp') setStep('forgot-id');
      else if (step === 'signup-otp') setStep('signup-phone');
      else if (step === 'details') setStep('signup-otp');
      else setStep('login');
      return true;
    });
    return () => sub.remove();
  }, [step]);

  // ---------- Login (ID + password) ----------
  const doLogin = async () => {
    if (!idFilled || !password) { setError('Enter your ID and password'); return; }
    setLoading(true);
    try {
      const r = await authApi.login({ identifier: identifier.trim(), password });
      if (!r.token || !r.user) throw new Error('Login failed. Please try again.');
      await completeLogin(r.token, r.user);
    } catch (e: any) {
      setError(e?.message || 'Invalid ID or password');
    } finally {
      setLoading(false);
    }
  };

  // ---------- Forgot password ----------
  const sendForgotOtp = async () => {
    if (!idFilled) { setError('Enter your registered mobile number or email'); return; }
    setLoading(true);
    try {
      const r = await authApi.forgotPassword({ identifier: identifier.trim() });
      setOtp('');
      setOtpSentMsg(r.message || 'OTP sent');
      setStep('forgot-otp');
    } catch (e: any) {
      setError(e?.message || 'Could not send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (otp.length !== OTP_LEN) { setError(`Enter the ${OTP_LEN}-digit OTP`); return; }
    if (!newPassValid) { setError('New password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const r = await authApi.resetPassword({ identifier: identifier.trim(), otp, newPassword });
      if (!r.token || !r.user) throw new Error('Could not reset password. Please try again.');
      await completeLogin(r.token, r.user);
    } catch (e: any) {
      setError(e?.message || 'Could not reset password');
    } finally {
      setLoading(false);
    }
  };

  // ---------- Signup ----------
  const sendSignupOtp = async () => {
    if (!phoneValid) { setError('Enter a valid 10-digit Indian mobile number'); return; }
    setLoading(true);
    try {
      await authApi.sendOtp(phone);
      setOtp('');
      setOtpSentMsg(`OTP sent to +91 ${phone}`);
      setStep('signup-otp');
    } catch (e: any) {
      setError(e?.message || 'Could not send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifySignupOtp = async () => {
    if (otp.length !== OTP_LEN) { setError(`Enter the ${OTP_LEN}-digit OTP`); return; }
    setLoading(true);
    try {
      const r = await authApi.verifyOtp({ phone, otp });
      if (r.needsProfile || !r.token) { setStep('details'); return; }
      // Phone already has an account — log straight in.
      await completeLogin(r.token!, r.user!);
    } catch (e: any) {
      setError(e?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const submitDetails = async () => {
    if (!detailsValid) { setError('Please fill all the details'); return; }
    if (!newPassValid) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const r = await authApi.verifyOtp({ phone, otp, name, city: address, password: newPassword });
      if (!r.token || !r.user) throw new Error('Could not create account');
      await completeLogin(r.token, r.user);
    } catch (e: any) {
      setError(e?.message || 'Could not create account');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (resendIn > 0) return;
    setOtp('');
    setResendIn(45);
    try {
      if (step === 'forgot-otp') await authApi.forgotPassword({ identifier: identifier.trim() });
      else await authApi.sendOtp(phone);
    } catch (e: any) {
      setResendIn(0);
      setError(e?.message || 'Could not resend OTP');
    }
  };

  const titleFor: Record<Step, string> = {
    login: 'Welcome back',
    'forgot-id': 'Forgot password',
    'forgot-otp': 'Reset password',
    'signup-phone': 'Create account',
    'signup-otp': 'Verify OTP',
    details: 'Complete your profile',
  };
  const subFor: Record<Step, string> = {
    login: 'Login with your ID (mobile / email) and password',
    'forgot-id': "Enter your registered mobile number or email — we'll send an OTP",
    'forgot-otp': `Enter the OTP and choose a new password. ${otpSentMsg ? `(${otpSentMsg})` : ''}`,
    'signup-phone': 'Enter your mobile number to receive an OTP',
    'signup-otp': `Enter the 6-digit OTP. ${otpSentMsg ? `(${otpSentMsg})` : ''}`,
    details: "Fill the details below and set a password for next time. You'll continue to KYC.",
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior="padding"
    >
      {/* Compact brand header — no big banner, so inputs always stay visible. */}
      <View style={[styles.header, { paddingTop: insets.top + 10, paddingBottom: 12 }]}>
        {step !== 'login' && (
          <Pressable
            style={styles.back}
            onPress={() => {
              setError(null);
              if (step === 'forgot-otp') setStep('forgot-id');
              else if (step === 'signup-otp') setStep('signup-phone');
              else if (step === 'details') setStep('signup-otp');
              else setStep('login');
            }}
            hitSlop={10}
          >
            <ChevronLeft size={20} color="#FFFFFF" />
          </Pressable>
        )}
        <Text style={styles.brand}>Tractor Wala</Text>
        <Text style={styles.brandSub}>KISANO KA SACHCHA SATHI</Text>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 22, paddingBottom: insets.bottom + 32, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>{titleFor[step]}</Text>
        <Text style={styles.subheading}>{subFor[step]}</Text>

        {/* ---------- LOGIN ---------- */}
        {step === 'login' && (
          <View>
            <Field label="Mobile / Email ID" required>
              <TextInput
                style={styles.input}
                placeholder="98765 43210 or you@email.com"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                value={identifier}
                onChangeText={setIdentifier}
              />
            </Field>

            <Field label="Password" required>
              <View style={styles.passwordWrap}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.mutedForeground}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={password}
                  onChangeText={setPassword}
                  onSubmitEditing={doLogin}
                />
                <Pressable onPress={() => setShowPassword((s) => !s)} hitSlop={10} style={styles.eyeBtn}>
                  {showPassword ? <EyeOff size={18} color={colors.mutedForeground} /> : <Eye size={18} color={colors.mutedForeground} />}
                </Pressable>
              </View>
            </Field>

            <Pressable onPress={() => { setError(null); setStep('forgot-id'); }} hitSlop={6}>
              <Text style={styles.forgotLink}>Forgot password?</Text>
            </Pressable>

            <PrimaryButton label="Login" loading={loading} disabled={!idFilled || !password} onPress={doLogin} />

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <Pressable style={styles.outlineBtn} onPress={() => { setError(null); setPhone(''); setStep('signup-phone'); }}>
              <Text style={styles.outlineBtnText}>Create new account</Text>
            </Pressable>
          </View>
        )}

        {/* ---------- FORGOT: ENTER ID ---------- */}
        {step === 'forgot-id' && (
          <View>
            <Field label="Registered Mobile / Email ID" required>
              <TextInput
                style={styles.input}
                placeholder="98765 43210 or you@email.com"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                value={identifier}
                onChangeText={setIdentifier}
                onSubmitEditing={sendForgotOtp}
              />
            </Field>

            <PrimaryButton label="Send OTP" loading={loading} disabled={!idFilled} onPress={sendForgotOtp} />
          </View>
        )}

        {/* ---------- FORGOT: OTP + NEW PASSWORD ---------- */}
        {step === 'forgot-otp' && (
          <View>
            <Text style={styles.otpLabel}>Enter OTP</Text>
            <OtpCells value={otp} onChange={setOtp} inputRef={otpRef} />

            <Field label="New Password" required>
              <View style={styles.passwordWrap}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="At least 6 characters"
                  placeholderTextColor={colors.mutedForeground}
                  secureTextEntry={!showNewPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  onSubmitEditing={resetPassword}
                />
                <Pressable onPress={() => setShowNewPassword((s) => !s)} hitSlop={10} style={styles.eyeBtn}>
                  {showNewPassword ? <EyeOff size={18} color={colors.mutedForeground} /> : <Eye size={18} color={colors.mutedForeground} />}
                </Pressable>
              </View>
            </Field>

            <PrimaryButton label="Reset & Login" loading={loading} disabled={otp.length !== OTP_LEN || !newPassValid} onPress={resetPassword} />

            <View style={styles.resendRow}>
              <Text style={styles.resendText}>Didn't receive code?</Text>
              <Pressable onPress={resend} disabled={resendIn > 0}>
                <Text style={[styles.resendLink, resendIn > 0 && { color: colors.mutedForeground }]}>
                  {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend OTP'}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ---------- SIGNUP: PHONE ---------- */}
        {step === 'signup-phone' && (
          <View>
            <View style={styles.phoneRow}>
              <View style={styles.cc}>
                <Text style={styles.ccText}>+91</Text>
              </View>
              <View style={styles.divider} />
              <TextInput
                style={styles.phoneInput}
                placeholder="98765 43210"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="number-pad"
                maxLength={10}
                value={phone}
                onChangeText={(t) => setPhone(t.replace(/[^0-9]/g, ''))}
                onSubmitEditing={sendSignupOtp}
              />
            </View>

            <PrimaryButton label="Send OTP" loading={loading} disabled={!phoneValid} onPress={sendSignupOtp} />
          </View>
        )}

        {/* ---------- SIGNUP: OTP ---------- */}
        {step === 'signup-otp' && (
          <View>
            <Text style={styles.otpLabel}>Enter OTP</Text>
            <OtpCells value={otp} onChange={setOtp} inputRef={otpRef} />

            <PrimaryButton label="Verify & Continue" loading={loading} disabled={otp.length !== OTP_LEN} onPress={verifySignupOtp} />

            <View style={styles.resendRow}>
              <Text style={styles.resendText}>Didn't receive code?</Text>
              <Pressable onPress={resend} disabled={resendIn > 0}>
                <Text style={[styles.resendLink, resendIn > 0 && { color: colors.mutedForeground }]}>
                  {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend OTP'}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ---------- SIGNUP: DETAILS + SET PASSWORD ---------- */}
        {step === 'details' && (
          <View>
            <Field label="Full Name" required value={name} onChangeText={setName} placeholder="e.g. Rahul Kumar" />
            <Field label="Address" required value={address} onChangeText={setAddress} placeholder="House, street, city, state" multiline />
            <Field label="Dealer Name" required value={dealerName} onChangeText={setDealerName} placeholder="e.g. Kumar Tractors" />
            <Field label="Dealer Code" required value={dealerCode} onChangeText={setDealerCode} placeholder="e.g. TWD-1024" autoCapitalize="characters" />

            <Field label="Set Password" required>
              <View style={styles.passwordWrap}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="At least 6 characters"
                  placeholderTextColor={colors.mutedForeground}
                  secureTextEntry={!showNewPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  onSubmitEditing={submitDetails}
                />
                <Pressable onPress={() => setShowNewPassword((s) => !s)} hitSlop={10} style={styles.eyeBtn}>
                  {showNewPassword ? <EyeOff size={18} color={colors.mutedForeground} /> : <Eye size={18} color={colors.mutedForeground} />}
                </Pressable>
              </View>
            </Field>

            <PrimaryButton
              label="Create Account & Continue"
              loading={loading}
              disabled={!detailsValid || !newPassValid}
              onPress={submitDetails}
            />
          </View>
        )}

        <View style={styles.legal}>
          <Text style={styles.legalText}>
            By continuing you agree to Tractor Wala's{' '}
            <Text style={styles.legalLink} onPress={() => router.push('/terms-and-conditions' as any)}>Terms & Conditions</Text>{' '}
            and{' '}
            <Text style={styles.legalLink} onPress={() => router.push('/privacy-policy' as any)}>Privacy Policy</Text>.
          </Text>
        </View>
      </ScrollView>

      <BottomSheet
        visible={!!error}
        variant="error"
        title="Please check"
        message={error || ''}
        confirmText="OK"
        onClose={() => setError(null)}
      />
    </KeyboardAvoidingView>
  );
}

function PrimaryButton({ label, loading, disabled, onPress }: { label: string; loading: boolean; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable
      style={[styles.primaryBtn, (loading || disabled) && { opacity: 0.55 }]}
      onPress={onPress}
      disabled={loading || disabled}
    >
      {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryBtnText}>{label}</Text>}
    </Pressable>
  );
}

function Field({ label, required, multiline, children, ...rest }: any) {
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={styles.label}>{label}{required ? <Text style={{ color: colors.danger }}> *</Text> : null}</Text>
      {children || (
        <TextInput
          {...rest}
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, multiline && { height: 70, textAlignVertical: 'top', paddingTop: 10 }]}
          multiline={!!multiline}
        />
      )}
    </View>
  );
}

function OtpCells({ value, onChange, inputRef }: { value: string; onChange: (v: string) => void; inputRef: React.RefObject<TextInput | null> }) {
  const cells = Array.from({ length: OTP_LEN });
  return (
    <Pressable onPress={() => inputRef.current?.focus()} style={styles.otpWrap}>
      {cells.map((_, i) => {
        const ch = value[i] || '';
        const focused = i === value.length;
        return (
          <View key={i} style={[styles.otpCell, ch && styles.otpCellFilled, focused && styles.otpCellFocused]}>
            <Text style={styles.otpChar}>{ch}</Text>
          </View>
        );
      })}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(t) => onChange(t.replace(/[^0-9]/g, '').slice(0, OTP_LEN))}
        keyboardType="number-pad"
        maxLength={OTP_LEN}
        style={styles.otpHidden}
        autoFocus
        caretHidden
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  back: {
    position: 'absolute',
    left: 12,
    bottom: 18,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
    zIndex: 2,
  },
  brand: { color: '#FFFFFF', fontFamily: fonts.extrabold, fontSize: 22, letterSpacing: 0.4 },
  brandSub: { color: 'rgba(255,255,255,0.85)', fontFamily: fonts.bold, fontSize: 8.5, letterSpacing: 2, marginTop: 2 },

  heading: { color: colors.foreground, fontWeight: '800', fontSize: 20 },
  subheading: { color: colors.mutedForeground, fontSize: 13, marginTop: 4, lineHeight: 18 },

  label: { color: colors.foreground, fontWeight: '600', fontSize: 13, marginBottom: 5 },
  input: { borderWidth: 1, borderColor: colors.inputBorder, backgroundColor: colors.card, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, color: colors.foreground, borderRadius: radius.md },

  passwordWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.inputBorder, backgroundColor: colors.card, borderRadius: radius.md, overflow: 'hidden' },
  passwordInput: { flex: 1, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, color: colors.foreground },
  eyeBtn: { paddingHorizontal: 12, paddingVertical: 10 },

  phoneRow: { flexDirection: 'row', marginTop: 12, borderWidth: 1, borderColor: colors.inputBorder, backgroundColor: colors.card, alignItems: 'stretch', overflow: 'hidden', borderRadius: radius.md },
  cc: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, backgroundColor: colors.primaryLight },
  ccText: { color: colors.primaryDark, fontWeight: '800', fontSize: 14 },
  divider: { width: 1, backgroundColor: colors.border },
  phoneInput: { flex: 1, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16, color: colors.foreground, letterSpacing: 1, fontWeight: '600' },

  forgotLink: { color: colors.primary, fontWeight: '700', fontSize: 13, textAlign: 'right', marginTop: 10 },

  primaryBtn: { backgroundColor: colors.primary, paddingVertical: 14, alignItems: 'center', marginTop: 16, borderRadius: radius.md },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15, letterSpacing: 0.5 },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.mutedForeground, fontSize: 12, fontWeight: '600' },

  outlineBtn: { borderWidth: 1, borderColor: colors.primary, paddingVertical: 13, alignItems: 'center', marginTop: 16, borderRadius: radius.md, backgroundColor: colors.card },
  outlineBtnText: { color: colors.primary, fontWeight: '800', fontSize: 14 },

  otpLabel: { color: colors.foreground, fontWeight: '600', fontSize: 13, marginTop: 14, marginBottom: 6 },
  otpWrap: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  otpCell: { flex: 1, height: 50, borderWidth: 1, borderColor: colors.inputBorder, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  otpCellFilled: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  otpCellFocused: { borderColor: colors.accent, borderWidth: 2 },
  otpChar: { fontSize: 22, fontWeight: '800', color: colors.primaryDark },
  otpHidden: { position: 'absolute', width: 1, height: 1, opacity: 0 },

  resendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 },
  resendText: { color: colors.mutedForeground, fontSize: 12 },
  resendLink: { color: colors.primary, fontWeight: '800', fontSize: 12 },

  legal: { marginTop: 20, paddingHorizontal: 8 },
  legalText: { color: colors.mutedForeground, fontSize: 11, textAlign: 'center', lineHeight: 16 },
  legalLink: { color: colors.primary, fontWeight: '700' },
});
