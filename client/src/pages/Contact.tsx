import '../styles/shore-pages.css';
// Форма теперь ходит на наш сервер (/api/contact), а не напрямую в Telegram.
// Токен бота из браузера больше не виден.

import { useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PROJECTS } from '../data/projects';
import { TransitionLink } from '../lib/transition';

import { useLang } from '../lib/language';

const feedback = {
  ru: {
    fields: 'Укажите имя, контакт для ответа и кратко опишите задачу.',
    consent: 'Чтобы отправить заявку, отметьте согласие на обработку данных.',
    pending: 'Отправляю заявку…',
    success: 'Спасибо за заявку! Я свяжусь с вами по указанному контакту.',
    limit: 'Слишком много заявок. Попробуйте отправить чуть позже.',
    unavailable: 'Форма временно недоступна. Вы можете написать мне в Telegram — @yeahayat.',
    failure: 'Не удалось отправить заявку. Попробуйте ещё раз или напишите в Telegram — @yeahayat.'
  },
  kk: {
    fields: 'Атыңызды, байланыс дерегіңізді және жобаның қысқаша сипаттамасын жазыңыз.',
    consent: 'Өтінімді жіберу үшін деректеріңізді өңдеуге келісім беріңіз.',
    pending: 'Өтінім жіберіліп жатыр…',
    success: 'Өтініміңізге рақмет! Өзіңіз көрсеткен байланыс арнасы арқылы хабарласамын.',
    limit: 'Қысқа уақытта тым көп өтінім жіберілді. Сәл кейінірек қайталап көріңіз.',
    unavailable: 'Форма уақытша қолжетімсіз. Маған Telegram арқылы жаза аласыз — @yeahayat.',
    failure: 'Өтінім жіберілмеді. Қайталап көріңіз немесе Telegram арқылы хабарласыңыз — @yeahayat.'
  }
} as const;

export default function Contact() {
  const lang = useLang();
  const kk = lang === 'kk';
  const [params] = useSearchParams();
  const example = PROJECTS.find(project => project.slug === params.get('project'));
  const formRef = useRef<HTMLFormElement>(null);
  const [sending, setSending] = useState(false);
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<keyof typeof feedback.ru | ''>('');
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
      setStatus('fields');
      flash('form-shake');
      return;
    }

    if (!consent) {
      setStatus('consent');
      flash('form-shake');
      return;
    }

    setSending(true);
    setStatus('pending');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, contact, consent,
          message: example && data.has('include-example')
            ? (kk ? 'Ұқсас жоба — ' : 'Похожий проект — ') + example.title + '\n\n' + message
            : message
        })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.ok) {
        if (response.status === 429) setStatus('limit');
        else if (response.status === 503) setStatus('unavailable');
        else if (response.status === 400) setStatus('fields');
        else setStatus('failure');
        return;
      }

      form.reset();
      setConsent(false);
      setStatus('success');
      flash('form-pop');
    } catch {
      setStatus('failure');
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="page-main shore-page shore-contact">
      <section className="page-head shore-head">
        <h1 className="page-title">{kk ? 'Байланыс' : 'Контакты'}</h1>
        <a className="shore-action" href="#contactForm">{kk ? 'Жоба туралы жазу' : 'Рассказать о проекте'} <span aria-hidden="true">↘</span></a>
      </section>

      <section className="contact-board reveal" id="contact">
        <a className="contact-row" href="https://t.me/yeahayat" target="_blank" rel="noreferrer">
          <span>Telegram</span>
          <strong>@yeahayat</strong>
        </a>
        <a className="contact-row" href="mailto:balmagambet.ayat@gmail.com">
          <span>{kk ? 'Электрондық пошта' : 'Электронная почта'}</span>
          <strong>balmagambet.ayat@gmail.com</strong>
        </a>
        <TransitionLink className="contact-row" to="/github">
          <span>GitHub</span>
          <strong>{kk ? 'Жобалардың кодын көру' : 'Посмотреть код проектов'}</strong>
        </TransitionLink>
      </section>

      <section className="form-shell reveal" aria-label={kk ? 'Кері байланыс формасы' : 'Форма обратной связи'}>
        <div className="form-head">
          <p className="panel-label">{kk ? 'өтінім қалдыру' : 'оставить заявку'}</p>
          <h2 className="form-heading">{kk ? 'Қандай мәселені шешкіңіз келеді?' : 'Какую задачу вы хотите решить?'}</h2>
        </div>

        <form
          ref={formRef}
          className={`contact-form${sending ? ' is-sending' : ''}${fx ? ` ${fx}` : ''}`}
          id="contactForm"
          noValidate
          onSubmit={onSubmit}
        >
          {example && <label className="form-consent" key={example.slug}>
            <input className="form-consent-box" type="checkbox" name="include-example" />
            <span className="form-consent-mark" aria-hidden="true" />
            <span className="form-consent-text">{kk
              ? 'Хабарламада «' + example.title + '» жобасын мысал ретінде көрсету'
              : 'Указать «' + example.title + '» как пример в сообщении'}</span>
          </label>}
          <div className="form-grid">
            <label className="form-field">
              <span className="form-field-label">{kk ? 'Атыңыз' : 'Имя'}</span>
              <input
                className="form-control"
                type="text"
                name="name"
                autoComplete="name"
                placeholder={kk ? 'Сізге қалай жүгінейін?' : 'Как к вам обращаться?'}
                required
              />
            </label>
            <label className="form-field">
              <span className="form-field-label">{kk ? 'Сізбен қалай хабарласуға болады?' : 'Куда вам ответить?'}</span>
              <input
                className="form-control"
                type="text"
                name="contact"
                autoComplete="email"
                placeholder={kk ? 'Telegram, пошта немесе телефон' : 'Telegram, почта или телефон'}
                required
              />
            </label>
          </div>

          <label className="form-field">
            <span className="form-field-label">{kk ? 'Жоба туралы' : 'О проекте'}</span>
            <textarea
              className="form-control form-textarea"
              name="message"
              rows={5}
              placeholder={kk ? 'Мысалы, клиенттер қазір телефонмен жазылады. Оларға сайттан ыңғайлы уақыт таңдау мүмкіндігін бергіміз келеді.' : 'Например, сейчас клиенты записываются по телефону. Хотим, чтобы они сами выбирали время на сайте.'}
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
              {kk ? '' : 'Соглашаюсь с '}
              <TransitionLink className="form-consent-link" to="/privacy">
                {kk ? 'Құпиялық саясатымен' : 'политикой конфиденциальности'}
              </TransitionLink>{' '}
              {kk ? 'және дербес деректерімді өңдеуге келісемін' : 'и даю согласие на обработку моих персональных данных'}
            </span>
          </label>

          <div className="form-foot">
            <button className="btn btn-white form-submit" type="submit" disabled={sending}>
              <span className="form-submit-text">{sending ? feedback[lang].pending : (kk ? 'Өтінімді жіберу' : 'Отправить заявку')}</span>
            </button>
            <p className="form-status" id="formStatus" role="status" aria-live="polite" data-tone={['pending', 'success', ''].includes(status) ? status : 'error'}>
              {status && feedback[lang][status]}
            </p>
          </div>
        </form>
      </section>
    </main>
  );
}
