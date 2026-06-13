/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  initDB,
  saveDB,
  haversineDistance,
  seedMockData,
  getAllUsers,
  findUserById,
  findUserByUsername,
  addUser,
  updateUser,
  getPosts,
  getComments,
  getStories,
  getGroups,
  getMessages,
  getEvents,
  getBusinesses,
  getProducts,
  getOffers,
  getReviews,
  getOrders,
  getNotifications,
  getReports,
  getFriendRequests,
  getFollows,
  getBlocks
} from './src/server/db';
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
  UserBlock,
  PostType
} from './src/types';

const app = express();
const PORT = 3000;

// Enable JSON parse with high payloads for base64 images
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Initialize Mock database
initDB();

// Mock User Session Management (In-Memory Session Token Map)
// In a production app, we would use JWT. For preview, we map a Header `x-session-userid`
// directly. If missing, we fall back to a default active user to make the UI completely robust
// even when first loading or without full authentication flows.
function getAuthenticatedUserId(req: express.Request): string {
  const userIdHeader = req.headers['x-session-userid'];
  if (userIdHeader && typeof userIdHeader === 'string' && userIdHeader !== '') {
    return userIdHeader;
  }
  return '';
}

// REST APIs

// 1. Authentication
app.post('/api/auth/register', (req, res) => {
  const {
    name,
    username,
    email,
    password,
    mobile,
    profilePhoto,
    dob,
    gender,
    latitude,
    longitude,
    city,
    state,
    country
  } = req.body;

  if (!name || !username || !email || !password) {
    res.status(400).json({ error: 'Name, username, email, and password are required.' });
    return;
  }

  const existingUser = findUserByUsername(username);
  if (existingUser) {
    res.status(400).json({ error: 'Username is already taken.' });
    return;
  }

  // Create user
  const newUser: User = {
    id: `user_${Date.now()}`,
    name,
    username,
    email,
    mobile: mobile || '',
    profilePhoto: profilePhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop',
    dob: dob || '2000-01-01',
    gender: gender || 'Other',
    location: {
      latitude: Number(latitude) || 37.7749,
      longitude: Number(longitude) || -122.4194,
      city: city || 'San Francisco',
      state: state || 'California',
      country: country || 'United States',
      updatedAt: new Date().toISOString()
    },
    interests: [],
    createdAt: new Date().toISOString()
  };

  addUser(newUser);

  // Auto seed content centered around the new user's location
  seedMockData(newUser.location.latitude, newUser.location.longitude);

  res.status(201).json({ user: newUser });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username) {
    res.status(400).json({ error: 'Username is required.' });
    return;
  }

  const user = findUserByUsername(username);
  if (!user) {
    res.status(404).json({ error: 'User does not exist.' });
    return;
  }

  if (user.isBanned) {
    res.status(403).json({ error: 'This user account has been banned by the administrator.' });
    return;
  }

  // Seeding around this user's last known location to ensure nearby widgets are dynamic
  seedMockData(user.location.latitude, user.location.longitude);

  res.status(200).json({ user });
});

app.post('/api/auth/logout', (req, res) => {
  res.status(200).json({ success: true });
});

// Update current Location coordinate on startup or resume
app.post('/api/auth/location', (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const { latitude, longitude, city, state, country } = req.body;

  if (latitude === undefined || longitude === undefined) {
    res.status(400).json({ error: 'Latitude and Longitude are required' });
    return;
  }

  const user = findUserById(userId);
  if (user) {
    user.location = {
      latitude: Number(latitude),
      longitude: Number(longitude),
      city: city || user.location.city,
      state: state || user.location.state,
      country: country || user.location.country,
      updatedAt: new Date().toISOString()
    };
    saveDB();

    // Dynamically generate extra posts and local businesses close to this new user location!
    seedMockData(Number(latitude), Number(longitude));

    res.status(200).json({ success: true, location: user.location });
  } else {
    res.status(404).json({ error: 'User session not found' });
  }
});

// 2. User Profiles Info
app.get('/api/users/me', (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const user = findUserById(userId);
  if (!user) {
    res.status(404).json({ error: 'Profile not found' });
  } else {
    res.json(user);
  }
});

