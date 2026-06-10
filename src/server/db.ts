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

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'geoconnect_db.json');

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
      console.log('Database loaded successfully from file.');
    } catch (err) {
      console.error('Error reading database file. Initializing empty memories.', err);
      seedMockData(37.7749, -122.4194); // Default to SF coordinates
    }
  } else {
    // Standard setup with SF coords initially if file doesn't exist
    seedMockData(37.7749, -122.4194);
  }
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
      reports
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save database to disk:', err);
  }
}

// Seeder logic to populates realistic surrounding information based on coordinates
export function seedMockData(lat: number, lng: number) {
  console.log(`Seeding mock database centered near lat: ${lat}, lng: ${lng}`);

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
  }

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
    const mockUserId = `user_mock_${idx + 1}`;
    // Check if duplicate username already exists
    if (users.some((u) => u.username === uo.username)) return;

    const mockUser: User = {
      id: mockUserId,
      name: uo.name,
      username: uo.username,
      email: `${uo.username}@example.com`,
      mobile: `+155598765${idx}`,
      profilePhoto: `https://images.unsplash.com/photo-${1500000000000 + uo.photoIdx * 10000}?w=150&h=150&fit=crop`,
      coverImage: `https://images.unsplash.com/photo-${1510000000000 + idx * 80000}?w=600&h=200&fit=crop`,
      dob: `199${4 + idx}-0${idx + 1}-15`,
      gender: uo.gender,
      bio: `Local enthusiast. Loving local cafes, ${uo.interest[0]}, and meeting cool neighbors!`,
      interests: uo.interest,
      profession: uo.profession,
      website: `${uo.username}.dev`,
      socialLinks: {
        instagram: `instagram.com/${uo.username}`,
        twitter: `twitter.com/${uo.username}`
      },
      location: {
        latitude: lat + uo.dLat,
        longitude: lng + uo.dLng,
        city: 'Local City',
        state: 'Local State',
        country: 'Local Country',
        updatedAt: new Date().toISOString()
      },
      createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString() // 30 days ago
    };
    users.push(mockUser);
    newlySeededUsers.push(mockUser);
  });

  // Make some interactions (Requests, Friends)
  if (users.length >= 4) {
    // Seed friend request states
    const fReqExist = friendRequests.some((fr) => fr.senderId === 'user_mock_1');
    if (!fReqExist) {
      friendRequests.push({
        id: 'fr_1',
        senderId: 'user_mock_1', // Sarah
        receiverId: 'user_mock_2', // Alex
        status: 'accepted',
        createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString()
      });
      friendRequests.push({
        id: 'fr_2',
        senderId: 'user_mock_3', // Chloe
        receiverId: 'user_mock_1',
        status: 'pending',
        createdAt: new Date().toISOString()
      });
    }
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
    if (!businesses.some((b) => b.id === bt.id)) {
      businesses.push({
        id: bt.id,
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
        id: `rev_${bt.id}_1`,
        targetId: bt.id,
        userId: 'user_mock_1',
        rating: Math.floor(bt.rating),
        comment: `Excellent service! This is exactly what our neighborhood was missing. Recommend 100%!`,
        createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString()
      });

      reviews.push({
        id: `rev_${bt.id}_2`,
        targetId: bt.id,
        userId: 'user_mock_2',
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
    if (!products.some((p) => p.id === pt.id)) {
      products.push({
        id: pt.id,
        businessId: pt.businessId,
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
    if (!events.some((e) => e.id === et.id)) {
      events.push({
        id: et.id,
        creatorId: 'user_mock_1', // created by Sarah
        name: et.name,
        description: et.description,
        locationName: et.locationName,
        latitude: lat + et.dLat,
        longitude: lng + et.dLng,
        date: et.date,
        time: et.time,
        image: et.image,
        participants: ['user_mock_1', 'user_mock_2', 'user_mock_3'],
        createdAt: new Date().toISOString()
      });
    }
  });

  // Seed Posts around coordinates
  const postTemplates = [
    {
      id: 'post_1',
      userId: 'user_mock_1', // Sarah
      type: 'image' as const,
      content: 'Just grabbed a marvelous pour-over and a buttery croissant at Aroma Corner. Starting the productive design week right! 🌸☕️',
      mediaUrls: ['https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&h=450&fit=crop'],
      dLat: 0.001, dLng: 0.002,
      city: 'San Francisco', country: 'United States',
      likes: ['user_mock_2', 'user_mock_3']
    },
    {
      id: 'post_2',
      userId: 'user_mock_2', // Alex
      type: 'poll' as const,
      content: 'Hey neighbors! I want to organize a local cycling club this coming weekend. Which trail direction would you guys prefer to embark on?',
      pollOptions: [
        { id: 'opt_1', text: 'Stinson Coastal Route (Scenic but steep)', votes: ['user_mock_1', 'user_mock_4'] },
        { id: 'opt_2', text: 'Golden Gate Redwoods Preserve (Flat nature shadows)', votes: ['user_mock_3'] },
        { id: 'opt_3', text: 'Silicon Valley Urban Loop (Fast paced asphalt)', votes: [] }
      ],
      dLat: -0.002, dLng: 0.003,
      city: 'San Francisco', country: 'United States',
      likes: ['user_mock_1']
    },
    {
      id: 'post_3',
      userId: 'user_mock_3', // Chloe
      type: 'text' as const,
      content: 'Is anyone else hearing beautiful live acoustic guitar playing around Broad St Park right now? Sounds absolutely magical under the sunset...',
      dLat: 0.006, dLng: -0.005,
      city: 'San Francisco', country: 'United States',
      likes: ['user_mock_1', 'user_mock_4', 'user_mock_2']
    }
  ];

  postTemplates.forEach((pt) => {
    if (!posts.some((p) => p.id === pt.id)) {
      posts.push({
        id: pt.id,
        userId: pt.userId,
        type: pt.type,
        content: pt.content,
        mediaUrls: pt.mediaUrls,
        pollOptions: pt.pollOptions,
        latitude: lat + pt.dLat,
        longitude: lng + pt.dLng,
        city: pt.city,
        country: pt.country,
        likes: pt.likes,
        loves: [],
        createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString() // 12 hours ago
      });

      // Add a couple comments
      if (pt.id === 'post_1') {
        comments.push({
          id: 'cmt_1_1',
          postId: pt.id,
          userId: 'user_mock_2',
          content: 'Aroma Brews is fantastic! Try their matcha cookies next time.',
          createdAt: new Date(Date.now() - 11 * 3600 * 1000).toISOString()
        });
      }
    }
  });

  // Seed stories that expire in 24 hours
  const hasStories = stories.length > 0;
  if (!hasStories) {
    stories.push({
      id: 'story_1',
      userId: 'user_mock_1',
      mediaUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=300&h=500&fit=crop',
      mediaType: 'image',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 23 * 3600 * 1000).toISOString(),
      views: [{ userId: 'user_mock_2', viewedAt: new Date().toISOString() }],
      reactions: [{ userId: 'user_mock_2', reaction: '🔥', createdAt: new Date().toISOString() }]
    });

    stories.push({
      id: 'story_2',
      userId: 'user_mock_3',
      mediaUrl: 'https://images.unsplash.com/photo-1498804103079-a6351b050096?w=300&h=500&fit=crop',
      mediaType: 'image',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 20 * 3600 * 1000).toISOString(),
      views: [],
      reactions: []
    });
  }

  // Seed messages/chat groups
  const hasChat = chatGroups.length > 0;
  if (!hasChat) {
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

  saveDB();
}

// REST helper CRUD queries
export function findUserByUsername(username: string): User | undefined {
  return users.find((u) => u.username.toLowerCase() === username.toLowerCase() && !u.isBanned);
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
    users[idx] = { ...users[idx], ...updates, location: { ...users[idx].location, ...updates.location } } as User;
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
