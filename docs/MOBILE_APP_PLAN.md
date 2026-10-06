# GeoConnect Mobile App: Implementation Plan

A native iOS and Android app that connects to the existing Laravel API (`api/my-api`, base URL `/api/v1`). It uses the same endpoints as the website and does not need any new backend work, apart from the few items in section 9.

> Assumption: "app" means a mobile app. If you meant something else (a desktop app, or an extension of the existing website), tell me and I will adjust the plan.

---

## 1. Decisions

| Topic | Choice | Why |
|---|---|---|
| Framework | **React Native + Expo (SDK latest) + TypeScript** | The website is already React + TypeScript, so types, API client and mappers (`src/api/*`, `src/types.ts`) can be reused. One codebase for iOS and Android. |
| Navigation | Expo Router (file-based) | Deep links and tabs with little setup. |
| Server data | TanStack Query | Caching, pagination, retry, optimistic updates for likes and votes. |
| Local state | Zustand | Small. Used for session, theme and the draft cart. |
| Forms | React Hook Form + Zod | Same rules as the API validation. |
| Token storage | `expo-secure-store` | The Sanctum bearer token must not sit in plain storage. |
| Maps | `react-native-maps` (Google on Android, Apple on iOS) | Replaces Leaflet from the website. |
| Location | `expo-location` | Foreground location for "nearby"; background is not needed. |
| Media | `expo-image-picker`, `expo-image-manipulator`, `expo-av`, `expo-video` | Pick, resize, record voice notes, play video. |
| Push | `expo-notifications` + FCM / APNs | Fills the existing `device_tokens` table. |
| Realtime chat | Laravel Reverb via `laravel-echo` + `pusher-js` | The API already broadcasts message events. |
| Styling | NativeWind (Tailwind) | Same design language as the website. |
| Builds | EAS Build + EAS Update | Cloud builds and over-the-air fixes. |

---

## 2. Project layout

```
mobile/
  app/                      # Expo Router screens
    (auth)/                 # login, register, forgot-password, reset-password
    (tabs)/
      index.tsx             # Feed + stories
      map.tsx               # Nearby map
      people.tsx            # Discover, friends, requests
      chat/                 # conversations list + thread
      shop/                 # marketplace, cart, orders
    profile/[username].tsx
    post/[id].tsx
    events/                 # list, detail, create
    business/               # list, detail [slug], create, dashboard
    settings/
    admin/                  # visible only when role = admin
  src/
    api/                    # client.ts (fetch wrapper), one file per module
    hooks/                  # useFeed, useConversations, ...
    store/                  # session, theme
    components/             # shared UI (Avatar, PostCard, Toast, EmptyState)
    types/                  # copied from API resources
    utils/                  # time, geo, format
```

---

## 3. API client rules

These follow from how the Laravel API behaves (see `routes/api.php`).

1. **Base URL** from `EXPO_PUBLIC_API_URL` (`http://10.0.2.2:8000/api/v1` for the Android emulator, your LAN IP for a real phone, production URL for release builds).
2. **Headers**: `Accept: application/json`, `Content-Type: application/json`, and `Authorization: Bearer <token>` when signed in.
3. **Success** responses are `{"data": ...}`. Unwrap once in the client. Lists are paginated, so use infinite queries (cursor or page, whichever each endpoint returns).
4. **Errors** are `{"message": "...", "errors": {...}}`:
   - `422` -> show field errors under the inputs.
   - `401` -> clear the token and go to login.
   - `403` -> show "not allowed"; a banned account (`EnsureUserIsActive`) should sign the user out with a clear message.
   - `429` -> read `Retry-After` and show a countdown. Limits exist on auth, geo, uploads (media and checkout) and reports.
   - Network failure -> offline banner, queued retry for safe GET requests.
5. **Uploads** go through `POST /media` first. Take the returned media id and send it when creating a post, story, message or product. Unattached files are deleted after 24 hours, so create the post soon after the upload.
6. **Device**: send a clear device name when logging in so the "Devices" screen (`GET /auth/devices`) is readable.

---

## 4. Screens mapped to API endpoints

### Phase A: Foundation and auth
| Screen | Endpoints |
|---|---|
| Register (with place search) | `POST auth/register`, `GET geo/search`, `GET geo/reverse` |
| Login | `POST auth/login` |
| Forgot / reset password | `POST auth/forgot-password`, `POST auth/reset-password` |
| Session restore, logout | `GET me`, `POST auth/logout` |
| Devices, change password | `GET auth/devices`, `DELETE auth/devices/{id}`, `PUT auth/password` |

