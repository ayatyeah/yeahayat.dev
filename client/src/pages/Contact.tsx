// Форма теперь ходит на наш сервер (/api/contact), а не напрямую в Telegram.
// Токен бота из браузера больше не виден.

import { useRef, useState, type FormEvent } from 'react';
import { TransitionLink } from '../lib/transition';

type Tone = '' | 'pending' | 'success' | 'error';

export default function Contact() {
  const formRef = useRef<HTMLFormElement>(null);
  const [sending, setSending] = useState(false);
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<{ text: string; tone: Tone }>({ text: '', tone: '' });
  const [fx, setFx] = useState('');

  const flash = (name: 'form-shake' | 'form-pop') => {
    setFx('');
    requestAnimationFrame(() => requestAnimationFrame(() => setFx(name)));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sending) return;

    const form = formRef.current;
    if (!form) return;

    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    const contact = String(data.get('contact') || '').trim();
    const message = String(data.get('message') || '').trim();

    if (!name || !contact || !message) {
      setStatus({ text: 'Заполни все поля — так я смогу ответить.', tone: 'error' });
      flash('form-shake');
      return;
    }

    if (!consent) {
      setStatus({ text: 'Отметь согласие с политикой конфиденциальности.', tone: 'error' });
      flash('form-shake');
      return;
    }

    setSending(true);
    setStatus({ text: 'Отправляю заявку…', tone: 'pending' });

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, contact, message, consent })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || `HTTP ${response.status}`);
      }

      form.reset();
      setConsent(false);
      setStatus({ text: 'Готово! Заявка ушла — отвечу в ближайшее время.', tone: 'success' });
      flash('form-pop');
    } catch (error) {
      const text =
        error instanceof Error && error.message && !error.message.startsWith('HTTP')
          ? error.message
          : 'Не получилось отправить. Напиши напрямую в Telegram @yeahayat.';
      setStatus({ text, tone: 'error' });
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="page-main">
      <section className="page-head reveal">
        <h1 className="page-title">Контакты</h1>
      </section>

      <section className="contact-board reveal" id="contact">
        <a className="contact-row magnetic" href="https://t.me/yeahayat" target="_blank" rel="noreferrer">
          <span>Telegram</span>
          <strong>@yeahayat</strong>
        </a>
        <a className="contact-row magnetic" href="mailto:balmagambet.ayat@gmail.com">
          <span>Email</span>
          <strong>balmagambet.ayat@gmail.com</strong>
        </a>
        <TransitionLink className="contact-row magnetic" to="/github">
          <span>GitHub</span>
          <strong>посмотреть код</strong>
        </TransitionLink>
      </section>

      <section className="form-shell reveal" aria-label="Форма обратной связи">
        <div className="form-head">
          <p className="panel-label">оставить заявку</p>
          <h2 className="form-heading">Расскажи о задаче — я отвечу в Telegram.</h2>
        </div>

        <form
          ref={formRef}
          className={`contact-form${sending ? ' is-sending' : ''}${fx ? ` ${fx}` : ''}`}
          id="contactForm"
          noValidate
          onSubmit={onSubmit}
        >
          <div className="form-grid">
            <label className="form-field">
              <span className="form-field-label">Имя</span>
              <input
                className="form-control"
                type="text"
                name="name"
                autoComplete="name"
                placeholder="Как тебя зовут"
                required
              />
            </label>
            <label className="form-field">
              <span className="form-field-label">Контакт для связи</span>
              <input
                className="form-control"
                type="text"
                name="contact"
                autoComplete="email"
                placeholder="@telegram, email или телефон"
                required
              />
            </label>
          </div>

          <label className="form-field">
            <span className="form-field-label">Сообщение</span>
            <textarea
              className="form-control form-textarea"
              name="message"
              rows={5}
              placeholder="О чём проект, сроки, бюджет, ссылки…"
              required
            ></textarea>
          </label>

          <label className="form-consent">
            <input
              className="form-consent-box"
              type="checkbox"
              name="consent"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              required
            />
            <span className="form-consent-mark" aria-hidden="true" />
            <span className="form-consent-text">
              Соглашаюсь с{' '}
              <TransitionLink className="form-consent-link" to="/privacy">
                политикой конфиденциальности
              </TransitionLink>{' '}
              и обработкой персональных данных
            </span>
          </label>

          <div className="form-foot">
            <button className="btn btn-white form-submit magnetic" type="submit" disabled={sending}>
              <span className="form-submit-text">{sending ? 'Отправляю…' : 'Отправить заявку'}</span>
            </button>
            <p className="form-status" id="formStatus" role="status" aria-live="polite" data-tone={status.tone}>
              {status.text}
            </p>
          </div>
        </form>
      </section>
    </main>
  );
}
