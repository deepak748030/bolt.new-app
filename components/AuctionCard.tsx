import React from 'react';
import { View, Text, StyleSheet, Pressable, Image, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { MapPin, Gavel, ShoppingBag, Ban, Trophy, AlertTriangle } from 'lucide-react-native';
import { colors, fonts, radius } from '@/lib/theme';
import { Auction } from '@/lib/mockData';
import CountdownBadge from './CountdownBadge';
import { useMyBidsMap } from '@/lib/useMyBids';
import { usePendingOrdersMap } from '@/lib/usePendingOrders';

const W = Dimensions.get('window').width;

const inr = (n: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function AuctionCard({ item }: { item: Auction }) {
  const onPress = () => router.push({ pathname: '/auction-details', params: { id: item.id } });

  const pendingMap = usePendingOrdersMap();
  const hasMyPending = !!pendingMap[item.id];
  const isPreApproved = item.status === 'pre-approved' || item.status === 'sold_out';
  const isSoldOut = item.status === 'sold_out' || !!item.soldOut || !!(item as any).pendingOrder || hasMyPending;

  const myBids = useMyBidsMap();
  const my = myBids[item.id];
  const topBid = my ? (my.topBid || my.currentBid || item.currentBid) : item.currentBid;

  const renderCta = () => {
    if (isSoldOut) {
      return (
        <View style={[styles.cta, styles.ctaSold]}>
          <Ban size={13} color="#FFFFFF" />
          <Text style={styles.ctaText}>Sold Out</Text>
        </View>
      );
    }
    if (isPreApproved) {
      return (
        <View style={[styles.cta, styles.ctaPurchase]}>
          <ShoppingBag size={13} color="#FFFFFF" />
          <Text style={styles.ctaText}>Buy Now</Text>
        </View>
      );
    }
    if (my && my.myHighest > 0) {
      if (my.isTopBidder) {
        return (
          <View style={[styles.cta, styles.ctaWin]}>
            <Trophy size={12} color="#FFFFFF" />
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.ctaText} numberOfLines={1}>My Bid {inr(my.myHighest)}</Text>
              <Text style={styles.ctaSub} numberOfLines={1}>Winning · Top {inr(topBid)}</Text>
            </View>
          </View>
        );
      }
      return (
        <View style={[styles.cta, styles.ctaLose]}>
          <AlertTriangle size={12} color="#FFFFFF" />
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.ctaText} numberOfLines={1}>My Bid {inr(my.myHighest)}</Text>
            <Text style={styles.ctaSub} numberOfLines={1}>Outbid · Top {inr(topBid)}</Text>
          </View>
        </View>
      );
    }
    return (
      <View style={styles.cta}>
        <Gavel size={13} color="#FFFFFF" />
        <Text style={styles.ctaText}>Bid</Text>
      </View>
    );
  };

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.imgWrap}>
        <Image source={{ uri: item.image }} style={styles.img} resizeMode="cover" />
        {!isPreApproved && !isSoldOut ? (
          <View style={styles.timer}>
            <CountdownBadge endsAt={item.endsAt} />
          </View>
        ) : null}
        {isSoldOut ? (
          <View style={styles.soldRibbon}>
            <Text style={styles.soldRibbonText}>SOLD OUT</Text>
          </View>
        ) : null}
        <View style={styles.catTag}>
          <Text style={styles.catText}>{isPreApproved ? 'PRE-APPROVED' : item.category}</Text>
        </View>
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        <View style={styles.metaRow}>
          <MapPin size={11} color={colors.mutedForeground} />
          <Text style={styles.meta}>{item.location}</Text>
          {item.hp ? <Text style={styles.dot}>·</Text> : null}
          {item.hp ? <Text style={styles.meta}>{item.hp} HP</Text> : null}
          {item.year ? <Text style={styles.dot}>·</Text> : null}
          {item.year ? <Text style={styles.meta}>{item.year}</Text> : null}
        </View>
        <View style={styles.bottomRow}>
          <View>
            <Text style={styles.bidLabel}>{isPreApproved ? 'Buy Price' : 'Current Bid'}</Text>
            <Text style={styles.bidValue}>{inr(isPreApproved ? (item.buyNowPrice || item.currentBid) : topBid)}</Text>
          </View>
          {!isPreApproved ? (
            <View style={styles.bidsCol}>
              <Text style={styles.bidsValue}>{item.bids}</Text>
              <Text style={styles.bidLabel}>Bids</Text>
            </View>
          ) : null}
          {renderCta()}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  imgWrap: { width: '100%', height: W * 0.58, backgroundColor: '#EAEAE8' },
  img: { width: '100%', height: '100%' },
  timer: { position: 'absolute', top: 6, right: 6 },
  soldRibbon: { position: 'absolute', top: 6, right: 6, backgroundColor: '#DC2626', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm },
  soldRibbonText: { color: '#FFFFFF', fontFamily: fonts.extrabold, fontSize: 11, letterSpacing: 0.6 },
  catTag: { position: 'absolute', top: 6, left: 6, backgroundColor: colors.primaryDark, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.sm },
  catText: { color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.4 },
  body: { paddingHorizontal: 6, paddingVertical: 6 },
  title: { color: colors.foreground, fontFamily: fonts.bold, fontSize: 14 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: -2, gap: 4 },
  meta: { color: colors.mutedForeground, fontFamily: fonts.medium, fontSize: 11 },
  dot: { color: colors.mutedForeground, fontSize: 11, marginHorizontal: 1 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 },
  bidLabel: { color: colors.mutedForeground, fontFamily: fonts.medium, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 },
  bidValue: { color: colors.foreground, fontFamily: fonts.extrabold, fontSize: 16, marginTop: 1 },
  bidsCol: { alignItems: 'center', paddingHorizontal: 8, borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border },
  bidsValue: { color: colors.foreground, fontFamily: fonts.extrabold, fontSize: 14 },
  cta: { flex: 1, minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: colors.primary, paddingVertical: 8, paddingHorizontal: 4, borderRadius: radius.sm },
  ctaPurchase: { backgroundColor: colors.primaryDark },
  ctaSold: { backgroundColor: '#6B7280' },
  ctaWin: { backgroundColor: colors.success, paddingVertical: 6 },
  ctaLose: { backgroundColor: colors.danger, paddingVertical: 6 },
  ctaText: { color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 10 },
  ctaSub: { color: 'rgba(255,255,255,0.9)', fontFamily: fonts.semibold, fontSize: 8, marginTop: -1 },
});
