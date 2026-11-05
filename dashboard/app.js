'use strict';

const API = {
  latest: '/api/readings/latest',
  history: (limit) => `/api/readings/history?limit=${limit}`,
  count: '/api/readings/count',
  health: '/health',
};

const state = {
  latest: null,
  history: [],
  count: null,
  health: null,
  historyLimit: 50,
  currentView: 'overview',
  ticks: 0,
  refreshPending: false,
  previousStatus: null,
  apiReachable: false,
  chartSignatures: {},
};

const $ = (id) => document.getElementById(id);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const metricAnimations = new Map();
const metricValues = new Map();

// Animate only when a real sensor value changes. Honors OS reduced-motion setting.
function animateMetric(id, value, decimals = 2) {
  const element = $(id);
  if (!element) return;
  if (!finite(value)) {
    element.textContent = '—';
    metricValues.delete(id);
    return;
  }
  const previous = metricValues.get(id);
  if (previous === value) return;
  metricValues.set(id, value);
  if (metricAnimations.has(id)) cancelAnimationFrame(metricAnimations.get(id));
  if (!finite(previous) || reducedMotion.matches || document.hidden) {
    element.textContent = fmt(value, decimals);
    return;
  }
  const duration = 650;
  const start = performance.now();
  function frame(now) {
    const progress = Math.min(1, (now - start) / duration);
    const ease = 1 - Math.pow(1 - progress, 3);
    element.textContent = fmt(previous + (value - previous) * ease, decimals);
    if (progress < 1) metricAnimations.set(id, requestAnimationFrame(frame));
    else metricAnimations.delete(id);
  }
  metricAnimations.set(id, requestAnimationFrame(frame));
}

const finite = (value) => typeof value === 'number' && Number.isFinite(value);
const fmt = (value, decimals = 2) => finite(value) ? value.toFixed(decimals) : '—';
const localTime = (timestamp) => {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'medium' });
};
const shortTime = (timestamp) => {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};
const ageSeconds = (timestamp) => {
  const age = (Date.now() - new Date(timestamp).getTime()) / 1000;
  return Number.isFinite(age) ? Math.max(0, age) : Infinity;
};

async function getJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
  return response.json();
}

function toast(message) {
  const el = $('toast');
  el.textContent = message;
  el.classList.add('visible');
  clearTimeout(toast.timeout);
  toast.timeout = setTimeout(() => el.classList.remove('visible'), 4400);
}

function metricTrend(key, unit) {
  if (state.history.length < 2) return 'Collecting history…';
  const current = state.latest?.[key];
  const oldest = state.history[0][key];
  if (!finite(current) || !finite(oldest)) return 'Data not available';
  const difference = current - oldest;
  if (Math.abs(difference) < 0.005) return 'Stable in this window';
  return `${difference > 0 ? '↑' : '↓'} ${Math.abs(difference).toFixed(2)} ${unit} over window`;
}

const chartConfigs = [
  { id: 'temperature', key: 'temperature_c', color: '#f0a18b', unit: '°C', precision: 2, minPadding: 0.05 },
  { id: 'humidity', key: 'humidity_pct', color: '#78bdff', unit: '%', precision: 2, minPadding: 0.10 },
  { id: 'pressure', key: 'pressure_hpa', color: '#c8acf4', unit: 'hPa', precision: 2, minPadding: 0.05 },
  { id: 'light', key: 'light_lux', color: '#edc673', unit: 'lux', precision: 2, minPadding: 2 },
];

