// Central API client for the Tractor Wala backend.
// Configure the base URL via EXPO_PUBLIC_API_URL (falls back to localhost:4000).
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Auction, Order } from './mockData';

const BASE_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://tractorapi.codemindstudio.com').replace(/\/$/, '');
const TOKEN_KEY = 'twd_auth_token';
const USER_KEY = 'twd_auth_user';

let cachedToken: string | null = null;

export async function getToken(): Promise<string | null> {
    if (cachedToken) return cachedToken;
    try { cachedToken = await AsyncStorage.getItem(TOKEN_KEY); } catch { cachedToken = null; }
    return cachedToken;
}

export async function setToken(token: string | null) {
    cachedToken = token;
    try {
        if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
        else await AsyncStorage.removeItem(TOKEN_KEY);
    } catch { /* ignore */ }
}

export async function setStoredUser(user: any) {
    try {
        if (user) await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
        else await AsyncStorage.removeItem(USER_KEY);
    } catch { /* ignore */ }
}

export async function getStoredUser<T = any>(): Promise<T | null> {
    try { const s = await AsyncStorage.getItem(USER_KEY); return s ? JSON.parse(s) : null; } catch { return null; }
}

type ReqOpts = { method?: string; body?: any; auth?: boolean; timeoutMs?: number };