app.put('/api/users/profile', (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const { name, bio, profilePhoto, coverImage, interests, profession, website, socialLinks } = req.body;

  const updated = updateUser(userId, {
    name,
    bio,
    profilePhoto,
    coverImage,
    interests,
    profession,
    website,
    socialLinks
  });

  if (updated) {
    res.json(updated);
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

// 3. Followers, Friend Requests and blocks
app.get('/api/users/social-relations', (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const requests = getFriendRequests().filter(
    (r) => r.senderId === userId || r.receiverId === userId
  );
  const fws = getFollows().filter((f) => f.followerId === userId);
  const bks = getBlocks().filter((b) => b.blockerId === userId);

  res.json({
    friendRequests: requests,
    following: fws,
    blocked: bks
  });
});

app.post('/api/users/friend-request', (req, res) => {
  const senderId = getAuthenticatedUserId(req);
  const { receiverId } = req.body;

  if (!receiverId || senderId === receiverId) {
    res.status(400).json({ error: 'Invalid receiver ID' });
    return;
  }

  // Check existing
  const reqs = getFriendRequests();
  const duplicate = reqs.find(
    (r) =>
      (r.senderId === senderId && r.receiverId === receiverId) ||
      (r.senderId === receiverId && r.receiverId === senderId)
  );

  if (duplicate) {
    res.json({ success: true, request: duplicate });
    return;
  }

  const newRequest: FriendRequest = {
    id: `fr_req_${Date.now()}`,
    senderId,
    receiverId,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  reqs.push(newRequest);

  // Trigger real-time notification
  const sender = findUserById(senderId);
  getNotifications().push({
    id: `notif_${Date.now()}`,
    userId: receiverId,
    senderId,
    type: 'friend_request',
    title: 'New Friend Request',
    message: `${sender?.name || 'Someone'} sent you a friend request.`,
    isRead: false,
    createdAt: new Date().toISOString()
  });

  saveDB();
  res.json({ success: true, request: newRequest });
});

app.post('/api/users/friend-respond', (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const { requestId, respond } = req.body; // respond: 'accepted' | 'declined'

  const reqs = getFriendRequests();
  const idx = reqs.findIndex((r) => r.id === requestId && r.receiverId === userId);

  if (idx === -1) {
    res.status(404).json({ error: 'Friend request not found.' });
    return;
  }

  reqs[idx].status = respond;

  if (respond === 'accepted') {
    // Notify accepted sender
    const responder = findUserById(userId);
    getNotifications().push({
      id: `notif_${Date.now()}`,
      userId: reqs[idx].senderId,
      senderId: userId,
      type: 'friend_accept',
      title: 'Friend Request Accepted',
      message: `${responder?.name || 'Someone'} accepted your friend request!`,
      isRead: false,
      createdAt: new Date().toISOString()
    });
  }

  saveDB();
  res.json({ success: true, request: reqs[idx] });
});

app.post('/api/users/follow', (req, res) => {
  const followerId = getAuthenticatedUserId(req);
  const { targetId, targetType } = req.body; // targetType: 'user' | 'business'

  if (!targetId) {
    res.status(400).json({ error: 'Target ID required' });
    return;
  }

  const followsList = getFollows();
  const existingIdx = followsList.findIndex(
    (f) => f.followerId === followerId && f.followingId === targetId
  );

  if (existingIdx !== -1) {
    // Unfollow
    followsList.splice(existingIdx, 1);
    saveDB();
    res.json({ success: true, following: false });
  } else {
    // Follow
    const newFollow: Follow = {
      id: `flw_${Date.now()}`,
      followerId,
      followingId: targetId,
      targetType,
      createdAt: new Date().toISOString()
    };
    followsList.push(newFollow);

    // Notify of follow
    if (targetType === 'user') {
      const follower = findUserById(followerId);
      getNotifications().push({
        id: `notif_flw_${Date.now()}`,
        userId: targetId,
        senderId: followerId,
        type: 'friend_accept',
        title: 'New Follower',
        message: `${follower?.name || 'Someone'} started following you.`,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }

    saveDB();
    res.json({ success: true, following: true });
  }
});

// Block user
app.post('/api/users/block', (req, res) => {
  const blockerId = getAuthenticatedUserId(req);
  const { blockedId } = req.body;

  if (!blockedId) {
    res.status(400).json({ error: 'Blocked ID required' });
    return;
  }

  const blocksList = getBlocks();
  const existing = blocksList.find((b) => b.blockerId === blockerId && b.blockedId === blockedId);

  if (existing) {
    res.json({ success: true, blocked: true });
    return;
  }

  blocksList.push({
    id: `blk_${Date.now()}`,
    blockerId,
    blockedId,
    createdAt: new Date().toISOString()
  });

  saveDB();
  res.json({ success: true, blocked: true });
});

// REPORT users/content
app.post('/api/reports', (req, res) => {
  const reporterId = getAuthenticatedUserId(req);
  const { targetId, targetType, reason } = req.body;

  if (!targetId || !targetType || !reason) {
    res.status(400).json({ error: 'Missing targetId, targetType or reason.' });
    return;
  }

  const reportsList = getReports();
  const newReport: Report = {
    id: `rep_${Date.now()}`,
    reporterId,
    targetId,
    targetType,
    reason,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  reportsList.push(newReport);
  saveDB();
  res.json({ success: true, report: newReport });
});


// 4. Location-based Social Feed & Posting
app.post('/api/posts', (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const { type, content, mediaUrls, pollOptions, sharedPostId } = req.body;

  if (!content && !mediaUrls?.length && !pollOptions?.length && !sharedPostId) {
    res.status(400).json({ error: 'Post must contain content or media or poll' });
    return;
  }

  const creator = findUserById(userId);
  if (!creator) {
    res.status(404).json({ error: 'User profile not found' });
    return;
  }

  // Create post with current user location coordinates
  const newPost: Post = {
    id: `post_${Date.now()}`,
    userId,
    type: (type as PostType) || 'text',
    content: content || '',
    mediaUrls: mediaUrls || [],
    pollOptions: pollOptions ? pollOptions.map((opt: string, i: number) => ({ id: `opt_${i}`, text: opt, votes: [] })) : undefined,
    sharedPostId,
    latitude: creator.location.latitude,
    longitude: creator.location.longitude,
    city: creator.location.city,
    country: creator.location.country,
    likes: [],
    loves: [],
    createdAt: new Date().toISOString()
  };

  getPosts().push(newPost);
  saveDB();
  res.status(201).json(newPost);
});

// Main Location Feed API with dynamic Haversine Formula distance offsets!
app.get('/api/posts/feed', (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const user = findUserById(userId);

  if (!user) {
    res.status(404).json({ error: 'Session user profile not found' });
    return;
  }

  // Filters: '1', '5', '10', '25', '50', '100', 'global' (KM)
  const distanceFilter = req.query.range ? String(req.query.range) : '25';

  const userLat = user.location.latitude;
  const userLng = user.location.longitude;

  // Grab blocks
  const blockedIds = getBlocks()
    .filter((b) => b.blockerId === userId || b.blockedId === userId)
    .map((b) => (b.blockerId === userId ? b.blockedId : b.blockerId));

  // Compute posts list
  const activePosts = getPosts()
    .filter((p) => {
      // Exclude posts by banned or blocked users
      const author = findUserById(p.userId);
      if (!author || author.isBanned) return false;
      if (blockedIds.includes(p.userId)) return false;
      return true;
    })
    .map((p) => {
      const author = findUserById(p.userId);
      const postDistance = haversineDistance(userLat, userLng, p.latitude, p.longitude);

      // Populate sharing post if necessary
      let sharedPostData: Post | undefined;
      if (p.sharedPostId) {
        const orig = getPosts().find((op) => op.id === p.sharedPostId);
        if (orig) {
          const origAuthor = findUserById(orig.userId);
          sharedPostData = {
            ...orig,
            authorName: origAuthor?.name || 'Anonymous User',
            authorUsername: origAuthor?.username || 'anonymous',
            authorPhoto: origAuthor?.profilePhoto
          };
        }
      }

      return {
        ...p,
        authorName: author?.name || 'Deleted User',
        authorUsername: author?.username || 'deleted_user',
        authorPhoto: author?.profilePhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop',
        distanceKm: Number(postDistance.toFixed(2)),
        sharedPost: sharedPostData
      };
    })
    .filter((p) => {
      if (distanceFilter === 'global') return true;
      const limit = Number(distanceFilter);
      return (p.distanceKm || 0) <= limit;
    });

  // Sort by newly created
  activePosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json(activePosts);
});

// Like / Love Reacts
app.post('/api/posts/:id/react', (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const postId = req.params.id;
  const { reaction } = req.body; // 'like' | 'love'

  const allPosts = getPosts();
  const idx = allPosts.findIndex((p) => p.id === postId);

  if (idx === -1) {
    res.status(404).json({ error: 'Post not found' });
    return;
  }

  const post = allPosts[idx];

  if (reaction === 'love') {
    const lIdx = post.loves.indexOf(userId);
    if (lIdx !== -1) {
      post.loves.splice(lIdx, 1);
    } else {
      post.loves.push(userId);
      // Remove standard like if exists
      const lkIdx = post.likes.indexOf(userId);
      if (lkIdx !== -1) post.likes.splice(lkIdx, 1);

      // Event notification
      if (post.userId !== userId) {
        const rName = findUserById(userId)?.name || 'Someone';
        getNotifications().push({
          id: `notif_${Date.now()}`,
          userId: post.userId,
          senderId: userId,
          type: 'love',
          title: 'Love Reaction',
          message: `${rName} loved your post.`,
          isRead: false,
          createdAt: new Date().toISOString()
        });
      }
    }
  } else {
    // Like
    const lIdx = post.likes.indexOf(userId);
    if (lIdx !== -1) {
      post.likes.splice(lIdx, 1);
    } else {
      post.likes.push(userId);
      // Remove love react
      const lvIdx = post.loves.indexOf(userId);
      if (lvIdx !== -1) post.loves.splice(lvIdx, 1);

      // Event notification
      if (post.userId !== userId) {
        const rName = findUserById(userId)?.name || 'Someone';
        getNotifications().push({
          id: `notif_${Date.now()}`,
          userId: post.userId,
          senderId: userId,
          type: 'like',
          title: 'Liked Post',
          message: `${rName} liked your post.`,
          isRead: false,
          createdAt: new Date().toISOString()
        });
      }
    }
  }

  saveDB();
  res.json({ success: true, likes: post.likes, loves: post.loves });
});

// Vote Polls
app.post('/api/posts/:id/vote', (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const postId = req.params.id;
  const { optionId } = req.body;

  const post = getPosts().find((p) => p.id === postId);
  if (!post || !post.pollOptions) {
    res.status(404).json({ error: 'Poll post not found' });
    return;
  }

  // Remove existing vote of this user from any option of this poll
  post.pollOptions.forEach((opt) => {
    const vIdx = opt.votes.indexOf(userId);
    if (vIdx !== -1) opt.votes.splice(vIdx, 1);
  });

  // Vote for selected option
  const selected = post.pollOptions.find((o) => o.id === optionId);
  if (selected) {
    selected.votes.push(userId);
  }

  saveDB();
  res.json({ success: true, pollOptions: post.pollOptions });
});

// Post Comments CRUD
app.get('/api/posts/:id/comments', (req, res) => {
  const postId = req.params.id;
  const list = getComments()
    .filter((c) => c.postId === postId)
    .map((c) => {
      const u = findUserById(c.userId);
      return {
        ...c,
        userName: u?.name || 'Deleted User',
        userPhoto: u?.profilePhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop'
      };
    });

  res.json(list);
});

app.post('/api/posts/:id/comments', (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const postId = req.params.id;
  const { content, parentId } = req.body;

  if (!content) {
    res.status(400).json({ error: 'Content is required.' });
    return;
  }

  const post = getPosts().find((p) => p.id === postId);
  if (!post) {
    res.status(404).json({ error: 'Post not found' });
    return;
  }

  const newComment: Comment = {
    id: `cmt_${Date.now()}`,
    postId,
    userId,
    parentId,
    content,
    createdAt: new Date().toISOString()
  };

  getComments().push(newComment);

  // Notify post owner
  if (post.userId !== userId) {
    const commenter = findUserById(userId);
    getNotifications().push({
      id: `notif_${Date.now()}`,
      userId: post.userId,
      senderId: userId,
      type: 'comment',
      title: 'New Comment',
      message: `${commenter?.name || 'Someone'} commented on your post.`,
      isRead: false,
      createdAt: new Date().toISOString()
    });
  }

  saveDB();

  // Return populated comment
  const u = findUserById(userId);
  res.json({
    ...newComment,
    userName: u?.name || 'Just You',
    userPhoto: u?.profilePhoto
  });
});

// 5. Instagram Stories APIs
app.get('/api/stories', (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const user = findUserById(userId);
  if (!user) {
    res.status(404).json({ error: 'Session user invalid' });
    return;
  }

  const userLat = user.location.latitude;
  const userLng = user.location.longitude;

  // Grab non-expired stories (< 24 hours) and populate user details
  const activeStories = getStories()
    .filter((s) => {
      const isExpired = new Date(s.expiresAt).getTime() < Date.now();
      const author = findUserById(s.userId);
      return !isExpired && author && !author.isBanned;
    })
    .map((s) => {
      const author = findUserById(s.userId);
      const postDistance = haversineDistance(userLat, userLng, author!.location.latitude, author!.location.longitude);
      return {
        ...s,
        userName: author?.name || 'Anonymous User',
        userPhoto: author?.profilePhoto,
        distanceKm: Number(postDistance.toFixed(2))
      };
    })
    .filter((s) => s.distanceKm <= 50 || s.userId === userId); // nearby or mine

  res.json(activeStories);
});

app.post('/api/stories', (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const { mediaUrl, mediaType } = req.body;

  if (!mediaUrl) {
    res.status(400).json({ error: 'Media URL required' });
    return;
  }

  const newStory: Story = {
    id: `story_${Date.now()}`,
    userId,
    mediaUrl,
    mediaType: mediaType || 'image',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(), // 24 Hours
    views: [],
    reactions: []
  };

  getStories().push(newStory);
  saveDB();
  res.status(201).json(newStory);
});

app.post('/api/stories/:id/view', (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const storyId = req.params.id;

  const story = getStories().find((s) => s.id === storyId);
  if (!story) {
    res.status(404).json({ error: 'Story not found.' });
    return;
  }

  const alreadyViewed = story.views.some((v) => v.userId === userId);
  if (!alreadyViewed) {
    story.views.push({
      userId,
      viewedAt: new Date().toISOString()
    });
    saveDB();
  }

  res.json({ success: true, story });
});

// 6. Discover Nearby People Page
app.get('/api/users/discover', (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const currUser = findUserById(userId);

  if (!currUser) {
    res.status(404).json({ error: 'User profile not found' });
    return;
  }

  // Filters: distance, interest, profession, gender, age
  const range = req.query.range ? String(req.query.range) : '50';
  const interest = req.query.interest ? String(req.query.interest).toLowerCase() : '';
  const profession = req.query.profession ? String(req.query.profession).toLowerCase() : '';
  const gender = req.query.gender ? String(req.query.gender) : '';
  const searchName = req.query.search ? String(req.query.search).toLowerCase() : '';

  const userLat = currUser.location.latitude;
  const userLng = currUser.location.longitude;

  const searchResults = getAllUsers()
    .filter((u) => u.id !== userId && !u.isBanned && !u.isAdmin)
    .map((u) => {
      const d = haversineDistance(userLat, userLng, u.location.latitude, u.location.longitude);
      return {
        ...u,
        distanceKm: Number(d.toFixed(2))
      };
    })
    .filter((u) => {
      // Distance filter
      if (range !== 'global') {
        if (u.distanceKm > Number(range)) return false;
      }
      // Interest filter
      if (interest && !u.interests.some((i) => i.toLowerCase().includes(interest))) return false;
      // Profession
      if (profession && (!u.profession || !u.profession.toLowerCase().includes(profession))) return false;
      // Gender
      if (gender && u.gender !== gender) return false;
      // Name or username search
      if (searchName && !u.name.toLowerCase().includes(searchName) && !u.username.toLowerCase().includes(searchName)) return false;

      return true;
    });

  // Sort by closest distance
  searchResults.sort((a, b) => a.distanceKm - b.distanceKm);

  res.json(searchResults);
});

// 7. Messaging System (Chats & Groups)
// For preview, we emulate instant sockets via rest polling/posting
app.get('/api/messaging/threads', (req, res) => {
  const userId = getAuthenticatedUserId(req);

  // Find all groups the user belongs to
  const threads = getGroups()
    .filter((g) => g.memberIds.includes(userId))
    .map((g) => {
      // Find other member details for 1-to-1 chats
      let threadName = g.name || 'Group Chat';
      let threadPhoto = g.coverPhoto || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=120&h=120&fit=crop';

      if (!g.isGroup) {
        const otherId = g.memberIds.find((id) => id !== userId);
        const otherUser = findUserById(otherId || '');
        if (otherUser) {
          threadName = otherUser.name;
          threadPhoto = otherUser.profilePhoto;
        } else {
          threadName = 'Deleted User';
          threadPhoto = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop';
        }
      }

      // Compute unreads (messages in thread that sender didn't read)
      const threadMsgs = getMessages().filter((m) => m.groupId === g.id);
      const unreadCount = threadMsgs.filter((m) => m.senderId !== userId && !m.readBy.includes(userId)).length;

      let lastMessageContent = 'No messages yet';
      let lastMessageAt = g.lastMessageAt || new Date().toISOString();

      if (threadMsgs.length > 0) {
        const lastMsg = threadMsgs[threadMsgs.length - 1];
        lastMessageContent = lastMsg.content || (lastMsg.mediaType ? `Shared dynamic ${lastMsg.mediaType}` : 'Image file');
        lastMessageAt = lastMsg.createdAt;
      }

      return {
        ...g,
        name: threadName,
        coverPhoto: threadPhoto,
        lastMessageContent,
        lastMessageAt,
        unreadCount
      };
    });

  // Sort threads by latest message
  threads.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  res.json(threads);
});

app.get('/api/messaging/threads/:id/messages', (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const threadId = req.params.id;

  // Ensure thread access
  const group = getGroups().find((g) => g.id === threadId && g.memberIds.includes(userId));
  if (!group) {
    res.status(403).json({ error: 'You are not member of this conversation thread.' });
    return;
  }

  // Fetch and mark read for current user
  const list = getMessages()
    .filter((m) => m.groupId === threadId)
    .map((m) => {
      if (m.senderId !== userId && !m.readBy.includes(userId)) {
        m.readBy.push(userId);
      }
      const s = findUserById(m.senderId);
      return {
        ...m,
        senderName: s?.name || 'Someone',
        senderPhoto: s?.profilePhoto
      };
    });

  saveDB();
  res.json(list);
});

app.post('/api/messaging/threads/:id/messages', (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const threadId = req.params.id;
  const { content, mediaUrl, mediaType } = req.body;

  const group = getGroups().find((g) => g.id === threadId && g.memberIds.includes(userId));
  if (!group) {
    res.status(403).json({ error: 'Conversation access denied.' });
    return;
  }

  const newMsg: Message = {
    id: `msg_${Date.now()}`,
    groupId: threadId,
    senderId: userId,
    content: content || '',
    mediaUrl,
    mediaType,
    readBy: [userId],
    createdAt: new Date().toISOString()
  };

  getMessages().push(newMsg);

  // Update thread stats
  group.lastMessageContent = content || `Sent standard ${mediaType}`;
  group.lastMessageAt = newMsg.createdAt;

  // Real-time app notifications for other members in group / thread
  group.memberIds.forEach((mId) => {
    if (mId !== userId) {
      const creator = findUserById(userId);
      getNotifications().push({
        id: `notif_msg_${Date.now()}_${mId}`,
        userId: mId,
        senderId: userId,
        type: 'message',
        title: group.name ? `Message in ${group.name}` : 'New Private Message',
        message: `${creator?.name || 'Someone'}: ${content || 'Sent a file'}`,
        link: `/chat/${threadId}`,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }
  });

  saveDB();
  res.status(201).json(newMsg);
});

// Start private chat thread
app.post('/api/messaging/start', (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const { recipientId } = req.body;

  if (!recipientId) {
    res.status(400).json({ error: 'Recipient ID is required' });
    return;
  }

  // Standard ordered id combination for 1-to-1 conversations to avoid duplicates
  const threadId = ['one-to-one', userId, recipientId].sort().join(':');

  let group = getGroups().find((g) => g.id === threadId);
  if (!group) {
    group = {
      id: threadId,
      isGroup: false,
      memberIds: [userId, recipientId],
      lastMessageContent: 'Chat initiated.',
      lastMessageAt: new Date().toISOString()
    };
    getGroups().push(group);
    saveDB();
  }

  res.json(group);
});

// Start a group chat
app.post('/api/messaging/group', (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const { name, memberIds } = req.body; // array of participant IDs

  if (!name || !memberIds || !Array.isArray(memberIds)) {
    res.status(400).json({ error: 'Group name and member IDs list are required' });
    return;
  }

  const distinctMembers = Array.from(new Set([userId, ...memberIds]));
  const customId = `group_${Date.now()}`;

  const newGroup: ChatGroup = {
    id: customId,
    isGroup: true,
    name,
    creatorId: userId,
    memberIds: distinctMembers,
    lastMessageContent: 'Group conversation started.',
    lastMessageAt: new Date().toISOString()
  };

  getGroups().push(newGroup);
  saveDB();
  res.status(201).json(newGroup);
});


// 8. Local Events APIs
app.get('/api/events', (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const user = findUserById(userId);
  if (!user) {
    res.status(404).json({ error: 'Session user profile invalid.' });
    return;
  }

  const range = req.query.range ? String(req.query.range) : '50';

  const userLat = user.location.latitude;
  const userLng = user.location.longitude;

  const result = getEvents()
    .map((e) => {
      const dist = haversineDistance(userLat, userLng, e.latitude, e.longitude);
      const host = findUserById(e.creatorId);
      return {
        ...e,
        creatorName: host?.name || 'Local Organizer',
        distanceKm: Number(dist.toFixed(2))
      };
    })
    .filter((e) => {
      if (range === 'global') return true;
      return e.distanceKm <= Number(range);
    });

  // Sort by closest coordinates first
  result.sort((a, b) => a.distanceKm - b.distanceKm);
  res.json(result);
});

app.post('/api/events', (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const { name, description, locationName, latitude, longitude, date, time, image } = req.body;

  if (!name || !description || !locationName || !date || !time) {
    res.status(400).json({ error: 'Missing required event parameters.' });
    return;
  }

  const user = findUserById(userId);
  const newEvent: LocalEvent = {
    id: `event_${Date.now()}`,
    creatorId: userId,
    name,
    description,
    locationName,
    latitude: Number(latitude) || user?.location.latitude || 37.7749,
    longitude: Number(longitude) || user?.location.longitude || -122.4194,
    date,
    time,
    image: image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=500&h=250&fit=crop',
    participants: [userId],
    createdAt: new Date().toISOString()
  };

  getEvents().push(newEvent);

  // Invite friends around 5km
  if (user) {
    getAllUsers().forEach((u) => {
      if (u.id !== userId) {
        const d = haversineDistance(user.location.latitude, user.location.longitude, u.location.latitude, u.location.longitude);
        if (d <= 15) {
          getNotifications().push({
            id: `notif_evt_${Date.now()}_${u.id}`,
            userId: u.id,
            senderId: userId,
            type: 'event_invite',
            title: 'Nearby Event Alert',
            message: `${user.name} created a new event "${name}" within ${d.toFixed(1)}km! Join now.`,
            link: `/events`,
            isRead: false,
            createdAt: new Date().toISOString()
          });
        }
      }
    });
  }

  saveDB();
  res.status(201).json(newEvent);
});

app.post('/api/events/:id/join', (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const eventId = req.params.id;

  const event = getEvents().find((e) => e.id === eventId);
  if (!event) {
    res.status(404).json({ error: 'Local event not found.' });
    return;
  }

  const joinedIdx = event.participants.indexOf(userId);
  if (joinedIdx !== -1) {
    // Leave event
    event.participants.splice(joinedIdx, 1);
    saveDB();
    res.json({ success: true, joined: false, event });
  } else {
    // Join event
    event.participants.push(userId);
    saveDB();
    res.json({ success: true, joined: true, event });
  }
});


// 9. Local Business Directory & Dashboards
app.get('/api/businesses', (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const user = findUserById(userId);
  if (!user) {
    res.status(404).json({ error: 'Session user profile invalid.' });
    return;
  }

  const range = req.query.range ? String(req.query.range) : '50';
  const category = req.query.category ? String(req.query.category) : '';
  const searchName = req.query.search ? String(req.query.search).toLowerCase() : '';

  const userLat = user.location.latitude;
  const userLng = user.location.longitude;

  const results = getBusinesses()
    .map((b) => {
      const dist = haversineDistance(userLat, userLng, b.latitude, b.longitude);

      // Compute average rating from reviews
      const bizReviews = getReviews().filter((r) => r.targetId === b.id);
      const avg =
        bizReviews.length > 0
          ? bizReviews.reduce((sum, r) => sum + r.rating, 0) / bizReviews.length
          : 0;

      // Compute followers list
      const followersCount = getFollows().filter(
        (f) => f.followingId === b.id && f.targetType === 'business'
      ).length;

      return {
        ...b,
        distanceKm: Number(dist.toFixed(2)),
        averageRating: Number(avg.toFixed(1)),
        followersCount
      };
    })
    .filter((b) => {
      // Range filter
      if (range !== 'global' && b.distanceKm > Number(range)) return false;
      // Category filter
      if (category && b.category !== category) return false;
      // Search term
      if (searchName && !b.name.toLowerCase().includes(searchName)) return false;
      return true;
    });

  // Sort by average rating first, then by closest distance
  results.sort((a, b) => b.averageRating - a.averageRating || a.distanceKm - b.distanceKm);
  res.json(results);
});

// Create business account
app.post('/api/businesses', (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const { category, name, logo, coverImage, description, address, latitude, longitude, phone, email, website, themeVibe, tagline, instagramUrl, twitterUrl } = req.body;

  if (!category || !name || !address || !phone || !email) {
    res.status(400).json({ error: 'Missing required business fields' });
    return;
  }

  const user = findUserById(userId);
  const newBiz: any = {
    id: `biz_${Date.now()}`,
    ownerId: userId,
    category,
    name,
    logo: logo || 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=120&h=120&fit=crop',
    coverImage: coverImage || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=300&fit=crop',
    description: description || '',
    address,
    latitude: Number(latitude) || user?.location.latitude || 37.7749,
    longitude: Number(longitude) || user?.location.longitude || -122.4194,
    phone,
    email,
    website,
    isVerified: false, // Must be verified by superadmin
    themeVibe: themeVibe || 'minimal',
    tagline: tagline || '',
    instagramUrl: instagramUrl || '',
    twitterUrl: twitterUrl || '',
    createdAt: new Date().toISOString()
  };

  getBusinesses().push(newBiz);
  saveDB();
  res.status(201).json(newBiz);
});

// Get promotional offers for a single business
app.get('/api/businesses/:id/offers', (req, res) => {
  const bizId = req.params.id;
  const list = getOffers().filter((o) => o.businessId === bizId);
  res.json(list);
});

// Admin Dashboard for Business Owner
app.get('/api/businesses/dashboard', (req, res) => {
  const userId = getAuthenticatedUserId(req);

  // Business belongs to user
  const bizList = getBusinesses().filter((b) => b.ownerId === userId);
  if (bizList.length === 0) {
    // If none owned, return helper setup
    res.json({ owned: false });
    return;
  }

  const myBiz = bizList[0];

  // Load reviews
  const bizReviews = getReviews().filter((r) => r.targetId === myBiz.id).map((r) => {
    const commenter = findUserById(r.userId);
    return {
      ...r,
      userName: commenter?.name || 'Annonymous Reviewer',
      userPhoto: commenter?.profilePhoto
    };
  });

  // Load orders
  const myOrders = getOrders().filter((o) => o.businessId === myBiz.id).map((o) => {
    const customer = findUserById(o.userId);
    return {
      ...o,
      customerName: customer?.name || 'Standard Client'
    };
  });

  // Load products list
  const myProducts = getProducts().filter((p) => p.businessId === myBiz.id);

  // Load active discount offers
  const myOffers = getOffers().filter((o) => o.businessId === myBiz.id);

  // Analytics count summary
  const followersCount = getFollows().filter(
    (f) => f.followingId === myBiz.id && f.targetType === 'business'
  ).length;

  const totalSales = myOrders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  res.json({
    owned: true,
    business: myBiz,
    products: myProducts,
    offers: myOffers,
    reviews: bizReviews,
    orders: myOrders,
    analytics: {
      followersCount,
      reviewsCount: bizReviews.length,
      ordersCount: myOrders.length,
      totalSales: Number(totalSales.toFixed(2))
    }
  });
});

// Upload Business Product
app.post('/api/businesses/products', (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const { businessId, name, description, price, category, stock, images } = req.body;

  if (!businessId || !name || !price) {
    res.status(400).json({ error: 'Business ID, product name and price are required' });
    return;
  }

  const biz = getBusinesses().find((b) => b.id === businessId && b.ownerId === userId);
  if (!biz) {
    res.status(403).json({ error: 'Unauthorized to add products for this business.' });
    return;
  }

  const newProd: Product = {
    id: `prod_${Date.now()}`,
    businessId,
    name,
    description: description || '',
    price: Number(price),
    category: category || 'General',
    stock: Number(stock) || 10,
    images: images || ['https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=300&h=300&fit=crop'],
    createdAt: new Date().toISOString()
  };

  getProducts().push(newProd);
  saveDB();
  res.status(201).json(newProd);
});

// Delete Business Product
app.delete('/api/businesses/products/:id', (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const prodId = req.params.id;

  const prodIdx = getProducts().findIndex((p) => p.id === prodId);
  if (prodIdx === -1) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  const prod = getProducts()[prodIdx];
  const myBiz = getBusinesses().find((b) => b.id === prod.businessId && b.ownerId === userId);

  if (!myBiz) {
    res.status(403).json({ error: 'Unauthorized product modification' });
    return;
  }

  getProducts().splice(prodIdx, 1);
  saveDB();
  res.json({ success: true });
});

// Update Business profile detail specs (banner, logo, phone, website, category)
app.put('/api/businesses/:id', (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const bizId = req.params.id;
  const { name, category, description, address, phone, email, website, coverImage, logo, themeVibe, tagline, instagramUrl, twitterUrl } = req.body;

  const biz = getBusinesses().find((b) => b.id === bizId && b.ownerId === userId);
  if (!biz) {
    res.status(403).json({ error: 'Unauthorized to modify this business, or business not found.' });
    return;
  }

  if (name) biz.name = name;
  if (category) biz.category = category;
  if (description !== undefined) biz.description = description;
  if (address) biz.address = address;
  if (phone) biz.phone = phone;
  if (email) biz.email = email;
  if (website !== undefined) biz.website = website;
  if (coverImage !== undefined) biz.coverImage = coverImage;
  if (logo !== undefined) biz.logo = logo;
  if (themeVibe !== undefined) (biz as any).themeVibe = themeVibe;
  if (tagline !== undefined) (biz as any).tagline = tagline;
  if (instagramUrl !== undefined) (biz as any).instagramUrl = instagramUrl;
  if (twitterUrl !== undefined) (biz as any).twitterUrl = twitterUrl;

  saveDB();
  res.json({ success: true, business: biz });
});

// Update Business Product (name, description, price, category, stock, images)
app.put('/api/businesses/products/:id', (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const prodId = req.params.id;
  const { name, description, price, category, stock, images } = req.body;

  const prod = getProducts().find((p) => p.id === prodId);
  if (!prod) {
    res.status(404).json({ error: 'Product not found.' });
    return;
  }

  const biz = getBusinesses().find((b) => b.id === prod.businessId && b.ownerId === userId);
  if (!biz) {
    res.status(403).json({ error: 'Unauthorized to modify products for this business.' });
    return;
  }

  if (name) prod.name = name;
  if (description !== undefined) prod.description = description;
  if (price !== undefined) prod.price = Number(price);
  if (category) prod.category = category;
  if (stock !== undefined) prod.stock = Number(stock);
  if (images !== undefined) prod.images = images;

  saveDB();
  res.json({ success: true, product: prod });
});

// Upload Business Offer Promotion code
app.post('/api/businesses/offers', (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const { businessId, title, description, discountPercent, promoCode, expiresAt } = req.body;

  const biz = getBusinesses().find((b) => b.id === businessId && b.ownerId === userId);
  if (!biz) {
    res.status(403).json({ error: 'Unauthorized modification' });
    return;
  }

  const newOffer: BusinessOffer = {
    id: `off_${Date.now()}`,
    businessId,
    title,
    description: description || '',
    discountPercent: Number(discountPercent) || 10,
    promoCode: promoCode || '',
    expiresAt: expiresAt || new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    createdAt: new Date().toISOString()
  };

  getOffers().push(newOffer);

  // Send update notification to followers
  getFollows()
    .filter((f) => f.followingId === businessId && f.targetType === 'business')
    .forEach((f) => {
      getNotifications().push({
        id: `notif_biz_up_${Date.now()}_${f.followerId}`,
        userId: f.followerId,
        senderId: userId,
        type: 'business_update',
        title: 'New Offer from ' + biz.name,
        message: `${title}: Enjoy ${discountPercent}% off! Code: ${promoCode || 'NONE'}`,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    });

  saveDB();
  res.status(201).json(newOffer);
});

// Get Reviews list of a business or product with submission of new reviews
app.get('/api/reviews/:targetId', (req, res) => {
  const reviewsList = getReviews()
    .filter((r) => r.targetId === req.params.targetId)
    .map((r) => {
      const u = findUserById(r.userId);
      return {
        ...r,
        userName: u?.name || 'Visitor',
        userPhoto: u?.profilePhoto
      };
    });

  res.json(reviewsList);
});

app.post('/api/reviews', (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const { targetId, rating, comment } = req.body;

  if (!targetId || !rating) {
    res.status(400).json({ error: 'Target ID and rating score required.' });
    return;
  }

  const commentsList = getReviews();
  const newReview: Review = {
    id: `rev_${Date.now()}`,
    targetId,
    userId,
    rating: Number(rating),
    comment: comment || '',
    createdAt: new Date().toISOString()
  };

  commentsList.push(newReview);
  saveDB();

  const u = findUserById(userId);
  res.json({
    ...newReview,
    userName: u?.name || 'Self User',
    userPhoto: u?.profilePhoto
  });
});


// 10. Marketplace Purchase & Orders checkout APIs
app.get('/api/marketplace/products', (req, res) => {
  const search = req.query.search ? String(req.query.search).toLowerCase() : '';
  const category = req.query.category ? String(req.query.category) : '';

  const results = getProducts()
    .map((p) => {
      const b = getBusinesses().find((biz) => biz.id === p.businessId);
      return {
        ...p,
        businessName: b?.name || 'Local merchant'
      };
    })
    .filter((p) => {
      if (category && p.category !== category) return false;
      if (search && !p.name.toLowerCase().includes(search) && !p.description.toLowerCase().includes(search)) return false;
      return true;
    });

  res.json(results);
});

app.post('/api/marketplace/checkout', (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const { items, address } = req.body; // items: Array of { productId, quantity }

  if (!items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'No items in checkouts' });
    return;
  }

  // Verify stock of all requested items first to avoid partial failures
  for (const item of items) {
    const p = getProducts().find((prod) => prod.id === item.productId);
    if (!p) {
      res.status(404).json({ error: `Product not found: ${item.productId}` });
      return;
    }
    const currentStock = typeof p.stock === 'number' ? p.stock : 10;
    if (currentStock < item.quantity) {
      res.status(400).json({ error: `Insufficient stock for "${p.name}". Only ${currentStock} left in stock.` });
      return;
    }
  }

  // Group items by business
  const businessOrders: { [bizId: string]: { prod: Product; qty: number }[] } = {};

  items.forEach((item) => {
    const p = getProducts().find((prod) => prod.id === item.productId);
    if (p) {
      if (!businessOrders[p.businessId]) {
        businessOrders[p.businessId] = [];
      }
      businessOrders[p.businessId].push({ prod: p, qty: item.quantity });
      
      // Decrement the physical stock inventory
      const currentStock = typeof p.stock === 'number' ? p.stock : 10;
      p.stock = currentStock - item.quantity;
    }
  });

  const createdOrders: Order[] = [];

  Object.keys(businessOrders).forEach((bizId) => {
    const orderItems = businessOrders[bizId].map((item) => ({
      productId: item.prod.id,
      quantity: item.qty,
      price: item.prod.price,
      productName: item.prod.name
    }));

    const totalAmount = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const biz = getBusinesses().find((b) => b.id === bizId);

    const newOrder: Order = {
      id: `ord_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      userId,
      businessId: bizId,
      items: orderItems,
      totalAmount: Number(totalAmount.toFixed(2)),
      status: 'pending',
      address: address || 'Current User Geolocation Location Address',
      createdAt: new Date().toISOString()
    };

    getOrders().push(newOrder);
    createdOrders.push(newOrder);

    // Business Owner notifications
    if (biz) {
      getNotifications().push({
        id: `notif_ord_${Date.now()}_${biz.id}`,
        userId: biz.ownerId,
        senderId: userId,
        type: 'business_update',
        title: 'New Checkout Order Received',
        message: `Order of $${newOrder.totalAmount} was placed at ${biz.name}. Inspect orders on dashboard.`,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }
  });

  saveDB();
  res.status(201).json({ success: true, orders: createdOrders });
});

// Retrieve customer orders
app.get('/api/marketplace/orders', (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const list = getOrders()
    .filter((o) => o.userId === userId)
    .map((o) => {
      const b = getBusinesses().find((biz) => biz.id === o.businessId);
      return {
        ...o,
        businessName: b?.name || 'Local boutique'
      };
    });

  res.json(list);
});

// Update business order status
app.put('/api/businesses/orders/:id', (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const orderId = req.params.id;
  const { status } = req.body; // 'processing' | 'shipped' | 'delivered' | 'cancelled'

  const ordersList = getOrders();
  const idx = ordersList.findIndex((o) => o.id === orderId);

  if (idx === -1) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  const order = ordersList[idx];
  const biz = getBusinesses().find((b) => b.id === order.businessId && b.ownerId === userId);

  if (!biz) {
    res.status(403).json({ error: 'No permissions on this order' });
    return;
  }

  order.status = status;

  // Send update notification to customer
  const shopOwner = findUserById(userId);
  getNotifications().push({
    id: `notif_ord_st_${Date.now()}`,
    userId: order.userId,
    senderId: userId,
    type: 'business_update',
    title: `Order status: ${status.toUpperCase()}`,
    message: `Your order for $${order.totalAmount} from ${biz.name} has been updated to ${status}.`,
    isRead: false,
    createdAt: new Date().toISOString()
  });

  saveDB();
  res.json({ success: true, order });
});


// 11. Notifications Dashboard API
app.get('/api/notifications', (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const list = getNotifications()
    .filter((n) => n.userId === userId)
    .map((n) => {
      const s = findUserById(n.senderId);
      return {
        ...n,
        senderName: s?.name || 'Community Member',
        senderPhoto: s?.profilePhoto
      };
    });

  // Sort by newly created
  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(list);
});

app.post('/api/notifications/read-all', (req, res) => {
  const userId = getAuthenticatedUserId(req);
  getNotifications()
    .filter((n) => n.userId === userId)
    .forEach((n) => {
      n.isRead = true;
    });

  saveDB();
  res.json({ success: true });
});


// 12. Super Admin Dashboard control routes
app.get('/api/admin/metrics', (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const admin = findUserById(userId);

  if (!admin || !admin.isAdmin) {
    res.status(403).json({ error: 'Requires admin rights' });
    return;
  }

  // Retrieve basic statistics metrics
  const activeUsers = getAllUsers().filter((u) => !u.isBanned).length;
  const bannedCount = getAllUsers().filter((u) => u.isBanned).length;
  const verifiedBiz = getBusinesses().filter((b) => b.isVerified).length;
  const unverifiedBiz = getBusinesses().filter((b) => !b.isVerified).length;
  const totalPosts = getPosts().length;
  const pendingReports = getReports().filter((r) => r.status === 'pending').length;

  res.json({
    metrics: {
      activeUsers,
      bannedCount,
      verifiedBiz,
      unverifiedBiz,
      totalPosts,
      pendingReports
    },
    users: getAllUsers().map((u) => ({ id: u.id, name: u.name, username: u.username, isBanned: !!u.isBanned, email: u.email })),
    businesses: getBusinesses().map((b) => ({ id: b.id, name: b.name, category: b.category, isVerified: !!b.isVerified })),
    reports: getReports().map((r) => {
      const reporter = findUserById(r.reporterId);
      return {
        ...r,
        reporterName: reporter?.name || 'Anonymous reporter'
      };
    })
  });
});

app.post('/api/admin/users/:id/ban', (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const admin = findUserById(userId);
  if (!admin || !admin.isAdmin) {
    res.status(403).json({ error: 'Requires admin rights' });
    return;
  }

  const targetId = req.params.id;
  const target = findUserById(targetId);

  if (!target) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  target.isBanned = !target.isBanned;
  saveDB();
  res.json({ success: true, banned: target.isBanned, user: target });
});

app.post('/api/admin/businesses/:id/verify', (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const admin = findUserById(userId);
  if (!admin || !admin.isAdmin) {
    res.status(403).json({ error: 'Requires admin rights' });
    return;
  }

  const targetId = req.params.id;
  const biz = getBusinesses().find((b) => b.id === targetId);

  if (!biz) {
    res.status(404).json({ error: 'Business not found' });
    return;
  }

  biz.isVerified = !biz.isVerified;
  saveDB();
  res.json({ success: true, verified: biz.isVerified, business: biz });
});

app.post('/api/admin/reports/:id/resolve', (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const admin = findUserById(userId);
  if (!admin || !admin.isAdmin) {
    res.status(403).json({ error: 'Requires admin rights' });
    return;
  }

  const reportId = req.params.id;
  const report = getReports().find((r) => r.id === reportId);

  if (!report) {
    res.status(404).json({ error: 'Report entry not found' });
    return;
  }

  report.status = 'resolved';
  saveDB();
  res.json({ success: true, report });
});


// Express static server asset pipeline
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server successfully booted on http://localhost:${PORT}`);
  });
}

startServer();
