import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Dimensions, Keyboard, Platform, FlatList, Image } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPin, User, Gavel, ChevronLeft, Calendar, Activity, Zap, ShieldCheck, FileText, Trophy, AlertCircle, Play, ShoppingBag, Ban, BadgeCheck, Sparkles, Tag } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, radius } from '@/lib/theme';
import { type Auction, type AuctionVideo } from '@/lib/mockData';
import { auctionApi, bidApi, orderApi, type MyAuctionBidStats } from '@/lib/api';
import CountdownBadge from '@/components/CountdownBadge';
import BottomSheet from '@/components/BottomSheet';
import MediaGallery from '@/components/MediaGallery';
import InAppViewerModal from '@/components/InAppViewerModal';
import { useAuctionRoom, useRealtime } from '@/lib/socket';
import { refreshMyBids } from '@/lib/useMyBids';
import { usePendingOrdersMap, markPending, refreshPendingOrders } from '@/lib/usePendingOrders';



const W = Dimensions.get('window').width;
const QUICK_INCREMENTS = [1000, 2000, 5000, 10000];
// Slower fallback poll — socket.io pushes real updates; this just backfills if the socket drops.
const POLL_MS = 15000;

export default function AuctionDetails() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<Auction | null>(null);
  const [loading, setLoading] = useState(true);
  const [myStats, setMyStats] = useState<MyAuctionBidStats | null>(null);
  const pollRef = useRef<any>(null);

  const refreshStats = async (auctionId: string) => {
    try { const r = await bidApi.myStats(auctionId); setMyStats(r.data); }
    catch { /* not logged in or offline — silent */ }
  };

  const refreshItem = async (auctionId: string) => {
    try {
      const r = await auctionApi.get(auctionId);
      setItem(r.data);
    } catch { /* silent */ }
  };

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    auctionApi.get(String(id))
      .then((r) => { setItem(r.data); refreshStats(r.data.id); })
      .catch(() => setItem(null))
      .finally(() => setLoading(false));
  }, [id]);

  // Fallback polling (long interval) — socket.io is the primary realtime channel.
  useEffect(() => {
    if (!id) return;
    pollRef.current = setInterval(() => {
      refreshItem(String(id));
      refreshStats(String(id));
    }, POLL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [id]);

  // Realtime — join this auction's room and react to live bid / auction updates.
  useAuctionRoom(id ? String(id) : null);
  useRealtime<{ auctionId: string; auction: Auction }>('bid:new', (p) => {
    if (!id || p.auctionId !== String(id)) return;
    if (p.auction) setItem((prev) => (prev ? { ...prev, ...p.auction } : p.auction));
    refreshStats(String(id));
  });
  useRealtime<{ auction: Auction }>('auction:updated', (p) => {
    if (!id || !p.auction || String((p.auction as any).id || (p.auction as any)._id) !== String(id)) return;
    setItem((prev) => (prev ? { ...prev, ...p.auction } : p.auction));
  });
  useRealtime<{ auctionId: string }>('auction:closed', (p) => {
    if (!id || p.auctionId !== String(id)) return;
    refreshItem(String(id));
    refreshStats(String(id));
  });


  const pendingMap = usePendingOrdersMap();
  const hasMyPending = !!(item && pendingMap[item.id]);
  const isPreApproved = item?.status === 'pre-approved' || item?.status === 'sold_out';
  const isSoldOut = !!item && (item.status === 'sold_out' || (item as any).soldOut || !!(item as any).pendingOrder || hasMyPending);
  const isEnded = !!item && !isPreApproved && !isSoldOut && (item.status !== 'live' || (item.endsAt && item.endsAt <= Date.now()));
  const minNext = item
    ? Math.max(item.startingBid || 0, (item.currentBid || 0) + 1000)
    : 0;
  const reserve = item?.reservePrice || 0;

  const [bid, setBid] = useState('');
  const [placing, setPlacing] = useState(false);
  const [done, setDone] = useState(false);
  const [buying, setBuying] = useState(false);
  const [bought, setBought] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorTitle, setErrorTitle] = useState('Bid too low');
  const [info, setInfo] = useState<string | null>(null);
  const [kbHeight, setKbHeight] = useState(0);
  const [viewer, setViewer] = useState<{ kind: 'pdf' | 'video'; url: string; title: string } | null>(null);


  useEffect(() => { if (item && !bid) setBid(String(minNext)); }, [item, minNext, bid]);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, (e) => setKbHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener(hideEvt, () => setKbHeight(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const placeBid = async () => {
    if (!item) return;
    if (isEnded) {
      setErrorTitle('Auction ended');
      setError('This auction has ended. Bidding is closed.');
      return;
    }
    const value = Number(bid);
    if (!value || value < minNext) {
      setErrorTitle('Bid too low');
      setError(`Minimum bid is ₹${minNext.toLocaleString('en-IN')} (₹1,000 minimum increment)`);
      return;
    }
    setPlacing(true);
    try {
      const res = await bidApi.place(item.id, value);
      setItem(res.auction);
      setDone(true);
      if (res.isLoss) {
        // Bid accepted but below reserve — inform user
        setTimeout(() => {
          setErrorTitle('⚠️ Loss Bid');
          setError(`Your bid ₹${value.toLocaleString('en-IN')} is below reserve price ₹${(res.reservePrice || reserve).toLocaleString('en-IN')}. It has been placed but is a LOSS bid.`);
        }, 400);
      }
      refreshStats(item.id);
      refreshMyBids();
    } catch (e: any) {
      setErrorTitle('Bid failed');
      setError(e?.message || 'Could not place bid');
    } finally {
      setPlacing(false);
    }
  };

  const buyNow = async () => {
    if (!item) return;
    setBuying(true);
    // Optimistically lock the item so the button flips to SOLD OUT immediately.
    markPending(item.id, 'optimistic');
    setItem((prev) => (prev ? ({ ...prev, soldOut: true } as any) : prev));
    try {
      const res = await orderApi.buyNow(item.id);
      if (res.auction) setItem((prev) => (prev ? { ...prev, ...res.auction, soldOut: true } : res.auction));
      if (res?.data?.id) markPending(item.id, String(res.data.id));
      // Reconcile from server so refresh survives.
      refreshPendingOrders();
      setInfo('Purchase request placed. It is pending until admin approval.');
    } catch (e: any) {
      setErrorTitle('Purchase failed');
      setError(e?.message || 'Could not complete purchase');
      // Refresh from server; if the server actually locked the auction (e.g. duplicate), keep it sold out.
      refreshPendingOrders();
    } finally {
      setBuying(false);
    }
  };


  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (!item) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, padding: 20 }}>
        <Text style={{ color: colors.mutedForeground, fontFamily: fonts.medium }}>Auction not found.</Text>
      </View>
    );
  }

  const viewInspectionPdf = () => {
    const url = item?.inspectionPdfUrl;
    if (!url) {
      setInfo('Inspection report PDF will be available soon.');
      return;
    }
    setViewer({ kind: 'pdf', url, title: 'Inspection Report' });
  };

  const openVideo = (url?: string, title?: string) => {
    if (!url) {
      setInfo('Video will be available soon.');
      return;
    }
    setViewer({ kind: 'video', url, title: title || item?.title || 'Video' });
  };

  // Show ONLY images in gallery — videos are their own section now
  const galleryImages = (item?.gallery && item.gallery.length
    ? item.gallery
    : item?.image ? [item.image] : []
  ).filter((u) => !!u && u.trim().length > 0);

  const tractorVideos: AuctionVideo[] = Array.isArray(item.videos) ? item.videos.filter((v) => v?.url) : [];
  // Legacy fallback: expose old single videoUrl as a video too
  if (!tractorVideos.length && item.videoUrl) {
    tractorVideos.push({ url: item.videoUrl, thumb: item.videoThumb, label: 'Video', duration: item.videoDuration });
  }

  // Bid color logic — my highest bid vs reserve
  const myHighest = myStats?.highest || 0;
  const myBidColor = myHighest === 0 ? colors.foreground : (reserve > 0 && myHighest < reserve ? colors.danger : colors.success);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: (isPreApproved || isEnded || isSoldOut ? 100 : 160) + insets.bottom }} showsVerticalScrollIndicator={false}>
        <View style={styles.heroWrap}>
          <MediaGallery
            images={galleryImages}
            onVideoPress={undefined}
          />

          <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
            <Pressable style={styles.iconBtn} onPress={() => router.back()} hitSlop={8}>
              <ChevronLeft size={22} color="#FFFFFF" />
            </Pressable>
          </View>

          {!isPreApproved && (
            <View style={styles.timerOverlay}>
              <CountdownBadge endsAt={item.endsAt} />
            </View>
          )}
          <View style={styles.catOverlay}>
            <Text style={styles.catText}>{isPreApproved ? 'PRE-APPROVED' : item.category}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.title}>{item.title}</Text>
          <View style={styles.metaRow}>
            <MapPin size={12} color={colors.mutedForeground} />
            <Text style={styles.meta}>{item.location}</Text>
          </View>
        </View>

        {isPreApproved ? (
          <View style={styles.preApprovedWrap}>
            <LinearGradient
              colors={[colors.primaryDark, colors.primary, '#0EA05C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.preApprovedCard}
            >
              <View style={styles.preApprovedGlow} />
              <View style={styles.preApprovedTopRow}>
                <View style={styles.preApprovedBadge}>
                  <BadgeCheck size={12} color={colors.primaryDark} />
                  <Text style={styles.preApprovedBadgeText}>PRE-APPROVED</Text>
                </View>
                <View style={styles.preApprovedInstant}>
                  <Sparkles size={11} color={colors.primaryGlow} />
                  <Text style={styles.preApprovedInstantText}>Instant Buy</Text>
                </View>
              </View>

              <Text style={styles.preApprovedLabel}>Fixed Price · No Bidding</Text>
              <View style={styles.preApprovedPriceRow}>
                <Text style={styles.preApprovedRupee}>₹</Text>
                <Text style={styles.preApprovedPrice}>{(item.buyNowPrice || item.currentBid || 0).toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.preApprovedDivider} />
              <View style={styles.preApprovedFeatures}>
                <View style={styles.preApprovedFeat}>
                  <ShieldCheck size={12} color={colors.primaryGlow} />
                  <Text style={styles.preApprovedFeatText}>46-Pt Verified</Text>
                </View>
                <View style={styles.preApprovedFeatDot} />
                <View style={styles.preApprovedFeat}>
                  <Tag size={12} color={colors.primaryGlow} />
                  <Text style={styles.preApprovedFeatText}>RC Cleared</Text>
                </View>
                <View style={styles.preApprovedFeatDot} />
                <View style={styles.preApprovedFeat}>
                  <BadgeCheck size={12} color={colors.primaryGlow} />
                  <Text style={styles.preApprovedFeatText}>Team Approved</Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        ) : (
          <View style={styles.bidGrid}>
            <View style={styles.bidCol}>
              <Text style={styles.bidLabel}>Current Bid</Text>
              <Text style={styles.bidValue}>₹{item.currentBid.toLocaleString('en-IN')}</Text>
              <Text style={styles.bidHint}>Highest bid so far</Text>
            </View>
            <View style={styles.bidColAlt}>
              <Text style={styles.bidLabelDark}>Starting Price</Text>
              <Text style={styles.bidValueAlt}>₹{(item.startingBid / 1000).toFixed(0)}k</Text>
              <Text style={styles.bidHintDark}>Base price</Text>
            </View>
            <View style={styles.bidColAlt}>
              <Text style={styles.bidLabelDark}>Total Bids</Text>
              <Text style={styles.bidValueAlt}>{item.bids}</Text>
              <Text style={styles.bidHintDark}>Bidders so far</Text>
            </View>
          </View>
        )}

        {(item.hp || item.year || item.hours) && (
          <View style={styles.specsRow}>
            {item.hp ? (
              <View style={styles.spec}>
                <Zap size={14} color={colors.foreground} />
                <View>
                  <Text style={styles.specLabel}>Power</Text>
                  <Text style={styles.specValue}>{item.hp} HP</Text>
                </View>
              </View>
            ) : null}
            {item.year ? (
              <View style={styles.spec}>
                <Calendar size={14} color={colors.foreground} />
                <View>
                  <Text style={styles.specLabel}>Year</Text>
                  <Text style={styles.specValue}>{item.year}</Text>
                </View>
              </View>
            ) : null}
            {item.hours ? (
              <View style={styles.spec}>
                <Activity size={14} color={colors.foreground} />
                <View>
                  <Text style={styles.specLabel}>Hours</Text>
                  <Text style={styles.specValue}>{item.hours}</Text>
                </View>
              </View>
            ) : null}
          </View>
        )}

        {!isPreApproved && myStats && myStats.count > 0 && (
          <View style={[styles.myBidsCard, myStats.isTopBidder ? styles.myBidsWinning : styles.myBidsLosing]}>
            <View style={[styles.myBidsIcon, { backgroundColor: myStats.isTopBidder ? colors.primary : colors.danger }]}>
              {myStats.isTopBidder
                ? <Trophy size={16} color="#FFFFFF" />
                : <AlertCircle size={16} color="#FFFFFF" />}
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.myBidsTitle}>
                You've placed {myStats.count} bid{myStats.count === 1 ? '' : 's'}
              </Text>
              <Text style={styles.myBidsSub}>
                Your highest: <Text style={{ color: myBidColor, fontFamily: fonts.extrabold }}>₹{myStats.highest.toLocaleString('en-IN')}</Text>
                {myStats.isTopBidder ? '  ·  You\'re winning' : `  ·  Bid > ₹${myStats.currentBid.toLocaleString('en-IN')} to win back`}
                {reserve > 0 && myHighest < reserve ? '  ·  ⚠️ LOSS (below reserve)' : ''}
              </Text>
            </View>
          </View>
        )}

        {tractorVideos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>TRACTOR VIDEOS</Text>
            <FlatList
              data={tractorVideos}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(_, i) => String(i)}
              contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
              renderItem={({ item: v }) => (
                <Pressable style={styles.videoCard} onPress={() => openVideo(v.url, v.label)}>
                  {v.thumb
                    ? <Image source={{ uri: v.thumb }} style={styles.videoThumbImg} />
                    : <View style={[styles.videoThumbImg, { backgroundColor: '#111' }]} />}
                  <View style={styles.videoPlayOverlay}>
                    <View style={styles.videoPlayBtn}>
                      <Play size={16} color="#FFFFFF" fill="#FFFFFF" />
                    </View>
                  </View>
                  <Text style={styles.videoLabel} numberOfLines={1}>{v.label || 'Video'}</Text>
                </Pressable>
              )}
            />
          </View>
        )}

        <View style={styles.sellerRow}>
          <View style={styles.sellerIcon}><User size={16} color="#FFFFFF" /></View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.sellerName}>{item.seller}</Text>
            <Text style={styles.sellerHint}>✓ Verified Seller · RC Cleared</Text>
          </View>
        </View>


        {item.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>DESCRIPTION</Text>
            <Text style={styles.descText}>{item.description}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <View style={styles.inspectCard}>
            <View style={styles.inspectIcon}>
              <ShieldCheck size={20} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.inspectTitle}>46 Point Test Verified</Text>
              <Text style={styles.inspectSub}>Inspected & certified by our experts</Text>
            </View>
            <Pressable style={styles.viewBtn} onPress={viewInspectionPdf}>
              <FileText size={13} color="#FFFFFF" />
              <Text style={styles.viewBtnText}>View Detail</Text>
            </Pressable>

          </View>
        </View>
      </ScrollView>

      <View style={[styles.bidBarWrap, { bottom: kbHeight }]}>

        <View style={[styles.bidBar, { paddingBottom: (kbHeight > 0 ? 6 : insets.bottom + 6), flexDirection: 'column', alignItems: 'stretch' }]}>
          {isSoldOut ? (
            <View style={[styles.bidBtn, { paddingVertical: 12, backgroundColor: '#6B7280' }]}>
              <Ban size={16} color="#FFFFFF" />
              <Text style={styles.bidBtnText}>SOLD OUT · Awaiting admin approval</Text>
            </View>
          ) : isPreApproved ? (
            <Pressable style={[styles.bidBtn, { paddingVertical: 12 }]} onPress={buyNow} disabled={buying}>
              {buying ? <ActivityIndicator color="#FFFFFF" /> : (
                <>
                  <ShoppingBag size={16} color="#FFFFFF" />
                  <Text style={styles.bidBtnText}>BUY NOW · ₹{(item.buyNowPrice || item.currentBid || 0).toLocaleString('en-IN')}</Text>
                </>
              )}
            </Pressable>
          ) : isEnded ? (
            <View style={styles.endedBar}>
              <AlertCircle size={16} color={colors.mutedForeground} />
              <Text style={styles.endedText}>Auction ended · Bidding closed</Text>
            </View>
          ) : (
            <>
              {/* Quick increment chips */}
              <View style={styles.quickRow}>
                {QUICK_INCREMENTS.map((inc) => (
                  <Pressable
                    key={inc}
                    style={styles.quickChip}
                    onPress={() => setBid(String((item.currentBid || 0) + inc))}
                  >
                    <Text style={styles.quickChipText}>+₹{inc.toLocaleString('en-IN')}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <View style={styles.bidInputWrap}>
                  <Text style={styles.rupee}>₹</Text>
                  <TextInput
                    style={[styles.bidInput, { color: reserve > 0 && Number(bid) > 0 && Number(bid) < reserve ? colors.danger : (Number(bid) >= reserve && reserve > 0 ? colors.success : colors.foreground) }]}
                    value={bid}
                    keyboardType="number-pad"
                    onChangeText={(t) => setBid(t.replace(/[^0-9]/g, ''))}
                    placeholder={`Custom amount · min ₹${minNext.toLocaleString('en-IN')}`}
                    placeholderTextColor={colors.mutedForeground}
                  />
                </View>
                <Pressable style={styles.bidBtn} onPress={placeBid} disabled={placing}>
                  {placing ? <ActivityIndicator color="#FFFFFF" /> : (
                    <>
                      <Gavel size={15} color="#FFFFFF" />
                      <Text style={styles.bidBtnText}>PLACE BID</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>

      <BottomSheet
        visible={done}
        variant="success"
        title="Bid Placed!"
        message={`Your bid of ₹${Number(bid).toLocaleString('en-IN')} has been recorded.`}
        confirmText="Great"
        onClose={() => setDone(false)}
      />
      <BottomSheet
        visible={bought}
        variant="success"
        title="Purchase Request Pending"
        message="This tractor is locked as Sold Out. It will move to Won only after admin approval."
        confirmText="View Requests"
        onClose={() => { setBought(false); router.replace('/(tabs)/orders' as any); }}
      />
      <BottomSheet
        visible={!!error}
        variant="error"
        title={errorTitle}
        message={error || ''}
        confirmText="OK"
        onClose={() => setError(null)}
      />
      <BottomSheet
        visible={!!info}
        variant="info"
        title={info?.startsWith('Purchase request') ? 'Purchase Request Pending' : 'Inspection Report'}
        message={info || ''}
        confirmText="OK"
        onClose={() => setInfo(null)}
      />
      <InAppViewerModal
        visible={!!viewer}
        kind={viewer?.kind || 'pdf'}
        url={viewer?.url}
        title={viewer?.title}
        onClose={() => setViewer(null)}
      />
    </View>
  );
}


const styles = StyleSheet.create({
  heroWrap: { width: W, backgroundColor: colors.primaryLight },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 6, paddingBottom: 8 },
  iconBtn: { width: 36, height: 36, backgroundColor: 'rgba(8, 77, 37, 0.2)', alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg },
  timerOverlay: { position: 'absolute', bottom: 8, right: 6 },
  catOverlay: { position: 'absolute', bottom: 8, left: 6, backgroundColor: colors.primary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.sm },
  catText: { color: '#FFFFFF', fontFamily: fonts.extrabold, fontSize: 11, letterSpacing: 0.5 },

  section: { backgroundColor: colors.card, paddingHorizontal: 6, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { color: colors.foreground, fontFamily: fonts.extrabold, fontSize: 18 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 3 },
  meta: { color: colors.mutedForeground, fontFamily: fonts.medium, fontSize: 12 },

  bidGrid: { flexDirection: 'row', backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  bidCol: { flex: 1.4, paddingVertical: 10, paddingHorizontal: 8, backgroundColor: colors.primaryDark },
  bidColAlt: { flex: 1, paddingVertical: 10, paddingHorizontal: 8, borderLeftWidth: 1, borderLeftColor: colors.border, alignItems: 'flex-start' },
  bidLabel: { color: colors.primaryGlow, fontFamily: fonts.bold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6 },
  bidLabelDark: { color: colors.primaryDark, fontFamily: fonts.bold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6 },
  bidValue: { color: '#FFFFFF', fontFamily: fonts.extrabold, fontSize: 20, marginTop: 2 },
  bidValueAlt: { color: colors.foreground, fontFamily: fonts.extrabold, fontSize: 16, marginTop: 2 },
  bidHint: { color: 'rgba(255,255,255,0.7)', fontFamily: fonts.medium, fontSize: 9, marginTop: 2 },
  bidHintDark: { color: colors.mutedForeground, fontFamily: fonts.medium, fontSize: 9, marginTop: 2 },

  preApprovedWrap: { paddingHorizontal: 10, paddingTop: 10, paddingBottom: 12, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  preApprovedCard: { borderRadius: 16, paddingVertical: 16, paddingHorizontal: 14, overflow: 'hidden', position: 'relative' },
  preApprovedGlow: { position: 'absolute', top: -60, right: -60, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(134,239,172,0.18)' },
  preApprovedTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  preApprovedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFFFFF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  preApprovedBadgeText: { color: colors.primaryDark, fontFamily: fonts.extrabold, fontSize: 10, letterSpacing: 0.6 },
  preApprovedInstant: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.25)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(134,239,172,0.4)' },
  preApprovedInstantText: { color: colors.primaryGlow, fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.4 },
  preApprovedLabel: { color: 'rgba(255,255,255,0.75)', fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 0.8, marginTop: 12, textTransform: 'uppercase' },
  preApprovedPriceRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 4 },
  preApprovedRupee: { color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 20, marginBottom: 4, marginRight: 2 },
  preApprovedPrice: { color: '#FFFFFF', fontFamily: fonts.extrabold, fontSize: 36, letterSpacing: -0.5, lineHeight: 40 },
  preApprovedDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginTop: 12, marginBottom: 10 },
  preApprovedFeatures: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  preApprovedFeat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  preApprovedFeatText: { color: '#FFFFFF', fontFamily: fonts.semibold, fontSize: 11 },
  preApprovedFeatDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.4)' },

  specsRow: { flexDirection: 'row', backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  spec: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 6, borderLeftWidth: 1, borderLeftColor: colors.border },
  specLabel: { color: colors.mutedForeground, fontFamily: fonts.medium, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.4 },
  specValue: { color: colors.foreground, fontFamily: fonts.extrabold, fontSize: 13 },

  sellerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, paddingHorizontal: 6, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  sellerIcon: { width: 34, height: 34, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  sellerName: { color: colors.foreground, fontFamily: fonts.bold, fontSize: 13 },
  sellerHint: { color: colors.primary, fontFamily: fonts.bold, fontSize: 10, marginTop: 1 },

  myBidsCard: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border, borderLeftWidth: 3 },
  myBidsWinning: { backgroundColor: colors.primaryLight, borderLeftColor: colors.primary },
  myBidsLosing: { backgroundColor: '#FEF2F2', borderLeftColor: colors.danger },
  myBidsIcon: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  myBidsTitle: { color: colors.foreground, fontFamily: fonts.extrabold, fontSize: 13 },
  myBidsSub: { color: colors.mutedForeground, fontFamily: fonts.medium, fontSize: 11, marginTop: 2 },


  sectionTitle: { color: colors.mutedForeground, fontFamily: fonts.extrabold, fontSize: 11, letterSpacing: 1, marginBottom: 4 },
  descText: { color: colors.foreground, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18 },

  videoCard: { width: 140, backgroundColor: '#000', borderRadius: radius.sm, overflow: 'hidden' },
  videoThumbImg: { width: 140, height: 90 },
  videoPlayOverlay: { position: 'absolute', top: 0, left: 0, right: 0, height: 90, alignItems: 'center', justifyContent: 'center' },
  videoPlayBtn: { width: 32, height: 32, borderRadius: radius.pill, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FFFFFF' },
  videoLabel: { color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 11, paddingHorizontal: 6, paddingVertical: 4, backgroundColor: 'rgba(0,0,0,0.7)' },

  inspectCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: colors.primary, paddingHorizontal: 8, paddingVertical: 8, borderRadius: radius.md },
  inspectIcon: { width: 36, height: 36, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  inspectTitle: { color: colors.primaryDark, fontFamily: fonts.extrabold, fontSize: 14 },
  inspectSub: { color: colors.foreground, fontFamily: fonts.medium, fontSize: 11, marginTop: 2 },
  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 7, borderRadius: radius.sm, minWidth: 90, justifyContent: 'center' },
  viewBtnText: { color: '#FFFFFF', fontFamily: fonts.extrabold, fontSize: 11, letterSpacing: 0.5 },

  bidBarWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  bidBar: { paddingHorizontal: 6, paddingTop: 6, gap: 6, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border, marginBottom: 20 },
  quickRow: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  quickChip: { flex: 1, backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: colors.primary, paddingVertical: 6, alignItems: 'center', borderRadius: radius.sm },
  quickChipText: { color: colors.primaryDark, fontFamily: fonts.extrabold, fontSize: 11 },
  bidInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.primary, paddingHorizontal: 10, backgroundColor: colors.card, borderRadius: radius.md },
  rupee: { color: colors.primaryDark, fontFamily: fonts.extrabold, fontSize: 14, marginRight: 2 },
  bidInput: { flex: 1, paddingVertical: 6, fontFamily: fonts.extrabold, fontSize: 14, color: colors.foreground },
  bidBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.primary, paddingHorizontal: 18, borderRadius: radius.sm },
  bidBtnText: { color: '#FFFFFF', fontFamily: fonts.extrabold, fontSize: 13, letterSpacing: 0.8, borderRadius: radius.sm },
  endedBar: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: '#F3F4F6', borderRadius: radius.md },
  endedText: { color: colors.mutedForeground, fontFamily: fonts.bold, fontSize: 12 },
});
