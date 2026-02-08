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

async function loadEvents() {
  try {
    const res = await fetch('/api/events');
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

    if (data.date) {
      dateEl.textContent = formatDate(data.date + 'T12:00:00');
    }

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
