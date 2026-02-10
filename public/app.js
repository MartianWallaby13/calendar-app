const eventsEl = document.getElementById('event-list');
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');
const emptyEl = document.getElementById('empty');
const dateEl = document.getElementById('date');
const signInEl = document.getElementById('sign-in');
const signOutEl = document.getElementById('sign-out');
const authErrorEl = document.getElementById('auth-error');

// Show auth error from redirect query (e.g. ?error=access_denied)
const params = new URLSearchParams(window.location.search);
const urlError = params.get('error');
if (urlError) {
  authErrorEl.textContent = urlError === 'missing_code' ? 'Sign-in was cancelled or no code was returned.' : urlError;
  authErrorEl.classList.remove('hidden');
  window.history.replaceState({}, document.title, window.location.pathname);
}

function formatTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function renderEvent(event) {
  const li = document.createElement('li');
  li.className = 'event' + (event.allDay ? ' all-day' : '');
  const colorHex = event.colorHex || '#5484ED';
  const colorBg = event.colorBg || 'rgba(84, 132, 237, 0.28)';
  li.style.setProperty('--event-color', colorHex);
  li.style.setProperty('--event-bg', colorBg);

  let timeLabel = event.allDay ? 'All day' : `${formatTime(event.start)} – ${formatTime(event.end)}`;

  li.innerHTML = `
    <span class="event-time">${timeLabel}</span>
    <h2 class="event-title">${escapeHtml(event.summary)}</h2>
    ${event.location ? `<p class="event-details">📍 ${escapeHtml(event.location)}</p>` : ''}
    ${event.description ? `<p class="event-details">${escapeHtml(event.description)}</p>` : ''}
    ${event.htmlLink ? `<a class="event-link" href="${escapeHtml(event.htmlLink)}" target="_blank" rel="noopener">Open in Google Calendar</a>` : ''}
  `;

  return li;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getTodayInZone(timezone) {
  if (!timezone) return null;
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(new Date());
  const y = parts.find((p) => p.type === 'year').value;
  const m = parts.find((p) => p.type === 'month').value;
  const d = parts.find((p) => p.type === 'day').value;
  return `${y}-${m}-${d}`;
}

async function loadEvents() {
  try {
    const configRes = await fetch('/api/config');
    const config = configRes.ok ? await configRes.json() : { timezone: null };
    const timezone = config.timezone || null;

    let eventsUrl = '/api/events';
    let displayDateStr;

    if (timezone) {
      const dateStr = getTodayInZone(timezone);
      if (dateStr) {
        eventsUrl = '/api/events?date=' + encodeURIComponent(dateStr) + '&timezone=' + encodeURIComponent(timezone);
        displayDateStr = dateStr;
      }
    }

    if (!displayDateStr) {
      const now = new Date();
      const localStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const localEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      eventsUrl = '/api/events?timeMin=' + encodeURIComponent(localStart.toISOString()) + '&timeMax=' + encodeURIComponent(localEnd.toISOString());
      displayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }

    const res = await fetch(eventsUrl);
    const data = await res.json();

    loadingEl.classList.add('hidden');
    errorEl.classList.add('hidden');
    emptyEl.classList.add('hidden');

    if (res.status === 401 || (data.code === 'auth_required')) {
      signInEl.classList.remove('hidden');
      signOutEl.classList.add('hidden');
      document.getElementById('events').classList.add('hidden');
      return;
    }

    signInEl.classList.add('hidden');
    signOutEl.classList.remove('hidden');
    document.getElementById('events').classList.remove('hidden');

    if (!res.ok) {
      errorEl.textContent = data.message || data.error || 'Something went wrong';
      errorEl.classList.remove('hidden');
      return;
    }

    dateEl.textContent = formatDate((data.date || displayDateStr) + 'T12:00:00');

    if (!data.events || data.events.length === 0) {
      emptyEl.classList.remove('hidden');
      return;
    }

    eventsEl.innerHTML = '';
    data.events.forEach((event) => eventsEl.appendChild(renderEvent(event)));
  } catch (err) {
    loadingEl.classList.add('hidden');
    errorEl.textContent = err.message || 'Failed to load events';
    errorEl.classList.remove('hidden');
  }
}

loadEvents();
