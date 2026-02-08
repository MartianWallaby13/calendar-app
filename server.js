require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const { google } = require('googleapis');

const app = express();
const PORT = process.env.PORT || 3000;
const TOKEN_PATH = path.join(__dirname, 'token.json');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || `http://localhost:${PORT}/auth/callback`
);

// Google Calendar classic event colors (colorId 1–11) – background hex
const EVENT_COLORS = {
  1: '#A4BDFC',   // Lavender
  2: '#7AE7BF',   // Sage
  3: '#DBADFF',   // Grape
  4: '#FF887C',   // Flamingo
  5: '#FBD75B',   // Banana
  6: '#FFB878',   // Tangerine
  7: '#46D6DB',   // Peacock
  8: '#E1E1E1',   // Graphite
  9: '#5484ED',   // Blueberry
  10: '#51B749',  // Basil
  11: '#DC2127',  // Tomato
};

function hexToRgba(hex, alpha) {
  const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return `rgba(84, 132, 237, ${alpha})`;
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function getStoredTokens() {
  try {
    const data = fs.readFileSync(TOKEN_PATH, 'utf8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

function storeTokens(tokens) {
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
}

function clearTokens() {
  try {
    fs.unlinkSync(TOKEN_PATH);
  } catch {}
}

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Start OAuth: redirect to Google sign-in
app.get('/auth/login', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar.readonly'],
    prompt: 'consent',
  });
  res.redirect(url);
});

// OAuth callback: exchange code for tokens, then redirect home
app.get('/auth/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error) {
    return res.redirect(`/?error=${encodeURIComponent(error)}`);
  }
  if (!code) {
    return res.redirect('/?error=missing_code');
  }
  try {
    const { tokens } = await oauth2Client.getToken(code);
    storeTokens(tokens);
    res.redirect('/');
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.redirect(`/?error=${encodeURIComponent(err.message)}`);
  }
});

// Sign out: remove stored tokens
app.get('/auth/logout', (req, res) => {
  clearTokens();
  res.redirect('/');
});

// Check if user is authenticated
app.get('/api/auth', (req, res) => {
  const tokens = getStoredTokens();
  res.json({ authenticated: !!tokens });
});

// Get today's events (requires OAuth tokens)
app.get('/api/events', async (req, res) => {
  const calendarId = process.env.CALENDAR_ID || 'primary';
  const tokens = getStoredTokens();

  if (!tokens) {
    return res.status(401).json({ error: 'Not authenticated', code: 'auth_required' });
  }

  try {
    oauth2Client.setCredentials(tokens);

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Fetch Google's event color palette and this calendar's default color in parallel
    const [colorsRes, calendarListRes] = await Promise.all([
      calendar.colors.get(),
      calendar.calendarList.get({ calendarId }).catch(() => null),
    ]);

    const eventColorMap = colorsRes.data.event || {};
    const calendarBg = calendarListRes?.data?.backgroundColor || null;

    const now = new Date();
    const timeMin = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const timeMax = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const response = await calendar.events.list({
      calendarId,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      maxResults: 50,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const currentTokens = oauth2Client.credentials;
    if (currentTokens && (currentTokens.access_token || currentTokens.refresh_token)) {
      storeTokens(currentTokens);
    }

    const events = (response.data.items || []).map((event) => {
      const colorId = event.colorId != null ? String(event.colorId) : null;
      const apiColor = colorId && eventColorMap[colorId];
      const colorHex =
        (apiColor && apiColor.background) ||
        (colorId && EVENT_COLORS[colorId]) ||
        calendarBg ||
        EVENT_COLORS[9];
      const colorBg = hexToRgba(colorHex, 0.28);
      return {
        id: event.id,
        summary: event.summary || '(No title)',
        description: event.description || '',
        location: event.location || '',
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        allDay: !event.start?.dateTime,
        htmlLink: event.htmlLink,
        colorHex,
        colorBg,
      };
    });

    res.json({ events, date: timeMin.toISOString().slice(0, 10) });
  } catch (err) {
    if (err.code === 401 || (err.response && err.response.status === 401)) {
      clearTokens();
      return res.status(401).json({ error: 'Session expired', code: 'auth_required' });
    }
    console.error('Calendar API error:', err.message);
    res.status(500).json({
      error: 'Failed to fetch calendar events',
      message: err.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Calendar app running at http://localhost:${PORT}`);
});
