// Данные проектов — единый источник для главной и страницы «Проекты».
// Скриншоты лежат в client/public/screens/. Чтобы добавить новый:
// положи файл (webp, ширина 1600px) и допиши объект { src, caption } в массив screens.

export type Screen = {
  src: string; // путь относительно public/
  caption: string; // подпись в лайтбоксе: какая это страница
};

export type Project = {
  slug: string;
  label: string;
  title: string;
  text: string;
  url: string;
  screens: Screen[];
  featured?: boolean;
};

export const PROJECTS: Project[] = [
  {
    slug: 'yeahgrind',
    label: 'продуктивность',
    title: 'YeahGrind',
    text: 'Личный трекер дисциплины: задачи на сегодня, календарь, прогресс и профиль. Лендинг плюс полноценное веб-приложение.',
    url: 'https://yeahdays-production.up.railway.app',
    screens: [
      { src: '/screens/yeahgrind-1.webp', caption: 'Лендинг' },
      { src: '/screens/yeahgrind-2.webp', caption: 'Веб-приложение — главная' },
      { src: '/screens/yeahgrind-3.webp', caption: 'Раздел «Сегодня»' },
      { src: '/screens/yeahgrind-4.webp', caption: 'Календарь' },
      { src: '/screens/yeahgrind-5.webp', caption: 'Прогресс' },
      { src: '/screens/yeahgrind-6.webp', caption: 'Профиль' }
    ]
  },
  {
    slug: 'studyloop',
    label: 'обучение',
    title: 'StudyLoop',
    text: 'Учебная платформа: конспекты и квизы — от создания материала до результатов и истории прохождений.',
    url: 'https://studyloop.tech',
    screens: [
      { src: '/screens/studyloop-1.webp', caption: 'Главная' },
      { src: '/screens/studyloop-2.webp', caption: 'Создание конспекта' },
      { src: '/screens/studyloop-3.webp', caption: 'Прохождение квиза' },
      { src: '/screens/studyloop-4.webp', caption: 'Результаты квиза' },
      { src: '/screens/studyloop-5.webp', caption: 'История' }
    ]
  },
  {
    slug: 'clicki',
    label: 'платформа',
    title: 'Clicki',
    text: 'Платформа, соединяющая креаторов и бизнес: витрина, страницы профилей и личные кабинеты.',
    url: 'https://clicki-platform.com',
    screens: [
      { src: '/screens/clicki-1.webp', caption: 'Главная' },
      { src: '/screens/clicki-2.webp', caption: 'Страница креатора' },
      { src: '/screens/clicki-3.webp', caption: 'Страница бизнеса' },
      { src: '/screens/clicki-4.webp', caption: 'Кабинет креатора' }
    ]
  },
  {
    slug: 'ddc',
    label: 'корпоративный',
    title: 'DDC',
    text: 'Конкурсный корпоративный сайт с живой 3D-сценой и внутренним порталом сотрудников.',
    url: 'https://ddc-v2-production.up.railway.app',
    screens: [
      { src: '/screens/ddc-1.webp', caption: 'Главная' },
      { src: '/screens/ddc-2.webp', caption: 'Портал сотрудников' }
    ]
  },
  {
    slug: 'shmagro',
    label: 'каталог',
    title: 'СХМ Агро',
    text: 'Сайт продавца сельхозтехники: каталог машин, карточки и заявки для реального бизнеса.',
    url: 'https://shmagro.kz',
    screens: [
      { src: '/screens/shmagro-1.webp', caption: 'Главная' },
      { src: '/screens/shmagro-2.webp', caption: 'Каталог техники' }
    ]
  },
  {
    slug: 'blcsoftsale',
    label: 'продажи',
    title: 'BLC Soft Sale',
    text: 'Сайт для продажи софта: продукты, вендоры, подача и заявки без лишней путаницы.',
    url: 'https://blcsoftsale.kz',
    screens: [
      { src: '/screens/blcsoftsale-1.webp', caption: 'Главная' },
      { src: '/screens/blcsoftsale-2.webp', caption: 'Вендоры' }
    ]
  }
];
