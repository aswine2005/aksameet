# Aksa Meet 🎥

A Google Meet–style video conferencing app built with **Next.js 15**, **Stream Video & Chat**, **Clerk** authentication and **Tailwind CSS**.

Everyone in a meeting can share their **camera, microphone and screen**, send **in-call chat messages** and **reactions**, and see who's in the call.

---

## Features

- **Multi-party HD video & audio** — routed through Stream's global SFU, so each participant uploads one stream no matter how many people join.
- **Screen sharing** — the presenter is spotlighted for everyone (their camera stays visible in the strip), and shared tab audio is played too.
- **In-call chat** — persistent per-meeting chat with unread badge and message toasts; people who join late see earlier messages.
- **Reactions & raise hand** — 👍 ❤️ 😀 🎉 👎 ✋ shown on the sender's tile.
- **People panel & meeting details** — participant list with mic/presenting status, and a copyable invite link.
- **Lobby** — camera/mic preview and device selection before joining; see who's already in the call.
- **Instant meetings & guest access** — signed-in users create meetings with one click; anyone with the link can join as a guest with just a name.
- **Recording** — shown to users with recording permission (the meeting host), using Stream's recording feature.
- Leave / rejoin, reconnection indicator, and a responsive layout down to phone width.

## How it works

| Piece | Responsibility |
| --- | --- |
| `src/contexts/MeetProvider.tsx` | Connects the Stream **video** and **chat** clients as the same user (Clerk user, or a guest) and provides the call to the meeting pages. |
| `POST /api/token` | Issues Stream user tokens. Signed-in users get a token for their own Clerk id; everyone else gets a fresh `guest_…` identity, so nobody can obtain a token for someone else's id. |
| `POST /api/meetings/:id/chat` | Adds the caller to the meeting's chat channel (server-side, so no dashboard permission changes are needed). Guests authenticate with the token issued above. |
| `GET /api/meetings/:id` | Lets the home page check a meeting code before navigating. |
| `POST /api/webhooks` | *Optional* Clerk webhook that keeps Stream user profiles in sync. |

Meeting flow: **Home** → `/{code}` **lobby** (guests enter a name first) → `/{code}/meeting` → `/{code}/meeting-end`.

---

## Getting started

### Prerequisites

- Node.js **18.18+** (20 LTS recommended) and npm
- A free [Stream](https://getstream.io) account and a free [Clerk](https://clerk.com) account

### 1. Install

```bash
git clone https://github.com/<your-username>/aksameet.git
cd aksameet
npm install
```

> The repo's `.npmrc` enables `legacy-peer-deps`, because `stream-chat-react` v11 hasn't updated its React peer range to 19. No extra flags are needed.

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

| Variable | Where to find it |
| --- | --- |
| `NEXT_PUBLIC_STREAM_API_KEY`, `STREAM_API_SECRET` | Stream Dashboard → your app → **App Access Keys** |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Clerk Dashboard → **API Keys** |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `…SIGN_UP_URL`, `…FALLBACK_REDIRECT_URL` | Keep the defaults from `.env.example` |
| `WEBHOOK_SECRET` *(optional)* | Clerk Dashboard → **Webhooks** → your endpoint's signing secret |

**Stream setup:** create an app (Video and Chat are enabled together). The app uses the built-in `default` call type and `messaging` channel type with their default permissions — no dashboard changes are required.

**Clerk setup:** create an application and enable the sign-in methods you want (email, Google, …).

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign in, and click **New meeting**.

### Try it with several people locally

Copy the meeting link and open it in another browser, an incognito window, or on your phone (same Wi‑Fi: `http://<your-computer-ip>:3000`). Each extra tab joins as a separate guest.

> Browsers only allow camera, microphone and screen capture on `https://` or `localhost`. To test from another device, use a tunnel (e.g. `ngrok http 3000`) or deploy.

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (also lints and type-checks) |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript type-check |

CI (`.github/workflows/ci.yml`) runs lint, type-check and build on every push and pull request.

---

## Deployment

### Vercel (recommended)

1. Push the repository to GitHub.
2. In Vercel, **Add New Project** → import the repository.
3. Add the environment variables from `.env.example` (use Clerk **production** keys, `pk_live_…` / `sk_live_…`, for a production domain).
4. Deploy. Video and audio travel through Stream's servers, not Vercel, so serverless usage stays small.
5. *(Optional)* Add a Clerk webhook to `https://<your-domain>/api/webhooks` for `user.created` and `user.updated`, and set `WEBHOOK_SECRET`.

### Render / any Node host

- **Build command:** `npm install && npm run build`
- **Start command:** `npm start`
- Add the same environment variables.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| "Couldn't connect to the meeting service" | Check `NEXT_PUBLIC_STREAM_API_KEY` / `STREAM_API_SECRET`, then restart the server. |
| Camera or microphone not working | Allow access in the browser's site settings; make sure no other app is holding the camera; use `https://` or `localhost`. |
| "Present now" button missing | Screen sharing isn't supported by mobile browsers; use a desktop browser. |
| Others can't hear/see you on a corporate network | Allow outbound UDP/TCP to Stream (`*.stream-io-api.com`, `*.stream-io-video.com`); Stream falls back to TURN over TCP/TLS 443 automatically. |
| Clerk "development keys" warning in production | Switch to your Clerk production instance keys. |

---

## Project structure

```
src/
├── app/
│   ├── page.tsx                  # Home: new meeting / join by code or link
│   ├── [meetingId]/
│   │   ├── layout.tsx            # Validates the code, wraps pages in MeetProvider
│   │   ├── page.tsx              # Lobby (preview + join)
│   │   ├── meeting/page.tsx      # In-call UI
│   │   └── meeting-end/page.tsx
│   ├── api/                      # token, meetings, chat membership, webhooks
│   ├── sign-in/ & sign-up/       # Clerk pages
│   └── globals.css
├── components/                   # Layouts, controls, popups, icons
├── contexts/                     # MeetProvider (Stream clients), AppProvider
├── hooks/
└── lib/                          # Shared constants, server-side Stream helpers
```

## Tech stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS · Stream Video React SDK · Stream Chat React · Clerk · GSAP
