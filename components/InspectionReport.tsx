import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Check, X, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react-native';
import { colors, fonts, radius } from '@/lib/theme';
import { inspectionReport } from '@/lib/mockData';

export default function InspectionReport() {
    const [open, setOpen] = useState<number | null>(0);

    return (
        <View style={styles.wrap}>
            {/* Summary */}
            <View style={styles.summary}>
                <View style={styles.badge}>
                    <ShieldCheck size={18} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.summaryTitle}>
                        {inspectionReport.passed}/{inspectionReport.total} Points Passed
                    </Text>
                    <Text style={styles.summarySub}>Certified inspection by Tractor Wala</Text>
                </View>
                <View style={styles.scoreBox}>
                    <Text style={styles.scoreText}>
                        {Math.round((inspectionReport.passed / inspectionReport.total) * 100)}%
                    </Text>
                </View>
            </View>

            {/* Group rows */}
            {inspectionReport.groups.map((g, idx) => {
                const isOpen = open === idx;
                const failed = g.items.filter((i) => !i.pass).length;
                return (
                    <View key={g.title} style={styles.group}>
                        <Pressable style={styles.groupHead} onPress={() => setOpen(isOpen ? null : idx)}>
                            <Text style={styles.groupTitle}>{g.title}</Text>
                            <View style={styles.groupRight}>
                                {failed > 0 ? (
                                    <Text style={styles.failTag}>{failed} issue</Text>
                                ) : (
                                    <View style={styles.passTag}>
                                        <Check size={10} color="#FFFFFF" />
                                        <Text style={styles.passTagText}>All Pass</Text>
                                    </View>
                                )}
                                {isOpen
                                    ? <ChevronUp size={14} color={colors.foreground} />
                                    : <ChevronDown size={14} color={colors.foreground} />}
                            </View>
                        </Pressable>

                        {isOpen && (
                            <View style={styles.itemList}>
                                {g.items.map((it) => (
                                    <View key={it.label} style={styles.itemRow}>
                                        <View style={[styles.itemIcon, { backgroundColor: it.pass ? colors.primary : colors.danger }]}>
                                            {it.pass ? <Check size={10} color="#FFFFFF" /> : <X size={10} color="#FFFFFF" />}
                                        </View>
                                        <Text style={styles.itemLabel}>{it.label}</Text>
                                        {it.note ? <Text style={styles.itemNote}>{it.note}</Text> : null}
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {},
    summary: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: colors.primary, paddingHorizontal: 8, paddingVertical: 8, borderRadius: radius.sm },
    badge: { width: 36, height: 36, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
    summaryTitle: { color: colors.primaryDark, fontFamily: fonts.extrabold, fontSize: 14 },
    summarySub: { color: colors.primaryDark, fontFamily: fonts.medium, fontSize: 10, marginTop: 1 },
    scoreBox: { backgroundColor: colors.primaryDark, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.sm },
    scoreText: { color: '#FFFFFF', fontFamily: fonts.extrabold, fontSize: 13 },

    group: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, marginTop: 0, backgroundColor: colors.card },
    groupHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 8 },
    groupTitle: { color: colors.foreground, fontFamily: fonts.bold, fontSize: 12 },
    groupRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    passTag: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.primary, paddingHorizontal: 5, paddingVertical: 2, borderRadius: radius.xs },
    passTagText: { color: '#FFFFFF', fontFamily: fonts.extrabold, fontSize: 9 },
    failTag: { color: colors.danger, backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: colors.danger, paddingHorizontal: 5, paddingVertical: 1, fontFamily: fonts.extrabold, fontSize: 9, borderRadius: radius.xs },

    itemList: { borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: 8, paddingVertical: 6 },
    itemRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
    itemIcon: { width: 16, height: 16, alignItems: 'center', justifyContent: 'center', borderRadius: radius.xs },
    itemLabel: { flex: 1, color: colors.foreground, fontFamily: fonts.medium, fontSize: 11 },
    itemNote: { color: colors.mutedForeground, fontFamily: fonts.semibold, fontSize: 10 },
});
