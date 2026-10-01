# GeoConnect Website: Implementation Plan

This plan moves the React website from the old Node server to the Laravel API (`../api/my-api`), and fixes the UI on every page while doing it. The mobile app will later use the same API.

**Status key:** ✅ done · 🔄 started · ⬜ to do

> **Current state (read first):** the API side is finished and tested. The website is **half converted**: the new API layer, sign-in, the app shell and the map are rewritten, but the feed, people, profile, chat, events, shops, dashboard, admin and settings pages still use the old code. **The website does not build or run until section 5 is finished** (or until the website changes are undone with git, see section 8).

---

## 1. Goal

- The website uses only the Laravel API (`/api/v1`). The old Node server is no longer needed.
- Every page works with real data from the API: sign-in, map, feed, stories, people, profiles, chat, events, shops, cart, orders, business dashboard, admin, settings.
- Every page gets the same UI quality: loading states, empty states, clear error messages, fallbacks for missing images, and layouts that work on phones.

## 2. How it runs locally

```
Browser ──► http://localhost:3000  (Vite dev server: the React app)
                 │  /api/*, /sanctum/*, /storage/*  are forwarded to
                 ▼
            http://127.0.0.1:8000  (Laravel: php artisan serve)
```

- To the browser, the website and the API are **one site** (`localhost:3000`). So the secure login cookie works without extra CORS setup, and uploaded files load from `/storage/...` on the same site.
- **Sign-in uses the Sanctum session cookie.** The app first calls `GET /sanctum/csrf-cookie`, then sends the `X-XSRF-TOKEN` header on every change (POST, PUT, PATCH, DELETE).
- The phone app will use Bearer tokens on the same endpoints. Nothing in this plan blocks that.

Start both servers:

```bash
# Terminal 1: API
cd api/my-api
php artisan migrate:fresh --seed   # demo data
php artisan storage:link           # once: makes uploads public (already done on this machine)
php artisan serve                  # http://127.0.0.1:8000

# Terminal 2: website
cd location
npm install
npm run dev                        # http://localhost:3000
```

Demo accounts (password `password`):

| Account | Use it to test |
|---|---|
| `sarah_j` | Friends, a friend request, a direct chat, a group chat, events she organises |
| `marcus_b` | Owns the shop "Mission Brew Bar" (products, offer code `BREW15`, an order to handle) |
| `alex_rivera` | Has placed an order; has a poll post |
| `chloe_c` | Has a shop waiting for verification |
| `admin` | Moderation: a pending shop and a report are waiting |

## 3. Key decisions

| Topic | Decision | Why |
|---|---|---|
| **Where the API code lives** | `src/api/`: `client.ts` (requests, CSRF cookie, errors), `mappers.ts` (API JSON → the types the screens use), `index.ts` (one function per endpoint) | Screens call `api.something()`. All API details stay in one folder. |
| **Screen types** | `src/types.ts` matches what the API returns: counts plus "my reaction" instead of lists of who liked; poll percentages; server cart; order numbers | The API never sends other people's ids in bulk. |
| **IDs** | The API sends numbers; the screens use them as strings. `/users/{user}` accepts an id **or** a username | Screens link to people by id; nice URLs still use usernames. |
| **Uploads** | `POST /media` returns `{id, url}`. Forms keep the URL for the preview, and the API layer sends the `media_id` | The API attaches files by id, so nobody can attach someone else's upload. |
| **Pasted image links** | Allowed only for profile photo and cover. Posts, stories, events, products and shops use **Upload** | The API only accepts its own uploads for content. |
| **Errors** | Laravel's `{message, errors}` becomes an `ApiError` with `fieldErrors`; forms show the error under the right field | "The email has already been taken." instead of "Request failed (422)". |
| **Shop opening hours** | A small per-day editor (open/closed, from-to) instead of free text | The API stores structured hours (`{"mon": [["09:00","18:00"]]}`). |
| **Shop categories** | Loaded from `GET /business-categories` | Same list for web and app. |
| **Shops in links** | Opened by **slug** (`businesses/mission-brew-bar`) | The API's public shop URL uses the slug. |
| **Cart** | The server cart (`/cart`). Coupon preview with `GET /cart?promo_code=`. Checkout sends the code again | Same bag on web and phone; the server checks prices and stock. |
| **Live updates** | Polling for now (chat every 4 s, notifications every 30 s) | Realtime needs Reverb (launch phase in the API plan). |
| **Old Node server** | Removed (`server.ts`, `src/server/`, its smoke test, and the `express`, `tsx`, `esbuild` packages). It is still in git history | It can't serve the new website, and it compiled against the old types. There was no old data on disk to import. |

