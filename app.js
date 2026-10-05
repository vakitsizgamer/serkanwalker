'use strict';

// ---------- Kalıcı veri ----------
const STORE_KEY = 'rekorkir.v1';
const RESUME_WINDOW_MS = 30 * 1000; // bu süre içinde geri dönülürse oturum devam eder

const defaults = () => ({
  days: {},          // 'YYYY-MM-DD' -> saniye
  total: 0,          // tüm zamanlar, saniye
  bestSession: 0,    // saniye
  bestDay: 0,        // saniye
  streakNow: 0,
  streakBest: 0,
  lastDay: null,
  tapBest: 0,        // dokunma sayısı
  reactBest: 0,      // ms, düşük daha iyi (0 = yok)
  holdBest: 0,       // ms
  sessions: 0,
  badges: {},
});

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return Object.assign(defaults(), JSON.parse(raw));
  } catch (e) { /* depolama yoksa bellekte çalış */ }
  return defaults();
}

function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { /* yoksay */ }
}

const S = load();

// ---------- Yardımcılar ----------
const $ = (id) => document.getElementById(id);

function dayKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function clock(sec) {
  sec = Math.floor(sec);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const p = (n) => String(n).padStart(2, '0');
  return h ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
}

function human(sec) {
  sec = Math.floor(sec);
  if (sec < 60) return `${sec} sn`;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h ? `${h} sa ${m} dk` : `${m} dk`;
}

function vibrate(p) { try { navigator.vibrate && navigator.vibrate(p); } catch (e) { /* yoksay */ } }

// ---------- Toast + konfeti ----------
let toastTimer;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

const canvas = $('confetti');
const ctx = canvas.getContext('2d');
let parts = [];
let confettiRunning = false;

function confetti() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const colors = ['#ff5e3a', '#ffb03a', '#2ecc71', '#3498db', '#e84393', '#f1c40f'];
  for (let i = 0; i < 140; i++) {
    parts.push({
      x: innerWidth / 2, y: innerHeight / 3,
      vx: (Math.random() - 0.5) * 14, vy: Math.random() * -14 - 2,
      s: Math.random() * 6 + 4, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3,
      c: colors[i % colors.length], life: 120 + Math.random() * 60,
    });
  }
  if (!confettiRunning) { confettiRunning = true; requestAnimationFrame(drawConfetti); }
}

function drawConfetti() {
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  parts = parts.filter((p) => p.life > 0 && p.y < innerHeight + 20);
  for (const p of parts) {
    p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life--;
    ctx.save();
    ctx.translate(p.x, p.y); ctx.rotate(p.r);
    ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
    ctx.restore();
  }
  if (parts.length) requestAnimationFrame(drawConfetti);
  else { confettiRunning = false; ctx.clearRect(0, 0, innerWidth, innerHeight); }
}

function newRecord(msg) {
  toast(`🏆 YENİ REKOR! ${msg}`);
  confetti();
  vibrate([60, 40, 120]);
}

// ---------- Rozetler ----------
const BADGES = [
  { id: 's5', e: '🔥', t: '5 dk oturum', ok: () => S.bestSession >= 300 },
  { id: 's30', e: '🏃', t: '30 dk oturum', ok: () => S.bestSession >= 1800 },
  { id: 's60', e: '🚀', t: '1 saat oturum', ok: () => S.bestSession >= 3600 },
  { id: 's180', e: '👑', t: '3 saat oturum', ok: () => S.bestSession >= 10800 },
  { id: 'd120', e: '📱', t: 'Günde 2 saat', ok: () => S.bestDay >= 7200 },
  { id: 'k3', e: '📅', t: '3 gün seri', ok: () => S.streakBest >= 3 },
  { id: 'k7', e: '🗓️', t: '7 gün seri', ok: () => S.streakBest >= 7 },
  { id: 'k30', e: '💎', t: '30 gün seri', ok: () => S.streakBest >= 30 },
  { id: 't70', e: '⚡', t: '70+ dokunuş', ok: () => S.tapBest >= 70 },
  { id: 'r250', e: '🎯', t: '250 ms altı refleks', ok: () => S.reactBest > 0 && S.reactBest < 250 },
  { id: 'h60', e: '✋', t: '60 sn tutma', ok: () => S.holdBest >= 60000 },
  { id: 'tot10', e: '🌟', t: 'Toplam 10 saat', ok: () => S.total >= 36000 },
];

