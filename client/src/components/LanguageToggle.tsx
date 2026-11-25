import {setLang,useLang} from '../lib/language';

export default function LanguageToggle(){
  const lang=useLang();
  return <span className="lang-switch" role="group" aria-label={lang==='ru'?'Язык сайта':'Сайт тілі'}>
    {(['ru','kk'] as const).map(code=><button type="button" key={code} lang={code} aria-label={code==='ru'?'Русский':'Қазақша'} aria-pressed={code===lang} onClick={()=>setLang(code)}>{code==='ru'?'РУС':'ҚАЗ'}</button>)}
  </span>;
}
