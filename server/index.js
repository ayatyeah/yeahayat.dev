// Сервер yeahayat.dev для Railway.
// 1) Раздаёт собранный фронтенд (client/dist) с компрессией и кешированием.
// 2) POST /api/contact — принимает заявку и отправляет её в Telegram.
//    Токен бота живёт ТОЛЬКО здесь, в переменных окружения. В браузер он не попадает.
// 3) GET /health — healthcheck для Railway.

import express from 'express';
import compression from 'compression';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../client/dist');

const PORT = Number(process.env.PORT) || 8080;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

const app = express();
app.disable('x-powered-by');
app.use(compression());
app.use(express.json({ limit: '32kb' }));

// Базовые security-заголовки (без лишних зависимостей).
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// ---------- API ----------

// Простейший rate limit в памяти: не больше 5 заявок с одного IP за 10 минут.
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 5;
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const entry = hits.get(ip) || [];
  const fresh = entry.filter((t) => now - t < RATE_WINDOW_MS);
  if (fresh.length >= RATE_MAX) {
    hits.set(ip, fresh);
    return true;
  }
  fresh.push(now);
  hits.set(ip, fresh);
  // Лёгкая уборка, чтобы Map не рос бесконечно.
  if (hits.size > 5000) {
    for (const [key, times] of hits) {
      if (times.every((t) => now - t >= RATE_WINDOW_MS)) hits.delete(key);
    }
  }
  return false;
}

function clean(value, max) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

app.post('/api/contact', async (req, res) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';

  if (rateLimited(ip)) {
    return res.status(429).json({ ok: false, error: 'Слишком много заявок. Попробуй чуть позже.' });
  }

  const name = clean(req.body?.name, 120);
  const contact = clean(req.body?.contact, 160);
  const message = String(req.body?.message ?? '').trim().slice(0, 2000);

  if (!name || !contact || !message) {
    return res.status(400).json({ ok: false, error: 'Заполни все поля.' });
  }

  if (req.body?.consent !== true) {
    return res.status(400).json({ ok: false, error: 'Нужно согласие с политикой конфиденциальности.' });
  }

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error('[contact] TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID не заданы');
    return res.status(503).json({ ok: false, error: 'Форма временно не настроена.' });
  }

  const text =
    '🚀 Новая заявка с yeahayat.dev\n\n' +
    `👤 Имя: ${name}\n` +
    `📡 Контакт: ${contact}\n` +
    `💬 Сообщение:\n${message}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const tgResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        disable_web_page_preview: true
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    const payload = await tgResponse.json().catch(() => ({}));
    if (!tgResponse.ok || !payload.ok) {
      console.error('[contact] Telegram error:', payload.description || tgResponse.status);
      return res.status(502).json({ ok: false, error: 'Не получилось отправить. Напиши напрямую в Telegram.' });
    }

    return res.json({ ok: true });
  } catch (error) {
    console.error('[contact] fail:', error.message);
    return res.status(502).json({ ok: false, error: 'Не получилось отправить. Напиши напрямую в Telegram.' });
  }
});

app.get('/health', (req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

// ---------- Статика ----------

// Хешированные ассеты Vite можно кешировать навсегда.
app.use(
  '/assets',
  express.static(path.join(distDir, 'assets'), {
    immutable: true,
    maxAge: '1y'
  })
);

app.use(express.static(distDir, { maxAge: '1h', index: false }));

// Редиректы со старых статических URL (DigitalOcean) на новые роуты.
const legacyRoutes = {
  '/index.html': '/',
  '/projects.html': '/projects',
  '/contact.html': '/contact',
  '/github.html': '/github'
};
app.get(Object.keys(legacyRoutes), (req, res) => {
  res.redirect(301, legacyRoutes[req.path]);
});

// SPA-fallback: любые остальные GET-запросы получают index.html.
app.get('*', (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'), {
    headers: { 'Cache-Control': 'no-cache' }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`yeahayat.dev server on :${PORT}`);
});