function checkBadges() {
  for (const b of BADGES) {
    if (!S.badges[b.id] && b.ok()) {
      S.badges[b.id] = Date.now();
      setTimeout(() => { toast(`${b.e} Rozet kazandın: ${b.t}`); vibrate(80); }, 2800);
    }
  }
}

// ---------- Günlük seri ----------
function updateStreak() {
  const today = dayKey();
  if (S.lastDay === today) return;
  const y = new Date(); y.setDate(y.getDate() - 1);
  S.streakNow = S.lastDay === dayKey(y) ? S.streakNow + 1 : 1;
  S.lastDay = today;
  if (S.streakNow > S.streakBest) {
    const had = S.streakBest > 0;
    S.streakBest = S.streakNow;
    if (had && S.streakNow > 1) setTimeout(() => newRecord(`${S.streakNow} günlük seri`), 600);
  }
  save();
}

// ---------- Oturum takibi ----------
let sessionSec = 0;
let sessionStartBest = S.bestSession; // oturum başındaki rekor; bir kere kutlamak için
let sessionRecordShown = false;
let dayRecordShown = false;
let dayStartBest = S.bestDay;
let hiddenAt = 0;
let lastTick = performance.now();
let wakeLock = null;

function startNewSession() {
  sessionSec = 0;
  sessionStartBest = S.bestSession;
  sessionRecordShown = false;
  S.sessions++;
  save();
}

function tick() {
  if (document.hidden) return;
  const now = performance.now();
  const dt = Math.min((now - lastTick) / 1000, 2); // arka plan sıçramalarına karşı sınır
  lastTick = now;

  updateStreak();
  const k = dayKey();
  if (k !== currentDay) { currentDay = k; dayStartBest = S.bestDay; dayRecordShown = false; }

  sessionSec += dt;
  S.total += dt;
  S.days[k] = (S.days[k] || 0) + dt;

  if (sessionSec > S.bestSession) {
    S.bestSession = sessionSec;
    if (!sessionRecordShown && sessionStartBest >= 60) {
      sessionRecordShown = true;
      newRecord(`En uzun oturum geçildi (${clock(sessionStartBest)})`);
    }
  }
  if (S.days[k] > S.bestDay) {
    S.bestDay = S.days[k];
    if (!dayRecordShown && dayStartBest >= 300) {
      dayRecordShown = true;
      newRecord(`Günlük kullanım rekoru (${human(dayStartBest)})`);
    }
  }

  // Milestone'lar: her 10 dakikada küçük bir titreşim
  if (Math.floor(sessionSec) > 0 && Math.floor(sessionSec) % 600 === 0 && Math.floor(sessionSec - dt) % 600 !== 0) {
    toast(`⏱️ ${human(sessionSec)} oldu, devam!`);
    vibrate(40);
  }

  checkBadges();
  save();
  renderSession();
}
let currentDay = dayKey();

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    hiddenAt = Date.now();
    releaseWake();
  } else {
    lastTick = performance.now();
    if (hiddenAt && Date.now() - hiddenAt > RESUME_WINDOW_MS) {
      toast('Yeni oturum başladı');
      startNewSession();
    }
    hiddenAt = 0;
    requestWake();
    renderAll();
  }
});

// Ekranın kendiliğinden kapanmasını engelle (destekleyen tarayıcılarda)
async function requestWake() {
  try {
    if ('wakeLock' in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    }
  } catch (e) { wakeLock = null; }
}
function releaseWake() {
  try { wakeLock && wakeLock.release(); } catch (e) { /* yoksay */ }
  wakeLock = null;
}

// ---------- Görünüm ----------
const RING_LEN = 2 * Math.PI * 88;