function chartSvg(values, color, id, minPadding) {
  const width = 500;
  const height = 150;
  const left = 12, right = 10, top = 12, bottom = 16;
  const usableW = width - left - right, usableH = height - top - bottom;
  let low = Math.min(...values), high = Math.max(...values);
  // Use a small sensor-specific floor instead of 0.8% of the absolute
  // reading. Previously a 1010 hPa pressure value forced ~8 hPa padding,
  // hiding ordinary changes smaller than 1 hPa.
  const minimumPadding = Math.max((high - low) * 0.12, minPadding);
  low -= minimumPadding;
  high += minimumPadding;
  const y = (value) => top + (high - value) * usableH / (high - low);
  const x = (i) => left + (values.length === 1 ? usableW / 2 : i * usableW / (values.length - 1));
  const pairs = values.map((value, i) => [x(i), y(value)]);
  const line = pairs.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(2)},${py.toFixed(2)}`).join(' ');
  const baseline = top + usableH;
  const area = `${line} L${pairs.at(-1)[0].toFixed(2)},${baseline.toFixed(2)} L${pairs[0][0].toFixed(2)},${baseline.toFixed(2)} Z`;
  const grid = [0, 1, 2, 3].map(i => {
    const gy = top + i * usableH / 3;
    return `<line x1="${left}" y1="${gy.toFixed(2)}" x2="${width - right}" y2="${gy.toFixed(2)}" stroke="#2b3c51" stroke-dasharray="3 5" opacity=".8"/>`;
  }).join('');
  const [lastX, lastY] = pairs.at(-1);
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Time series line chart" preserveAspectRatio="none"><defs><linearGradient id="gradient-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${color}" stop-opacity=".27"/><stop offset="100%" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>${grid}<path class="chart-area" d="${area}" fill="url(#gradient-${id})"/><path class="chart-line" pathLength="1" d="${line}" stroke="${color}" fill="none" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/><circle class="chart-glow" cx="${lastX.toFixed(2)}" cy="${lastY.toFixed(2)}" r="9" fill="${color}" opacity=".14"/><circle cx="${lastX.toFixed(2)}" cy="${lastY.toFixed(2)}" r="4.2" fill="${color}" stroke="#152036" stroke-width="2"/></svg>`;
}

function renderCharts() {
  for (const item of chartConfigs) {
    const points = state.history.filter(row => finite(row[item.key]));
    const values = points.map(row => row[item.key]);
    const current = state.latest?.[item.key];
    $(`chart-${item.id}-value`).textContent = finite(current) ? `${fmt(current, item.precision)} ${item.unit}` : '—';
    const container = $(`chart-${item.id}`);
    const range = $(`range-${item.id}`);
    if (values.length < 2) {
      container.innerHTML = '<div class="chart-empty">Collecting sensor history…</div>';
      range.textContent = 'At least two readings needed';
      continue;
    }
    // Re-animate a chart only when the stored history actually changes.
    const signature = points.map(point => `${point.id ?? point.received_at}:${point[item.key]}`).join('|');
    if (signature === state.chartSignatures[item.id]) continue;
    state.chartSignatures[item.id] = signature;
    container.innerHTML = chartSvg(values, item.color, item.id, item.minPadding);
    range.replaceChildren();
    const earliest = document.createElement('span');
    const mostRecent = document.createElement('span');
    earliest.textContent = shortTime(points[0].received_at);
    mostRecent.textContent = shortTime(points.at(-1).received_at);
    const valueRange = document.createElement('span');
    valueRange.className = 'axis-summary';
    valueRange.textContent = `${fmt(Math.min(...values), item.precision)}–${fmt(Math.max(...values), item.precision)} ${item.unit}`;
    range.append(earliest, valueRange, mostRecent);
  }
}

function renderReadings() {
  const reading = state.latest;
  if (!reading) return;
  animateMetric('temperature', reading.temperature_c);
  animateMetric('humidity', reading.humidity_pct);
  animateMetric('pressure', reading.pressure_hpa);
  animateMetric('light', reading.light_lux);
  animateMetric('hero-temperature', reading.temperature_c, 1);
  animateMetric('hero-humidity', reading.humidity_pct, 1);
  animateMetric('hero-light', reading.light_lux, 0);
  $('temperature-trend').textContent = metricTrend('temperature_c', '°C');
  $('humidity-trend').textContent = metricTrend('humidity_pct', '%');
  $('pressure-trend').textContent = metricTrend('pressure_hpa', 'hPa');
  $('light-trend').textContent = metricTrend('light_lux', 'lux');
  $('last-updated').textContent = localTime(reading.received_at);
}

