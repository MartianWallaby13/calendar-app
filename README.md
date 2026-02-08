# Today's Calendar

A simple app that shows today's events from your Google Calendar. Sign in with Google (OAuth) to see your own and shared calendars.

## Setup

### 1. Google Cloud & Calendar API

1. Go to [Google Cloud Console](https://console.cloud.google.com/) and create a project (or use an existing one).
2. Enable the **Google Calendar API**: APIs & Services → Enable APIs and Services → search for "Google Calendar API" → Enable.
3. Create **OAuth 2.0 credentials**: APIs & Services → Credentials → Create Credentials → **OAuth client ID**.
4. If prompted, configure the OAuth consent screen (e.g. External, add your email as test user).
5. For the OAuth client:
   - Application type: **Web application**
   - Add **Authorized redirect URI**: `http://localhost:3000/auth/callback` (use your actual port if you set `PORT` in `.env`)
6. Copy the **Client ID** and **Client secret**.

### 2. Configure the app

```bash
cp .env.example .env
```

Edit `.env` and set:

- `GOOGLE_CLIENT_ID` – your OAuth client ID
- `GOOGLE_CLIENT_SECRET` – your OAuth client secret
- `CALENDAR_ID` – use `primary` for your main calendar, or a calendar ID from Calendar settings → Integrate calendar (for a shared calendar you already have access to)

If the app runs on a different port, set:

- `GOOGLE_REDIRECT_URI` – e.g. `http://localhost:4000/auth/callback`

### 3. Install and run

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000). Click **Sign in with Google**, approve access, and you’ll see today’s events from the chosen calendar.

## Notes

- **Do not commit** `.env` or `token.json`; they are in `.gitignore`.
- The app stores OAuth tokens in `token.json` so you stay signed in until you click **Sign out**.
- Events shown are for **today** (server’s local date).
- Shared calendars you can see in Google Calendar will work with `CALENDAR_ID` set to that calendar’s ID.
