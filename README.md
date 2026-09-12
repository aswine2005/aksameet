# Aksa Meet 🎥

A modern, high-performance, real-time video conferencing application built with **Next.js 15**, **Stream Video & Chat SDK**, **Clerk Authentication**, and **Tailwind CSS**.

---

## 🌟 Key Features

- **Multi-Party HD Video & Audio**: Up to 6+ participants can simultaneously enable camera, microphone, and screen share with low latency and adaptive bitrate.
- **Selective Forwarding Unit (SFU)**: Powered by GetStream.io's global WebRTC mesh network. Each user only uploads 1 track, preventing home network overload.
- **Adaptive Screen Sharing**: Dynamic layout switcher spotlights the active screen share while keeping attendee webcams neatly arranged in the participant dock.
- **Real-time In-Call Chat & Reactions**: Send messages and reactions directly inside meetings without interrupting the speaker.
- **Instant Meeting Links**: 1-click meeting creation with shareable codes and quick-copy links.
- **User Authentication & Guest Mode**: Seamless login with Clerk or join as a guest with custom display names.

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18+ (tested up to v24)
- **npm** or **yarn**

### 2. Clone & Install Dependencies

```bash
# Navigate to the project directory
cd gmeet-main

# Install dependencies (using legacy peer deps for React 19 compatibility)
npm install --legacy-peer-deps
```

### 3. Setup Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in the required keys:

```env
# GetStream.io (Video & Chat)
NEXT_PUBLIC_STREAM_API_KEY=your_stream_api_key
STREAM_API_SECRET=your_stream_api_secret

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
WEBHOOK_SECRET=whsec_...

# Clerk URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
```

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view Aksa Meet in your browser.

---

## 🔑 Where to Get the API Keys

### 1. Stream Video & Chat (Free)
1. Go to [getstream.io](https://getstream.io) and register for a free account.
2. In the Dashboard, click **Create App** and select **Video & Chat**.
3. Under the App Overview, copy your **Key** (`NEXT_PUBLIC_STREAM_API_KEY`) and **Secret** (`STREAM_API_SECRET`).
4. Ensure default call types have permissions enabled for audio, video, and screen sharing.

### 2. Clerk Authentication (Free)
1. Go to [clerk.com](https://clerk.com) and create a free project.
2. Under **API Keys**, copy the **Publishable Key** and **Secret Key**.
3. (Optional for Webhooks) Under **Webhooks**, click **Add Endpoint**, target `https://your-deployment-domain.com/api/webhooks`, select `user.created` and `user.updated`, and copy the signing secret (`WEBHOOK_SECRET`).

---

## 🌐 Deployment Guide: Vercel vs. Render

### Option A: Deploy on Vercel (Recommended ⭐️)

Vercel is the creator of Next.js and provides the easiest, zero-cold-start hosting for this application:

1. Push your repository to **GitHub**.
2. Go to [vercel.com](https://vercel.com) and click **Add New Project** -> **Import Git Repository**.
3. If your Next.js project is inside a subfolder, set **Root Directory** to `gmeet-main`.
4. In **Environment Variables**, paste the keys from `.env.local`:
   - `NEXT_PUBLIC_STREAM_API_KEY`
   - `STREAM_API_SECRET`
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `WEBHOOK_SECRET`
   - `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
   - `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
   - `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/`
   - `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/`
5. Click **Deploy**. Vercel will build and assign you a free HTTPS domain (e.g., `https://aksa-meet.vercel.app`).

> **Note on Bandwidth:** All heavy video and audio streams route directly through **Stream's global SFU servers**, not Vercel. Your Vercel serverless usage will remain minimal and comfortably within the free tier!

---

### Option B: Deploy on Render

If you prefer Render:

1. Push your repository to **GitHub**.
2. Log in to [render.com](https://render.com) and click **New +** -> **Web Service**.
3. Select your repository.
4. Set the following settings:
   - **Root Directory**: `gmeet-main` (or leave empty if project is at root)
   - **Environment**: `Node`
   - **Build Command**: `npm install --legacy-peer-deps && npm run build`
   - **Start Command**: `npm start`
5. In the **Environment Variables** section, add all keys from your `.env.local`.
6. Click **Create Web Service**.
*(Note: Render free tier services sleep after 15 minutes of inactivity, taking ~50s to wake up on the first visit).*

---

## 👥 Multi-User Real-Time Mechanics (5-6+ Users)

### How It Works:
1. **SFU Architecture**: Unlike mesh WebRTC where each person sends video to every other person ($N \times (N-1)$ connections), Aksa Meet routes video through an SFU. Each participant sends **only 1 stream up** and receives optimized streams down.
2. **Camera & Mic Toggles**: Mute/unmute and camera toggles update instantaneously across all connected clients via WebSocket track events.
3. **Screen Sharing**: When a user clicks **Present now**, Stream negotiates a high-resolution presentation track and automatically triggers the **Speaker Spotlight Layout** for all participants.
