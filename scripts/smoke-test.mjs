/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// End-to-end smoke test for GeoConnect website API proxy and modules.
// Walks through authentication, relations, feed, stories, people, chat,
// events, shops, cart, business dashboard, and admin moderation.
//
// Usage:
//   node scripts/smoke-test.mjs [url]
//   e.g. node scripts/smoke-test.mjs http://localhost:3000
//   or TARGET_URL=http://127.0.0.1:8000 node scripts/smoke-test.mjs

const target = process.argv[2] || process.env.TARGET_URL || process.env.APP_URL || 'http://localhost:3000';
const BASE = target.replace(/\/+$/, '');

class CookieJarClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.cookies = new Map();
  }

  getCookie(name) {
    return this.cookies.get(name);
  }

  setFromHeaders(headers) {
    const raw = typeof headers.getSetCookie === 'function' ? headers.getSetCookie() : [headers.get('set-cookie')].filter(Boolean);
    for (const cookieStr of raw) {
      if (!cookieStr) continue;
      const parts = cookieStr.split(';');
      const [nameVal] = parts;
      const idx = nameVal.indexOf('=');
      if (idx !== -1) {
        const name = nameVal.slice(0, idx).trim();
        const val = nameVal.slice(idx + 1).trim();
        this.cookies.set(name, val);
      }
    }
  }

  getCookieHeader() {
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  async fetch(urlPath, options = {}) {
    const fullUrl = urlPath.startsWith('http') ? urlPath : `${this.baseUrl}${urlPath}`;
    const headers = { ...(options.headers || {}) };

    const cookieHeader = this.getCookieHeader();
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    const xsrf = this.getCookie('XSRF-TOKEN');
    if (xsrf) {
      headers['X-XSRF-TOKEN'] = decodeURIComponent(xsrf);
    }

    headers['Accept'] = 'application/json';
    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }

    const res = await fetch(fullUrl, {
      ...options,
      headers
    });

    this.setFromHeaders(res.headers);
    let data = null;
    const text = await res.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    return { status: res.status, headers: res.headers, data };
  }
}

let passed = 0;
let failed = 0;

function check(label, condition, extra = '') {
  if (condition) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.error(`  ✗ ${label}${extra ? ` (${extra})` : ''}`);
  }
}

