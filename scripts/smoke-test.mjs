// End-to-end API smoke test. Starts the real server on a spare port with a throwaway data folder,
// exercises auth, validation and the main features, then shuts everything down.
// Usage: npm test
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const PORT = 3999;
const BASE = `http://localhost:${PORT}`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'geoconnect-test-'));

let passed = 0;
let failed = 0;
function check(label, condition, detail = '') {
  if (condition) passed++;
  else failed++;
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${label}${detail ? `  -> ${detail}` : ''}`);
}

async function call(pathname, { method = 'GET', body, token } = {}) {
  const res = await fetch(BASE + pathname, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await res.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data, text };
}

const login = async (username, password = 'password') => (await call('/api/auth/login', { method: 'POST', body: { username, password } })).data;

let counter = 0;
async function registerUser(extra = {}) {
  counter++;
  const res = await call('/api/auth/register', {
    method: 'POST',
    body: {
      name: `Tester ${counter}`,
      username: `tester_${Date.now() % 100000}_${counter}`,
      email: `tester${Date.now()}_${counter}@example.com`,
      password: 'secret-pass-1',
      latitude: 37.7749,
      longitude: -122.4194,
      city: 'San Francisco',
      state: 'California',
      ...extra
    }
  });
  return res.data;
}

async function run() {
  // ---------- Authentication ----------
  check('unauthenticated request is rejected', (await call('/api/users/me')).status === 401);
  const spoof = await fetch(`${BASE}/api/users/me`, { headers: { 'x-session-userid': 'admin_1' } });
  check('old user-id header no longer logs you in', spoof.status === 401);

  check('wrong password is rejected', (await call('/api/auth/login', { method: 'POST', body: { username: 'sarah_j', password: 'nope' } })).status === 401);
  const sarah = await login('sarah_j');
  check('demo account signs in with its password', !!sarah?.token && sarah.user.username === 'sarah_j');
  const admin = await login('admin');
  check('admin signs in and is an admin', admin?.user?.isAdmin === true);

  const badUser = await call('/api/auth/register', { method: 'POST', body: { name: 'X', username: 'a b', email: 'x@y.z', password: 'longenough' } });
  check('invalid username rejected', badUser.status === 400, badUser.data?.error);
  const shortPw = await call('/api/auth/register', { method: 'POST', body: { name: 'X', username: 'valid_name', email: 'x@y.zz', password: 'short' } });
  check('short password rejected', shortPw.status === 400, shortPw.data?.error);
  const dupe = await call('/api/auth/register', { method: 'POST', body: { name: 'X', username: 'SARAH_J', email: 'n@e.w', password: 'longenough' } });
  check('duplicate username rejected (case-insensitive)', dupe.status === 400);

  const alice = await registerUser({ mobile: '+1555', dob: '1990-05-05' });
  check('register returns user + token', !!alice?.token && !!alice.user?.id);
  const me = await call('/api/users/me', { token: alice.token });
  check('session works after register', me.status === 200 && me.data.id === alice.user.id);
  check('mobile + dob saved', me.data.mobile === '+1555' && me.data.dob === '1990-05-05');
  check('no password data in responses', !/password/i.test(me.text) && !/password/i.test(JSON.stringify(alice)));

  // Brute force lock-out
  const victim = await registerUser();
  let last;
  for (let i = 0; i < 6; i++) last = await call('/api/auth/login', { method: 'POST', body: { username: victim.user.username, password: 'wrong' } });
  check('repeated wrong passwords get locked out', last.status === 429, last.data?.error);

  // Change password
  const bob = await registerUser();
  const wrongCurrent = await call('/api/auth/password', { method: 'PUT', token: bob.token, body: { currentPassword: 'x', newPassword: 'another-pass-2' } });
  check('change password needs the current password', wrongCurrent.status === 400);
  const changed = await call('/api/auth/password', { method: 'PUT', token: bob.token, body: { currentPassword: 'secret-pass-1', newPassword: 'another-pass-2' } });
  check('change password works', changed.status === 200);
  check('old password stops working', (await call('/api/auth/login', { method: 'POST', body: { username: bob.user.username, password: 'secret-pass-1' } })).status === 401);
  check('new password works', !!(await login(bob.user.username, 'another-pass-2'))?.token);

  // Logout
  const temp = await registerUser();
  await call('/api/auth/logout', { method: 'POST', token: temp.token });
  check('logout invalidates the token', (await call('/api/users/me', { token: temp.token })).status === 401);

  // ---------- Profile & privacy ----------
  const prof = await call('/api/users/profile', { method: 'PUT', token: alice.token, body: { bio: 'hi', interests: ['coffee'] } });
  check('profile update keeps name', prof.data?.user?.name === alice.user.name);
  check('profile validation (bio too long)', (await call('/api/users/profile', { method: 'PUT', token: alice.token, body: { bio: 'x'.repeat(600) } })).status === 400);
  const discover = await call('/api/users/discover?range=global', { token: alice.token });
  check('discover hides other people’s email/phone', discover.data.length > 0 && discover.data.every((u) => !('email' in u) && !('mobile' in u)));
  const sarahProfile = await call(`/api/users/${sarah.user.id}`, { token: alice.token });
  check('public profile loads', sarahProfile.status === 200 && !('email' in sarahProfile.data.user));

  // ---------- Friends & blocking ----------
  const fr = await call('/api/users/friend-request', { method: 'POST', token: alice.token, body: { receiverId: bob.user.id } });
  const bobToken = (await login(bob.user.username, 'another-pass-2')).token;
  const friendsBob = await call('/api/users/friends', { token: bobToken });
  check('incoming friend request listed', friendsBob.data.incoming.some((i) => i.user.id === alice.user.id));
  await call('/api/users/friend-respond', { method: 'POST', token: bobToken, body: { requestId: fr.data.request.id, respond: 'accepted' } });
  check('accepted friend appears in friends list', (await call('/api/users/friends', { token: alice.token })).data.friends.some((f) => f.id === bob.user.id));
  await call(`/api/users/friends/${bob.user.id}`, { method: 'DELETE', token: alice.token });
  check('unfriend removes friendship', !(await call('/api/users/friends', { token: alice.token })).data.friends.some((f) => f.id === bob.user.id));

  await call('/api/users/block', { method: 'POST', token: alice.token, body: { blockedId: bob.user.id } });
  const discoverAfterBlock = await call('/api/users/discover?range=global', { token: alice.token });
  check('blocked user hidden from discover', !discoverAfterBlock.data.some((u) => u.id === bob.user.id));
  check('blocked user cannot start a chat', (await call('/api/messaging/start', { method: 'POST', token: bobToken, body: { recipientId: alice.user.id } })).status === 400);
  check('blocked list shows them', (await call('/api/users/blocked', { token: alice.token })).data.some((u) => u.id === bob.user.id));
  await call('/api/users/unblock', { method: 'POST', token: alice.token, body: { blockedId: bob.user.id } });
  check('unblock works', (await call('/api/messaging/start', { method: 'POST', token: bobToken, body: { recipientId: alice.user.id } })).status === 200);

  // ---------- Posts & comments ----------
  const post = await call('/api/posts', { method: 'POST', token: alice.token, body: { type: 'text', content: 'Hello neighbours' } });
  check('create post', post.status === 201);
  check('empty post rejected', (await call('/api/posts', { method: 'POST', token: alice.token, body: { type: 'text', content: '' } })).status === 400);
  check('poll needs 2 options', (await call('/api/posts', { method: 'POST', token: alice.token, body: { type: 'poll', content: 'Q?', pollOptions: ['a'] } })).status === 400);
  check('javascript: media link rejected', (await call('/api/posts', { method: 'POST', token: alice.token, body: { type: 'image', content: 'x', mediaUrls: ['javascript:alert(1)'] } })).status === 400);
  check('others cannot edit my post', (await call(`/api/posts/${post.data.id}`, { method: 'PUT', token: bobToken, body: { content: 'hacked' } })).status === 403);
  const edited = await call(`/api/posts/${post.data.id}`, { method: 'PUT', token: alice.token, body: { content: 'Hello neighbours (edited)' } });
  check('owner can edit post', edited.data?.content === 'Hello neighbours (edited)' && !!edited.data.editedAt);
  const c1 = await call(`/api/posts/${post.data.id}/comments`, { method: 'POST', token: bobToken, body: { content: 'Hi!' } });
  const reply = await call(`/api/posts/${post.data.id}/comments`, { method: 'POST', token: alice.token, body: { content: 'Hey', parentId: c1.data.id } });
  check('reply attaches to parent comment', reply.data?.parentId === c1.data.id);
  const feed = await call('/api/posts/feed?range=global', { token: alice.token });
  check('feed includes comment count', feed.data.find((p) => p.id === post.data.id)?.commentCount === 2);
  check('invalid reaction rejected', (await call(`/api/posts/${post.data.id}/react`, { method: 'POST', token: bobToken, body: { reaction: 'hate' } })).status === 400);
  await call(`/api/comments/${c1.data.id}`, { method: 'DELETE', token: alice.token });
  check('post owner can delete a comment (and its replies)', (await call(`/api/posts/${post.data.id}/comments`, { token: alice.token })).data.length === 0);
  await call(`/api/posts/${post.data.id}`, { method: 'DELETE', token: alice.token });
  check('owner can delete post', !(await call('/api/posts/feed?range=global', { token: alice.token })).data.some((p) => p.id === post.data.id));

  // ---------- Stories ----------
  const story = await call('/api/stories', { method: 'POST', token: alice.token, body: { mediaUrl: 'https://example.com/a.jpg', mediaType: 'image' } });
  const react = await call(`/api/stories/${story.data.id}/react`, { method: 'POST', token: bobToken, body: { reaction: '🔥' } });
  check('story reaction saved', react.data?.story?.reactions?.length === 1);

  // ---------- Chat ----------
  const thread = await call('/api/messaging/start', { method: 'POST', token: bobToken, body: { recipientId: alice.user.id } });
  for (const text of ['one', 'two', 'three']) {
    await call(`/api/messaging/threads/${encodeURIComponent(thread.data.id)}/messages`, { method: 'POST', token: bobToken, body: { content: text } });
  }
  const aliceNotifs = await call('/api/notifications', { token: alice.token });
  const chatNotifs = aliceNotifs.data.filter((n) => n.link === `chat:${thread.data.id}`);
  check('one notification per conversation, not per message', chatNotifs.length === 1, chatNotifs[0]?.message);
  await call(`/api/messaging/threads/${encodeURIComponent(thread.data.id)}/messages`, { token: alice.token });
  check('opening the chat marks its notification read', (await call('/api/notifications', { token: alice.token })).data.find((n) => n.id === chatNotifs[0].id)?.isRead === true);
  await call(`/api/notifications/${chatNotifs[0].id}`, { method: 'DELETE', token: alice.token });
  check('dismissed notification stays gone', !(await call('/api/notifications', { token: alice.token })).data.some((n) => n.id === chatNotifs[0].id));
  const group = await call('/api/messaging/group', { method: 'POST', token: alice.token, body: { name: 'Block party', memberIds: [bob.user.id] } });
  check('group chat lists members', group.data?.members?.length === 2);
  await call(`/api/messaging/threads/${group.data.id}/leave`, { method: 'POST', token: bobToken });
  check('leaving a group removes you', !(await call('/api/messaging/threads', { token: bobToken })).data.some((t) => t.id === group.data.id));

  // ---------- Events ----------
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const pastEvent = await call('/api/events', { method: 'POST', token: alice.token, body: { name: 'Old', description: 'd', locationName: 'Park', date: '2020-01-01', time: '10:00' } });
  check('events in the past are rejected', pastEvent.status === 400);
  const ev = await call('/api/events', { method: 'POST', token: alice.token, body: { name: 'Picnic', description: 'Bring food', locationName: 'Park', date: tomorrow, time: '12:00', latitude: 37.78, longitude: -122.42 } });
  check('create event with picked location', ev.status === 201 && ev.data.latitude === 37.78);
  check('organizer cannot leave own event', (await call(`/api/events/${ev.data.id}/join`, { method: 'POST', token: alice.token })).status === 400);
  const joined = await call(`/api/events/${ev.data.id}/join`, { method: 'POST', token: bobToken });
  check('joining shows attendees', joined.data?.event?.participantsInfo?.length === 2);
  check('others cannot edit event', (await call(`/api/events/${ev.data.id}`, { method: 'PUT', token: bobToken, body: { name: 'x' } })).status === 403);
  await call(`/api/events/${ev.data.id}`, { method: 'PUT', token: alice.token, body: { name: 'Big Picnic' } });
  await call(`/api/events/${ev.data.id}`, { method: 'DELETE', token: alice.token });
  check('organizer can delete event', !(await call('/api/events?range=global', { token: alice.token })).data.some((e) => e.id === ev.data.id));

  // ---------- Businesses ----------
  const shop = await call('/api/businesses', { method: 'POST', token: alice.token, body: { name: 'Alice Bakes', category: 'Cafe', address: '1 Main St', phone: '555', email: 'shop@alice.com', openingHours: 'Daily 8-18' } });
  check('register business (unverified)', shop.status === 201 && shop.data.isVerified === false);
  check('bad category rejected', (await call('/api/businesses', { method: 'POST', token: alice.token, body: { name: 'X', category: 'Casino', address: 'a', phone: '1', email: 'a@b.cd' } })).status === 400);
  const bobSees = await call('/api/businesses?range=global', { token: bobToken });
  check('unverified shop hidden from others', !bobSees.data.some((b) => b.id === shop.data.id));
  const shop2 = await call('/api/businesses', { method: 'POST', token: alice.token, body: { name: 'Alice Books', category: 'Local Vendor', address: '2 Main St', phone: '556', email: 'books@alice.com' } });
  const dash = await call(`/api/businesses/dashboard?businessId=${shop2.data.id}`, { token: alice.token });
  check('owner can have several businesses', dash.data.businesses?.length === 2 && dash.data.business.id === shop2.data.id);
  check('negative stock rejected', (await call('/api/businesses/products', { method: 'POST', token: alice.token, body: { businessId: shop.data.id, name: 'Bun', price: 3, stock: -5 } })).status === 400);
  const product = await call('/api/businesses/products', { method: 'POST', token: alice.token, body: { businessId: shop.data.id, name: 'Bun', price: 3, stock: 5 } });
  check('product stock saved', product.data?.stock === 5);
  check('offer discount over 100% rejected', (await call('/api/businesses/offers', { method: 'POST', token: alice.token, body: { businessId: shop.data.id, title: 'Deal', discountPercent: 150 } })).status === 400);
  const offer = await call('/api/businesses/offers', { method: 'POST', token: alice.token, body: { businessId: shop.data.id, title: 'Deal', discountPercent: 15, promoCode: 'BUNS15', expiresOn: tomorrow } });
  check('offer with expiry date', offer.status === 201 && offer.data.expiresAt.startsWith(tomorrow));
  check('promo code must be unique', (await call('/api/businesses/offers', { method: 'POST', token: alice.token, body: { businessId: shop2.data.id, title: 'Copy', discountPercent: 10, promoCode: 'BUNS15' } })).status === 400);

  // Verify so others can buy
  check('admin cannot ban themselves', (await call(`/api/admin/users/${admin.user.id}/ban`, { method: 'POST', token: admin.token })).status === 400);
  await call(`/api/admin/businesses/${shop.data.id}/verify`, { method: 'POST', token: admin.token });
  check('verified shop visible', (await call('/api/businesses?range=global', { token: bobToken })).data.some((b) => b.id === shop.data.id));

  // ---------- Checkout & orders ----------
  check('negative quantity rejected', (await call('/api/marketplace/checkout', { method: 'POST', token: bobToken, body: { items: [{ productId: product.data.id, quantity: -3 }], address: '9 Elm Street' } })).status === 400);
  check('missing address rejected', (await call('/api/marketplace/checkout', { method: 'POST', token: bobToken, body: { items: [{ productId: product.data.id, quantity: 1 }], address: '' } })).status === 400);
  check('cannot buy from own shop', (await call('/api/marketplace/checkout', { method: 'POST', token: alice.token, body: { items: [{ productId: product.data.id, quantity: 1 }], address: '9 Elm Street' } })).status === 400);
  const order = await call('/api/marketplace/checkout', { method: 'POST', token: bobToken, body: { items: [{ productId: product.data.id, quantity: 2 }], address: '9 Elm Street', promoCode: 'buns15' } });
  check('shop promo applied by server', order.data?.orders?.[0]?.totalAmount === 5.1, `paid ${order.data?.orders?.[0]?.totalAmount}`);
  const stockAfter = (await call('/api/businesses/dashboard?businessId=' + shop.data.id, { token: alice.token })).data.products[0].stock;
  check('stock reduced', stockAfter === 3);
  const dashOrders = (await call('/api/businesses/dashboard?businessId=' + shop.data.id, { token: alice.token })).data.orders;
  check('shop sees delivery address', dashOrders[0]?.address === '9 Elm Street');
  await call(`/api/marketplace/orders/${order.data.orders[0].id}/cancel`, { method: 'POST', token: bobToken });
  check('customer cancel restores stock', (await call('/api/businesses/dashboard?businessId=' + shop.data.id, { token: alice.token })).data.products[0].stock === 5);
  check('cancelled order cannot be changed', (await call(`/api/businesses/orders/${order.data.orders[0].id}`, { method: 'PUT', token: alice.token, body: { status: 'shipped' } })).status === 400);
  const order2 = await call('/api/marketplace/checkout', { method: 'POST', token: bobToken, body: { items: [{ productId: product.data.id, quantity: 1 }], address: '9 Elm Street' } });
  check('invalid order status rejected', (await call(`/api/businesses/orders/${order2.data.orders[0].id}`, { method: 'PUT', token: alice.token, body: { status: 'teleported' } })).status === 400);
  await call(`/api/businesses/orders/${order2.data.orders[0].id}`, { method: 'PUT', token: alice.token, body: { status: 'cancelled' } });
  check('shop cancel restores stock', (await call('/api/businesses/dashboard?businessId=' + shop.data.id, { token: alice.token })).data.products[0].stock === 5);
  check('customer cannot cancel after shipping', await (async () => {
    const o = await call('/api/marketplace/checkout', { method: 'POST', token: bobToken, body: { items: [{ productId: product.data.id, quantity: 1 }], address: '9 Elm Street' } });
    await call(`/api/businesses/orders/${o.data.orders[0].id}`, { method: 'PUT', token: alice.token, body: { status: 'shipped' } });
    return (await call(`/api/marketplace/orders/${o.data.orders[0].id}/cancel`, { method: 'POST', token: bobToken })).status === 400;
  })());

  // ---------- Reviews ----------
  check('rating must be 1-5', (await call('/api/reviews', { method: 'POST', token: bobToken, body: { targetId: shop.data.id, rating: 6, comment: 'x' } })).status === 400);
  check('cannot review own business', (await call('/api/reviews', { method: 'POST', token: alice.token, body: { targetId: shop.data.id, rating: 5, comment: 'x' } })).status === 400);
  await call('/api/reviews', { method: 'POST', token: bobToken, body: { targetId: shop.data.id, rating: 4, comment: 'Nice' } });
  await call('/api/reviews', { method: 'POST', token: bobToken, body: { targetId: shop.data.id, rating: 2, comment: 'Changed my mind' } });
  const reviews = await call(`/api/reviews/${shop.data.id}`, { token: bobToken });
  check('second review updates the first', reviews.data.length === 1 && reviews.data[0].rating === 2);

  // ---------- Marketplace distance ----------
  const near = await call('/api/marketplace/products?range=5', { token: bobToken });
  const far = await call('/api/marketplace/products?range=global', { token: bobToken });
  check('marketplace respects distance', near.data.every((p) => p.distanceKm <= 5) && far.data.length >= near.data.length);

  // ---------- Reports & moderation ----------
  const badPost = await call('/api/posts', { method: 'POST', token: bobToken, body: { type: 'text', content: 'spam spam spam' } });
  const rep = await call('/api/reports', { method: 'POST', token: alice.token, body: { targetId: badPost.data.id, targetType: 'post', reason: 'Spam' } });
  const metrics = await call('/api/admin/metrics', { token: admin.token });
  check('admin sees what was reported', metrics.data.reports.find((r) => r.id === rep.data.report.id)?.targetPreview === 'spam spam spam');
  check('non-admin blocked from admin API', (await call('/api/admin/metrics', { token: alice.token })).status === 403);
  await call(`/api/admin/reports/${rep.data.report.id}/remove-content`, { method: 'POST', token: admin.token });
  check('admin removed reported post', !(await call('/api/posts/feed?range=global', { token: alice.token })).data.some((p) => p.id === badPost.data.id));

  // Ban revokes sessions
  await call(`/api/admin/users/${bob.user.id}/ban`, { method: 'POST', token: admin.token });
  check('banned user is signed out', (await call('/api/users/me', { token: bobToken })).status === 401);
  check('banned user cannot sign in', (await call('/api/auth/login', { method: 'POST', body: { username: bob.user.username, password: 'another-pass-2' } })).status === 403);

  // ---------- Uploads ----------
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  const up = await call('/api/uploads', { method: 'POST', token: alice.token, body: { dataUrl: png } });
  check('image upload works', up.status === 201 && up.data.url.startsWith('/uploads/'));
  const served = await fetch(BASE + up.data.url);
  check('uploaded file is served', served.status === 200 && served.headers.get('content-type') === 'image/png');
  const svg = `data:image/svg+xml;base64,${Buffer.from('<svg onload="alert(1)"/>').toString('base64')}`;
  check('SVG uploads rejected', (await call('/api/uploads', { method: 'POST', token: alice.token, body: { dataUrl: svg } })).status === 400);

  // ---------- Location & demo neighbourhoods ----------
  const london = await call('/api/auth/location', { method: 'POST', token: alice.token, body: { latitude: 51.5074, longitude: -0.1278, city: 'London', state: 'England' } });
  check('location update returns the user', london.data?.user?.location?.city === 'London');
  check('invalid coordinates rejected', (await call('/api/auth/location', { method: 'POST', token: alice.token, body: { latitude: 200, longitude: 0 } })).status === 400);
  check('new city gets demo shops', (await call('/api/businesses?range=25', { token: alice.token })).data.length > 0);

  // ---------- Delete account ----------
  const doomed = await registerUser();
  check('delete account needs password', (await call('/api/users/me', { method: 'DELETE', token: doomed.token, body: { password: 'x' } })).status === 400);
  await call('/api/users/me', { method: 'DELETE', token: doomed.token, body: { password: 'secret-pass-1' } });
  check('deleted account is gone', (await call('/api/auth/login', { method: 'POST', body: { username: doomed.user.username, password: 'secret-pass-1' } })).status === 401);
}

// ---------- Harness ----------
const server = spawn(process.execPath, ['--import', 'tsx', 'server.ts'], {
  env: { ...process.env, PORT: String(PORT), DATA_DIR: dataDir, NODE_ENV: 'production' },
  stdio: ['ignore', 'pipe', 'pipe']
});
let log = '';
server.stdout.on('data', (d) => (log += d));
server.stderr.on('data', (d) => (log += d));

async function waitForServer() {
  for (let i = 0; i < 120; i++) {
    try {
      await fetch(`${BASE}/api/users/me`);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error(`Server did not start:\n${log}`);
}

try {
  await waitForServer();
  await run();
} catch (err) {
  failed++;
  console.error(err);
} finally {
  server.kill();
  fs.rmSync(dataDir, { recursive: true, force: true });
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exitCode = failed ? 1 : 0;
}
