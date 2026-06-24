// Генерирует config.js из .env.
// Браузер не читает .env напрямую, поэтому секреты прокидываем в config.js,
// который статические страницы подключают перед script.js.
// Запуск: node gen-config.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const envUrl = new URL('.env', import.meta.url);

let raw;
try {
  raw = readFileSync(envUrl, 'utf8');
} catch {
  console.error('Не найден .env. Скопируй .env.example в .env и впиши значения.');
  process.exit(1);
}

const env = {};
for (const line of raw.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) {
    continue;
  }
  const eq = trimmed.indexOf('=');
  if (eq === -1) {
    continue;
  }
  env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
}

const config = {
  telegram: {
    token: env.TELEGRAM_BOT_TOKEN || '',
    chatId: env.TELEGRAM_CHAT_ID || ''
  }
};

const out =
  '// АВТОГЕНЕРАЦИЯ из .env через gen-config.mjs — не редактировать вручную и не коммитить.\n' +
  `window.__APP_CONFIG__ = ${JSON.stringify(config, null, 2)};\n`;

writeFileSync(new URL('config.js', import.meta.url), out, 'utf8');
console.log('config.js сгенерирован из .env');