### Phase B: Account and people
| Screen | Endpoints |
|---|---|
| My profile, edit | `GET me`, `PATCH me`, `GET me/relations` |
| Update location (on app open, then every few minutes while foreground) | `PUT me/location` |
| Delete account | `DELETE me` |
| Discover people | `GET users` |
| Public profile + actions | `GET users/{username}`, `POST/DELETE users/{u}/follow`, `.../block` |
| Friends | `GET me/friends`, `GET me/friend-requests`, `POST users/{u}/friend-request`, `POST friend-requests/{id}/accept`, `.../decline`, `DELETE users/{u}/friendship` |
| Blocked users | `GET me/blocks` |

### Phase C: Feed, media, stories
| Screen | Endpoints |
|---|---|
| Feed | `GET feed`, `GET users/{u}/posts` |
| Compose (text, image, video, poll) | `POST media`, `POST posts` |
| Post detail, edit, delete | `GET/PATCH/DELETE posts/{id}` |
| Like / love | `PUT/DELETE posts/{id}/reaction` |
| Poll vote | `PUT posts/{id}/vote` |
| Comments and replies | `GET/POST posts/{id}/comments`, `PATCH/DELETE comments/{id}` |
| Stories bar, viewer, create | `GET stories`, `POST stories`, `POST stories/{id}/view`, `PUT stories/{id}/reaction`, `GET stories/{id}/viewers`, `DELETE stories/{id}` |

### Phase D: Map
| Screen | Endpoints |
|---|---|
| Nearby map (people, events, businesses as pins; radius filter) | `GET users`, `GET events`, `GET businesses` using the user's latitude and longitude |

### Phase E: Chat
| Screen | Endpoints |
|---|---|
| Conversation list (unread badge from `last_read_message_id`) | `GET conversations` |
| Start direct / group chat | `POST conversations/direct`, `POST conversations/group` |
| Thread (text, image, video, voice note) | `GET conversations/{id}/messages`, `POST conversations/{id}/messages`, `POST media` |
| Read, mute, leave | `POST .../read`, `PUT/DELETE .../mute`, `POST .../leave` |
| Group members | `POST .../members`, `DELETE .../members/{user}` |
| Delete message | `DELETE messages/{id}` |
| Live updates | Reverb channel for the conversation (fall back to polling every 10 seconds if the socket drops) |

### Phase F: Events
| Screen | Endpoints |
|---|---|
| Events nearby, detail | `GET events`, `GET events/{id}` |
| Create, edit, cancel | `POST events`, `PATCH events/{id}`, `DELETE events/{id}` |
| Going / interested | `PUT/DELETE events/{id}/attendance`, `GET events/{id}/attendees` |

### Phase G: Businesses and shop
| Screen | Endpoints |
|---|---|
| Directory, detail by slug | `GET business-categories`, `GET businesses`, `GET businesses/{slug}` |
| Register / edit my business | `POST businesses`, `PATCH businesses/{id}`, `GET me/businesses` |
| Follow a business | `POST/DELETE businesses/{id}/follow` |
| Catalog (owner) | `GET/POST businesses/{id}/products`, `PATCH/DELETE products/{id}` |
| Offers | `GET/POST businesses/{id}/offers`, `DELETE offers/{id}` |
| Reviews | `GET businesses/{id}/reviews`, `PUT businesses/{id}/reviews`, `DELETE businesses/{id}/reviews/mine` |
| Marketplace | `GET products` |
| Cart | `GET cart`, `PUT cart/items/{product}`, `DELETE cart/items/{id}`, `DELETE cart` |
| Checkout (with promo code) | `POST checkout` |
| My orders | `GET orders`, `GET orders/{id}`, `POST orders/{id}/cancel` |
| Shop owner orders and dashboard | `GET businesses/{id}/orders`, `GET businesses/{id}/dashboard`, `PATCH orders/{id}/status` |

### Phase H: Notifications, safety, admin
| Screen | Endpoints |
|---|---|
| Notification list, unread badge | `GET notifications`, `GET notifications/unread-count`, `POST notifications/{id}/read`, `POST notifications/read-all`, `DELETE notifications/{id}` |
| Push registration (on login and when the token changes) | `POST me/device-tokens`, `GET me/device-tokens`, `DELETE me/device-tokens/{id}` |
| Report content (post, comment, story, user, business, product, message) | `POST reports` |
| Admin (role = admin only) | `GET admin/stats`, `GET admin/reports`, `POST admin/reports/{id}/resolve`, `GET admin/users`, `POST/DELETE admin/users/{id}/ban`, `GET admin/businesses`, `POST/DELETE admin/businesses/{id}/verify` |

