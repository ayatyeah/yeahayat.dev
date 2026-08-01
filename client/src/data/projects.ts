// Данные проектов — единый источник для главной и страницы «Проекты».
// Чтобы добавить реальные скриншоты: положи файлы в client/public/screens/
// (например clicki-1.webp, clicki-2.webp) и перечисли их в массиве screens.

export type Project = {
  slug: string;
  label: string;
  title: string;
  text: string;
  url: string;
  screens: string[]; // пути относительно public/
  featured?: boolean;
};

export const PROJECTS: Project[] = [
  {
    slug: 'yeahmusic',
    label: 'музыка',
    title: 'YeahMusic',
    text: 'Музыкальный веб-сервис с живым интерфейсом, личной атмосферой и быстрым доступом к трекам.',
    url: 'https://yeahmusic.tech',
    screens: ['/screens/yeahmusic-1.svg'],
    featured: true
  },
  {
    slug: 'studyloop',
    label: 'обучение',
    title: 'StudyLoop',
    text: 'Платформа для учёбы, где материалы и прогресс собраны в понятный спокойный поток.',
    url: 'https://studyloop.tech',
    screens: ['/screens/studyloop-1.svg']
  },
  {
    slug: 'blcsoftsale',
    label: 'продажи',
    title: 'BLC Soft Sale',
    text: 'Рабочий сайт для продажи софта: продукты, подача, заявки и коммерческая структура без лишней путаницы.',
    url: 'https://blcsoftsale.kz',
    screens: ['/screens/blcsoftsale-1.svg']
  },
  {
    slug: 'clicki',
    label: 'платформа',
    title: 'Clicki',
    text: 'Платформа с продуманным интерфейсом и живым взаимодействием — собрана как цельный продукт под реальные сценарии.',
    url: 'https://clicki-platform.com',
    screens: ['/screens/clicki-1.svg']
  }
];
