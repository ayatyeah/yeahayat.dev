import SunPuzzle from '../components/SunPuzzle';
import ProjectWorkshop from '../components/ProjectWorkshop';
import WaterJournal from '../components/WaterJournal';
import ArchiveOpening from '../components/ArchiveOpening';
import WaterScene from '../components/WaterScene';
import ProjectShowcase from '../components/ProjectShowcase';
import ServiceWorkbench from '../components/ServiceWorkbench';
import { useLang } from '../lib/language';
import '../styles/business.css';

const copy = {
  ru: {
    name: 'Аят Балмагамбет',
    headline: 'Что я могу сделать',
    introduction: 'Дизайнер и разработчик. Создаю сайты для бизнеса — от каталога техники до учебной платформы.',
    services: [
      ['Каталоги и заявки', 'Помогаю покупателю разобраться в ассортименте и связаться с продавцом. В каталоге «СХМ Агро» можно выбрать сельхозтехнику и оставить заявку.'],
      ['Личные кабинеты', 'Продумываю, что видят и делают пользователи с разными ролями. В Clicki у бизнеса и креаторов свои профили и кабинеты.'],
      ['Учебные сервисы', 'Собираю уроки, задания и результаты в одном интерфейсе. В StudyLoop из конспекта можно составить тест, пройти его и посмотреть результат.']
    ],
    discuss: 'Обсудить задачу',
    cases: 'Избранные проекты',
    casesIntro: 'Урок на пять минут, каталог сельхозтехники и кабинет автора. Шесть проектов с разными задачами.',
  },
  kk: {
    name: 'Аят Балмағамбет',
    headline: 'Сізге қалай көмектесемін',
    introduction: 'Дизайнер әрі әзірлеушімін. Бизнеске арнап техника каталогынан бастап оқу платформасына дейін сайттар жасаймын.',
    services: [
      ['Каталогтар мен өтінімдер', 'Сатып алушыға тауар таңдап, сатушымен байланысуға көмектесетін сайттар жасаймын. «СХМ Агро» каталогынан ауыл шаруашылығы техникасын таңдап, өтінім қалдыруға болады.'],
      ['Жеке кабинеттер', 'Әр пайдаланушыға өз жұмысына қажет бөлімдер мен мүмкіндіктерді жобалаймын. Clicki платформасында компаниялар мен контент авторларының жеке профильдері мен кабинеттері бар.'],
      ['Оқу сервистері', 'Сабақты, тапсырманы және оның нәтижесін бір интерфейске біріктіремін. StudyLoop платформасында конспект негізінде тест құрастырып, оны тапсырып, нәтижесін көруге болады.']
    ],
    discuss: 'Жобаны талқылау',
    cases: 'Таңдаулы жобалар',
    casesIntro: 'Бес минуттық сабақ, ауыл шаруашылығы техникасының каталогы және автордың жеке кабинеті. Алты жоба, алты түрлі міндет.',
  }
};

export default function Home() {
  const lang = useLang();
  const text = copy[lang];

  return (
    <main className="page-main page-main-home">
      <WaterScene name={text.name} introduction={text.introduction} discuss={text.discuss} />
      <WaterJournal>
        <ServiceWorkbench heading={text.headline} services={text.services} />

        <section data-current className="home-cases" id="cases" aria-labelledby="work-heading">
          <div className="section-head archive-banner" data-current>
            <ArchiveOpening heading={text.cases} introduction={text.casesIntro} />
          </div>
          <ProjectShowcase board />
        </section>

        <ProjectWorkshop />

        <SunPuzzle />

      </WaterJournal>
    </main>
  );
}
