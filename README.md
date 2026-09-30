# AksaMeet

**Online classes that keep their integrity — and everyone's dignity.**
AksaMeet is the meeting room of the **AksaRank** ecosystem: HD video meetings with automatic
attendance and private, on-device attention insights for the host.

Built with **Next.js 15**, **Stream Video & Chat**, **Clerk** (Google sign-in), **MongoDB** and
**MediaPipe Face Landmarker**.

---

## Features

**Meetings**
- Multi-party HD video, audio and screen sharing through Stream's SFU; in-call chat, reactions,
  raise hand, pinning, recording (host).
- **Sign-in required** — opening a meeting link while signed out goes to sign-in (Google or email)
  and straight back to the meeting. There are no anonymous guests.
- **Background blur**, applied on the participant's own device.
- Host can **end the meeting for everyone**.

**Attendance** (host-configurable)
- Every join, leave and rejoin, recorded automatically — even when a tab is closed or a laptop lid
  shuts (a stay ends at its last 15-second heartbeat).
- Minutes present, share of the meeting, rejoin count, first join / last seen, **late** flag.
- **Present / partial** status against the host's threshold (default: 75 % of the meeting).

**Attention insights** (host-configurable)
- Each participant's browser estimates, twice a second, whether they are facing the screen, using
  head pose and eye direction from MediaPipe's face landmarker.
- States: attentive · looking away · eyes closed · not in view · on another tab · camera off.
- A glance is not counted — a change must hold 1.5 s (3 s for closed eyes).

**The host's private panel**
- Live list of who is here, their current state and how long they have been in it, and an attention
  percentage per student and for the class.
- **Alert** when someone has been away longer than the host allows (default 1 minute), as a toast
  and a red badge on their video tile — visible only to the host.
- Change the settings mid-meeting; participants pick them up within 15 seconds.

**History and reports**
- **History** of every meeting hosted or attended, with its duration.
- **Report** per meeting: summary, attendance table, per-minute attention **timeline**, and a
  **CSV export**.
- Students can see **their own record** — and only their own.

**Camera check** (`/check`) — anyone can see exactly what the attention model reads from their
camera, before class. Nothing on that page leaves the browser.

## How it works

```
 Student's browser                                  Server (Vercel)            Host's browser
 ─────────────────                                  ───────────────            ──────────────
 camera ─► MediaPipe face landmarker (2 fps)
          ─► head pose + eye blendshapes
          ─► attention state, smoothed
          ─► minutes per state ──► POST /presence ─► MongoDB  ◄── GET /live (every 5 s)
                                    every 15 s        (atomic      panel, alerts, tile badges
 video/audio ◄──────────── Stream SFU ────────────►   updates)
```

- **Video never reaches our server.** The face analysis runs in each participant's browser; only
  milliseconds-per-state are sent. No frame, landmark or recording is stored for analysis.
- **Scale:** because every laptop does its own looking, a class of 60 costs the server what 5 do —
  about four small database writes a second, and one poll every five seconds from the host.
- Timers run in a Web Worker, so heartbeats keep time in a background tab.
- The host-only endpoints check the host on the server; hiding buttons is not the security.

| Path | What it does |
| --- | --- |
| `src/lib/attention.ts` | Per-frame classification and smoothing (pure, tested) |
| `src/lib/attendance.ts` | Presence, rejoins, lateness, status (pure, tested) |
| `src/lib/store.ts` | MongoDB reads and atomic presence updates (tested against a real mongod) |
| `src/hooks/useAttentionTracker.ts` | Runs the model on the local camera |
| `src/hooks/usePresence.ts` | Join / heartbeat / leave reports |
| `src/app/api/meetings/**` | Create, settings, presence, live panel, report + CSV, end |
| `src/app/api/history` | Meetings hosted and attended |

## Getting started

### Prerequisites
- Node.js 20+
- A free [Stream](https://getstream.io) app, a free [Clerk](https://clerk.com) application, and a
  MongoDB database (free [Atlas](https://www.mongodb.com/atlas) cluster for deployment).

### 1. Install and configure

```bash
npm install
cp .env.example .env.local   # then fill it in
```

In **Clerk**: *User & Authentication → Social connections → Google* to enable Google sign-in, and
*Settings → Application name* to show "AksaMeet" on the sign-in card.

### 2. Run locally

```bash
npm run db:dev    # a real MongoDB on 127.0.0.1:27018, data in .data/ (leave it running)
npm run dev       # in another terminal
```

with `MONGODB_URI=mongodb://127.0.0.1:27018/?directConnection=true` in `.env.local`. Open
<http://localhost:3000>, sign in, and click **New meeting**. Open the link in a second browser
profile signed in as someone else to join as a student.

### 3. Test

```bash
npm test          # logic, store and API tests against a real mongod, plus screen renders
npm run lint && npm run typecheck && npm run build
```

## Deploying to Vercel

1. Push the repository to GitHub and import it in Vercel (framework: Next.js; defaults are right).
2. In **MongoDB Atlas → Network Access**, allow `0.0.0.0/0` (Vercel's addresses change).
3. Add the environment variables in Vercel → *Settings → Environment Variables*:
   `NEXT_PUBLIC_STREAM_API_KEY`, `STREAM_API_SECRET`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`,
   `CLERK_SECRET_KEY`, `MONGODB_URI` (Atlas), and optionally `MONGODB_DB`,
   `NEXT_PUBLIC_AKSARANK_URL`.
4. For production, switch Clerk to a production instance (`pk_live_`/`sk_live_`) and add the
   Vercel domain in Clerk.

The build copies MediaPipe's WASM into `public/mediapipe/` (`prebuild`), so the model loads from
the app's own domain.

## AksaRank integration

- `NEXT_PUBLIC_AKSARANK_URL` adds an AksaRank link to the header and home page.
- **Start a class from AksaRank** with a plain link:
  `https://<aksameet-domain>/new?title=DBMS%20Unit%203&attention=1&attendance=1&alert=60`
  The visitor signs in if needed, becomes the host, and lands in the new meeting's lobby.

## Privacy and dignity

- Participants are told what a meeting measures before they join; the camera check shows them
  exactly what is read.
- Attention results are visible only to the host. A student sees only their own record.
- Attention is an estimate — lighting, glasses, a second monitor and camera placement all affect
  it. It tells a host where to look; it is not evidence of misconduct.
- Before using this with real students, add the processors (Stream, Clerk, MongoDB Atlas, Vercel)
  to your institution's privacy notice.
