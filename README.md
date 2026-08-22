# FilmMetrics

A Manifest V3 Chrome Extension that lets filmmakers understand how viewers
watch their videos on **YouTube** and **Google Drive** — passive viewing
behaviour (play/pause/seek/speed/volume/fullscreen/completion) plus
timestamped viewer feedback (emoji reactions and comments).

Stack: React + TypeScript + Vite + `@crxjs/vite-plugin`, Chrome popup,
background service worker, content script, `chrome.storage.local`, and (as
of Week 4) **Supabase/PostgreSQL** for cloud persistence.

## 1. What Supabase does here

The extension is **offline-first**: everything you see working in Weeks 1–3
(video detection, event tracking, the floating feedback widget) keeps
working with zero network access, because `chrome.storage.local` is always
the primary store while a viewer is watching.

Supabase is added purely as a **cloud copy** of that local data, for later
analytics (Week 5) and AI insight work (Week 6). Nothing in the tracking or
feedback path depends on Supabase being reachable.

```
Video
  ↓
Content Script (videoTracker.ts / youtubeTracker.ts / driveTracker.ts)
  ↓
Background Service Worker (background.ts)
  ↓
chrome.storage.local            <-- always written first, always authoritative
  ↓ (manual "Upload Session" click, or best-effort auto-sync on session end)
Supabase (@supabase/supabase-js, anon key)
  ↓
PostgreSQL
```

## 2. Database architecture

```
movies
   │
   └── sessions
          │
          ├── events
          ├── feedback
          └── survey
```

| Table      | Purpose                                                                 |
| ---------- | ------------------------------------------------------------------------ |
| `movies`   | One row per distinct video URL (`youtube` or `google_drive`).            |
| `sessions` | One row per local viewing session that gets uploaded.                    |
| `events`   | Passive playback events for a session (play, pause, seek, rewind, speed_change, fullscreen, volume_change, progress, complete). |
| `feedback` | Emoji reactions and text comments, each tied to a session + timestamp.   |
| `survey`   | Reserved for a future post-viewing survey. Not wired into any UI yet.    |

Relationships: a movie has many sessions; a session has many events, many
feedback items, and (in the future) survey responses. Full DDL — tables,
foreign keys, `CHECK` constraints, indexes, and Row Level Security policies
— lives in [`supabase/schema.sql`](supabase/schema.sql).

## 3. Environment variables

Copy `.env.example` to `.env` and fill in your project's values:

```
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...   (or the legacy anon JWT)
```

`.env` is git-ignored (see `.gitignore`). **Never** put the Supabase
secret/service-role key (prefixed `sb_secret_...`, or labelled
"service_role") into any `VITE_*` variable — Vite inlines every `VITE_*`
value directly into the built extension bundle, so it would ship inside
`dist/` and be extractable by anyone who installs the extension.

If `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` are missing, cloud
sync simply stays disabled (`src/lib/supabase.ts` exports `supabase = null`)
and the popup shows "Cloud sync not configured" — tracking and feedback are
unaffected.

## 4. Creating the Supabase project & schema

