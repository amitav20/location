/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import {
  User,
  Post,
  Comment,
  Story,
  Message,
  ChatGroup,
  LocalEvent,
  Business,
  Product,
  BusinessOffer,
  Review,
  Order,
  Notification,
  Report,
  FriendRequest,
  Follow,
  UserBlock
} from '../types';
import { hashPassword } from './auth';

// DATA_DIR lets tests run against a throwaway copy
const DB_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'geoconnect_db.json');
const DEFAULT_PLACE = { city: 'San Francisco', state: 'California', country: 'United States' };
export const UPLOADS_DIR = path.join(DB_DIR, 'uploads');

// Password for the seeded demo accounts (sarah_j, admin, ...)
export const DEMO_PASSWORD = 'password';

// Server-only records: never sent to the browser
export interface Session {
  tokenHash: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export interface Credential {
  userId: string;
  passwordHash: string;
}

// Memory storage
let users: User[] = [];
let friendRequests: FriendRequest[] = [];
let follows: Follow[] = [];
let blocks: UserBlock[] = [];
let posts: Post[] = [];
let comments: Comment[] = [];
let stories: Story[] = [];
let messages: Message[] = [];
let chatGroups: ChatGroup[] = [];
let events: LocalEvent[] = [];
let businesses: Business[] = [];
let products: Product[] = [];
let offers: BusinessOffer[] = [];
let reviews: Review[] = [];
let orders: Order[] = [];
let notifications: Notification[] = [];
let reports: Report[] = [];
let sessions: Session[] = [];
let credentials: Credential[] = [];

// Haversine Distance Formula in KM
export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (lat1 === lat2 && lon1 === lon2) return 0;
  const R = 6371; // Radius of earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Ensure database directory and file exist
export function initDB() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const rawData = fs.readFileSync(DB_FILE, 'utf-8');
      const data = JSON.parse(rawData);
      users = data.users || [];
      friendRequests = data.friendRequests || [];
      follows = data.follows || [];
      blocks = data.blocks || [];
      posts = data.posts || [];
      comments = data.comments || [];
      stories = data.stories || [];
      messages = data.messages || [];
      chatGroups = data.chatGroups || [];
      events = data.events || [];
      businesses = data.businesses || [];
      products = data.products || [];
      offers = data.offers || [];
      reviews = data.reviews || [];
      orders = data.orders || [];
      notifications = data.notifications || [];
      reports = data.reports || [];
      sessions = (data.sessions || []).filter((s: Session) => new Date(s.expiresAt).getTime() > Date.now());
      credentials = data.credentials || [];
      console.log('Database loaded successfully from file.');
    } catch (err) {
      console.error('Error reading database file. Initializing empty memories.', err);
      seedMockData(37.7749, -122.4194, DEFAULT_PLACE); // Default to SF coordinates
    }
  } else {
    // Standard setup with SF coords initially if file doesn't exist
    seedMockData(37.7749, -122.4194, DEFAULT_PLACE);
  }

  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  ensureCredentials();
}

// Accounts created before passwords were stored get the demo password so they can still sign in
function ensureCredentials() {
  const missing = users.filter((u) => !credentials.some((c) => c.userId === u.id));
  if (missing.length === 0) return;
  missing.forEach((u) => setPassword(u.id, DEMO_PASSWORD, false));
  saveDB();
  console.warn(
    `${missing.length} account(s) had no password and were given the demo password "${DEMO_PASSWORD}": ` +
      missing.map((u) => u.username).join(', ')
  );
}

export function saveDB() {
  try {
    const data = {
      users,
      friendRequests,
      follows,
      blocks,
      posts,
      comments,
      stories,
      messages,
      chatGroups,
      events,
      businesses,
      products,
      offers,
      reviews,
      orders,
      notifications,
      reports,
      sessions,
      credentials
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save database to disk:', err);
  }
}

// Real Unsplash portraits / landscapes for the demo neighbors (index-aligned with userOffsets)
const MOCK_USER_PHOTOS = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&h=150&fit=crop',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&h=150&fit=crop',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&h=150&fit=crop'
];

