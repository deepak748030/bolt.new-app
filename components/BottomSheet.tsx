import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable, ActivityIndicator, KeyboardAvoidingView } from 'react-native';
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react-native';
import { colors, fonts, radius } from '@/lib/theme';

type Variant = 'success' | 'error' | 'warning' | 'info';

type Props = {
    visible: boolean;
    variant?: Variant;
    title: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    loading?: boolean;
    onConfirm?: () => void;
    onClose: () => void;
    children?: React.ReactNode;
};

const ICONS: Record<Variant, { Icon: any; color: string }> = {
    success: { Icon: CheckCircle2, color: '#15803D' },
    error: { Icon: XCircle, color: '#B91C1C' },
    warning: { Icon: AlertTriangle, color: '#A16207' },
    info: { Icon: Info, color: '#0A0A0A' },
};

export default function BottomSheet({
    visible, variant = 'info', title, message, confirmText = 'OK',
    cancelText, loading, onConfirm, onClose, children,
}: Props) {
    const { Icon, color } = ICONS[variant];
    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            {/* Keep inputs (e.g. wallet amount) above the keyboard. */}
            <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
                <Pressable style={styles.backdrop} onPress={() => !loading && onClose()} />
                <View style={styles.sheet}>
                <View style={styles.handle} />
                <View style={styles.iconWrap}>
                    <Icon size={28} color={color} />
                </View>
                <Text style={styles.title}>{title}</Text>
                {message ? <Text style={styles.message}>{message}</Text> : null}
                {children ? <View style={styles.children}>{children}</View> : null}
                <View style={styles.actions}>
                    {cancelText ? (
                        <Pressable style={[styles.btn, styles.cancelBtn]} onPress={onClose} disabled={loading}>
                            <Text style={styles.cancelText}>{cancelText}</Text>
                        </Pressable>
                    ) : null}
                    <Pressable
                        style={[styles.btn, styles.confirmBtn, { flex: 1 }]}
                        onPress={onConfirm || onClose}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator color="#FFFFFF" /> : (
                            <Text style={styles.confirmText}>{confirmText}</Text>
                        )}
                    </Pressable>
                </View>
            </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
    sheet: { backgroundColor: colors.card, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 24, alignItems: 'center', borderTopLeftRadius: radius.md, borderTopRightRadius: radius.md, borderTopWidth: 1, borderColor: colors.border },
    handle: { width: 40, height: 4, backgroundColor: colors.border, marginBottom: 10, borderRadius: radius.pill },
    iconWrap: { width: 52, height: 52, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: colors.primary },
    title: { color: colors.foreground, fontFamily: fonts.extrabold, fontSize: 16, marginTop: 8, textAlign: 'center' },
    message: { color: colors.mutedForeground, fontFamily: fonts.regular, fontSize: 13, marginTop: 4, textAlign: 'center', paddingHorizontal: 6, lineHeight: 18 },
    children: { width: '100%', marginTop: 8 },
    actions: { flexDirection: 'row', gap: 6, marginTop: 12, width: '100%' },
    btn: { paddingVertical: 11, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
    cancelBtn: { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
    confirmBtn: { backgroundColor: colors.primary },
    cancelText: { color: colors.foreground, fontFamily: fonts.bold, fontSize: 14 },
    confirmText: { color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 14 },
});
