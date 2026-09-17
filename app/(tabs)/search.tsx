import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, ActivityIndicator, Pressable, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search as SearchIcon, X } from 'lucide-react-native';
import { colors, fonts } from '@/lib/theme';
import type { Auction } from '@/lib/mockData';
import { auctionApi } from '@/lib/api';
import AuctionCard from '@/components/AuctionCard';

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Auction[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (query !== debounced) setSearching(true);
    const t = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  const runSearch = useCallback(() => {
    if (!debounced) { setResults([]); setSearching(false); setRefreshing(false); return; }
    setSearching(true);
    auctionApi.list({ q: debounced, limit: 30, notStatus: 'ended' } as any)
      .then((r) => setResults(r.data))
      .catch(() => setResults([]))
      .finally(() => { setSearching(false); setRefreshing(false); });
  }, [debounced]);

  useEffect(() => { runSearch(); }, [runSearch]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.title}>SEARCH</Text>
        <View style={styles.searchBox}>
          <SearchIcon size={16} color={colors.foreground} />
          <TextInput
            style={styles.input}
            placeholder="Search Mahindra, John Deere, Nashik…"
            placeholderTextColor={colors.mutedForeground}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            returnKeyType="search"
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <X size={16} color={colors.mutedForeground} />
            </Pressable>
          ) : null}
        </View>
      </View>
      <FlatList
        data={results}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => <AuctionCard item={item} />}
        contentContainerStyle={{ paddingBottom: 24 }}
        ItemSeparatorComponent={() => <View style={{ height: 0 }} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); runSearch(); }} tintColor={colors.primary} colors={[colors.primary]} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            {searching ? (
              <ActivityIndicator color={colors.primary} />
            ) : debounced ? (
              <Text style={styles.emptyText}>No results for "{debounced}"</Text>
            ) : (
              <Text style={styles.emptyText}>Search by brand, model, HP or city</Text>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.primary, paddingHorizontal: 6, paddingBottom: 10 },
  title: { color: '#FFFFFF', fontFamily: fonts.extrabold, fontSize: 18, letterSpacing: 1, marginBottom: 8 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border, paddingHorizontal: 8, gap: 6 },
  input: { flex: 1, paddingVertical: 6, fontFamily: fonts.medium, fontSize: 13, color: colors.foreground },
  empty: { padding: 28, alignItems: 'center' },
  emptyText: { color: colors.mutedForeground, fontFamily: fonts.medium, fontSize: 12 },
});
