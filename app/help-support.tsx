import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import ScreenHeader from '@/components/ScreenHeader';
import { colors, fonts } from '@/lib/theme';
import { ChevronDown, ChevronUp, Phone, Mail, MessageCircle, ScrollText, Shield, PackageOpen, RotateCcw, ShoppingBag, ChevronRight } from 'lucide-react-native';

const FAQS = [
    { q: 'How do I place a bid?', a: 'Open any live auction, enter an amount higher than the current bid, and tap Place Bid. Your wallet must hold a refundable deposit.' },
    { q: 'When do I pay for an auction I won?', a: 'You have 24 hours after auction close to settle the remaining amount from your wallet or UPI.' },
    { q: 'How is the deposit refunded if I lose?', a: 'Deposits are auto-refunded to your wallet within minutes of auction close.' },
    { q: 'Can I cancel a bid?', a: 'Bids cannot be retracted once placed. Bid carefully.' },
    { q: 'Is my mobile number visible to sellers?', a: 'No. Sellers only see your masked Tractor Wala ID until you win the auction.' },
];

const CONTACTS = [
    { icon: Phone, label: 'Call Support', value: '+91 1800-123-456', href: 'tel:+9118001234567' },
    { icon: Mail, label: 'Email Us', value: 'help@tractorwala.in', href: 'mailto:help@tractorwala.in' },
    { icon: MessageCircle, label: 'WhatsApp Chat', value: '+91 98765-43210', href: 'https://wa.me/919876543210' },
];

const POLICIES = [
    { icon: ScrollText, label: 'Terms & Conditions', route: '/terms-and-conditions' },
    { icon: Shield, label: 'Privacy Policy', route: '/privacy-policy' },
    { icon: PackageOpen, label: 'Return Policy', route: '/return-policy' },
    { icon: RotateCcw, label: 'Refund Policy', route: '/refund-policy' },
    { icon: ShoppingBag, label: 'Shopping Policy', route: '/shopping-policy' },
];

export default function HelpScreen() {
    const insets = useSafeAreaInsets();
    const [open, setOpen] = useState<number | null>(0);

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScreenHeader title="Help & Support" />
            <FlatList
                data={FAQS}
                keyExtractor={(_, i) => String(i)}
                ListHeaderComponent={
                    <View>
                        <View style={styles.sectionHead}><Text style={styles.section}>Contact Us</Text></View>
                        <View>
                            {CONTACTS.map((c, i) => {
                                const Icon = c.icon;
                                return (
                                    <View key={c.label}>
                                        <Pressable style={styles.contactRow} onPress={() => Linking.openURL(c.href)}>
                                            <View style={styles.iconWrap}><Icon size={16} color={colors.primaryDark} /></View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.cTitle}>{c.label}</Text>
                                                <Text style={styles.cVal}>{c.value}</Text>
                                            </View>
                                        </Pressable>
                                        {i < CONTACTS.length - 1 && <View style={styles.sep} />}
                                    </View>
                                );
                            })}
                        </View>
                        <View style={styles.sectionHead}><Text style={styles.section}>Legal & Policies</Text></View>
                        <View>
                            {POLICIES.map((p, i) => {
                                const Icon = p.icon;
                                return (
                                    <View key={p.label}>
                                        <Pressable style={styles.contactRow} onPress={() => router.push(p.route as any)}>
                                            <View style={styles.iconWrap}><Icon size={16} color={colors.primaryDark} /></View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.cTitle}>{p.label}</Text>
                                            </View>
                                            <ChevronRight size={15} color={colors.mutedForeground} />
                                        </Pressable>
                                        {i < POLICIES.length - 1 && <View style={styles.sep} />}
                                    </View>
                                );
                            })}
                        </View>
                        <View style={styles.sectionHead}><Text style={styles.section}>Frequently Asked</Text></View>
                    </View>
                }
                contentContainerStyle={{ paddingBottom: 24 + insets.bottom }}
                ItemSeparatorComponent={() => <View style={styles.sep} />}
                renderItem={({ item, index }) => {
                    const isOpen = open === index;
                    return (
                        <View style={styles.faqCard}>
                            <Pressable style={styles.faqHead} onPress={() => setOpen(isOpen ? null : index)}>
                                <Text style={styles.faqQ}>{item.q}</Text>
                                {isOpen ? <ChevronUp size={16} color={colors.mutedForeground} /> : <ChevronDown size={16} color={colors.mutedForeground} />}
                            </Pressable>
                            {isOpen && <Text style={styles.faqA}>{item.a}</Text>}
                        </View>
                    );
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    sectionHead: { paddingHorizontal: 6, paddingTop: 8, paddingBottom: 6, backgroundColor: colors.background },
    section: { color: colors.foreground, fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.4, textTransform: 'uppercase' },
    contactRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 9, backgroundColor: colors.card },
    iconWrap: { width: 30, height: 30, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
    cTitle: { color: colors.foreground, fontFamily: fonts.bold, fontSize: 12 },
    cVal: { color: colors.mutedForeground, fontFamily: fonts.medium, fontSize: 11, marginTop: 1 },
    sep: { height: 1, backgroundColor: colors.border },
    faqCard: { backgroundColor: colors.card, paddingHorizontal: 6, paddingVertical: 9 },
    faqHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    faqQ: { color: colors.foreground, fontFamily: fonts.bold, fontSize: 12, flex: 1, marginRight: 6 },
    faqA: { color: colors.mutedForeground, fontFamily: fonts.regular, fontSize: 11, marginTop: 6, lineHeight: 16 },
});
