// Проверочный скрипт: обходит ключевые страницы сайта в двух вьюпортах,
// ловит вылезающие заголовки (горизонтальный скролл), проверяет лайтбокс
// кейсов, форму согласия на /contact и переход на /privacy из футера.
// Запуск: node scripts/check-site.mjs [baseURL]
// baseURL по умолчанию http://localhost:8080, можно переопределить аргументом
// или переменной окружения BASE_URL.

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotsDir = path.resolve(__dirname, '..', 'screenshots');
mkdirSync(screenshotsDir, { recursive: true });

const baseURL = process.env.BASE_URL || process.argv[2] || 'http://localhost:8080';

const VIEWPORTS = [
  { width: 1920, height: 1080, label: 'desktop' },
  { width: 390, height: 844, label: 'mobile' }
];

const PAGES = ['/', '/projects', '/contact', '/github', '/privacy'];

const results = [];
function record(name, ok, detail) {
  results.push({ name, ok, detail: detail || '' });
  const tag = ok ? 'PASS' : 'FAIL';
  console.log(`[${tag}] ${name}${detail ? ' — ' + detail : ''}`);
}

function slug(p) {
  return p === '/' ? 'home' : p.replace(/^\//, '');
}

const browser = await chromium.launch();

for (const viewport of VIEWPORTS) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(`${page.url()} :: ${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => {
    consoleErrors.push(`${page.url()} :: pageerror: ${err.message}`);
  });

  for (const p of PAGES) {
    await page.goto(baseURL + p, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // б) отсутствие горизонтального скролла
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth
    }));
    const noHScroll = overflow.scrollWidth <= overflow.innerWidth + 1;
    record(
      `no-horizontal-scroll:${p}:${viewport.label}`,
      noHScroll,
      `scrollWidth=${overflow.scrollWidth} innerWidth=${overflow.innerWidth}`
    );

    await page.screenshot({
      path: path.join(screenshotsDir, `${slug(p)}-${viewport.label}.png`),
      fullPage: true
    });
  }

  // в) лайтбокс кейсов — на главной
  try {
    await page.goto(baseURL + '/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const firstShot = page.locator('.case-shot').first();
    await firstShot.scrollIntoViewIfNeeded();
    await firstShot.click();

    const lightbox = page.locator('.lightbox');
    await lightbox.waitFor({ state: 'visible', timeout: 3000 });
    record(`lightbox-opens:${viewport.label}`, true);

    const img = page.locator('.lightbox-img');
    const visible = await img.isVisible();
    const box = await img.boundingBox();
    const withinViewport =
      !!box &&
      box.x >= -1 &&
      box.y >= -1 &&
      box.x + box.width <= viewport.width + 1 &&
      box.y + box.height <= viewport.height + 1;
    record(
      `lightbox-img-in-viewport:${viewport.label}`,
      visible && withinViewport,
      box ? `box=${JSON.stringify(box)} viewport=${viewport.width}x${viewport.height}` : 'no boundingBox'
    );

    const captionBefore = await page.locator('.lightbox-page').textContent();
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(400);
    const captionAfter = await page.locator('.lightbox-page').textContent();
    record(
      `lightbox-arrow-changes-caption:${viewport.label}`,
      captionBefore !== captionAfter,
      `before="${captionBefore}" after="${captionAfter}"`
    );

    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    const closedCount = await page.locator('.lightbox').count();
    record(`lightbox-esc-closes:${viewport.label}`, closedCount === 0, `count=${closedCount}`);
  } catch (err) {
    record(`lightbox-flow:${viewport.label}`, false, err.message);
  }

  // г) форма на /contact
  try {
    await page.goto(baseURL + '/contact', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    await page.fill('input[name="name"]', 'Проверка Скриптом');
    await page.fill('input[name="contact"]', '@check_site_script');
    await page.fill('textarea[name="message"]', 'Автоматическая проверка через Playwright, без согласия.');

    await page.click('button[type="submit"]');
    await page.waitForTimeout(600);

    const statusText = await page.locator('.form-status').textContent();
    const mentionsConsent = /согласие/i.test(statusText || '');
    record(`contact-blocks-without-consent:${viewport.label}`, mentionsConsent, `status="${statusText}"`);

    // Чекбокс визуально перекрыт кастомной меткой (.form-consent-mark),
    // поэтому кликаем по видимой метке — как это делает реальный пользователь.
    const checkbox = page.locator('.form-consent-box');
    await page.locator('.form-consent-mark').click();
    const isChecked = await checkbox.isChecked();
    record(`contact-checkbox-checkable:${viewport.label}`, isChecked, `checked=${isChecked}`);
  } catch (err) {
    record(`contact-form-flow:${viewport.label}`, false, err.message);
  }

  // д) ссылка «Политика конфиденциальности» в футере
  try {
    await page.goto(baseURL + '/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const footerLink = page.locator('footer a', { hasText: 'Политика конфиденциальности' });
    await footerLink.scrollIntoViewIfNeeded();
    await footerLink.click();
    await page.waitForURL('**/privacy', { timeout: 3000 });
    const url = page.url();
    record(`footer-privacy-link:${viewport.label}`, url.includes('/privacy'), `url=${url}`);
  } catch (err) {
    record(`footer-privacy-link:${viewport.label}`, false, err.message);
  }

  // е) console.error — допускаем только шум от 4xx /api/contact
  const relevantErrors = consoleErrors.filter((e) => !/\/api\/contact/i.test(e));
  record(
    `no-console-errors:${viewport.label}`,
    relevantErrors.length === 0,
    relevantErrors.length ? relevantErrors.join(' | ') : ''
  );

  await context.close();
}

await browser.close();

console.log('\n=== СВОДКА ===');
const failed = results.filter((r) => !r.ok);
for (const r of results) {
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? '  (' + r.detail + ')' : ''}`);
}
console.log(`\nВсего: ${results.length}, PASS: ${results.length - failed.length}, FAIL: ${failed.length}`);
console.log(`baseURL: ${baseURL}`);

process.exit(failed.length ? 1 : 0);