function renderStatus() {
  const reading = state.latest;
  const age = reading ? ageSeconds(reading.received_at) : Infinity;
  const online = state.apiReachable && reading && age <= 20;
  const inWarning = online && reading.status === 'WARNING';
  const banner = $('status-banner');
  banner.classList.remove('normal', 'warning', 'offline');
  banner.classList.add(online ? (inWarning ? 'warning' : 'normal') : 'offline');

  const bannerTitle = online ? (inWarning ? 'Environmental warning active' : 'Environment within configured limits') : 'No fresh sensor telemetry';
  const bannerDetail = !state.apiReachable ? 'Cannot reach FastAPI. Check your Docker containers.' : !reading ? 'Waiting for the first ESP32-S3 message.' : !online ? `Last reading was ${Math.round(age)} seconds ago. Check ESP32 power and MQTT.` : inWarning ? `Device reported WARNING. Check light, temperature, and humidity.` : 'Sensor readings are arriving and no thresholds are exceeded.';
  $('banner-title').textContent = bannerTitle;
  $('banner-detail').textContent = bannerDetail;
  $('banner-icon').textContent = online ? (inWarning ? '!' : '✓') : '×';
  $('banner-tag').textContent = !online ? 'OFFLINE' : inWarning ? 'WARNING' : 'NORMAL';
  $('sidebar-device-status').textContent = online ? 'Live telemetry received' : 'Offline or stale telemetry';
  $('top-status-text').textContent = online ? 'Device online' : 'Device offline';
  for (const id of ['top-dot', 'sidebar-device-dot']) {
    $(id).classList.toggle('online', Boolean(online));
    $(id).classList.toggle('offline', !online);
  }
  $('device-health').textContent = online ? 'ONLINE' : 'OFFLINE';
  $('device-health').className = online ? 'ok' : 'bad';
  $('api-health').textContent = state.apiReachable ? 'AVAILABLE' : 'UNREACHABLE';
  $('api-health').className = state.apiReachable ? 'ok' : 'bad';
  const mqttOk = state.health?.mqtt_connected === true;
  const dbOk = state.health?.database_connected === true;
  $('mqtt-health').textContent = state.health ? (mqttOk ? 'CONNECTED' : 'DISCONNECTED') : 'UNKNOWN';
  $('mqtt-health').className = mqttOk ? 'ok' : 'bad';
  $('db-health').textContent = state.health ? (dbOk ? 'CONNECTED' : 'DISCONNECTED') : 'UNKNOWN';
  $('db-health').className = dbOk ? 'ok' : 'bad';

  const currentStatus = !online ? 'OFFLINE' : inWarning ? 'WARNING' : 'NORMAL';
  if (state.previousStatus !== null && currentStatus !== state.previousStatus) {
    if (currentStatus === 'WARNING') toast('Environmental warning detected. Check the live readings.');
    if (currentStatus === 'OFFLINE') toast('ESP32-S3 data is missing or the API is unavailable.');
    if (currentStatus === 'NORMAL') toast('Sensor readings have returned to normal.');
  }
  // Do not show a misleading "returned to normal" notification on first load.
  if (state.latest !== null || state.ticks > 0) state.previousStatus = currentStatus;
}

