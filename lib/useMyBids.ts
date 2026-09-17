// Global per-auction "my bid" store, kept live via socket.io events.
// Consumed by the AuctionCard to show green/red bid pills.
import { useEffect, useState } from 'react';
import { bidApi, getStoredUser, getToken, type MyBidsSummary } from './api';
import { getSocket } from './socket';

type Entry = { myHighest: number; count: number; isTopBidder: boolean; currentBid: number; topBid: number };
type Map_ = Record<string, Entry>;

let state: Map_ = {};
let myUserId: string | null = null;
const listeners = new Set<(s: Map_) => void>();
let socketWired = false;
let currentSocket: any = null;

function emit() { for (const l of listeners) l(state); }
const ENTRY_DEFAULTS = { myHighest: 0, count: 0, isTopBidder: false, currentBid: 0, topBid: 0 };

function upsert(id: string, patch: Partial<Entry>) {
    const cur = state[id];
    if (!cur && (patch.myHighest || 0) <= 0) return; // don't track auctions user never bid on
    state = { ...state, [id]: { ...ENTRY_DEFAULTS, ...(cur || {}), ...patch } };
    emit();
}

function normalizeSummary(input: MyBidsSummary): Map_ {
    const out: Map_ = {};
    Object.entries(input || {}).forEach(([id, v]: any) => {
        const myHighest = Number(v?.myHighest || 0);
        const currentBid = Number(v?.currentBid || v?.topBid || 0);
        const topBid = Number(v?.topBid || currentBid || 0);
        if (myHighest > 0) {
            out[String(id)] = {
                myHighest,
                count: Number(v?.count || 0),
                currentBid,
                topBid,
                isTopBidder: Boolean(v?.isTopBidder || (topBid > 0 && myHighest >= topBid)),
            };
        }
    });
    return out;
}

function onBidNew(p: any) {
    if (!p?.auctionId) return;
    const id = String(p.auctionId);
    const bidderId = p?.bid?.userId ? String(p.bid.userId) : '';
    const amount = Number(p?.bid?.amount || 0);
    const isMine = !!(myUserId && bidderId === myUserId);
    const entry = state[id];
    if (isMine) {
        upsert(id, {
            myHighest: Math.max(entry?.myHighest || 0, amount),
            count: (entry?.count || 0) + 1,
            isTopBidder: true,
            currentBid: Math.max(entry?.currentBid || 0, amount),
            topBid: Math.max(entry?.topBid || 0, amount),
        });
    } else if (entry) {
        const nextTop = Math.max(entry.topBid || entry.currentBid || 0, amount);
        upsert(id, {
            currentBid: Math.max(entry.currentBid || 0, amount),
            topBid: nextTop,
            isTopBidder: (entry.myHighest || 0) >= nextTop,
        });
    }
}

function onAuctionUpdated(p: any) {
    const a = p?.auction;
    if (!a) return;
    const id = String(a.id || a._id || '');
    if (!id || !state[id]) return;
    if (typeof a.currentBid === 'number') {
        const entry = state[id];
        const nextTop = Math.max(Number(a.currentBid || 0), entry.topBid || 0);
        upsert(id, {
            currentBid: a.currentBid,
            topBid: nextTop,
            isTopBidder: (entry.myHighest || 0) >= nextTop,
        });
    }
}

async function wireSocket() {
    const sock = await getSocket();
    if (currentSocket && currentSocket !== sock) {
        try { currentSocket.off('bid:new', onBidNew); currentSocket.off('auction:updated', onAuctionUpdated); } catch {}
        socketWired = false;
    }
    currentSocket = sock;
    if (socketWired) return;
    sock.on('bid:new', onBidNew);
    sock.on('auction:updated', onAuctionUpdated);
    sock.on('connect', refreshMyBids);
    sock.io?.on?.('reconnect', refreshMyBids);
    socketWired = true;
}

export async function refreshMyBids() {
    try {
        const token = await getToken();
        if (!token) { state = {}; myUserId = null; emit(); return; }
        const u = await getStoredUser<any>();
        myUserId = (u?.id || u?._id) ? String(u.id || u._id) : null;
        const r = await bidApi.mineSummary();
        state = normalizeSummary(r.data as MyBidsSummary);
        emit();
        await wireSocket();
    } catch { /* silent */ }
}

export function useMyBidsMap() {
    const [s, setS] = useState<Map_>(state);
    useEffect(() => {
        listeners.add(setS);
        setS(state);
        refreshMyBids();
        return () => { listeners.delete(setS); };
    }, []);
    return s;
}