async function request<T = any>(path: string, opts: ReqOpts = {}): Promise<T> {
    const { method = 'GET', body, auth = false, timeoutMs = 15000 } = opts;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (auth) {
        const t = await getToken();
        if (t) headers.Authorization = `Bearer ${t}`;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
        const res = await fetch(`${BASE_URL}${path}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
            signal: ctrl.signal,
        });
        const text = await res.text();
        const json = text ? JSON.parse(text) : {};
        if (!res.ok || json.ok === false) {
            throw new Error(json.error || `Request failed (${res.status})`);
        }
        return json as T;
    } finally {
        clearTimeout(timer);
    }
}

// ---------------- Auth ----------------
export const authApi = {
    checkPhone: (phone: string) => request<{ ok: true; exists: boolean }>(`/api/auth/check-phone`, { method: 'POST', body: { phone } }),
    sendOtp: (phone: string) => request<{ ok: true; message?: string }>(`/api/auth/send-otp`, { method: 'POST', body: { phone } }),
    verifyOtp: (payload: { phone: string; otp: string; name?: string; email?: string; city?: string; password?: string }) =>
        request<{ ok: true; token?: string; user?: any; needsProfile?: boolean }>(`/api/auth/verify-otp`, { method: 'POST', body: payload }),
    login: (payload: { identifier: string; password: string }) =>
        request<{ ok: true; token?: string; user?: any }>(`/api/auth/login`, { method: 'POST', body: payload }),
    forgotPassword: (payload: { identifier: string }) =>
        request<{ ok: true; message?: string }>(`/api/auth/forgot-password`, { method: 'POST', body: payload }),
    resetPassword: (payload: { identifier: string; otp: string; newPassword: string }) =>
        request<{ ok: true; token?: string; user?: any }>(`/api/auth/reset-password`, { method: 'POST', body: payload }),
    me: () => request<{ ok: true; user: any }>(`/api/auth/me`, { auth: true }),
};

// ---------------- Auctions ----------------
function normalizeStatus(status: any): Auction['status'] {
    const s = String(status || 'live').trim().toLowerCase().replace(/_/g, '-');
    if (s === 'preapproved' || s === 'pre approved') return 'pre-approved';
    if (s === 'sold-out') return 'sold_out';
    if (s === 'upcoming' || s === 'ended' || s === 'pre-approved' || s === 'sold_out') return s as Auction['status'];
    return 'live';
}

export function normalizeAuction(raw: any): Auction {
    const endsAtRaw = raw?.endsAt;
    const endsAt = typeof endsAtRaw === 'number'
        ? endsAtRaw
        : endsAtRaw
            ? new Date(endsAtRaw).getTime()
            : 0;
    return {
        ...(raw || {}),
        id: String(raw?.id || raw?._id || ''),
        currentBid: Number(raw?.currentBid || raw?.startingBid || 0),
        startingBid: Number(raw?.startingBid || raw?.currentBid || 0),
        reservePrice: Number(raw?.reservePrice || 0),
        buyNowPrice: Number(raw?.buyNowPrice || 0),
        bids: Number(raw?.bids || 0),
        endsAt: Number.isFinite(endsAt) ? endsAt : 0,
        status: normalizeStatus(raw?.status),
        soldOut: !!raw?.soldOut,
        pendingOrder: raw?.pendingOrder || null,
        gallery: Array.isArray(raw?.gallery) ? raw.gallery : [],
        videos: Array.isArray(raw?.videos) ? raw.videos : [],
    } as Auction;
}

function mergeAuctions(...lists: Auction[][]): Auction[] {
    const seen = new Set<string>();
    const out: Auction[] = [];
    lists.flat().forEach((item) => {
        const a = normalizeAuction(item);
        if (!a.id || seen.has(a.id)) return;
        seen.add(a.id);
        out.push(a);
    });
    return out;
}

export const auctionApi = {
    list: (params: { status?: string; category?: string; q?: string; limit?: number } = {}) => {
        const qs = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') qs.set(k, String(v)); });
        const s = qs.toString();
        return request<any>(`/api/auctions${s ? `?${s}` : ''}`).then((r) => {
            const data = Array.isArray(r?.data) ? r.data.map(normalizeAuction).filter((a: Auction) => a.id) : [];
            return { ...r, ok: true, count: data.length, data } as { ok: true; count: number; data: Auction[] };
        });
    },
    listLiveAndPreApproved: async (params: { category?: string; q?: string; limit?: number } = {}) => {
        // Fetch separately so mobile keeps working even if the deployed API does not support comma status filters.
        const [live, pre] = await Promise.all([
            auctionApi.list({ ...params, status: 'live' }),
            auctionApi.list({ ...params, status: 'pre-approved' }).catch(() => ({ data: [] as Auction[] })),
        ]);
        const data = mergeAuctions(live.data, pre.data);
        return { ok: true, count: data.length, data } as { ok: true; count: number; data: Auction[] };
    },
    get: (id: string) => request<any>(`/api/auctions/${id}`).then((r) => ({ ...r, ok: true, data: normalizeAuction(r?.data) } as { ok: true; data: Auction })),
    bids: (id: string) => request<{ ok: true; data: any[] }>(`/api/auctions/${id}/bids`),
};

// ---------------- Bids ----------------
export type MyAuctionBidStats = { count: number; highest: number; isTopBidder: boolean; currentBid: number; reservePrice?: number };
export type MyBidsSummary = Record<string, { myHighest: number; count: number; isTopBidder: boolean; currentBid: number; topBid?: number; status?: string }>;
export const bidApi = {
    place: (auctionId: string, amount: number) =>
        request<any>(`/api/bids`, { method: 'POST', body: { auctionId, amount }, auth: true })
            .then((r) => ({ ...r, auction: normalizeAuction(r?.auction) } as { ok: true; data: any; auction: Auction; isLoss?: boolean; reservePrice?: number })),
    mine: () => request<{ ok: true; data: any[] }>(`/api/bids/mine`, { auth: true }),
    myStats: (auctionId: string) =>
        request<{ ok: true; data: MyAuctionBidStats }>(`/api/bids/mine/${auctionId}`, { auth: true }),
    mineSummary: () => request<{ ok: true; data: MyBidsSummary }>(`/api/bids/mine/summary`, { auth: true }),
};


// ---------------- Orders ----------------
export const orderApi = {
    mine: () => request<{ ok: true; data: Order[] }>(`/api/orders`, { auth: true }),
    buyNow: (auctionId: string) => request<any>(`/api/orders/buy-now`, { method: 'POST', body: { auctionId }, auth: true })
        .then((r) => ({ ...r, auction: r?.auction ? normalizeAuction(r.auction) : null } as { ok: true; data: Order; duplicate?: boolean; auction: Auction | null })),
};

// ---------------- Categories ----------------
export const categoryApi = {
    list: () => request<{ ok: true; data: { name: string; slug: string }[] }>(`/api/categories`),
};

// ---------------- Banners ----------------
export type ApiBanner = {
    id: string;
    image: string;
    title?: string;
    auction: string | null;
    sort: number;
};
export const bannerApi = {
    list: () => request<{ ok: true; data: ApiBanner[] }>(`/api/banners`),
};

// ---------------- Settings (public) ----------------
export type PublicSettings = {
    maintenanceMode: boolean;
    maintenanceMessage: string;
    appVersion: string;
    minAppVersion: string;
    forceUpdate: boolean;
    androidStoreUrl: string;
    iosStoreUrl: string;
    auctionTabs?: {
        live: string;
        upcoming: string;
        preApproved: string;
        ended: string;
    };
};
export const settingsApi = {
    public: () => request<{ ok: true; data: PublicSettings }>(`/api/settings/public`),
};

// ---------------- User ----------------
export const userApi = {
    me: () => request<{ ok: true; user: any }>(`/api/users/me`, { auth: true }),
    update: (patch: any) => request<{ ok: true; user: any }>(`/api/users/me`, { method: 'PATCH', body: patch, auth: true }),
    walletTopup: (amount: number) => request<{ ok: true; user: any }>(`/api/users/wallet/topup`, { method: 'POST', body: { amount }, auth: true }),
};

export type PaymentPurpose = 'wallet_topup' | 'kyc_deposit';

export type CashfreeOrder = {
    orderId: string;
    paymentSessionId: string;
    amount: number;
    currency: string;
    purpose: PaymentPurpose;
    mode: 'test' | 'production';
    returnUrl: string;
    paymentId: string;
    description: string;
};

export type PaymentVerifyResult = {
    ok: true;
    alreadyPaid?: boolean;
    payment: { id: string; gatewayPaymentId: string; amount: number; purpose: PaymentPurpose; status: string };
    user: any;
    kyc: any;
};

export const paymentApi = {
    createOrder: (payload: { purpose: PaymentPurpose; amount?: number }) =>
        request<{ ok: true; data: CashfreeOrder }>(`/api/payments/order`, { method: 'POST', body: payload, auth: true, timeoutMs: 30000 }),
    verify: (payload: { orderId: string }) =>
        request<PaymentVerifyResult>(`/api/payments/verify`, { method: 'POST', body: payload, auth: true, timeoutMs: 30000 }),
};

// ---------------- Transactions ----------------
export type ApiTransaction = {
    id: string;
    type: 'credit' | 'debit';
    kind: string;
    amount: number;
    title: string;
    balanceAfter?: number;
    createdAt: string;
};
export const txApi = {
    mine: (limit = 50) => request<{ ok: true; count: number; data: ApiTransaction[] }>(`/api/transactions/mine?limit=${limit}`, { auth: true }),
};

// ---------------- Notifications ----------------
export type ApiNotification = {
    id: string;
    type: 'auction_won' | 'auction_outbid' | 'auction_ending' | 'auction_new' | 'wallet' | 'system';
    title: string;
    body: string;
    auction?: string;
    read: boolean;
    createdAt: string;
};
export const notificationApi = {
    mine: (limit = 50) => request<{ ok: true; count: number; data: ApiNotification[] }>(`/api/notifications/mine?limit=${limit}`, { auth: true }),
    unreadCount: () => request<{ ok: true; count: number }>(`/api/notifications/unread-count`, { auth: true }),
    markRead: (id: string) => request<{ ok: true; data: ApiNotification }>(`/api/notifications/${id}/read`, { method: 'PATCH', auth: true }),
    markAllRead: () => request<{ ok: true; modified: number }>(`/api/notifications/mark-all-read`, { method: 'POST', auth: true }),
};

// ---------------- KYC ----------------
export type ApiKyc = {
    id: string;
    name?: string;
    dealership?: string;
    dealerId?: string;
    contact?: string;
    address?: string;
    city?: string;
    state?: string;
    docs?: {
        aadharFront?: string; aadharBack?: string; pan?: string; photo?: string;
        passbook?: string; cheque?: string; dealerCert?: string;
        certType?: 'MSME' | 'Shop Act' | 'GST';
    };
    depositAmount?: number;
    depositPaymentId?: string;
    depositPaidAt?: string;
    status: 'not_started' | 'in_progress' | 'pending' | 'approved' | 'rejected';
    rejectionReason?: string;
    submittedAt?: string;
    reviewedAt?: string;
};
export const kycApi = {
    mine: () => request<{ ok: true; data: ApiKyc; depositAmount: number }>(`/api/kyc/mine`, { auth: true }),
    saveProfile: (payload: Partial<ApiKyc>) => request<{ ok: true; data: ApiKyc }>(`/api/kyc/profile`, { method: 'PATCH', body: payload, auth: true }),
    saveDocs: (payload: NonNullable<ApiKyc['docs']>) => request<{ ok: true; data: ApiKyc }>(`/api/kyc/docs`, { method: 'PATCH', body: payload, auth: true }),
    recordDeposit: (paymentId: string) => request<{ ok: true; data: ApiKyc }>(`/api/kyc/deposit`, { method: 'POST', body: { paymentId }, auth: true }),
    submit: () => request<{ ok: true; data: ApiKyc }>(`/api/kyc/submit`, { method: 'POST', auth: true }),
};

// ---------------- Uploads (multipart) ----------------
export type UploadKind = 'image' | 'video' | 'pdf';
export type UploadResult = { url: string; filename: string; mime: string; size: number; kind: UploadKind };

export const uploadApi = {
    /** Upload a local file (from expo-image-picker / document-picker) and return a public URL. */
    upload: async (
        file: { uri: string; name?: string; type?: string },
        kind: UploadKind = 'image'
    ): Promise<UploadResult> => {
        const form = new FormData();
        const guessedType = file.type || (kind === 'image' ? 'image/jpeg' : kind === 'video' ? 'video/mp4' : 'application/pdf');
        const guessedName = file.name || (kind === 'image' ? 'upload.jpg' : kind === 'video' ? 'upload.mp4' : 'upload.pdf');
        // React Native FormData accepts { uri, name, type }
        form.append('file', { uri: file.uri, name: guessedName, type: guessedType } as any);

        const token = await getToken();
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 60000);
        try {
            const res = await fetch(`${BASE_URL}/api/uploads?kind=${kind}`, {
                method: 'POST',
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                body: form as any,
                signal: ctrl.signal,
            });
            const text = await res.text();
            const json = text ? JSON.parse(text) : {};
            if (!res.ok || json.success === false) {
                throw new Error(json.message || `Upload failed (${res.status})`);
            }
            return json.response as UploadResult;
        } finally {
            clearTimeout(timer);
        }
    },
};

export const API_BASE_URL = BASE_URL;