---

## 5. Build order and timeline

Estimates are for one developer.

| Phase | Work | Time |
|---|---|---|
| 0 | Expo project, navigation shell, theme, API client, secure token store, CI lint + typecheck | 3 days |
| A | Auth screens and session handling | 4 days |
| B | Profile, location updates, people, friends, follows, blocks | 6 days |
| C | Feed, compose, media upload, comments, polls, stories | 10 days |
| D | Nearby map | 3 days |
| E | Chat with realtime, voice notes | 8 days |
| F | Events | 3 days |
| G | Businesses, shop, cart, checkout, orders, owner dashboard | 10 days |
| H | Notifications, push, reports, admin | 5 days |
| 12 | Polish, accessibility, offline states, tests, store assets | 7 days |
| 13 | Beta (TestFlight and Play internal track), fixes, release | 7 days |

About 66 working days (roughly 13 weeks). Phases D, F and H can run in parallel with a second developer.

---

## 6. Cross-cutting requirements

- **Permissions**: ask for location only when the user opens the map or signs up, with a short reason. Ask for camera, photos and microphone only at the moment they are needed. Handle "denied" with a manual place search (`GET geo/search`).
- **Security**: token in SecureStore only; no secrets in the app bundle; HTTPS only in release; certificate pinning is optional for later.
- **Offline**: cache the last feed page, profile and conversation list. Show a banner when offline. Block writes with a clear message instead of failing silently.
- **Performance**: `FlashList` for the feed and chat, thumbnails sized for the screen, images resized to about 1600 px before upload, video limited by the API's size rules.
- **Accessibility**: labels on icon buttons, dynamic font sizes, contrast checked in light and dark mode.
- **Privacy**: precise location is sent only to the API, never to analytics. Provide the account deletion screen (`DELETE me`), which both stores require.
- **Moderation**: every post, comment, story, message and profile has a Report action, and blocking is reachable from any profile (store requirement for user-generated content).
- **Analytics and crashes**: Sentry for crashes; optional privacy-friendly analytics for screen views.

---

## 7. Testing

| Level | Tool | What |
|---|---|---|
| Unit | Jest | Mappers, formatters, geo helpers, form schemas |
| Component | React Native Testing Library | Post card, composer, cart, auth forms |
| API contract | MSW against the types copied from the API | Each module's success and error shapes (422, 401, 429) |
| End to end | Maestro | Register -> post -> comment -> chat -> checkout -> order |
| Manual | Real devices | Android 9+ and iOS 16+, slow network, airplane mode, denied permissions |

The backend already has 65 feature tests (`php artisan test`), so the app tests only need to cover the client side.

---

## 8. Release checklist

1. Production API on HTTPS with MySQL, queue worker, scheduler (story and upload cleanup), Reverb, and file storage on S3 (backend Phase 11).
2. FCM key and APNs key configured in the backend; push is currently written to the log only.
3. App icons, splash screen, screenshots, privacy policy URL, support URL.
4. Apple: App Privacy answers (location, photos, user content), account deletion in app, report and block features.
5. Google: Data safety form, target the current API level.
6. EAS production build, TestFlight and Play internal testing for at least one week, then staged rollout (10%, 50%, 100%).
7. Version the API: when `/api/v2` is introduced, keep v1 alive until old app versions fall below a few percent.

---

## 9. Backend items to confirm before or during the build

| Item | Why the app needs it |
|---|---|
| CORS is not needed for native apps, but the `Authorization` header and `Accept: application/json` must be accepted | Already part of the API contract |
| Real push delivery (FCM) | Currently only logged |
| Reverb installed and reachable from phones (wss) | Live chat |
| Image resizing and thumbnails on upload | Faster feed on mobile data (listed as not done in the API plan) |
| Pagination style per list endpoint documented (page vs cursor) | The app's infinite lists depend on it |
| OpenAPI / Postman export of all routes | Lets the app generate types instead of copying them by hand |

---

## 10. First week, concretely

1. `npx create-expo-app mobile -t expo-template-blank-typescript`, add Expo Router, NativeWind, TanStack Query, Zustand, SecureStore.
2. Copy `src/types.ts` and the useful parts of `src/api/client.ts` and `mappers.ts` from the website; swap `localStorage` for SecureStore.
3. Build the login and register screens against a locally running API (`php artisan serve --host=0.0.0.0`).
4. Add the tab shell with empty screens for every phase so navigation is settled early.
5. Set up EAS and produce a first internal build, so the release pipeline is proven before features pile up.
