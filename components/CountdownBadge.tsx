import React, { useEffect, useState } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { Clock } from 'lucide-react-native';
import { colors, fonts, radius } from '@/lib/theme';

function fmt(ms: number) {
  if (ms <= 0) return 'Ended';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${String(m).padStart(2, '0')}m ${String(sec).padStart(2, '0')}s`;
  return `${sec}s`;
}

export default function CountdownBadge({ endsAt, compact = false }: { endsAt: number; compact?: boolean }) {
  const [left, setLeft] = useState(endsAt - Date.now());
  useEffect(() => {
    const t = setInterval(() => setLeft(endsAt - Date.now()), 1000);
    return () => clearInterval(t);
  }, [endsAt]);
  const ending = left < 60 * 60 * 1000;
  const bg = ending ? '#B91C1C' : colors.primaryDark;
  return (
    <View style={[styles.wrap, { backgroundColor: bg }]}>
      <Clock size={compact ? 10 : 11} color="#FFFFFF" />
      <Text style={[styles.txt, { fontSize: compact ? 10 : 11 }]}>{fmt(left)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill },
  txt: { color: '#FFFFFF', fontFamily: fonts.bold, letterSpacing: 0.3 },
});