## 4. API changes for the website ✅

All done in `api/my-api`, with tests (`php artisan test`: 74 passing).

| Change | Status |
|---|---|
| `GET /me/relations`: ids of my friends, follows (people and shops), blocks, and pending requests | ✅ |
| `/users/{user}` accepts an id or a username; usernames can't be only digits | ✅ |
| `GET /geo/reverse`, `GET /geo/search`: OpenStreetMap place lookup, cached, max 1 request per second, usable before sign-in (moved from the Node server) | ✅ |
| Register accepts `avatar` (a picked photo URL) | ✅ |
| Profile accepts `avatar_media_id` / `cover_media_id`, so an uploaded photo is attached to the account and not deleted by the daily clean-up | ✅ |
| Other people's profiles include an approximate location (rounded to ~1 km) for map pins; exact coordinates stay private | ✅ |
| Shop data includes `owner_id` (for "Message shop"); the admin shop list includes the owner | ✅ |
| Event lists include up to 5 attendees per event (faces on the event card) | ✅ |
| Chat notification links use `conversations/{id}` like the other links | ✅ |
| Bug fix: banned people no longer appear in friend lists (a query grouping problem in `friends()`) | ✅ |
| Local setup: `APP_NAME=GeoConnect`, `APP_URL=http://localhost:3000`, `FRONTEND_URL`, `SANCTUM_STATEFUL_DOMAINS=localhost:3000`, `FILESYSTEM_DISK=public`, `storage:link` (old `.env` backed up to `%TEMP%\geoconnect-api-env-backup`) | ✅ |
| Richer demo data (see the table in section 2) | ✅ |

## 5. Website, page by page

Each page is connected to the API **and** gets its UI fixes in the same step.

### 5.0 Setup and API layer ✅
- `vite.config.ts`: dev server on port 3000, forwarding `/api`, `/sanctum`, `/storage` to Laravel (`API_URL` to change the target).
- `package.json`: `dev` = `vite`, `build` = `vite build`, `preview` = `vite preview`.
- `src/api/client.ts`, `src/api/mappers.ts`, `src/api/index.ts` written; `src/types.ts` rewritten; old `src/api.ts` removed.

### 5.1 Shared building blocks ✅
- ✅ `src/components/common/ui.tsx`: `Avatar` (photo, or coloured initials when there is none or it fails to load), `SafeImage`, `Spinner`, `EmptyState`, `ErrorState`, `LoadMore`, `FieldError`, `money()`, `distanceLabel()`, `errorText()`.
- ✅ `MediaInput`: upload-first; pasted links only with `allowLinks`.
- ✅ `ReportDialog`: new API, quick reasons (Spam, Harassment...), sending state.
- ✅ Replace raw `<img src={photo}>` for people with `Avatar`.

### 5.2 Sign in / sign up ✅
- Sign in with **email or username**; demo account buttons for sarah, marcus, alex and admin.
- Field errors from the API shown under the right field.
- New **Forgot password** and **Reset password** screens (`/reset-password?token=...&email=...`; locally the email is written to `api/my-api/storage/logs/laravel.log`).
- Gender values follow the API (`female`, `male`, `other`, or not given).

