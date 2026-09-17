import React, { useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Dimensions,
    Pressable,
    NativeSyntheticEvent,
    NativeScrollEvent,
    Image,
    ImageBackground,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    ArrowRight,
    Users,
    BadgeCheck,
    ShieldCheck,
    FileText,
    Search,
    Wallet,
    RefreshCw,
} from 'lucide-react-native';
import { colors, radius, fonts } from '@/lib/theme';

const { width, height } = Dimensions.get('window');
const ONBOARDING_KEY = 'tractorwala_onboarded_v1';
// All three slides share the same artwork; only their content changes.
const ONBOARDING_BANNER = require('../assets/images/onboarding-banner.png');

type Feature = { Icon: any; label: string };
type Slide = {
    key: string;
    dark: boolean; // true = photo is dark (white text), false = light photo (dark text)
    kicker?: string;
    titleLines?: string[];
    goldLine?: string;
    amount?: string;
    amountTag?: string;
    sub: string;
    features: Feature[];
    quote: string;
};

const slides: Slide[] = [
    {
        key: '1',
        dark: false,
        kicker: 'TRUSTED NETWORK',
        titleLines: ['भारत के भरोसेमंद', 'ट्रैक्टर डीलर्स से जुड़ें'],
        sub: 'Verified Dealers · Verified Tractors · Trusted',
        features: [
            { Icon: Users, label: 'बड़ा\nडीलर नेटवर्क' },
            { Icon: BadgeCheck, label: 'क्वालिटी\nट्रैक्टर्स' },
            { Icon: ShieldCheck, label: 'भरोसेमंद\nसाथी' },
        ],
        quote: 'मिलकर बढ़ाएँ किसानों की तरक्की',
    },
    {
        key: '2',
        dark: false,
        kicker: '100% SECURE',
        titleLines: ['KYC Verified.', 'भरोसे के साथ'],
        goldLine: 'Bidding करें',
        sub: 'Dealer verification · RC checked · Secure bidding',
        features: [
            { Icon: FileText, label: 'डीलर\nवेरिफिकेशन' },
            { Icon: Search, label: 'RC\nचेकड' },
            { Icon: ShieldCheck, label: 'सुरक्षित\nबिडिंग' },
        ],
        quote: 'सही डीलर्स, सही ट्रैक्टर्स — एक बेहतर कल के लिए',
    },
    {
        key: '3',
        dark: false,
        amount: '₹5,000',
        amountTag: 'Refundable Security Deposit',
        sub: 'Verified dealer बनने के लिए सुरक्षित प्रक्रिया',
        features: [
            { Icon: Wallet, label: 'सुरक्षित\nभुगतान' },
            { Icon: RefreshCw, label: 'रिफंडेबल\nडिपॉज़िट' },
            { Icon: BadgeCheck, label: 'भरोसे के साथ\nडीलिंग' },
        ],
        quote: 'किसानों की प्रगति में हमेशा आपके साथ',
    },
];

