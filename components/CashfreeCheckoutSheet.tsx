import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, ActivityIndicator, Platform, Linking } from 'react-native';
import { WebView, type WebViewMessageEvent, type WebViewNavigation } from 'react-native-webview';
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';
import { X } from 'lucide-react-native';
import { colors, fonts, radius } from '@/lib/theme';
import { paymentApi, type PaymentPurpose, type CashfreeOrder, type PaymentVerifyResult } from '@/lib/api';

type Props = {
    visible: boolean;
    purpose: PaymentPurpose;
    amount: number;
    description?: string;
    onSuccess: (result: PaymentVerifyResult) => void;
    onClose: () => void;
    onError?: (message: string) => void;
};

function safeJson(value: unknown) {
    return JSON.stringify(value).replace(/</g, '\\u003c');
}

/**
 * Cashfree drop-in checkout inside a WebView.
 *
 * Flow:
 *  1. Server creates a Cashfree order (v2023-08-01) and returns payment_session_id.
 *  2. This sheet loads Cashfree's JS SDK (sdk.cashfree.com/js/v3) with the session id.
 *  3. On success Cashfree redirects to the configured return URL — which we intercept
 *     here (never actually loaded) and re-verify the order with our server, which in
 *     turn re-confirms directly with Cashfree before fulfilling anything.
 */
