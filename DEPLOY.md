# Publishing the Calendar App

Follow these steps to put your app online. You’ll need to:

1. Choose a host and deploy the code.
2. Set environment variables on the host.
3. Update Google OAuth with your app’s public URL.

---

## Before you deploy

### 1. Google OAuth (required for production)

1. Open [Google Cloud Console](https://console.cloud.google.com/) → your project → **APIs & Services** → **Credentials**.
2. Edit your **OAuth 2.0 Client ID** (Web application).
3. Under **Authorized JavaScript origins**, add your app’s public URL, e.g.:
   - `https://your-app-name.onrender.com`
   - `https://your-app.up.railway.app`
4. Under **Authorized redirect URIs**, add:
   - `https://your-app-name.onrender.com/auth/callback`
   - (or the same for Railway / your domain).
5. Save.

### 2. Environment variables (set these on the host)

On your hosting provider, configure:

| Variable | Value |
|----------|--------|
| `GOOGLE_CLIENT_ID` | Your OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Your OAuth client secret |
| `GOOGLE_REDIRECT_URI` | `https://YOUR-PUBLIC-URL/auth/callback` |
| `CALENDAR_ID` | `primary` or your calendar ID (e.g. from Calendar → Settings → Integrate calendar) |
| `PORT` | Usually set by the host (e.g. 3000 or 8080); only override if they require it |

**Important:** Set `GOOGLE_REDIRECT_URI` to the **exact** URL where your app will run (including `https://` and `/auth/callback`). Do not use `localhost` in production.

---

## Option A: Railway (recommended, free tier)

1. Sign up at [railway.app](https://railway.app) (GitHub login is fine).
2. **New Project** → **Deploy from GitHub repo**. Connect GitHub and select your `calendar-app` repo (push your code to GitHub first if you haven’t).
3. Railway will detect Node and run `npm install` and `npm start`. If it doesn’t, set **Start Command** to `npm start` and **Root Directory** to the app folder if the repo has more than one app.
4. Open **Variables** and add:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI` = `https://YOUR-RAILWAY-URL/auth/callback`
   - `CALENDAR_ID`
5. Under **Settings** → **Networking** → **Generate Domain** to get a URL like `https://your-app.up.railway.app`.
6. Set `GOOGLE_REDIRECT_URI` to `https://your-app.up.railway.app/auth/callback` (and update the same in Google OAuth).
7. Redeploy if you changed variables. Your app will be live at the generated URL.

---

## Option B: Render (free tier)

1. Sign up at [render.com](https://render.com) and connect GitHub.
2. **New** → **Web Service**. Select your repo and branch.
3. Configure:
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
4. Under **Environment**, add the same variables as in the table above. For `GOOGLE_REDIRECT_URI` use your Render URL, e.g. `https://your-app-name.onrender.com/auth/callback`.
5. Create the service. Render will assign a URL like `https://your-app-name.onrender.com`.
6. In Google OAuth, add that URL as an authorized origin and `https://your-app-name.onrender.com/auth/callback` as a redirect URI.
7. If you added or changed env vars after first deploy, use **Manual Deploy** → **Deploy latest commit** so the new values are picked up.

---

## Option C: Fly.io

1. Install the [Fly CLI](https://fly.io/docs/hands-on/install-flyctl/) and sign up: `fly auth signup` or `fly auth login`.
2. From your app directory run:
   ```bash
   fly launch
   ```
   Use the same directory as the app root, choose a region, don’t add a Postgres DB. Fly will generate a `Dockerfile` and `fly.toml` if you allow it.
3. Set secrets (env vars):
   ```bash
   fly secrets set GOOGLE_CLIENT_ID=your_client_id
   fly secrets set GOOGLE_CLIENT_SECRET=your_secret
   fly secrets set GOOGLE_REDIRECT_URI=https://your-app-name.fly.dev/auth/callback
   fly secrets set CALENDAR_ID=primary
   ```
4. Get your URL: `https://your-app-name.fly.dev`, then add it and `https://your-app-name.fly.dev/auth/callback` in Google OAuth.
5. Deploy: `fly deploy`.

---

## After publishing

- **Sign-in:** The first time someone visits the public URL and clicks “Sign in with Google,” they’ll go through Google and then back to your app. As long as the redirect URI and env vars match, it will work.
- **Token storage:** The app stores refresh tokens in `token.json` on the server. On free tiers the filesystem is often ephemeral, so **after a restart or redeploy everyone may need to sign in again**. That’s normal for this setup. For “remember me” across restarts you’d need a database or other persistent store (a later improvement).
- **HTTPS:** All the hosts above give you HTTPS. Use `https://` in `GOOGLE_REDIRECT_URI` and in Google OAuth; don’t use `http://` in production.

---

## Quick checklist

- [ ] Code pushed to GitHub (or connected repo).
- [ ] Host created (Railway / Render / Fly) and app deployed.
- [ ] All env vars set on the host, including `GOOGLE_REDIRECT_URI` with your **real** public URL.
- [ ] Google OAuth: authorized origin and redirect URI updated to that URL.
- [ ] Visit `https://your-app-url`, click Sign in with Google, and confirm you see today’s events.