const MOCK_COVER_PHOTOS = [
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&h=200&fit=crop',
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=600&h=200&fit=crop',
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=600&h=200&fit=crop',
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&h=200&fit=crop',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600&h=200&fit=crop',
  'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=600&h=200&fit=crop',
  'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=600&h=200&fit=crop',
  'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=600&h=200&fit=crop'
];

// Older databases stored generated Unsplash ids (no hash suffix) that 404; swap them for real photos.
const BROKEN_UNSPLASH_URL = /images\.unsplash\.com\/photo-\d+\?/;

function repairMockUserPhotos() {
  users.forEach((u) => {
    const match = u.id.match(/^user_mock_(\d+)/);
    if (!match) return;
    const idx = (Number(match[1]) - 1) % MOCK_USER_PHOTOS.length;
    if (BROKEN_UNSPLASH_URL.test(u.profilePhoto)) u.profilePhoto = MOCK_USER_PHOTOS[idx];
    if (u.coverImage && BROKEN_UNSPLASH_URL.test(u.coverImage)) u.coverImage = MOCK_COVER_PHOTOS[idx];
  });
}

// Each demo "neighborhood" (users, shops, events, posts) covers this radius around where it was seeded.
const SEED_RADIUS_KM = 30;
const SEEDED_ANCHOR_BUSINESS = /^biz_1(_c\d+)?$/;

function hasNeighborhoodNear(lat: number, lng: number) {
  return businesses.some(
    (b) => SEEDED_ANCHOR_BUSINESS.test(b.id) && haversineDistance(lat, lng, b.latitude, b.longitude) <= SEED_RADIUS_KM
  );
}

function uniqueUsername(base: string) {
  let candidate = base;
  while (users.some((u) => u.username.toLowerCase() === candidate.toLowerCase())) {
    candidate += '_';
  }
  return candidate;
}

export interface SeedPlace {
  city?: string;
  state?: string;
  country?: string;
}

// Seeder logic to populates realistic surrounding information based on coordinates.
// A fresh demo neighborhood is generated the first time anyone visits a new area.
export function seedMockData(lat: number, lng: number, place: SeedPlace = {}) {
  ensureAdminAccount(lat, lng);
  repairMockUserPhotos();

  if (hasNeighborhoodNear(lat, lng)) {
    saveDB();
    return;
  }

  // Cluster 0 keeps the original ids (biz_1, user_mock_1, ...) so existing databases stay compatible
  const clusterIdx = businesses.filter((b) => SEEDED_ANCHOR_BUSINESS.test(b.id)).length;
  const sfx = clusterIdx === 0 ? '' : `_c${clusterIdx + 1}`;
  const mockId = (n: number) => `user_mock_${n}${sfx}`;
  const city = place.city || 'Local City';
  const state = place.state || '';
  const country = place.country || '';

  console.log(`Seeding demo neighborhood #${clusterIdx + 1} near lat: ${lat}, lng: ${lng}`);

  seedNeighborhood(lat, lng, { sfx, clusterIdx, mockId, city, state, country });
  saveDB();
}

function ensureAdminAccount(lat: number, lng: number) {
  // Create primary admin accounts if not exists
  const hasAdmin = users.some((u) => u.isAdmin);
  if (!hasAdmin) {
    users.push({
      id: 'admin_1',
      name: 'Super Admin',
      username: 'admin',
      email: 'admin@geoconnect.com',
      mobile: '+15550001234',
      profilePhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop',
      dob: '1990-01-01',
      gender: 'Non-binary',
      bio: 'Platform System Admin. Responsible for community moderations.',
      interests: ['Security', 'Community', 'Data Science'],
      profession: 'Super Administrator',
      website: 'admin.geoconnect.com',
      location: {
        latitude: lat,
        longitude: lng,
        city: 'San Francisco',
        state: 'California',
        country: 'United States',
        updatedAt: new Date().toISOString()
      },
      isAdmin: true,
      createdAt: new Date().toISOString()
    });
    setPassword('admin_1', DEMO_PASSWORD, false);
  }
}