async function run() {
  console.log(`\nStarting GeoConnect smoke test targeting: ${BASE}\n`);

  const client = new CookieJarClient(BASE);

  // 1. Connectivity & CSRF
  console.log('1. Health & Sanctum CSRF');
  try {
    const csrf = await client.fetch('/sanctum/csrf-cookie');
    check('sanctum csrf cookie retrieved', csrf.status === 204 || csrf.status === 200);
    check('xsrf token cookie present', !!client.getCookie('XSRF-TOKEN'));
  } catch (err) {
    console.error(`\nFailed to connect to ${BASE}. Ensure server is running.\n`, err.message);
    process.exit(1);
  }

  // 2. Auth as sarah_j
  console.log('\n2. Authentication (sarah_j)');
  const loginRes = await client.fetch('/api/v1/auth/login', {
    method: 'POST',
    body: { login: 'sarah_j', password: 'password' }
  });
  check('sign in as sarah_j succeeds', loginRes.status === 200, `status ${loginRes.status}`);
  const meRes = await client.fetch('/api/v1/auth/me');
  check('auth/me returns user object', meRes.status === 200 && meRes.data?.data?.username === 'sarah_j');

  // Relations
  const relsRes = await client.fetch('/api/v1/me/relations');
  check('me/relations returns friendship lists', relsRes.status === 200 && Array.isArray(relsRes.data?.data?.friend_ids));

  // 3. Feed & Stories
  console.log('\n3. Feed, Posts & Stories');
  const feedRes = await client.fetch('/api/v1/posts?range=global');
  check('global feed returns items', feedRes.status === 200 && Array.isArray(feedRes.data?.data));

  // Create post
  const newPost = await client.fetch('/api/v1/posts', {
    method: 'POST',
    body: { type: 'text', content: 'Automated smoke test post: Hello GeoConnect!' }
  });
  check('create text post', newPost.status === 201 && newPost.data?.data?.id);
  const postId = newPost.data?.data?.id;

  if (postId) {
    // Reaction
    const reactRes = await client.fetch(`/api/v1/posts/${postId}/reactions`, {
      method: 'POST',
      body: { type: 'love' }
    });
    check('react to post with love', reactRes.status === 200);

    // Comment
    const commentRes = await client.fetch(`/api/v1/posts/${postId}/comments`, {
      method: 'POST',
      body: { content: 'Smoke test automated comment' }
    });
    check('add comment to post', commentRes.status === 201 && commentRes.data?.data?.id);

    // Delete post
    const delPost = await client.fetch(`/api/v1/posts/${postId}`, { method: 'DELETE' });
    check('delete own post', delPost.status === 200 || delPost.status === 204);
  }

  // Stories
  const storiesRes = await client.fetch('/api/v1/stories');
  check('get active stories', storiesRes.status === 200 && Array.isArray(storiesRes.data?.data));

  // 4. People & Profiles
  console.log('\n4. People & Profiles');
  const peopleRes = await client.fetch('/api/v1/people?range=global');
  check('discover people returns list', peopleRes.status === 200 && Array.isArray(peopleRes.data?.data));

  const userProfile = await client.fetch('/api/v1/users/marcus_b');
  check('get user profile by username (marcus_b)', userProfile.status === 200 && userProfile.data?.data?.username === 'marcus_b');

  const friendsRes = await client.fetch('/api/v1/friends');
  check('get friends list', friendsRes.status === 200 && Array.isArray(friendsRes.data?.data?.friends));

  // 5. Messages / Chat
  console.log('\n5. Messaging');
  const convosRes = await client.fetch('/api/v1/conversations');
  check('list conversations', convosRes.status === 200 && Array.isArray(convosRes.data?.data));

  // 6. Events
  console.log('\n6. Events');
  const eventsRes = await client.fetch('/api/v1/events?range=global');
  check('list events', eventsRes.status === 200 && Array.isArray(eventsRes.data?.data));

  // 7. Shops, Marketplace & Cart
  console.log('\n7. Businesses, Marketplace & Cart');
  const catsRes = await client.fetch('/api/v1/business-categories');
  check('business categories loaded', catsRes.status === 200 && Array.isArray(catsRes.data?.data));

  const shopsRes = await client.fetch('/api/v1/businesses?range=global');
  check('shops list loaded', shopsRes.status === 200 && Array.isArray(shopsRes.data?.data));

  const shopSlug = 'mission-brew-bar';
  const brewShop = await client.fetch(`/api/v1/businesses/${shopSlug}`);
  check('get shop by slug (mission-brew-bar)', brewShop.status === 200 && brewShop.data?.data?.slug === shopSlug);

  const shopId = brewShop.data?.data?.id;
  if (shopId) {
    const shopProds = await client.fetch(`/api/v1/businesses/${shopId}/products`);
    check('get products of shop', shopProds.status === 200 && Array.isArray(shopProds.data?.data));
  }

  const cartRes = await client.fetch('/api/v1/cart');
  check('get server cart', cartRes.status === 200 && Array.isArray(cartRes.data?.data?.items));

  // Test coupon preview
  const promoRes = await client.fetch('/api/v1/cart?promo_code=BREW15');
  check('cart preview with promo code', promoRes.status === 200);

  // 8. Business Dashboard (as marcus_b)
  console.log('\n8. Business Dashboard (marcus_b)');
  const marcusClient = new CookieJarClient(BASE);
  await marcusClient.fetch('/sanctum/csrf-cookie');
  await marcusClient.fetch('/api/v1/auth/login', {
    method: 'POST',
    body: { login: 'marcus_b', password: 'password' }
  });

  const myShops = await marcusClient.fetch('/api/v1/my-businesses');
  check('marcus_b has businesses', myShops.status === 200 && Array.isArray(myShops.data?.data) && myShops.data.data.length > 0);

  const ownedShopId = myShops.data?.data?.[0]?.id;
  if (ownedShopId) {
    const statsRes = await marcusClient.fetch(`/api/v1/businesses/${ownedShopId}/stats`);
    check('business dashboard stats loaded', statsRes.status === 200 && typeof statsRes.data?.data?.revenue_cents !== 'undefined');

    const ordersRes = await marcusClient.fetch(`/api/v1/businesses/${ownedShopId}/orders`);
    check('business dashboard orders loaded', ordersRes.status === 200 && Array.isArray(ordersRes.data?.data));
  }

  // 9. Admin Panel (as admin)
  console.log('\n9. Admin Panel (admin)');
  const adminClient = new CookieJarClient(BASE);
  await adminClient.fetch('/sanctum/csrf-cookie');
  const adminLogin = await adminClient.fetch('/api/v1/auth/login', {
    method: 'POST',
    body: { login: 'admin', password: 'password' }
  });
  check('admin signs in', adminLogin.status === 200);

  const adminStats = await adminClient.fetch('/api/v1/admin/stats');
  check('admin stats loaded', adminStats.status === 200 && typeof adminStats.data?.data?.total_users !== 'undefined');

  const adminReports = await adminClient.fetch('/api/v1/admin/reports?status=pending');
  check('admin reports loaded', adminReports.status === 200 && Array.isArray(adminReports.data?.data));

  const adminUsers = await adminClient.fetch('/api/v1/admin/users');
  check('admin users loaded', adminUsers.status === 200 && Array.isArray(adminUsers.data?.data));

  const adminBusinesses = await adminClient.fetch('/api/v1/admin/businesses');
  check('admin businesses loaded', adminBusinesses.status === 200 && Array.isArray(adminBusinesses.data?.data));

  const logoutRes = await adminClient.fetch('/api/v1/auth/logout', { method: 'POST' });
  check('admin logout', logoutRes.status === 200 || logoutRes.status === 204);

  // Summary
  console.log(`\n========================================`);
  console.log(`Smoke test completed: ${passed} passed, ${failed} failed.`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('\nSmoke test encountered an unexpected error:\n', err);
  process.exit(1);
});