function buildCheckoutHtml(order: CashfreeOrder) {
    const cfg = {
        mode: order.mode || 'production',
        paymentSessionId: order.paymentSessionId,
    };
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <style>
    html, body { margin: 0; padding: 0; background: #F4F8F4; height: 100%; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif; }
    .wrap { min-height: 100%; display: flex; align-items: center; justify-content: center; color: #4B5563; font-size: 14px; }
    .spin { width: 22px; height: 22px; border: 3px solid #DCFCE7; border-top-color: #15803D; border-radius: 50%; margin: 0 auto 10px; animation: r 0.8s linear infinite; }
    @keyframes r { to { transform: rotate(360deg); } }
  </style>
  <script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>
</head>
<body>
  <div class="wrap"><div style="text-align:center"><div class="spin"></div>Opening secure Cashfree checkout…</div></div>
  <script>
    function post(payload) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      }
    }
    (async function () {
      try {
        const cashfree = await Cashfree(${safeJson({ mode: cfg.mode })});
        cashfree.checkout({
          paymentSessionId: ${safeJson(cfg.paymentSessionId)},
          redirectTarget: '_self'
        });
      } catch (e) {
        post({ type: 'error', message: (e && e.message) || 'Could not open Cashfree checkout' });
      }
    })();
  </script>
</body>
</html>`;
}

export default function CashfreeCheckoutSheet({
    visible, purpose, amount, description, onSuccess, onClose, onError,
}: Props) {
    const [order, setOrder] = useState<CashfreeOrder | null>(null);
    const [busy, setBusy] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [localErr, setLocalErr] = useState<string | null>(null);
    const doneRef = useRef(false);
    const verifyingRef = useRef(false);
    const onErrorRef = useRef(onError);
    onErrorRef.current = onError;

    useEffect(() => {
        if (!visible) {
            setOrder(null);
            setBusy(false);
            setVerifying(false);
            setLocalErr(null);
            doneRef.current = false;
            verifyingRef.current = false;
            return;
        }
        let alive = true;
        doneRef.current = false;
        verifyingRef.current = false;
        setBusy(true);
        setLocalErr(null);
        paymentApi.createOrder({ purpose, amount })
            .then((r) => { if (alive) setOrder(r.data); })
            .catch((e: any) => {
                const msg = e?.message || 'Could not start payment';
                if (!alive) return;
                setLocalErr(msg);
                onErrorRef.current?.(msg);
                onClose();
            })
            .finally(() => { if (alive) setBusy(false); });
        return () => { alive = false; };
    }, [visible, purpose, amount]);

    const html = useMemo(() => (order ? buildCheckoutHtml(order) : ''), [order]);

    // The return URL the server configured (e.g. https://pay.tractorwala.app/cashfree/return?order_id=…).
    // We intercept it in the WebView — it is never actually loaded.
    const returnUrlBase = useMemo(
        () => (order?.returnUrl ? order.returnUrl.split('?')[0] : ''),
        [order?.returnUrl],
    );

    const fail = (message: string) => {
        if (doneRef.current) return;
        doneRef.current = true;
        setLocalErr(message);
        onErrorRef.current?.(message);
        onClose();
    };

    const openExternal = async (url: string) => {
        try { await Linking.openURL(url); } catch { /* no UPI app */ }
    };

    const verifyOrder = async (orderId: string) => {
        if (doneRef.current || verifyingRef.current) return;
        verifyingRef.current = true;
        setVerifying(true);
        try {
            const result = await paymentApi.verify({ orderId });
            doneRef.current = true;
            onSuccess(result);
            onClose();
        } catch (e: any) {
            doneRef.current = true;
            onErrorRef.current?.(e?.message || 'Could not verify payment');
            onClose();
        } finally {
            verifyingRef.current = false;
            setVerifying(false);
        }
    };

    // UPI / wallet apps try to open intent:// URLs — send them out of the WebView.
    const handleShouldStart = (req: ShouldStartLoadRequest) => {
        const url = req.url || '';
        if (/^(upi|phonepe|gpay|tez|paytmmp|bhim|credpay|amazonpay|intent|freecharge|mobikwik):/i.test(url)) {
            void openExternal(url);
            return false;
        }
        // Cashfree redirect after payment — intercept & verify with the server.
        if (returnUrlBase && url.startsWith(returnUrlBase)) {
            let orderId = '';
            try { orderId = new URL(url).searchParams.get('order_id') || ''; } catch { /* ignore */ }
            if (orderId) void verifyOrder(orderId);
            return false;
        }
        return true;
    };

    const handleNavigationChange = (nav: WebViewNavigation) => {
        if (!nav.url) return;
        if (returnUrlBase && nav.url.startsWith(returnUrlBase)) {
            let orderId = '';
            try { orderId = new URL(nav.url).searchParams.get('order_id') || ''; } catch { /* ignore */ }
            if (orderId) void verifyOrder(orderId);
        }
    };

    const handleMessage = async (event: WebViewMessageEvent) => {
        if (doneRef.current) return;
        let payload: any = null;
        try { payload = JSON.parse(event.nativeEvent.data); } catch { return; }
        if (!payload || !payload.type) return;
        if (payload.type === 'error') {
            fail(payload.message || 'Cashfree checkout failed to open');
        }
    };

    const close = () => {
        if (verifying) return;
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
            <Pressable style={styles.backdrop} onPress={close} />
            <View style={styles.sheet}>
                <View style={styles.header}>
                    <View style={styles.brandLogo}><Text style={styles.brandLogoText}>C</Text></View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.brandTitle}>Cashfree</Text>
                        <Text style={styles.amountValue}>₹ {amount.toLocaleString('en-IN')}</Text>
                    </View>
                    <Pressable onPress={close} hitSlop={10} disabled={verifying}>
                        <X size={18} color={colors.foreground} />
                    </Pressable>
                </View>

                {busy || !order ? (
                    <View style={styles.center}>
                        {localErr
                            ? <Text style={styles.err}>{localErr}</Text>
                            : <><ActivityIndicator color={colors.primary} /><Text style={styles.hint}>Creating secure order…</Text></>}
                    </View>
                ) : (
                    <View style={styles.webWrap}>
                        <WebView
                            originWhitelist={['*']}
                            source={{ html, baseUrl: 'https://sdk.cashfree.com' }}
                            onMessage={handleMessage}
                            onShouldStartLoadWithRequest={handleShouldStart}
                            onNavigationStateChange={handleNavigationChange}
                            javaScriptEnabled
                            domStorageEnabled
                            startInLoadingState
                            setSupportMultipleWindows={false}
                            mixedContentMode="always"
                            style={styles.web}
                            {...(Platform.OS === 'android' ? { thirdPartyCookiesEnabled: true } : {})}
                        />
                        {verifying && (
                            <View style={styles.verifyOverlay}>
                                <ActivityIndicator color="#FFFFFF" />
                                <Text style={styles.verifyText}>Verifying payment…</Text>
                            </View>
                        )}
                    </View>
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
    sheet: { backgroundColor: colors.card, height: '92%', borderTopLeftRadius: radius.md, borderTopRightRadius: radius.md, overflow: 'hidden' },
    header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
    brandLogo: { width: 30, height: 30, backgroundColor: '#052654', alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
    brandLogoText: { color: '#FFFFFF', fontFamily: fonts.extrabold, fontSize: 16 },
    brandTitle: { color: colors.foreground, fontFamily: fonts.extrabold, fontSize: 14 },
    amountValue: { color: colors.mutedForeground, fontFamily: fonts.semibold, fontSize: 12, marginTop: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, gap: 8 },
    hint: { color: colors.mutedForeground, fontFamily: fonts.medium, fontSize: 12, marginTop: 8 },
    err: { color: colors.danger, fontFamily: fonts.semibold, fontSize: 12, textAlign: 'center' },
    webWrap: { flex: 1 },
    web: { flex: 1, backgroundColor: colors.background },
    verifyOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5,46,22,0.72)', alignItems: 'center', justifyContent: 'center', gap: 8 },
    verifyText: { color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 13 },
});
