import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ActivityIndicator, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, RotateCw } from 'lucide-react-native';
import { colors, fonts } from '@/lib/theme';

type Kind = 'pdf' | 'video';

type Props = {
    visible: boolean;
    kind: Kind;
    url?: string | null;
    title?: string;
    onClose: () => void;
};

function pdfViewerUrl(rawUrl: string) {
    // Google Docs viewer renders PDF reliably inside a mobile WebView.
    return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(rawUrl)}`;
}

// Injected into the Google Docs PDF viewer to strip only the floating popout /
// open-in-new-window link in the top-right corner. Keep the selectors narrow so
// we never accidentally hide the PDF canvas itself.
const HIDE_GVIEW_TOOLBAR_JS = `
(function(){
  var css = \`
    a[aria-label="Open"], a[aria-label="Pop-out"],
    a[href*="/viewer"][target="_blank"],
    a[href*="docs.google.com"][target="_blank"] {
      display: none !important;
    }
  \`;
  var s = document.createElement('style');
  s.textContent = css;
  document.documentElement.appendChild(s);
})();
true;
`;



function videoHtml(rawUrl: string) {
    // Fullscreen video player. No download / no PiP / no remote-playback / no airplay.
    // A `data-rot` attribute on <video> drives rotation (0/90/180/270) via CSS.
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/>
<style>
  html,body{margin:0;padding:0;background:#000;height:100%;width:100%;overflow:hidden;}
  .stage{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;}
  video{background:#000;transition:transform .2s ease;transform-origin:center center;}
  /* Portrait (default) — fit width */
  video[data-rot="0"],video[data-rot="180"]{width:100vw;height:100vh;object-fit:contain;}
  /* Landscape — swap dimensions so it still fits the screen */
  video[data-rot="90"],video[data-rot="270"]{width:100vh;height:100vw;object-fit:contain;}
  video[data-rot="0"]{transform:rotate(0deg);}
  video[data-rot="90"]{transform:rotate(90deg);}
  video[data-rot="180"]{transform:rotate(180deg);}
  video[data-rot="270"]{transform:rotate(270deg);}
  video::-webkit-media-controls-download-button{display:none !important;}
  video::-webkit-media-controls-enclosure{overflow:hidden;}
</style></head>
<body>
  <div class="stage">
    <video id="v" src="${rawUrl}" data-rot="0" controls autoplay playsinline webkit-playsinline
      controlsList="nodownload noremoteplayback noplaybackrate"
      disablePictureInPicture disableRemotePlayback x-webkit-airplay="deny"></video>
  </div>
  <script>
    window.__rotate = function(){
      var v = document.getElementById('v');
      var r = (parseInt(v.getAttribute('data-rot'),10) + 90) % 360;
      v.setAttribute('data-rot', String(r));
    };
    document.addEventListener('message', function(e){ if(e.data==='rotate') window.__rotate(); });
    window.addEventListener('message', function(e){ if(e.data==='rotate') window.__rotate(); });
  </script>
</body></html>`;
}

export default function InAppViewerModal({ visible, kind, url, title, onClose }: Props) {
    const insets = useSafeAreaInsets();
    const webRef = useRef<WebView>(null);
    const [rotateNonce, setRotateNonce] = useState(0);

    // If nothing to show, don't render an empty modal shell at all.
    const canShow = !!url && (kind === 'pdf' || kind === 'video');

    useEffect(() => { if (!visible) setRotateNonce(0); }, [visible]);

    const source =
        url && kind === 'pdf'
            ? { uri: pdfViewerUrl(url) }
            : url && kind === 'video'
                ? { html: videoHtml(url), baseUrl: '' as string }
                : undefined;

    const rotate = () => {
        setRotateNonce((n) => n + 1);
        webRef.current?.injectJavaScript('window.__rotate && window.__rotate(); true;');
    };

    if (!canShow) return null;

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
            <View style={[styles.wrap, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
                <View style={styles.header}>
                    <Text style={styles.title} numberOfLines={1}>
                        {title || (kind === 'pdf' ? 'Inspection Report' : 'Video')}
                    </Text>
                    {kind === 'video' ? (
                        <Pressable onPress={rotate} hitSlop={10} style={styles.headerBtn}>
                            <RotateCw size={18} color="#FFFFFF" />
                        </Pressable>
                    ) : null}
                    <Pressable onPress={onClose} hitSlop={10} style={styles.headerBtn}>
                        <X size={20} color="#FFFFFF" />
                    </Pressable>
                </View>
                <View style={styles.divider} />
                {source ? (
                    <WebView
                        ref={webRef}
                        key={`${kind}-${url}-${rotateNonce === -1 ? 'x' : 'y'}`}
                        source={source as any}
                        style={{ flex: 1, backgroundColor: '#000' }}
                        startInLoadingState
                        renderLoading={() => (
                            <View style={styles.loading}>
                                <ActivityIndicator color={colors.primary} />
                            </View>
                        )}
                        allowsInlineMediaPlayback
                        mediaPlaybackRequiresUserAction={false}
                        javaScriptEnabled
                        domStorageEnabled
                        setSupportMultipleWindows={false}
                        originWhitelist={['*']}
                        mixedContentMode={Platform.OS === 'android' ? 'always' : undefined}
                        injectedJavaScript={kind === 'pdf' ? HIDE_GVIEW_TOOLBAR_JS : undefined}
                        onLoadEnd={() => {
                            if (kind === 'pdf') {
                                webRef.current?.injectJavaScript(HIDE_GVIEW_TOOLBAR_JS);
                            }
                        }}
                        // Trap navigation inside the viewer. If the user taps the
                        // popout/open-in-new-window icon, block the request so
                        // we never leave the in-app PDF/video screen.
                        onShouldStartLoadWithRequest={(req) => {
                            if (kind !== 'pdf') return true;
                            const u = req.url || '';
                            // Allow only the Google Docs viewer chrome + the raw PDF host.
                            const allow =
                                u.startsWith('about:') ||
                                u.startsWith('data:') ||
                                u.startsWith('blob:') ||
                                u.includes('docs.google.com/gview') ||
                                u.includes('docs.google.com/viewer') ||
                                u.includes('googleusercontent.com') ||
                                u.includes('gstatic.com') ||
                                (!!url && u.startsWith(url.split('?')[0]));
                            return allow;
                        }}
                    />

                ) : null}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    wrap: { flex: 1, backgroundColor: '#000' },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 8, backgroundColor: '#000', gap: 4 },
    title: { flex: 1, color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 14 },
    headerBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
    divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.15)' },
    loading: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' },
});
