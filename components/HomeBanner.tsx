import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Image, Pressable, StyleSheet, Dimensions, FlatList, ViewToken } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/lib/theme';
import { bannerApi, type ApiBanner } from '@/lib/api';

const W = Dimensions.get('window').width;
const HEIGHT = Math.round(W * (7 / 16));

export default function HomeBanner() {
    const [banners, setBanners] = useState<ApiBanner[]>([]);
    const [index, setIndex] = useState(0);
    const listRef = useRef<FlatList<ApiBanner>>(null);

    useEffect(() => {
        let mounted = true;
        bannerApi.list()
            .then((r) => { if (mounted && r?.data) setBanners(r.data); })
            .catch(() => { /* silent */ });
        return () => { mounted = false; };
    }, []);

    // Auto-advance every 4s.
    useEffect(() => {
        if (banners.length < 2) return;
        const t = setInterval(() => {
            const next = (index + 1) % banners.length;
            listRef.current?.scrollToIndex({ index: next, animated: true });
            setIndex(next);
        }, 4000);
        return () => clearInterval(t);
    }, [banners.length, index]);

    const onViewable = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        if (viewableItems[0]?.index != null) setIndex(viewableItems[0].index);
    }).current;

    const onPress = useCallback((b: ApiBanner) => {
        if (b.auction) router.push({ pathname: '/auction-details', params: { id: b.auction } });
    }, []);

    if (banners.length === 0) return null;

    return (
        <View style={styles.wrap}>
            <FlatList
                ref={listRef}
                data={banners}
                keyExtractor={(b) => b.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                snapToInterval={W}
                decelerationRate="fast"
                onViewableItemsChanged={onViewable}
                viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
                getItemLayout={(_, i) => ({ length: W, offset: W * i, index: i })}
                renderItem={({ item }) => (
                    <Pressable onPress={() => onPress(item)} style={styles.slide}>
                        <Image source={{ uri: item.image }} style={styles.img} resizeMode="cover" />
                    </Pressable>
                )}
            />
            {banners.length > 1 && (
                <View style={styles.dots}>
                    {banners.map((b, i) => (
                        <View key={b.id} style={[styles.dot, i === index && styles.dotActive]} />
                    ))}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { width: W, backgroundColor: colors.background, marginTop: -6.1 },
    slide: { width: W, height: HEIGHT, backgroundColor: '#EAEAE8' },
    img: { width: '100%', height: '100%' },
    dots: { position: 'absolute', bottom: 6, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 4 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.55)' },
    dotActive: { backgroundColor: '#FFFFFF', width: 16 },
});