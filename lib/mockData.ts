export type AuctionVideo = { url: string; thumb?: string; label?: string; duration?: string };

export type Auction = {
  id: string;
  title: string;
  category: string;
  image: string;
  currentBid: number;
  startingBid: number;
  reservePrice?: number;
  buyNowPrice?: number;
  bids: number;
  endsAt: number; // epoch ms
  status: 'live' | 'upcoming' | 'ended' | 'pre-approved' | 'sold_out';
  soldOut?: boolean;
  pendingOrder?: string | null;
  seller: string;
  location: string;
  hp?: number;
  year?: number;
  hours?: number;
  description?: string;
  gallery?: string[];
  videoUrl?: string;
  videoThumb?: string;
  videoDuration?: string;
  videos?: AuctionVideo[];
  inspectionPdfUrl?: string;
};

// Common fallback gallery of tractor stock photos.
export const fallbackGallery: string[] = [
  'https://images.pexels.com/photos/2933243/pexels-photo-2933243.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/4577178/pexels-photo-4577178.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/235725/pexels-photo-235725.jpeg?auto=compress&cs=tinysrgb&w=800',
  'https://images.pexels.com/photos/533982/pexels-photo-533982.jpeg?auto=compress&cs=tinysrgb&w=800',
];

export const fallbackVideoThumb =
  'https://images.pexels.com/photos/96417/pexels-photo-96417.jpeg?auto=compress&cs=tinysrgb&w=800';

// 46-point inspection report grouped into 8 categories.
export type InspectionGroup = { title: string; items: { label: string; pass: boolean; note?: string }[] };

export const inspectionReport: { passed: number; total: number; groups: InspectionGroup[] } = {
  passed: 44,
  total: 46,
  groups: [
    {
      title: 'Engine (8)',
      items: [
        { label: 'Engine starting (cold)', pass: true },
        { label: 'Engine idle smoothness', pass: true },
        { label: 'Exhaust smoke check', pass: true },
        { label: 'Engine oil condition', pass: true },
        { label: 'Coolant level & leaks', pass: true },
        { label: 'Air filter condition', pass: true },
        { label: 'Fuel pump operation', pass: true },
        { label: 'Belt tension & wear', pass: false, note: 'Minor wear, replacement advised' },
      ],
    },
    {
      title: 'Transmission & Clutch (6)',
      items: [
        { label: 'Gear shifting smoothness', pass: true },
        { label: 'Clutch pedal play', pass: true },
        { label: 'PTO engagement', pass: true },
        { label: 'Differential lock', pass: true },
        { label: '4WD engagement', pass: true },
        { label: 'Transmission oil', pass: true },
      ],
    },
    {
      title: 'Hydraulics (5)',
      items: [
        { label: '3-point linkage lift', pass: true },
        { label: 'Hydraulic oil level', pass: true },
        { label: 'Hose & pipe leaks', pass: true },
        { label: 'Lift cylinder pressure', pass: true },
        { label: 'Remote valves operation', pass: true },
      ],
    },
    {
      title: 'Electrical (6)',
      items: [
        { label: 'Battery health (12V)', pass: true },
        { label: 'Headlights & indicators', pass: true },
        { label: 'Horn operation', pass: true },
        { label: 'Self-starter motor', pass: true },
        { label: 'Wiring harness check', pass: true },
        { label: 'Dashboard meters', pass: true },
      ],
    },
    {
      title: 'Brakes & Steering (5)',
      items: [
        { label: 'Foot brake operation', pass: true },
        { label: 'Parking brake', pass: true },
        { label: 'Brake oil level', pass: true },
        { label: 'Power steering response', pass: true },
        { label: 'Steering free play', pass: true },
      ],
    },
    {
      title: 'Tyres & Wheels (4)',
      items: [
        { label: 'Front tyre tread (%)', pass: true, note: '70%' },
        { label: 'Rear tyre tread (%)', pass: false, note: '55%, change soon' },
        { label: 'Wheel alignment', pass: true },
        { label: 'Rim condition', pass: true },
      ],
    },
    {
      title: 'Body & Chassis (6)',
      items: [
        { label: 'Chassis rust check', pass: true },
        { label: 'Bonnet & fender dents', pass: true },
        { label: 'Seat condition', pass: true },
        { label: 'Mudguards', pass: true },
        { label: 'Paint condition', pass: true },
        { label: 'Tow hook', pass: true },
      ],
    },
    {
      title: 'Documents (6)',
      items: [
        { label: 'RC original', pass: true },
        { label: 'Insurance valid', pass: true },
        { label: 'PUC certificate', pass: true },
        { label: 'Loan / HP clear', pass: true },
        { label: 'Owner ID match', pass: true },
        { label: 'Service history', pass: true },
      ],
    },
  ],
};

const now = Date.now();
const H = 60 * 60 * 1000;

