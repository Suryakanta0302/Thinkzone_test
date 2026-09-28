# School Visit Log

React + MUI web app and Express/Mongoose API for recording school visits. Visits are saved to IndexedDB before sync, so pending work survives a browser restart. The server stores the visit's `captureMode` (`online` or `offline`) along with its India-time year/month and school location snapshot.

## Setup

Requirements: Node.js 18+, npm, Git, and MongoDB 6+ running locally.

1. Put the supplied `schools.json` at `server/data/schools.json`.
2. In `server`, copy `.env.example` to `.env`. Set `MONGODB_URI` to `mongodb://127.0.0.1:27017/visit_log` and `CLIENT_ORIGIN` to the app origin.
3. From `server`, run `npm install`, `npm run import:schools`, and `npm run seed`.
4. Start the API with `npm start` (port 4000 by default).
5. In `app`, copy `.env.example` to `.env`, set `VITE_API_URL` to `http://localhost:4000/api`, then run `npm install` and `npm run dev`.
6. Open `http://localhost:5173`. For another device on the LAN, use the laptop's LAN IP in `VITE_API_URL` and allow the app origin in the server's comma-separated `CLIENT_ORIGIN`.

The app includes a generated service worker and loads additional school/visit pages as the list is scrolled.

## Offline And Sync

The app keeps the selected user in local storage. IndexedDB stores the questionnaire, schools already loaded, and every visit with its answers, `clientId`, capture mode, local sync status, and any failure reason. Every visit is queued before an immediate send attempt. On reconnect or app reopen, pending visits are retried with the same `clientId`; MongoDB's unique index makes retries idempotent. Validation (4xx) failures become `Failed`; network and server (5xx) failures remain `Pending`. Only accepted visits are stored in MongoDB, where `captureMode` tells whether the visit was captured online or offline.

On a real phone, service workers require HTTPS for a LAN-hosted web app; localhost is treated as secure by browsers. Use an HTTPS development origin for full offline app-shell support on a separate device.

## API

- `GET /api/schools` - filtered, paginated school list with only `udiseCode`, `schoolName`, `clusterName`, and `blockName`; the web app requests `includeLocationCodes=true` to cache location codes for offline filters.
- `GET /api/questionnaires/current` - questionnaire for the current India month.
- `POST /api/visits` - validate and save a visit; duplicate `clientId` returns the existing record.
- `GET /api/visits` - paginated visits for a user.
- `GET /api/reports/block-summary` - MongoDB aggregation for block and district totals.
- `GET /health` - server health check.

## Indexes

- Schools: unique `udiseCode` prevents duplicate school records; `districtCode`, `blockCode`, and `clusterCode` support filters; their compound index supports combined location filters; `schoolName` supports name lookup.
- Questionnaires: unique `{ year, month }` identifies a single questionnaire per month.
- Demo users: unique `userId` enforces the supplied user IDs.
- Visits: unique `clientId` enforces idempotent sync; `{ userId, visitedAt }` supports newest-first user history; `{ districtCode, year, month, blockCode, udiseCode, userId }` supports monthly report aggregation.

## Checks And Hand-In

Run `npm test` in both `server` and `app`. To verify API behavior against a disposable database, set `MONGODB_URI` to a database ending in `_test` and run `npm run verify:api` from `server`; the script drops only that test database.

The supplied school dataset is stored at `server/data/schools.json` and imported into `visit_log.schools`. A verified MongoDB dump is at `dump/visit_log.archive.gz` (about 2.1 MB); it contains the current local demo data. Recreate it after further visits with `mongodump --db visit_log --gzip --archive=../dump/visit_log.archive.gz` from `server`.