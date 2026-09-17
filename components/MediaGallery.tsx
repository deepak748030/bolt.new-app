import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Image, FlatList, Dimensions, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Play, Camera, Maximize2 } from 'lucide-react-native';
import { colors, fonts, radius } from '@/lib/theme';


const W = Dimensions.get('window').width;
const H = W * 0.75;

type Slide = { type: 'image' | 'video'; uri: string; duration?: string };

// Auto-derive a poster/thumbnail frame from the video URL itself so the
// preview always matches the actual video (not some unrelated product image).
// - Cloudinary: swap the file extension for `.jpg` (Cloudinary serves the
//   first frame as a JPG poster automatically).
// - Other hosts: return empty; we fall back to a black slide with play icon.
function deriveVideoPoster(videoUrl?: string): string {
    if (!videoUrl) return '';
    try {
        const clean = videoUrl.split('?')[0];
        if (clean.includes('res.cloudinary.com') && clean.includes('/video/upload/')) {
            return clean.replace(/\.(mp4|mov|webm|mkv|avi|m4v)$/i, '.jpg');
        }
    } catch { /* ignore */ }
    return '';
}

function inlineVideoHtml(rawUrl: string) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/>
<style>
  html,body{margin:0;padding:0;background:#000;height:100%;width:100%;overflow:hidden;}
  video{width:100%;height:100%;object-fit:contain;background:#000;display:block;pointer-events:none;}
  video::-webkit-media-controls{display:none !important;}
  video::-webkit-media-controls-enclosure{display:none !important;}
  video::-webkit-media-controls-panel{display:none !important;}
</style></head>
<body>
  <video src="${rawUrl}" autoplay loop playsinline webkit-playsinline muted disablePictureInPicture disableRemotePlayback x-webkit-airplay="deny"></video>
</body></html>`;
}


export default function MediaGallery({
    images, videoUrl, videoThumb, videoDuration, overlay, onVideoPress,
}: {
    images: string[];
    videoUrl?: string;
    videoThumb?: string;
    videoDuration?: string;
    overlay?: React.ReactNode;
    onVideoPress?: () => void;
}) {
    const hasVideo = !!videoUrl?.trim();
    // Priority: explicit videoThumb → auto-derived poster from video URL → empty (black slide)
    const posterUri = (videoThumb && videoThumb.trim()) || deriveVideoPoster(videoUrl);
    const slides: Slide[] = [
        ...(hasVideo ? [{ type: 'video' as const, uri: posterUri, duration: videoDuration }] : []),
        ...images.map((i) => ({ type: 'image' as const, uri: i })),
    ];

    const [idx, setIdx] = useState(0);
    const [playing, setPlaying] = useState(false);
    const ref = useRef<FlatList<Slide>>(null);
    const insets = useSafeAreaInsets();


    return (
        <View style={styles.wrap}>
            <FlatList
                ref={ref}
                data={slides}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(_, i) => String(i)}
                onMomentumScrollEnd={(e) => {
                    const newIdx = Math.round(e.nativeEvent.contentOffset.x / W);
                    setIdx(newIdx);
                    if (slides[newIdx]?.type !== 'video') setPlaying(false);
                }}
                renderItem={({ item }) => (
                    <View style={styles.slide}>
                        {item.type === 'video' && playing && videoUrl ? (
                            <>
                                <WebView
                                    source={{ html: inlineVideoHtml(videoUrl), baseUrl: '' }}
                                    style={styles.webview}
                                    allowsInlineMediaPlayback
                                    mediaPlaybackRequiresUserAction={false}
                                    javaScriptEnabled
                                    scrollEnabled={false}
                                    setSupportMultipleWindows={false}
                                    originWhitelist={['*']}
                                    mixedContentMode={Platform.OS === 'android' ? 'always' : undefined}
                                />
                                {onVideoPress ? (
                                    <Pressable
                                        style={styles.fsBtn}
                                        onPress={() => { setPlaying(false); onVideoPress(); }}
                                        hitSlop={8}
                                    >
                                        <Maximize2 size={14} color="#FFFFFF" />
                                    </Pressable>
                                ) : null}



                            </>
                        ) : (
                            <>
                                <Image source={{ uri: item.uri }} style={styles.img} resizeMode="cover" />
                                {item.type === 'video' && (
                                    <Pressable style={styles.videoOverlay} onPress={() => setPlaying(true)}>
                                        <View style={styles.playBtn}>
                                            <Play size={28} color="#FFFFFF" fill="#FFFFFF" />
                                        </View>
                                        {item.duration ? (
                                            <View style={styles.durationTag}>
                                                <Text style={styles.durationText}>{item.duration}</Text>
                                            </View>
                                        ) : null}
                                    </Pressable>
                                )}
                            </>
                        )}
                    </View>
                )}
            />


            {overlay}

            {/* Counter pill */}
            <View style={styles.counter}>
                {slides[idx]?.type === 'video'
                    ? <Play size={10} color="#FFFFFF" fill="#FFFFFF" />
                    : <Camera size={10} color="#FFFFFF" />}
                <Text style={styles.counterText}>{idx + 1} / {slides.length}</Text>
            </View>

            {/* Dots */}
            <View style={styles.dots}>
                {slides.map((_, i) => (
                    <View key={i} style={[styles.dot, i === idx && styles.dotActive]} />
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { width: W, height: H, backgroundColor: colors.primaryLight },
    slide: { width: W, height: H, backgroundColor: '#000' },
    img: { width: '100%', height: '100%' },
    webview: { width: '100%', height: '100%', backgroundColor: '#000' },
    videoOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.25)' },
    playBtn: { width: 60, height: 60, borderRadius: radius.pill, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
    durationTag: { position: 'absolute', bottom: 12, right: 10, backgroundColor: 'rgba(0,0,0,0.65)', paddingHorizontal: 5, paddingVertical: 1, borderRadius: radius.xs },
    durationText: { color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 10 },
    fsBtn: { position: 'absolute', bottom: 44, right: 6, width: 30, height: 30, borderRadius: radius.sm, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
    counter: { position: 'absolute', bottom: 18, right: 6, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.xs },
    counterText: { color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 10 },
    dots: { position: 'absolute', bottom: 6, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 3 },
    dot: { width: 5, height: 5, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.55)' },
    dotActive: { backgroundColor: '#FFFFFF', width: 14 },
});