function renderSession() {
  $('sessionTime').textContent = clock(sessionSec);
  const target = Math.max(sessionStartBest, 60);
  const beaten = sessionSec >= sessionStartBest && sessionStartBest > 0;
  $('sessionGoal').textContent = beaten
    ? `Rekor senin! ${clock(S.bestSession)}`
    : `Rekor: ${clock(sessionStartBest)}`;
  const frac = beaten ? 1 : Math.min(sessionSec / target, 1);
  const fg = $('ringFg');
  fg.style.strokeDasharray = RING_LEN;
  fg.style.strokeDashoffset = RING_LEN * (1 - frac);
  fg.classList.toggle('beaten', beaten);

  $('todayTotal').textContent = human(S.days[dayKey()] || 0);
  $('bestDay').textContent = human(S.bestDay);
  $('allTotal').textContent = human(S.total);
  $('bestStreak').textContent = `${S.streakBest} gün`;
  $('streakNow').textContent = S.streakNow;

  // Haftalık grafik dakikada bir yeterli
  if (Math.floor(sessionSec) % 60 === 0) renderWeek();
}

function renderWeek() {
  const names = ['Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct'];
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push({ k: dayKey(d), n: names[d.getDay()], v: S.days[dayKey(d)] || 0, today: i === 0 });
  }
  const max = Math.max(60, ...days.map((d) => d.v));
  const bestV = Math.max(...days.map((d) => d.v));
  $('weekChart').innerHTML = days.map((d) => `
    <div class="col" title="${d.k}: ${human(d.v)}">
      <div class="bar ${d.today ? 'today' : (d.v && d.v === bestV ? 'best' : '')}" style="height:${(d.v / max) * 100}%"></div>
      <div class="d">${d.n}</div>
    </div>`).join('');
}

function renderRecords() {
  const rows = [
    ['⏱️ En uzun oturum', clock(S.bestSession)],
    ['📱 Günlük kullanım rekoru', human(S.bestDay)],
    ['🌍 Toplam kullanım', human(S.total)],
    ['🔥 En uzun seri', `${S.streakBest} gün`],
    ['🔢 Oturum sayısı', S.sessions],
    ['⚡ Hızlı Dokun', `${S.tapBest} dokunuş`],
    ['🎯 Refleks', S.reactBest ? `${S.reactBest} ms` : '—'],
    ['✋ Bırakma', `${(S.holdBest / 1000).toFixed(1)} sn`],
  ];
  $('recordList').innerHTML = rows
    .map(([n, v]) => `<li><span class="n">${n}</span><span class="val">${v}</span></li>`).join('');
  $('badgeList').innerHTML = BADGES
    .map((b) => `<div class="badge ${S.badges[b.id] ? 'on' : ''}"><div class="e">${b.e}</div><div class="t">${b.t}</div></div>`).join('');
}

function renderGames() {
  $('tapBest').textContent = S.tapBest;
  $('reactBest').textContent = S.reactBest ? `${S.reactBest} ms` : '—';
  $('holdBest').textContent = `${(S.holdBest / 1000).toFixed(1)} sn`;
}

function renderAll() { renderSession(); renderWeek(); renderRecords(); renderGames(); }

// ---------- Sekmeler ----------
document.querySelectorAll('.tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b === btn));
    document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === `view-${btn.dataset.view}`));
    if (btn.dataset.view === 'records') renderRecords();
    if (btn.dataset.view === 'games') renderGames();
    window.scrollTo(0, 0);
  });
});

// ---------- Oyun: Hızlı Dokun ----------
(() => {
  const pad = $('tapPad'), main = $('tapMain'), sub = $('tapSub');
  const DURATION = 10000;
  let state = 'idle', count = 0, endAt = 0, raf = 0;

  function frame() {
    const left = Math.max(0, endAt - performance.now());
    sub.textContent = `${(left / 1000).toFixed(1)} sn kaldı`;
    if (left <= 0) return finish();
    raf = requestAnimationFrame(frame);
  }

  function finish() {
    cancelAnimationFrame(raf);
    state = 'locked';
    pad.classList.remove('running');
    const prev = S.tapBest;
    main.textContent = count;
    if (count > prev) {
      S.tapBest = count; checkBadges(); save(); renderGames();
      if (prev > 0) newRecord(`${count} dokunuş`);
      sub.textContent = 'Yeni rekor! Tekrar için dokun';
    } else {
      sub.textContent = `Rekora ${prev - count + 1} kaldı. Tekrar için dokun`;
    }
    setTimeout(() => { state = 'idle'; }, 1200); // yanlışlıkla yeniden başlamayı önle
  }

  pad.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (state === 'locked') return;
    if (state === 'idle') {
      state = 'running'; count = 0; endAt = performance.now() + DURATION;
      pad.classList.add('running');
      raf = requestAnimationFrame(frame);
    }
    count++;
    main.textContent = count;
    vibrate(8);
  });
})();

