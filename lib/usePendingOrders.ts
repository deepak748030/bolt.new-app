// Tracks the current user's PENDING buy-now orders per auctionId so the UI
// keeps showing "Sold Out" across refresh, until admin approves or cancels.
import { useEffect, useState } from 'react';
import { orderApi, getToken } from './api';
import { getSocket } from './socket';

type Map_ = Record<string, string>; // auctionId -> orderId

let state: Map_ = {};
const listeners = new Set<(s: Map_) => void>();
let socketWired = false;
let currentSocket: any = null;

function emit() { for (const l of listeners) l(state); }

export function markPending(auctionId: string, orderId: string) {
    if (!auctionId) return;
    state = { ...state, [String(auctionId)]: String(orderId || '1') };
    emit();
}

export function clearPending(auctionId: string) {
    if (!auctionId || !state[auctionId]) return;
    const next = { ...state };
    delete next[auctionId];
    state = next;
    emit();
}

function onOrderUpdated(p: any) {
    const o = p?.order;
    if (!o) return;
    const auctionId = String(o.auctionId || o.auction || '');
    const status = String(o.status || '');
    if (!auctionId) return;
    if (status === 'pending') markPending(auctionId, String(o.id || o._id || '1'));
    else clearPending(auctionId);
}

function onOrderNew(p: any) {
    const o = p?.order;
    if (!o) return;
    const auctionId = String(o.auctionId || o.auction || '');
    if (auctionId && (o.status || 'pending') === 'pending') markPending(auctionId, String(o.id || o._id || '1'));
}

async function wireSocket() {
    const sock = await getSocket();
    if (currentSocket && currentSocket !== sock) {
        try { currentSocket.off('order:updated', onOrderUpdated); currentSocket.off('order:new', onOrderNew); } catch {}
        socketWired = false;
    }
    currentSocket = sock;
    if (socketWired) return;
    sock.on('order:new', onOrderNew);
    sock.on('order:updated', onOrderUpdated);
    sock.on('connect', refreshPendingOrders);
    sock.io?.on?.('reconnect', refreshPendingOrders);
    socketWired = true;
}

export async function refreshPendingOrders() {
    try {
        const token = await getToken();
        if (!token) { state = {}; emit(); return; }
        const r = await orderApi.mine();
        const next: Map_ = {};
        (r.data || []).forEach((o: any) => {
            if (String(o.status) === 'pending') {
                const aid = String(o.auctionId || o.auction || '');
                if (aid) next[aid] = String(o.id || o._id || '1');
            }
        });
        state = next;
        emit();
        await wireSocket();
    } catch { /* silent */ }
}

export function usePendingOrdersMap() {
    const [s, setS] = useState<Map_>(state);
    useEffect(() => {
        listeners.add(setS);
        setS(state);
        refreshPendingOrders();
        return () => { listeners.delete(setS); };
    }, []);
    return s;
}

export function hasPendingOrder(auctionId: string): boolean {
    return !!auctionId && !!state[String(auctionId)];
}