interface NeighborhoodContext {
  sfx: string;
  clusterIdx: number;
  mockId: (n: number) => string;
  city: string;
  state: string;
  country: string;
}

function seedNeighborhood(lat: number, lng: number, ctx: NeighborhoodContext) {
  const { sfx, clusterIdx, mockId, city, state, country } = ctx;

  // Create mock users nearby with various offsets (lat offset, lng offset)
  const userOffsets = [
    { name: 'Sarah Jenkins', username: 'sarah_j', gender: 'Female', dLat: 0.003, dLng: 0.002, photoIdx: 49, interest: ['Hiking', 'Cafe hopping', 'Photography'], profession: 'UI Designer' },
    { name: 'Alex Rivera', username: 'alex_rivera', gender: 'Male', dLat: -0.004, dLng: 0.005, photoIdx: 53, interest: ['Cycling', 'Baking', 'Gadgets'], profession: 'Web Developer' },
    { name: 'Chloe Chen', username: 'chloe_c', gender: 'Female', dLat: 0.008, dLng: -0.007, photoIdx: 34, interest: ['Aromatherapy', 'Yoga', 'Matcha'], profession: 'Content Creator' },
    { name: 'Marcus Brody', username: 'marcus_b', gender: 'Male', dLat: -0.012, dLng: -0.015, photoIdx: 22, interest: ['Vinyl Records', 'Coffee', 'Indie Rock'], profession: 'Barista' },
    { name: 'Elena Rostova', username: 'elena_r', gender: 'Female', dLat: 0.025, dLng: 0.035, photoIdx: 50, interest: ['Contemporary Art', 'Tennis', 'Investing'], profession: 'Financial Analyst' },
    { name: 'David Kim', username: 'davidk', gender: 'Male', dLat: 0.075, dLng: -0.055, photoIdx: 42, interest: ['Gaming', 'Keyboard DIY', 'Anime'], profession: 'Hardware Engineer' },
    { name: 'Nisha Pillai', username: 'nisha_p', gender: 'Female', dLat: -0.150, dLng: 0.120, photoIdx: 38, interest: ['Vegan Cooking', 'Pottery', 'Salsa'], profession: 'Wellness Coach' },
    { name: 'Tyler Durden', username: 'soap_maker', gender: 'Male', dLat: 0.450, dLng: -0.350, photoIdx: 15, interest: ['Muay Thai', 'Brewing', 'Action Movies'], profession: 'Entrepreneur' }
  ];

  const newlySeededUsers: User[] = [];

  userOffsets.forEach((uo, idx) => {
    const mockUserId = mockId(idx + 1);
    if (users.some((u) => u.id === mockUserId)) return;
    const username = uniqueUsername(clusterIdx === 0 ? uo.username : `${uo.username}${clusterIdx + 1}`);

    const mockUser: User = {
      id: mockUserId,
      name: uo.name,
      username,
      email: `${username}@example.com`,
      mobile: `+155598765${idx}`,
      profilePhoto: MOCK_USER_PHOTOS[idx % MOCK_USER_PHOTOS.length],
      coverImage: MOCK_COVER_PHOTOS[idx % MOCK_COVER_PHOTOS.length],
      dob: `199${4 + idx}-0${idx + 1}-15`,
      gender: uo.gender,
      bio: `Local enthusiast. Loving local cafes, ${uo.interest[0]}, and meeting cool neighbors!`,
      interests: uo.interest,
      profession: uo.profession,
      website: `${username}.dev`,
      socialLinks: {
        instagram: `instagram.com/${username}`,
        twitter: `twitter.com/${username}`
      },
      location: {
        latitude: lat + uo.dLat,
        longitude: lng + uo.dLng,
        city,
        state,
        country,
        updatedAt: new Date().toISOString()
      },
      createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString() // 30 days ago
    };
    users.push(mockUser);
    setPassword(mockUserId, DEMO_PASSWORD, false);
    newlySeededUsers.push(mockUser);
  });

  // Make some interactions (Requests, Friends)
  if (!friendRequests.some((fr) => fr.id === `fr_1${sfx}`)) {
    friendRequests.push({
      id: `fr_1${sfx}`,
      senderId: mockId(1), // Sarah
      receiverId: mockId(2), // Alex
      status: 'accepted',
      createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString()
    });
    friendRequests.push({
      id: `fr_2${sfx}`,
      senderId: mockId(3), // Chloe
      receiverId: mockId(1),
      status: 'pending',
      createdAt: new Date().toISOString()
    });
  }

  // Seed Mock Businesses
  const businessTemplates = [
    {
      id: 'biz_1',
      name: 'The Bistro Griddle',
      category: 'Restaurant' as const,
      description: 'Elegant local bistro serving farm-to-table organic food, premium local steak, and exquisite handcrafted wines.',
      address: '242 Heartwood Ave, Suite A',
      phone: '+15552341234',
      email: 'hello@bistrogriddle.com',
      dLat: 0.002, dLng: -0.001,
      rating: 4.8,
      logo: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=120&h=120&fit=crop',
      cover: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=300&fit=crop'
    },
    {
      id: 'biz_2',
      name: 'Aroma Brews Corner',
      category: 'Cafe' as const,
      description: 'A cozy corner specialty coffee shop roasting beans from Colombia and Ethiopia weekly. Free Highspeed WiFi!',
      address: '90 Pine Street',
      phone: '+15554320987',
      email: 'support@aromabrews.co',
      dLat: -0.002, dLng: 0.003,
      rating: 4.6,
      logo: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=120&h=120&fit=crop',
      cover: 'https://images.unsplash.com/photo-1498804103079-a6351b050096?w=800&h=300&fit=crop'
    },
    {
      id: 'biz_3',
      name: 'GreenGrocer Organics',
      category: 'Grocery' as const,
      description: 'Daily fresh vegetables, hyper-local organic fruits, artisanal cheese, and biological dairy products directly from local farmers.',
      address: '500 Market Boulevard',
      phone: '+15556781212',
      email: 'info@greengrocer.org',
      dLat: 0.005, dLng: 0.006,
      rating: 4.5,
      logo: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=120&h=120&fit=crop',
      cover: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&h=300&fit=crop'
    },
    {
      id: 'biz_4',
      name: 'CareFirst Pharmacy',
      category: 'Pharmacy' as const,
      description: 'Your reliable, quick local pharmacy. Offering customized prescription refill services, health supplements, and organic skincare.',
      address: '730 Broad Street',
      phone: '+15551119999',
      email: 'broad@carefirst.com',
      dLat: -0.005, dLng: -0.004,
      rating: 4.2,
      logo: 'https://images.unsplash.com/photo-1607619056574-7b8d304f3c6f?w=120&h=120&fit=crop',
      cover: 'https://images.unsplash.com/photo-1586015555751-63bb77f4322a?w=800&h=300&fit=crop'
    },
    {
      id: 'biz_5',
      name: 'Retro Threads Boutique',
      category: 'Fashion' as const,
      description: 'Handpicked retro design, modern tailoring, denim lines, and vintage statement accessories for the modern minimalist.',
      address: '15 High Lane',
      phone: '+15552223456',
      email: 'vintage@retrothreads.com',
      dLat: 0.015, dLng: -0.012,
      rating: 4.9,
      logo: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=120&h=120&fit=crop',
      cover: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&h=300&fit=crop'
    },
    {
      id: 'biz_6',
      name: 'OmniVolt Electronics',
      category: 'Electronics' as const,
      description: 'Premium electronics, custom desktop building rigs, smart home gadgets, repair services, and technical accessories.',
      address: '102 Industrial Highway',
      phone: '+15559871111',
      email: 'admin@omnivolt.io',
      dLat: 0.050, dLng: 0.050,
      rating: 4.1,
      logo: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=120&h=120&fit=crop',
      cover: 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=800&h=300&fit=crop'
    }
  ];

  businessTemplates.forEach((bt) => {
    const bizId = `${bt.id}${sfx}`;
    if (!businesses.some((b) => b.id === bizId)) {
      businesses.push({
        id: bizId,
        ownerId: 'admin_1', // Owned by admin initially for demo dashboard
        category: bt.category,
        name: bt.name,
        logo: bt.logo,
        coverImage: bt.cover,
        description: bt.description,
        address: bt.address,
        latitude: lat + bt.dLat,
        longitude: lng + bt.dLng,
        phone: bt.phone,
        email: bt.email,
        website: bt.email.replace('hello@', 'www.').replace('support@', 'www.').replace('info@', 'www.').replace('admin@', 'www.').replace('vintage@', 'www.'),
        isVerified: true,
        createdAt: new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString()
      });

      // Add corresponding reviews to get initial ratings
      reviews.push({
        id: `rev_${bizId}_1`,
        targetId: bizId,
        userId: mockId(1),
        rating: Math.floor(bt.rating),
        comment: `Excellent service! This is exactly what our neighborhood was missing. Recommend 100%!`,
        createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString()
      });

      reviews.push({
        id: `rev_${bizId}_2`,
        targetId: bizId,
        userId: mockId(2),
        rating: 5,
        comment: `Super friendly staff and very high quality! Will definitely visit again and again.`,
        createdAt: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString()
      });
    }
  });

  // Seed Mock Products inside Marketplace
  const productTemplates = [
    // Bistro Products
    { id: 'prod_1', businessId: 'biz_1', name: 'Smoked Wagyu Sirloin', desc: 'Aged 45 days, served with organic local baby potatoes and standard black pepper butter sauce.', price: 42, cat: 'Food', stock: 15, img: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=300&h=300&fit=crop' },
    { id: 'prod_2', businessId: 'biz_1', name: 'Artisanal Duck Breast Salad', desc: 'Pan-seared tender duck breast on organic farm-grown green leaves with homemade honey-citrus dressing.', price: 19, cat: 'Food', stock: 25, img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&h=300&fit=crop' },
    // Cafe Products
    { id: 'prod_3', businessId: 'biz_2', name: 'Fresh Organic Espresso Bag (500g)', desc: 'Medium roasted single-origin Ethiopian heirloom. Expect berries, peach, and vanilla floral notes.', price: 18, cat: 'Coffee Beans', stock: 40, img: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=300&h=300&fit=crop' },
    { id: 'prod_4', businessId: 'biz_2', name: 'Drip Coffee V64 Brewer Kit', desc: 'All-in-one pour-over brewing device. Includes 1 ceramic dripper, glass decanter, and 40x filter paper sheets.', price: 29, cat: 'Equipment', stock: 10, img: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=300&h=300&fit=crop' },
    // Grocery Products
    { id: 'prod_5', businessId: 'biz_3', name: 'Premium Farm Veggie Haul Box', desc: 'A gorgeous weekly delivery crate loaded with organic spinach, vine tomatoes, colored carrots, and fresh garlic.', price: 25, cat: 'Produce', stock: 50, img: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&h=300&fit=crop' },
    { id: 'prod_6', businessId: 'biz_3', name: 'Handcrafted Local Honey Honey jar (500ml)', desc: 'Pure unpasteurized wildfire blossom honey harvested sustainably from regional alpine meadows.', price: 12, cat: 'Pantry', stock: 30, img: 'https://images.unsplash.com/photo-1587049352847-4a23e5133ec2?w=300&h=300&fit=crop' },
    // Fashion Products
    { id: 'prod_7', businessId: 'biz_5', name: 'Minimalist Charcoal Denim Jacket', desc: '100% thick heavy-weight cotton classic fit jacket. Double-stitched seams designed to endure a lifetime.', price: 85, cat: 'Apparel', stock: 8, img: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=300&h=300&fit=crop' },
    { id: 'prod_8', businessId: 'biz_5', name: 'Raw Leather Messenger Shoulder Bag', desc: 'Handcrafted raw chestnut leather organizer bag featuring robust solid brass buckles.', price: 140, cat: 'Accessories', stock: 5, img: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=300&h=300&fit=crop' }
  ];

  productTemplates.forEach((pt) => {
    const prodId = `${pt.id}${sfx}`;
    if (!products.some((p) => p.id === prodId)) {
      products.push({
        id: prodId,
        businessId: `${pt.businessId}${sfx}`,
        name: pt.name,
        description: pt.desc,
        price: pt.price,
        images: [pt.img],
        category: pt.cat,
        stock: pt.stock,
        createdAt: new Date().toISOString()
      });
    }
  });

  // Seed Mock Events
  const eventTemplates = [
    {
      id: 'evt_1',
      name: 'Weekend Organic Farmers Market',
      description: 'Come down and buy delicious fresh produce from 15+ local ecological farmers! Enjoy live acoustic music, fresh hot cider, and artisanal food cards.',
      locationName: 'Lafayette Town Square Park',
      dLat: 0.004, dLng: 0.003,
      date: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString().split('T')[0], // 2 days in future
      time: '08:00 AM - 01:00 PM',
      image: 'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?w=500&h=250&fit=crop'
    },
    {
      id: 'evt_2',
      name: 'Local Tech Catalyst Meetup',
      description: 'The monthly speed-networking social event for web developers, tech entrepreneurs, designers, and web enthusiasts in the city. Pizza and cold beer provided!',
      locationName: 'Co-Create Lounge & Hub',
      dLat: -0.001, dLng: 0.002,
      date: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString().split('T')[0], // 5 days in future
      time: '06:30 PM - 09:30 PM',
      image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=500&h=250&fit=crop'
    },
    {
      id: 'evt_3',
      name: 'Sunday Morning Flow Yoga',
      description: 'Awaken your spine with a beautiful, gentle Vinyasa Flow outdoors in nature! All skill levels welcome. Please bring a yoga mat and drinking water.',
      locationName: 'Vista Point Grass Amphitheater',
      dLat: 0.010, dLng: -0.012,
      date: new Date(Date.now() + 4 * 24 * 3600 * 1000).toISOString().split('T')[0], // 4 days in future
      time: '09:00 AM - 10:30 AM',
      image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=500&h=250&fit=crop'
    }
  ];

  eventTemplates.forEach((et) => {
    const eventId = `${et.id}${sfx}`;
    if (!events.some((e) => e.id === eventId)) {
      events.push({
        id: eventId,
        creatorId: mockId(1), // created by Sarah
        name: et.name,
        description: et.description,
        locationName: et.locationName,
        latitude: lat + et.dLat,
        longitude: lng + et.dLng,
        date: et.date,
        time: et.time,
        image: et.image,
        participants: [mockId(1), mockId(2), mockId(3)],
        createdAt: new Date().toISOString()
      });
    }
  });

  // Seed Posts around coordinates
  const postTemplates = [
    {
      id: 'post_1',
      userId: mockId(1), // Sarah
      type: 'image' as const,
      content: 'Just grabbed a marvelous pour-over and a buttery croissant at Aroma Corner. Starting the productive design week right! 🌸☕️',
      mediaUrls: ['https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&h=450&fit=crop'],
      dLat: 0.001, dLng: 0.002,
      likes: [mockId(2), mockId(3)]
    },
    {
      id: 'post_2',
      userId: mockId(2), // Alex
      type: 'poll' as const,
      content: 'Hey neighbors! I want to organize a local cycling club this coming weekend. Which trail direction would you guys prefer to embark on?',
      pollOptions: [
        { id: 'opt_1', text: 'Coastal Route (Scenic but steep)', votes: [mockId(1), mockId(4)] },
        { id: 'opt_2', text: 'Forest Preserve Loop (Flat and shady)', votes: [mockId(3)] },
        { id: 'opt_3', text: 'Urban Loop (Fast paced asphalt)', votes: [] }
      ],
      dLat: -0.002, dLng: 0.003,
      likes: [mockId(1)]
    },
    {
      id: 'post_3',
      userId: mockId(3), // Chloe
      type: 'text' as const,
      content: 'Is anyone else hearing beautiful live acoustic guitar playing around Broad St Park right now? Sounds absolutely magical under the sunset...',
      dLat: 0.006, dLng: -0.005,
      likes: [mockId(1), mockId(4), mockId(2)]
    }
  ];

  postTemplates.forEach((pt) => {
    const postId = `${pt.id}${sfx}`;
    if (!posts.some((p) => p.id === postId)) {
      posts.push({
        id: postId,
        userId: pt.userId,
        type: pt.type,
        content: pt.content,
        mediaUrls: pt.mediaUrls,
        pollOptions: pt.pollOptions,
        latitude: lat + pt.dLat,
        longitude: lng + pt.dLng,
        city,
        country,
        likes: pt.likes,
        loves: [],
        createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString() // 12 hours ago
      });

      // Add a couple comments
      if (pt.id === 'post_1') {
        comments.push({
          id: `cmt_1_1${sfx}`,
          postId,
          userId: mockId(2),
          content: 'Aroma Brews is fantastic! Try their matcha cookies next time.',
          createdAt: new Date(Date.now() - 11 * 3600 * 1000).toISOString()
        });
      }
    }
  });

  // Seed stories that expire in 24 hours
  if (!stories.some((s) => s.id === `story_1${sfx}`)) {
    stories.push({
      id: `story_1${sfx}`,
      userId: mockId(1),
      mediaUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=300&h=500&fit=crop',
      mediaType: 'image',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 23 * 3600 * 1000).toISOString(),
      views: [{ userId: mockId(2), viewedAt: new Date().toISOString() }],
      reactions: [{ userId: mockId(2), reaction: '🔥', createdAt: new Date().toISOString() }]
    });

    stories.push({
      id: `story_2${sfx}`,
      userId: mockId(3),
      mediaUrl: 'https://images.unsplash.com/photo-1498804103079-a6351b050096?w=300&h=500&fit=crop',
      mediaType: 'image',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 20 * 3600 * 1000).toISOString(),
      views: [],
      reactions: []
    });
  }

  // Seed messages/chat groups (only once, for the first neighborhood)
  if (clusterIdx === 0 && chatGroups.length === 0) {
    chatGroups.push({
      id: 'one-to-one:user_mock_1:admin_1',
      isGroup: false,
      memberIds: ['user_mock_1', 'admin_1'],
      lastMessageContent: 'Hey! Welcome to the Location-Based Platform! Let me know if you want to try our events.',
      lastMessageAt: new Date(Date.now() - 1800 * 1000).toISOString()
    });

    messages.push({
      id: 'msg_1',
      groupId: 'one-to-one:user_mock_1:admin_1',
      senderId: 'user_mock_1',
      content: 'Hey! Welcome to the Location-Based Platform! Let me know if you want to try our events.',
      readBy: ['admin_1'],
      createdAt: new Date(Date.now() - 1800 * 1000).toISOString()
    });
  }
}

// REST helper CRUD queries
// Includes banned users: callers decide how to treat them (login shows a "banned" message)
export function findUserByUsername(username: string): User | undefined {
  return users.find((u) => u.username.toLowerCase() === username.toLowerCase());
}

export function findUserByEmail(email: string): User | undefined {
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function findUserById(id: string): User | undefined {
  return users.find((u) => u.id === id);
}

export function getAllUsers() {
  return users;
}

export function addUser(user: User) {
  users.push(user);
  saveDB();
  return user;
}

export function updateUser(id: string, updates: Partial<User>) {
  const idx = users.findIndex((u) => u.id === id);
  if (idx !== -1) {
    // Ignore fields the client didn't send, so a partial update can't wipe e.g. the user's name
    const defined = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    ) as Partial<User>;
    users[idx] = { ...users[idx], ...defined, location: { ...users[idx].location, ...defined.location } } as User;
    saveDB();
    return users[idx];
  }
}

export function getPosts() {
  return posts;
}

export function getComments() {
  return comments;
}

export function getStories() {
  return stories;
}

export function getGroups() {
  return chatGroups;
}

export function getMessages() {
  return messages;
}

export function getEvents() {
  return events;
}

export function getBusinesses() {
  return businesses;
}

export function getProducts() {
  return products;
}

export function getOffers() {
  return offers;
}

export function getReviews() {
  return reviews;
}

export function getOrders() {
  return orders;
}

export function getNotifications() {
  return notifications;
}

export function getReports() {
  return reports;
}

export function getFriendRequests() {
  return friendRequests;
}

export function getFollows() {
  return follows;
}

export function getBlocks() {
  return blocks;
}

export function getSessions() {
  return sessions;
}

export function getCredential(userId: string): Credential | undefined {
  return credentials.find((c) => c.userId === userId);
}

export function setPassword(userId: string, password: string, persist = true) {
  const passwordHash = hashPassword(password);
  const existing = credentials.find((c) => c.userId === userId);
  if (existing) existing.passwordHash = passwordHash;
  else credentials.push({ userId, passwordHash });
  if (persist) saveDB();
}

// In-place removal so every module holding the array sees the change; returns how many were removed
export function removeWhere<T>(list: T[], predicate: (item: T) => boolean): number {
  let removed = 0;
  for (let i = list.length - 1; i >= 0; i--) {
    if (predicate(list[i])) {
      list.splice(i, 1);
      removed++;
    }
  }
  return removed;
}

// Deletes a post together with its comments
export function deletePostCascade(postId: string) {
  removeWhere(posts, (p) => p.id === postId);
  removeWhere(comments, (c) => c.postId === postId);
}

// Deletes a business together with its catalog and offers (orders are kept as purchase history)
export function deleteBusinessCascade(businessId: string) {
  removeWhere(businesses, (b) => b.id === businessId);
  removeWhere(products, (p) => p.businessId === businessId);
  removeWhere(offers, (o) => o.businessId === businessId);
  removeWhere(reviews, (r) => r.targetId === businessId);
  removeWhere(follows, (f) => f.followingId === businessId);
}

// "Delete my account": removes the user and everything they own. Orders stay as the shops' history,
// and messages in shared conversations stay (they show as "Deleted user").
export function deleteUserCascade(userId: string) {
  posts.filter((p) => p.userId === userId).forEach((p) => deletePostCascade(p.id));
  businesses.filter((b) => b.ownerId === userId).forEach((b) => deleteBusinessCascade(b.id));

  removeWhere(users, (u) => u.id === userId);
  removeWhere(credentials, (c) => c.userId === userId);
  removeWhere(sessions, (s) => s.userId === userId);
  removeWhere(comments, (c) => c.userId === userId);
  removeWhere(stories, (s) => s.userId === userId);
  removeWhere(friendRequests, (r) => r.senderId === userId || r.receiverId === userId);
  removeWhere(follows, (f) => f.followerId === userId || f.followingId === userId);
  removeWhere(blocks, (b) => b.blockerId === userId || b.blockedId === userId);
  removeWhere(notifications, (n) => n.userId === userId || n.senderId === userId);
  removeWhere(reviews, (r) => r.userId === userId);
  removeWhere(events, (e) => e.creatorId === userId);
  events.forEach((e) => removeWhere(e.participants, (id) => id === userId));

  chatGroups.forEach((g) => removeWhere(g.memberIds, (id) => id === userId));
  const emptyGroups = new Set(chatGroups.filter((g) => g.memberIds.length === 0).map((g) => g.id));
  removeWhere(chatGroups, (g) => emptyGroups.has(g.id));
  removeWhere(messages, (m) => emptyGroups.has(m.groupId));

  saveDB();
}