export const mockAuctions: Auction[] = [
  { id: 't1', title: 'Mahindra 575 DI XP Plus', category: '45-50 HP', image: 'https://images.pexels.com/photos/2933243/pexels-photo-2933243.jpeg?auto=compress&cs=tinysrgb&w=800', currentBid: 542000, startingBid: 480000, bids: 47, endsAt: now + 3 * H, status: 'live', seller: 'Mahindra Verified', location: 'Nashik, MH', hp: 47, year: 2021, hours: 1240, description: 'Single owner, all original parts, RC clear.' },
  { id: 't2', title: 'John Deere 5310 Gear Pro', category: '50-60 HP', image: 'https://images.pexels.com/photos/4577178/pexels-photo-4577178.jpeg?auto=compress&cs=tinysrgb&w=800', currentBid: 892300, startingBid: 750000, bids: 89, endsAt: now + 1.2 * H, status: 'live', seller: 'GreenFields', location: 'Ludhiana, PB', hp: 55, year: 2022, hours: 820 },
  { id: 't3', title: 'Sonalika DI 745 III Sikander', category: '45-50 HP', image: 'https://images.pexels.com/photos/1112080/pexels-photo-1112080.jpeg?auto=compress&cs=tinysrgb&w=800', currentBid: 418750, startingBid: 360000, bids: 23, endsAt: now + 6 * H, status: 'live', seller: 'Sonalika Bazaar', location: 'Hisar, HR', hp: 50, year: 2020, hours: 1830 },
  { id: 't4', title: 'New Holland 3630 TX Plus', category: '50-60 HP', image: 'https://images.pexels.com/photos/533982/pexels-photo-533982.jpeg?auto=compress&cs=tinysrgb&w=800', currentBid: 642000, startingBid: 555000, bids: 31, endsAt: now + 0.6 * H, status: 'live', seller: 'AgriPrime', location: 'Indore, MP', hp: 55, year: 2021, hours: 1100 },
  { id: 't5', title: 'Massey Ferguson 1035 DI', category: '35-40 HP', image: 'https://images.pexels.com/photos/96417/pexels-photo-96417.jpeg?auto=compress&cs=tinysrgb&w=800', currentBid: 378000, startingBid: 320000, bids: 14, endsAt: now + 12 * H, status: 'upcoming', seller: 'TractorYard', location: 'Pune, MH', hp: 36, year: 2019, hours: 2200 },
  { id: 't6', title: 'Swaraj 744 FE 4WD', category: '45-50 HP', image: 'https://images.pexels.com/photos/235725/pexels-photo-235725.jpeg?auto=compress&cs=tinysrgb&w=800', currentBid: 584500, startingBid: 500000, bids: 19, endsAt: now + 4 * H, status: 'live', seller: 'Swaraj Mart', location: 'Mohali, PB', hp: 48, year: 2022, hours: 640 },
  { id: 't7', title: 'Eicher 380 Super Plus', category: '35-40 HP', image: 'https://images.pexels.com/photos/2889440/pexels-photo-2889440.jpeg?auto=compress&cs=tinysrgb&w=800', currentBid: 312500, startingBid: 280000, bids: 8, endsAt: now + 2.5 * H, status: 'live', seller: 'Eicher Auto', location: 'Jaipur, RJ', hp: 40, year: 2020, hours: 1560 },
  { id: 't8', title: 'Kubota MU4501 4WD', category: '45-50 HP', image: 'https://images.pexels.com/photos/4453152/pexels-photo-4453152.jpeg?auto=compress&cs=tinysrgb&w=800', currentBid: 728000, startingBid: 650000, bids: 26, endsAt: now + 8 * H, status: 'live', seller: 'Kubota India', location: 'Coimbatore, TN', hp: 45, year: 2022, hours: 480 },
];

export type Order = {
  id: string;
  auctionId: string;
  title: string;
  image: string;
  finalBid: number;
  status: 'pending' | 'won' | 'shipped' | 'delivered' | 'lost' | 'cancelled';
  date: string;
  kind?: 'auction' | 'buy_now';
  snapshot?: {
    gallery?: string[];
    videoUrl?: string;
    videoThumb?: string;
    videoDuration?: string;
    videos?: AuctionVideo[];
    inspectionPdfUrl?: string;
    description?: string;
    category?: string;
    seller?: string;
    location?: string;
    hp?: number;
    year?: number;
    hours?: number;
    buyNowPrice?: number;
    startingBid?: number;
  } | null;
};

export const mockOrders: Order[] = [
  { id: 'o1', auctionId: 't2', title: 'John Deere 5310 Gear Pro', image: 'https://images.pexels.com/photos/4577178/pexels-photo-4577178.jpeg?auto=compress&cs=tinysrgb&w=400', finalBid: 881200, status: 'delivered', date: '12 Jun 2026' },
  { id: 'o2', auctionId: 't4', title: 'New Holland 3630 TX Plus', image: 'https://images.pexels.com/photos/533982/pexels-photo-533982.jpeg?auto=compress&cs=tinysrgb&w=400', finalBid: 632500, status: 'shipped', date: '18 Jun 2026' },
  { id: 'o3', auctionId: 't6', title: 'Swaraj 744 FE 4WD', image: 'https://images.pexels.com/photos/235725/pexels-photo-235725.jpeg?auto=compress&cs=tinysrgb&w=400', finalBid: 578000, status: 'won', date: '21 Jun 2026' },
  { id: 'o4', auctionId: 't3', title: 'Sonalika DI 745 III Sikander', image: 'https://images.pexels.com/photos/1112080/pexels-photo-1112080.jpeg?auto=compress&cs=tinysrgb&w=400', finalBid: 410000, status: 'lost', date: '08 Jun 2026' },
];

// Mock list of already-registered phone numbers — used by login flow
// to decide whether to ask for signup details.
export const registeredPhones: string[] = ['9876543210', '9000000001'];

export const categories = [
  '20-30 HP', '30-40 HP', '40-50 HP', '50-60 HP', '60+ HP', '4WD', 'Mini',
];

export const user = {
  name: 'Rahul Kumar',
  phone: '+91 9876543210',
  email: 'rahul@tractorwala.in',
  city: 'Nashik, MH',
  joined: 'Jun 2026',
  totalBids: 142,
  wonAuctions: 18,
  walletBalance: 12450,
};