1. Create a project at [supabase.com](https://supabase.com).
2. Project Settings → API → copy the **Project URL** and the **Publishable
   (anon)** key into `.env` as shown above.
3. Open the SQL Editor → New query, paste the entire contents of
   [`supabase/schema.sql`](supabase/schema.sql), and run it. This creates all
   five tables, foreign keys, constraints, indexes, enables Row Level
   Security, and adds the anon policies described below.

## 5. Running the extension

```bash
npm install
npm run dev      # local dev build with HMR
npm run build    # production build -> dist/
```

Load it in Chrome: `chrome://extensions` → enable **Developer mode** → **Load
unpacked** → select the `dist/` folder. Reload the extension after every
`npm run build`.

## 6. How offline storage works

- Every play/pause/seek/rewind/speed/volume/fullscreen/completion event and
  every emoji/comment is written to `chrome.storage.local` immediately,
  synchronously with the user action — this is unconditional and has no
  dependency on network state.
- The popup and the floating widget always read from local storage /
  `chrome.storage.local` first.
- Cloud upload is an **additional**, best-effort step layered on top:
  clicking "Upload Session" (or the automatic sync attempt when a tracked
  page unloads) reads the already-stored local session and pushes it to
  Supabase. If there is no network, or Supabase is unreachable, the local
  session is simply marked `syncStatus: "failed"` with an error message —
  no local data is ever deleted or blocked on the network call succeeding.

## 7. How duplicate uploads are prevented

- **Sessions**: `sessions.session_id` (the Chrome-extension-generated id,
  e.g. `session_1699999999999`) is `UNIQUE` in Postgres. Uploading looks the
  session up by `session_id` first (`findOrCreateSession`); if it already
  exists, that row is reused instead of inserting a new one — clicking
  "Upload Session" twice in a row never creates a second cloud session.
- **Movies**: matched by `movies.video_url` (also `UNIQUE`) the same way.
- **Events**: the local session stores `uploadedEventCount`, a cursor into
  its `events` array. Re-uploading only sends events *after* that cursor.
- **Feedback**: each local `FeedbackItem` gets `synced: true` once uploaded.
  Re-uploading only sends feedback items that aren't marked synced yet.
- **Retries**: a failed sync sets `syncStatus: "failed"` and increments
  `syncAttempts`. The best-effort *automatic* sync (on session end) stops
  retrying after 3 consecutive failures; the manual "Upload Session" /
  "Try Again" button in the popup is always available regardless.

See `src/services/supabase/uploadSession.ts` for the full upload flow:
find-or-create movie → find-or-create session → upload only new events
(batched in a single insert) → upload only new feedback (batched) → mark
local session synced.

## 8. Security considerations

- The extension only ever uses the Supabase **publishable/anon** key
  (`VITE_SUPABASE_PUBLISHABLE_KEY`), read in `src/lib/supabase.ts`. The
  secret/service-role key is never referenced anywhere in `src/`,
  `manifest.ts`, or any committed file.
- Row Level Security is **enabled** on all five tables (see
  `supabase/schema.sql`); it is not disabled to "make things work". The anon
  role is granted only `SELECT`/`INSERT` on all tables, plus `UPDATE` on
  `sessions` (to set `ended_at`/`duration`/`uploaded_at` after upload). No
  `DELETE` policy is granted to anon anywhere.
- **Documented limitation (MVP only)**: the extension has no per-user
  authentication yet, so the anon policies are not scoped to "rows I own" —
  anyone holding the publishable key can read or insert rows for any
  movie/session. This is acceptable for a small internal MVP but should be
  revisited (e.g. Supabase Auth + `auth.uid()`-scoped policies) before wider
  distribution.

## 9. Testing cloud synchronization

**YouTube**
1. Open a YouTube video, open the FilmMetrics popup to confirm "Video
   active" and a session id appear.
2. Play, pause, seek forward, seek backward (rewind), change speed, change
   volume, go fullscreen, and let it play past a few completion checkpoints.
3. Use the floating widget to add an emoji reaction and a text comment.
4. In DevTools → Application → Storage → `chrome.storage.local`, confirm
   `filmmetrics-sessions` has your session with events, and
   `filmmetrics-feedback` has your feedback items.
5. In the popup, click **Upload Session**. Confirm it shows "✓ Session
   synced" with non-zero events/feedback counts uploaded.
6. In the Supabase Table Editor, confirm rows exist in `movies`, `sessions`,
   `events`, `feedback` for this session. Refresh the page and confirm the
   rows persist.
7. Click **Upload Session** again — confirm no second row appears in
   `sessions` for the same `session_id` (duplicate protection).
8. Disable your network connection, keep watching / add more feedback —
   confirm the popup and floating widget keep working normally and new
   events keep appearing in `chrome.storage.local`.
9. Re-enable the network and click **Upload Session** (or "Try Again") —
   confirm the newly-collected events/feedback since the last successful
   sync are uploaded.

**Google Drive**

Repeat the same steps on a Google Drive video preview page
(`https://drive.google.com/...`). This requires the `drive.google.com` host
permission and content script match added to `manifest.ts` in Week 4 —
without it, `driveTracker.ts` (already present since Week 2) never actually
runs on Drive pages.

## Week 4 checklist

- [x] Supabase project connected (`src/lib/supabase.ts`, env-var driven)
- [x] PostgreSQL database schema (`supabase/schema.sql`)
- [x] Movies table
- [x] Sessions table
- [x] Events table
- [x] Feedback table
- [x] Survey table (schema only, no UI — as scoped for Week 4)
- [x] Foreign keys
- [x] Indexes
- [x] Row Level Security + anon policies
- [x] Supabase client
- [x] Environment variables (`.env.example`, `.env` git-ignored)
- [x] Session upload
- [x] Event upload (batched)
- [x] Feedback upload (batched)
- [x] Duplicate protection (unique `session_id`/`video_url`, event cursor, feedback `synced` flag)
- [x] Offline-safe local storage (unchanged from Weeks 1–3, verified by build/tests)
- [x] Retry/sync behavior (`syncStatus`, `syncAttempts`, capped auto-retry, unlimited manual retry)
- [x] Upload UI (popup "Cloud Sync" section)
- [ ] YouTube tested end-to-end against a live Supabase project — **NOT VERIFIED** (requires a real Supabase project + manual browser walkthrough, not runnable in this environment)
- [ ] Google Drive tested end-to-end against a live Supabase project — **NOT VERIFIED** (same reason)
- [x] `npm run build` succeeds
- [x] `dist/manifest.json` generated
- [x] Existing Weeks 1–3 functionality still works (build + existing vitest suite pass unchanged)
