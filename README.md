# yeahayat.dev v2

Портфолио-сайт, переведённый со статики на запускаемое приложение.

## Стек

- **Frontend:** Vite + React 18 + TypeScript, react-router, Three.js (npm, tree-shaking)
- **Backend:** Node.js 22 + Express — раздаёт собранный фронт и принимает заявки формы
- **Деплой:** Railway, один сервис, сборка через Dockerfile

## Что изменилось относительно статичной версии

1. **Безопасность.** Раньше токен Telegram-бота лежал в `config.js` и был виден любому посетителю. Теперь форма отправляется на `POST /api/contact`, а токен живёт только в переменных окружения сервера. Файлы `config.js`, `config.example.js`, `gen-config.mjs` удалены за ненадобностью.
2. **Стек.** Vanilla JS + 4 HTML-страницы → React SPA с роутером. Three.js ставится из npm и режется tree-shaking'ом вместо загрузки всего модуля с unpkg.
3. **Оптимизация.**
   - логотип: 61 КБ PNG → 9 КБ WebP;
   - удалены неиспользуемые картинки (~2.4 МБ);
   - код разбит на чанки (three / vendor / app), хешированные ассеты кешируются на год (immutable);
   - gzip-компрессия на сервере;
   - Three.js сцена ставится на паузу, когда вкладка не видна, и полностью отключает анимацию при `prefers-reduced-motion`;
   - «магнитные» эффекты и tilt не вешаются на тач-устройствах.
4. **Переходы.** Фирменный YA-переход между страницами сохранён и работает поверх react-router без перезагрузки страницы.
5. Старые URL (`/projects.html` и т.п.) отдают 301 на новые роуты — закладки и индексация не ломаются.

## Структура

```
├── client/          # Vite + React + TS
│   ├── public/      # логотип, robots.txt
│   └── src/
│       ├── components/   # VoidScene (three.js), Layout, CursorAura
│       ├── pages/        # Home, Projects, Contact, GitHubPage
│       ├── hooks/        # useInteractions (reveal/magnetic/tilt)
│       ├── lib/          # transition.tsx (YA-переходы)
│       └── styles/       # global.css (перенесённый styles.css)
├── server/index.js  # Express: статика + /api/contact + /health
├── Dockerfile       # multi-stage сборка
├── railway.json     # конфиг деплоя Railway
└── .env.example
```

## Локальный запуск

```bash
# 1. Зависимости
npm install
npm --prefix client install

# 2. Переменные (для формы; без них сайт работает, форма вернёт 503)
export TELEGRAM_BOT_TOKEN=...
export TELEGRAM_CHAT_ID=...

# 3. Продакшен-режим: собрать фронт и запустить сервер
npm run build
npm start                    # http://localhost:8080

# Либо режим разработки (2 терминала):
npm start                    # терминал 1: API на :8080
npm run dev:client           # терминал 2: Vite на :5173 с прокси /api → :8080
```

## Деплой на Railway

1. Запушить репозиторий на GitHub.
2. Railway → **New Project → Deploy from GitHub repo** → выбрать репозиторий. Railway увидит `Dockerfile` и `railway.json` сам.
3. В **Service → Variables** добавить:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`
   (`PORT` Railway подставляет сам — сервер его читает.)
4. Дождаться деплоя, проверить `https://<service>.up.railway.app/health`.
5. **Settings → Networking → Custom Domain** → добавить `yeahayat.dev`. Railway покажет CNAME-значение.

## Миграция с DigitalOcean Static Site

1. Задеплоить на Railway и проверить всё на `*.up.railway.app` (страницы, переходы, форма).
2. В DNS домена `yeahayat.dev` заменить записи, указывающие на DigitalOcean, на CNAME из Railway. Для апекс-домена без поддержки CNAME использовать ALIAS/ANAME или перенести DNS (например, Cloudflare — там CNAME flattening).
3. Подождать TTL, убедиться, что сертификат на Railway выпустился и сайт открывается по домену.
4. Удалить статик-приложение в DigitalOcean.

## ⚠️ Обязательно после переезда

Старый токен бота был публично виден в `config.js` статичной версии. Считай его скомпрометированным:
в @BotFather выполнить `/revoke` для бота, получить новый токен и вписать его в переменные Railway.