export default function OnboardingScreen() {
    const insets = useSafeAreaInsets();
    const [index, setIndex] = useState(0);
    const listRef = useRef<FlatList<Slide>>(null);
    const slide = slides[index];
    const isLast = index === slides.length - 1;

    const finish = async () => {
        try { await AsyncStorage.setItem(ONBOARDING_KEY, '1'); } catch { }
        router.replace('/login');
    };

    const next = () => {
        if (index < slides.length - 1) {
            listRef.current?.scrollToIndex({ index: index + 1, animated: true });
        } else {
            finish();
        }
    };

    const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const i = Math.round(e.nativeEvent.contentOffset.x / width);
        if (i !== index) setIndex(i);
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.primaryDark }}>
            <FlatList
                ref={listRef}
                data={slides}
                keyExtractor={(s) => s.key}
                renderItem={({ item }) => <SlideView item={item} />}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={onScroll}
                scrollEventThrottle={16}
                style={{ flex: 1 }}
            />

            {/* Top brand + skip (over photos, dark scrim behind) */}
            <View style={[styles.topScrim, { height: insets.top + 64 }]} pointerEvents="none" />
            <View style={[styles.topRow, { paddingTop: insets.top + 10 }]} pointerEvents="box-none">
                <View style={styles.brandRow}>
                    <Image source={require('../assets/images/icon.png')} style={styles.brandEmblem} resizeMode="contain" />
                    <View>
                        <Text style={styles.brand}>Tractor Wala</Text>
                        <Text style={styles.brandSub}>KISANO KA SACHCHA SATHI</Text>
                    </View>
                </View>
                {!isLast && (
                    <Pressable onPress={finish} hitSlop={10} style={styles.skipBtn}>
                        <Text style={styles.skip}>Skip</Text>
                    </Pressable>
                )}
            </View>

            {/* Footer on the green band */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]} pointerEvents="box-none">
                <View style={styles.quoteRow}>
                    <View style={styles.quoteLeaf} />
                    <Text style={styles.quote} numberOfLines={2}>{slide.quote}</Text>
                </View>

                <View style={styles.dots}>
                    {slides.map((_, i) => (
                        <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
                    ))}
                </View>

                <Pressable style={styles.cta} onPress={next}>
                    <Text style={styles.ctaText}>{isLast ? 'शुरू करें' : 'आगे बढ़ें'}</Text>
                    <View style={styles.ctaIcon}>
                        <ArrowRight size={20} color="#FFFFFF" strokeWidth={2.8} />
                    </View>
                </Pressable>

                {isLast && (
                    <Text style={styles.loginHint}>
                        पहले से अकाउंट है?{' '}
                        <Text style={styles.loginLink} onPress={finish}>लॉग इन करें</Text>
                    </Text>
                )}
            </View>
        </View>
    );
}

function SlideView({ item }: { item: Slide }) {
    const onLight = !item.dark;
    const titleColor = onLight ? colors.primaryDark : '#FFFFFF';
    const subColor = onLight ? colors.primaryDark : 'rgba(255,255,255,0.92)';

    return (
        <View style={{ width, height }}>
            <ImageBackground source={ONBOARDING_BANNER} style={StyleSheet.absoluteFill} resizeMode="cover" />

            {/* upper content block */}
            <View style={styles.content} pointerEvents="none">
                {item.amount ? (
                    <>
                        <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{item.amount}</Text>
                        <View style={styles.amountPill}>
                            <Text style={styles.amountPillText}>{item.amountTag}</Text>
                        </View>
                    </>
                ) : (
                    <>
                        <View style={[styles.kicker, onLight ? styles.kickerLight : styles.kickerDark]}>
                            <Text style={[styles.kickerText, { color: onLight ? colors.primaryDark : '#D9FBE5' }]}>
                                {item.kicker}
                            </Text>
                        </View>
                        {item.titleLines?.map((line, i) => (
                            <Text
                                key={i}
                                style={[styles.title, { color: titleColor }]}
                                numberOfLines={1}
                                adjustsFontSizeToFit
                                minimumFontScale={0.6}
                            >
                                {line}
                            </Text>
                        ))}
                        {!!item.goldLine && (
                            <Text style={styles.goldLine} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                                {item.goldLine}
                            </Text>
                        )}
                    </>
                )}

                <Text style={[styles.sub, { color: subColor }]}>{item.sub}</Text>

                <View style={styles.featureRow}>
                    {item.features.map((f, i) => (
                        <View key={i} style={styles.feature}>
                            <View style={[styles.featureIcon, onLight ? styles.featureIconLight : styles.featureIconDark]}>
                                <f.Icon size={22} color={onLight ? colors.primary : '#FFFFFF'} strokeWidth={2.2} />
                            </View>
                            <Text style={[styles.featureLabel, { color: titleColor }]}>{f.label}</Text>
                        </View>
                    ))}
                </View>
            </View>
        </View>
    );
}

const CONTENT_TOP = Math.round(height * 0.145);