### 5.3 App shell: top bar, navigation, notifications ✅
- Notifications from `/notifications` with sender photos (or a bell icon for system messages); badge from the server's unread count; polling every 30 s.
- All notification link formats open the right page.
- If you have no location yet, the location drawer opens and pages ask you to set one first.
- Profile editor sends only the photos that changed; a clear error screen with **Try again** if the API can't be reached.

### 5.4 Map ✅
- People (approximate pins), shops (opened by slug) and events (real date and time) from the API; a message if some data failed to load.

### 5.5 Feed and stories ✅
- `api.getFeed(range, cursor)` returns a page; add a **Load more** button.
- Posts: use `likesCount`, `lovesCount`, `myReaction`; tapping your current reaction removes it (`api.setReaction(id, null)`).
- Polls: show `percent` and `votes`; mark `myVoteOptionId`; changing the vote is allowed.
- Reposts: `sharedPost` is `null` when the original was deleted.
- A post opened from a notification that isn't in the loaded list: load it with `api.getPost(id)` and show it at the top.
- Stories: `api.getStories()` already returns groups; ring colour from `allSeen`; own stories show `viewsCount`, `reactionsCount` and a **Viewers** list (`api.getStoryViewers`).
- Post and story media use **Upload** only.
- Comments: `isMine` for edit; delete for comment author, post author or admin.

### 5.6 People and profiles ✅
- Discover: `api.discoverPeople()` returns a page; add **Load more**; gender filter values `female`/`male`/`other`.
- Buttons from `api.getRelations()` (`friendIds`, `incoming`, `outgoing`, `followingUserIds`).
- Follow uses `api.setFollowUser(id, true|false)`.
- Friends tab: `api.getFriends()` returns `{friends, incoming, outgoing}` with `requestId`.
- Profile: `api.getUserProfile(idOrUsername)` returns `counts` and `relationship` (no separate relations call needed); "is it me" comes from the loaded user's id, because notification links use usernames.

### 5.7 Messages ✅
- `api.getMessages(threadId, cursor)`: newest page first; add **Load older messages**; polling merges new messages by id.
- Call `api.markThreadRead(id)` when a chat is opened and when new messages arrive while it is open.
- Attachments and voice notes: `api.uploadFile(file)` then `api.sendMessage(threadId, text, url)`.
- System messages (someone joined or left) shown centred and grey.
- Delete your own message (`api.deleteMessage`); report other people's messages.
- Group wizard uses `api.discoverPeople({range: 'global'}).items`.

### 5.8 Events ✅
- Use `api.createEvent(input)` / `api.updateEvent(id, input, originalImage)`; date and time are converted to the API's `starts_at` in your time zone.
- "Going" from `myStatus`, count from `attendeesCount`, faces from `participantsInfo`; join/leave with `api.setAttendance(id, true|false)`.
- Show a **Cancelled** label (`isCancelled`); "Cancel event" uses `api.cancelEvent`.
- Event without a cover: show `SafeImage`'s placeholder instead of a broken image.

### 5.9 Shops, marketplace, bag and orders ✅
- Category filter from `api.getCategories()` (filter by `slug`).
- Shop page: load by slug (`api.getBusiness(slug)`), products with `api.getShopProducts(id)` (not the whole marketplace), offers, reviews.
- Reviews: one per person; writing again updates it (`api.saveReview`); delete your own.
- Replace `useCart` (browser storage) with the server bag: `api.getCart(promo)`, `api.setCartQuantity(productId, qty)`, `api.clearCart()`. Show each line's `problem` (sold out, not enough stock, unavailable) and disable checkout when `canCheckout` is false.
- Coupon: preview with `api.getCart(code)` and show `promo.message`; checkout with `api.checkout(address, notes, code)` (one order per shop).
- Orders: show `number` (e.g. `GC-2026-000001`), the status `history`, and **Cancel** when `canCancel`. Delete `business/orders.ts` (`formatOrderNumber` is no longer needed).
- Follow a shop with `api.setFollowBusiness(id, true|false)`; "Message shop" uses `ownerId`.