function renderHistory() {
  const body = $('readings-body');
  body.replaceChildren();
  const reversed = [...state.history].reverse();
  if (!reversed.length) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.className = 'empty-cell';
    td.colSpan = 6;
    td.textContent = 'No historical readings found.';
    tr.append(td);
    body.append(tr);
    return;
  }
  for (const row of reversed) {
    const tr = document.createElement('tr');
    const columns = [localTime(row.received_at), fmt(row.temperature_c), fmt(row.humidity_pct), fmt(row.pressure_hpa), fmt(row.light_lux)];
    for (const value of columns) {
      const td = document.createElement('td');
      td.textContent = value;
      tr.append(td);
    }
    const td = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = `table-status ${row.status === 'WARNING' ? 'warning' : 'normal'}`;
    badge.textContent = row.status === 'WARNING' ? 'WARNING' : row.status === 'NORMAL' ? 'NORMAL' : String(row.status ?? 'UNKNOWN');
    td.append(badge);
    tr.append(td);
    body.append(tr);
  }
  $('history-count').textContent = `${state.count ?? '—'} records`;
}

async function refresh() {
  if (state.refreshPending) return;
  state.refreshPending = true;
  try {
    const includeHistory = state.ticks % 3 === 0;
    const includeCount = state.ticks % 5 === 0;
    const [latestResult, healthResult, historyResult, countResult] = await Promise.allSettled([
      getJson(API.latest),
      getJson(API.health),
      includeHistory ? getJson(API.history(Math.max(state.historyLimit, state.currentView === 'history' ? 200 : state.historyLimit))) : Promise.resolve(null),
      includeCount ? getJson(API.count) : Promise.resolve(null),
    ]);
    state.apiReachable = healthResult.status === 'fulfilled';
    if (latestResult.status === 'fulfilled') state.latest = latestResult.value;
    if (healthResult.status === 'fulfilled') state.health = healthResult.value;
    if (historyResult.status === 'fulfilled' && Array.isArray(historyResult.value)) state.history = [...historyResult.value].reverse();
    if (countResult.status === 'fulfilled' && Number.isFinite(countResult.value?.total_readings)) state.count = countResult.value.total_readings;
    renderReadings();
    renderCharts();
    renderHistory();
    renderStatus();
    state.ticks += 1;
  } finally {
    state.refreshPending = false;
  }
}

async function manualHistoryRefresh() {
  try {
    const [history, count] = await Promise.all([getJson(API.history(200)), getJson(API.count)]);
    state.history = history.reverse();
    state.count = count.total_readings;
    renderHistory();
    toast('History refreshed.');
  } catch (error) {
    toast(`History refresh failed: ${error.message}`);
  }
}

function switchView(nextView) {
  if (!['overview', 'history', 'system'].includes(nextView)) return;
  state.currentView = nextView;
  document.querySelectorAll('.view').forEach(el => el.classList.toggle('active', el.id === nextView));
  document.querySelectorAll('.nav-item').forEach(button => {
    const active = button.dataset.view === nextView;
    button.classList.toggle('selected', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  $('breadcrumb').textContent = ({ overview: 'Overview', history: 'Reading history', system: 'System status' })[nextView];
  if (nextView === 'history') manualHistoryRefresh();
  history.replaceState(null, '', `#${nextView}`);
}

function start() {
  document.querySelectorAll('.nav-item').forEach(button => button.addEventListener('click', () => switchView(button.dataset.view)));
  document.querySelectorAll('.segmented button').forEach(button => button.addEventListener('click', async () => {
    state.historyLimit = Number(button.dataset.limit);
    document.querySelectorAll('.segmented button').forEach(b => b.classList.toggle('active', b === button));
    try {
      const rows = await getJson(API.history(state.historyLimit));
      state.history = rows.reverse();
      renderCharts();
      renderReadings();
    } catch (error) { toast(`Could not load chart data: ${error.message}`); }
  }));
  $('refresh-history').addEventListener('click', manualHistoryRefresh);
  const updateClock = () => { $('live-clock').textContent = new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }); renderStatus(); };
  updateClock();
  setInterval(updateClock, 1000);
  const initialView = location.hash.slice(1);
  if (['overview', 'history', 'system'].includes(initialView)) switchView(initialView);
  refresh();
  setInterval(refresh, 3000);
}

start();
