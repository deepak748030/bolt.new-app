import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenHeader from '@/components/ScreenHeader';
import { colors, fonts } from '@/lib/theme';

export type PolicySection = { title: string; body: string };

type Props = {
    title: string;
    icon: React.ReactNode;
    introText: string;
    updated: string;
    sections: PolicySection[];
};

/**
 * Shared renderer for all policy / legal documents in the app
 * (Privacy, Terms & Conditions, Return, Refund, Shopping policy).
 * Each screen only supplies its title, icon and content.
 */
export default function PolicyScreen({ title, icon, introText, updated, sections }: Props) {
    const insets = useSafeAreaInsets();
    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <ScreenHeader title={title} />
            <ScrollView contentContainerStyle={{ paddingBottom: 24 + insets.bottom }}>
                <View style={styles.intro}>
                    <View style={styles.iconWrap}>{icon}</View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.introText}>{introText}</Text>
                        <Text style={styles.updated}>Last updated: {updated}</Text>
                    </View>
                </View>

                <View style={styles.sep} />

                {sections.map((s, i) => (
                    <View key={s.title}>
                        <View style={styles.section}>
                            <Text style={styles.title}>{s.title}</Text>
                            <Text style={styles.body}>{s.body}</Text>
                        </View>
                        {i < sections.length - 1 && <View style={styles.sep} />}
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    intro: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryLight, paddingHorizontal: 6, paddingVertical: 10 },
    iconWrap: { width: 32, height: 32, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginRight: 8, borderWidth: 1, borderColor: colors.border },
    introText: { color: colors.foreground, fontFamily: fonts.bold, fontSize: 13, flexShrink: 1 },
    updated: { color: colors.mutedForeground, fontFamily: fonts.medium, fontSize: 10, marginTop: 2 },
    sep: { height: 1, backgroundColor: colors.border },
    section: { paddingHorizontal: 6, paddingVertical: 10, backgroundColor: colors.card },
    title: { color: colors.foreground, fontFamily: fonts.bold, fontSize: 13, marginBottom: 4 },
    body: { color: colors.mutedForeground, fontFamily: fonts.regular, fontSize: 11, lineHeight: 16 },
});