// ---------- Oyun: Refleks ----------
(() => {
  const pad = $('reactPad'), main = $('reactMain'), sub = $('reactSub');
  let state = 'idle', timer = 0, goAt = 0;

  function setPad(cls, m, s) {
    pad.classList.remove('wait', 'go');
    if (cls) pad.classList.add(cls);
    main.textContent = m; sub.textContent = s;
  }

  pad.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (state === 'idle') {
      state = 'wait';
      setPad('wait', 'BEKLE…', 'Yeşil olunca dokun');
      timer = setTimeout(() => {
        state = 'go'; goAt = performance.now();
        setPad('go', 'DOKUN!', 'Şimdi!');
      }, 1500 + Math.random() * 2500);
    } else if (state === 'wait') {
      clearTimeout(timer);
      state = 'idle';
      setPad('', 'ERKEN!', 'Tekrar denemek için dokun');
      vibrate([30, 30, 30]);
    } else if (state === 'go') {
      const ms = Math.round(performance.now() - goAt);
      state = 'idle';
      const prev = S.reactBest;
      if (!prev || ms < prev) {
        S.reactBest = ms; checkBadges(); save(); renderGames();
        if (prev) newRecord(`${ms} ms refleks`);
        setPad('', `${ms} ms`, 'Yeni rekor! Tekrar için dokun');
      } else {
        setPad('', `${ms} ms`, `Rekor ${prev} ms. Tekrar için dokun`);
      }
    }
  });
})();

// ---------- Oyun: Bırakma ----------
(() => {
  const pad = $('holdPad'), main = $('holdMain'), sub = $('holdSub');
  let start = 0, raf = 0, pid = null;

  function frame() {
    const ms = performance.now() - start;
    main.textContent = `${(ms / 1000).toFixed(1)} sn`;
    sub.textContent = ms > S.holdBest && S.holdBest > 0 ? 'Rekoru geçtin, bırakma!' : `Rekor: ${(S.holdBest / 1000).toFixed(1)} sn`;
    raf = requestAnimationFrame(frame);
  }

  function end() {
    if (pid === null) return;
    pid = null;
    cancelAnimationFrame(raf);
    pad.classList.remove('holding');
    const ms = Math.round(performance.now() - start);
    main.textContent = `${(ms / 1000).toFixed(1)} sn`;
    const prev = S.holdBest;
    if (ms > prev) {
      S.holdBest = ms; checkBadges(); save(); renderGames();
      if (prev > 0) newRecord(`${(ms / 1000).toFixed(1)} sn tuttun`);
      sub.textContent = 'Yeni rekor!';
    } else {
      sub.textContent = 'Tekrar dene';
    }
  }

  pad.addEventListener('pointerdown', (e) => {
    if (pid !== null) return;
    e.preventDefault();
    pid = e.pointerId;
    try { pad.setPointerCapture(pid); } catch (err) { /* yoksay */ }
    start = performance.now();
    pad.classList.add('holding');
    vibrate(15);
    raf = requestAnimationFrame(frame);
  });
  pad.addEventListener('pointerup', (e) => { if (e.pointerId === pid) end(); });
  pad.addEventListener('pointercancel', (e) => { if (e.pointerId === pid) end(); });
  pad.addEventListener('lostpointercapture', (e) => { if (e.pointerId === pid) end(); });
  pad.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('visibilitychange', () => { if (document.hidden) end(); });
})();

// ---------- Sıfırlama ----------
$('resetBtn').addEventListener('click', () => {
  if (!confirm('Tüm rekorlar ve geçmiş silinsin mi?')) return;
  Object.assign(S, defaults());
  save();
  sessionStartBest = 0; dayStartBest = 0;
  startNewSession();
  updateStreak();
  renderAll();
  toast('Sıfırlandı');
});

// ---------- Başlat ----------
updateStreak();
startNewSession();
renderAll();
requestWake();
setInterval(tick, 1000);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* çevrimdışı desteği opsiyonel */ });
  });
}
