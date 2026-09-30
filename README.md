# GeoConnect

A location-based social network and local business directory: a live map of what's nearby, a feed of posts and stories, people discovery and friends, chat (including group chats and voice notes), local events, and shops with a small marketplace.

## Run locally

**Prerequisites:** Node.js 20 or newer

1. Install dependencies: `npm install`
2. Start the development server: `npm run dev`
3. Open http://localhost:3000

Demo accounts are created automatically on first start. They all use the password `password` (for example `sarah_j` and the administrator `admin`), and the sign-in page has one-click buttons for them.

## Production build

```
npm run build
npm start
```

## Tests

`npm test` starts the server on port 3999 with a temporary data folder and runs an end-to-end API check (sign-in, validation, posts, chat, events, shops, orders, moderation, uploads).

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | Port the server listens on |
| `DATA_DIR` | `./data` | Where the database file and uploads are stored |

## Data

Everything is stored in `data/geoconnect_db.json` plus uploaded files in `data/uploads/`, both created on first start. Delete the `data` folder to reset the app to fresh demo data.

The JSON file is rewritten on every change. That is fine for a demo or a small group, but for real traffic the storage layer (`src/server/db.ts`) should be moved to a database such as SQLite or PostgreSQL.

## Security notes

- Passwords are hashed with scrypt; sessions are random tokens (only their SHA-256 is stored) that expire after 30 days.
- Repeated wrong passwords lock that username for 15 minutes.
- All input is validated on the server; uploads are limited to photos, videos and audio up to 8 MB.
- Place search and GPS-to-city lookups use OpenStreetMap Nominatim (throttled to 1 request per second and cached, as its usage policy requires). Map tiles come from OpenStreetMap.

## Project layout

| Path | What it is |
|---|---|
| `server.ts` | Express app: security headers, sign-in check, routes, uploads, error handling |
| `src/server/routes/` | One file per API area (auth, users, posts, stories, messaging, events, businesses, marketplace, notifications, admin, geo, uploads) |
| `src/server/db.ts` | JSON-file storage and demo data seeding |
| `src/server/auth.ts`, `http.ts` | Password/session helpers; validation and shared route helpers |
| `src/api.ts` | Browser API client |
| `src/App.tsx` | App shell: header, navigation, notifications |
| `src/components/` | One component per page, plus `business/` (shop pages) and `common/` (shared inputs) |
| `scripts/smoke-test.mjs` | End-to-end API test (`npm test`) |