const styles = StyleSheet.create({
    topScrim: {
        position: 'absolute', top: 0, left: 0, right: 0,
        backgroundColor: 'rgba(4,30,14,0.42)',
    },
    topRow: {
        position: 'absolute', top: 0, left: 0, right: 0,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, zIndex: 5,
    },
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    brandEmblem: { width: 40, height: 40 },
    brand: { color: '#FFFFFF', fontFamily: fonts.extrabold, fontSize: 17, letterSpacing: 0.3 },
    brandSub: { color: 'rgba(255,255,255,0.85)', fontFamily: fonts.bold, fontSize: 7.5, letterSpacing: 1.4, marginTop: 1 },
    skipBtn: {
        paddingHorizontal: 16, paddingVertical: 7, borderRadius: radius.pill,
        backgroundColor: 'rgba(255,255,255,0.92)',
    },
    skip: { color: colors.primaryDark, fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.3 },

    content: { position: 'absolute', top: CONTENT_TOP, left: 0, right: 0, paddingHorizontal: 22 },

    kicker: {
        alignSelf: 'flex-start', paddingHorizontal: 13, paddingVertical: 5, borderRadius: radius.pill,
        borderWidth: 1, marginBottom: 7,
    },
    kickerLight: { backgroundColor: 'rgba(220,252,231,0.92)', borderColor: colors.primary },
    kickerDark: { backgroundColor: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.35)' },
    kickerText: { fontFamily: fonts.extrabold, fontSize: 9.5, letterSpacing: 1.3 },

    title: {
        fontFamily: fonts.extrabold, fontSize: 25, lineHeight: 30, letterSpacing: 0,
        textShadowColor: 'rgba(0,0,0,0.12)', textShadowRadius: 4,
    },
    goldLine: {
        fontFamily: fonts.extrabold, fontSize: 25, lineHeight: 30, color: '#E8B93A',
        textShadowColor: 'rgba(0,0,0,0.25)', textShadowRadius: 4,
    },

    amount: { fontFamily: fonts.extrabold, fontSize: 52, lineHeight: 56, color: colors.primaryDark, letterSpacing: 0 },
    amountPill: {
        alignSelf: 'flex-start', marginTop: 8, backgroundColor: colors.accent,
        paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.pill,
    },
    amountPillText: { color: '#FFFFFF', fontFamily: fonts.extrabold, fontSize: 14, letterSpacing: 0.4 },

    sub: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, marginTop: 8, maxWidth: '96%' },

    featureRow: { flexDirection: 'row', marginTop: 12, justifyContent: 'space-between' },
    feature: { alignItems: 'center', flex: 1 },
    featureIcon: {
        width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
        borderWidth: 1.5,
    },
    featureIconLight: { backgroundColor: 'rgba(255,255,255,0.92)', borderColor: colors.primary },
    featureIconDark: { backgroundColor: 'rgba(255,255,255,0.14)', borderColor: 'rgba(255,255,255,0.4)' },
    featureLabel: {
        fontFamily: fonts.semibold, fontSize: 10.5, lineHeight: 13, textAlign: 'center', marginTop: 5,
    },

    footer: {
        position: 'absolute', left: 0, right: 0, bottom: 0,
        alignItems: 'center', paddingHorizontal: 20, paddingTop: 6,
    },
    quoteRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, marginBottom: 10 },
    quoteLeaf: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#3FB950' },
    quote: {
        color: '#FFFFFF', fontFamily: fonts.extrabold, fontSize: 14, lineHeight: 18, textAlign: 'center',
        flexShrink: 1,
    },

    dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 12 },
    dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.4)' },
    dotActive: { width: 22, backgroundColor: '#E8B93A' },

    cta: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        backgroundColor: '#FFFFFF', borderRadius: radius.pill,
        paddingVertical: 6, paddingLeft: 26, paddingRight: 8, minWidth: 226, justifyContent: 'center',
    },
    ctaText: { color: colors.primaryDark, fontFamily: fonts.extrabold, fontSize: 16, letterSpacing: 0.3 },
    ctaIcon: {
        width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primary,
        alignItems: 'center', justifyContent: 'center',
    },

    loginHint: { color: 'rgba(255,255,255,0.9)', fontFamily: fonts.medium, fontSize: 12.5, textAlign: 'center', marginTop: 10 },
    loginLink: { color: '#E8B93A', fontFamily: fonts.extrabold },
});