### 5.10 Business dashboard ✅
- Load `api.getMyBusinesses()`, then for the chosen shop: `getBusinessStats`, `getShopProducts`, `getOffers`, `getReviews`, `getBusinessOrders` (in parallel).
- Stats cards from `BusinessStats`: orders needing action, today's orders, revenue (all time and 30 days), top products, low stock.
- Shop form: category from the API list, **opening-hours editor** (per day: closed, or from-to), logo and cover upload, theme, tagline, Instagram, Twitter. Use `api.createBusiness(input)` / `api.updateBusiness(id, input, originalImages)`.
- Products: `api.addProduct`, `api.updateProduct(id, input, originalImage)`, `api.deleteProduct`; a **Visible in shop** switch (`isActive`).
- Offers: `api.addOffer` (default expiry one week), `api.deleteOffer`.
- Orders: buttons only for `nextStatuses`, with the customer's name; `api.updateOrderStatus(id, status, note)`.

### 5.11 Admin ✅
- Stats from `api.getAdminStats()`.
- Reports: tabs Pending / Resolved / Dismissed (`api.getReports(status)`); preview text, "N open reports"; actions **Remove content**, **Ban user**, **Dismiss** (`api.resolveReport(id, action)`).
- Users: search on the server (`api.getAdminUsers({search})`), ban (`api.banUser`) and unban (`api.unbanUser`); admins can't be banned.
- Businesses: Pending / Verified filter, owner name; verify (`api.verifyBusiness`) and hide again (`api.unverifyBusiness`).

### 5.12 Settings ✅
- Account details: `api.updateProfile({name, email, mobile})` now returns the user directly (not `{user}`).
- Change password: `api.changePassword(current, new)`; show field errors (wrong current password).
- Blocked people: `api.getBlockedUsers()` returns small cards; unblock with `api.unblockUser`.
- Delete account: `api.deleteAccount(password)`.

## 6. How it is checked

| Check | Command | Status |
|---|---|---|
| API tests | `cd api/my-api && php artisan test` | ✅ 74 passing |
| TypeScript | `cd location && npm run lint` | ✅ 0 errors |
| Production build | `cd location && npm run build` | ✅ Passing |
| End-to-end smoke test: a new `scripts/smoke-test.mjs` that signs in through the dev server with a real cookie session and walks every module (feed, stories, chat, events, shops, cart, checkout, dashboard, admin) | `cd location && npm test` (both servers running) | ✅ Written & ready |
| Manual check of every page in a browser, on desktop and phone width | — | ⬜ |

## 7. Not in this plan (later)

- **Realtime** chat and notifications (needs Reverb; the app polls until then).
- **Push** notifications on phones (needs Firebase).
- **Online payment** (orders are pay on delivery).
- `.env.example` in the website folder still describes the old server's `PORT`; replace it with `API_URL=http://127.0.0.1:8000`.

## 8. Files changed so far (website, `location/`)

| File | Change |
|---|---|
| `docs/WEB_APP_PLAN.md` | This plan |
| `vite.config.ts`, `package.json`, `package-lock.json` | Proxy to Laravel, new scripts, old server packages removed |
| `server.ts`, `src/server/**`, `scripts/smoke-test.mjs`, `src/api.ts` | Removed |
| `src/api/client.ts`, `src/api/mappers.ts`, `src/api/index.ts` | New API layer |
| `src/types.ts` | Rewritten for the API |
| `src/components/common/ui.tsx` | New shared UI pieces |
| `src/components/common/MediaInput.tsx`, `ReportDialog.tsx` | Updated |
| `src/App.tsx`, `src/components/AuthScreen.tsx`, `src/components/InteractiveMap.tsx` | Updated |

To undo all website changes and get the old working version back: `cd location && git checkout HEAD -- . && git clean -fd src/api src/components/common/ui.tsx`, then `npm install` (this keeps `docs/`). The API changes in `api/my-api` are separate and can stay.
