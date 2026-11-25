import { useState } from 'react';
import { useLang } from '../lib/language';
import '../styles/waterFigure.css';

const actions: Record<string, [string,string]> = {
  cursor: ['Нажать водяным курсором','Су меңзерімен басу'],
  code: ['Раздвинуть скобки','Жақшаларды ашу'],
  studyloop: ['Запустить цикл повторения','Қайталау циклін іске қосу'],
  clicki: ['Потянуть звенья цепи','Тізбек буындарын тарту'],
  ddc: ['Повернуть куб на следующую грань','Текшені келесі қырына бұру'],
  shmagro: ['Качнуть колос','Масақты тербету'],
  blcsoftsale: ['Повернуть ключ','Кілтті бұру']
};

export default function WaterFigure({kind}:{kind:string}) {
  const kk = useLang() === 'kk';
  const [open,setOpen] = useState(false);
  if (kind === 'yeahgrind') {
    const action = kk ? (open ? 'Кітапты жабу' : 'Кітапты ашу') : (open ? 'Закрыть книгу' : 'Открыть книгу');
    return <button type="button" data-water-figure={kind} className="water-figure water-book"
      aria-expanded={open} onClick={() => setOpen(current => !current)}>
      <canvas aria-hidden="true"/><span className="water-book-action">{action}</span>
    </button>;
  }
  const label = actions[kind]?.[kk ? 1 : 0];
  return <button type="button" data-water-figure={kind} className="water-figure"
    aria-label={label} title={label} onClick={event => {
      if (event.currentTarget.dataset.figureFallback !== 'wheat') return;
      window.dispatchEvent(new Event('water-splash'));
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const canvas = event.currentTarget.querySelector('canvas');
      canvas?.getAnimations().forEach(animation => animation.cancel());
      canvas?.animate([{transform:'rotate(0deg)'},{transform:'rotate(-17deg)'},{transform:'rotate(9deg)'},{transform:'rotate(0deg)'}],
        {duration:750,easing:'ease-in-out'});
    }}><canvas aria-hidden="true"/></button>;
}
