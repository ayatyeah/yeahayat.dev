import { useSyncExternalStore } from 'react';

export type Language = 'ru' | 'kk';
const storageKey = 'portfolio-language';
function preferred():Language {
  return navigator.language.toLowerCase().startsWith('kk') ? 'kk' : 'ru';
}
function read():Language {
  try {
    const saved=localStorage.getItem(storageKey);
    if(saved==='kk'||saved==='ru')return saved;
  } catch { /* Use the browser language when storage is unavailable. */ }
  return preferred();
}
let current=read();
document.documentElement.lang=current;
const listeners=new Set<()=>void>();
function apply(lang:Language){
  current=lang;
  document.documentElement.lang=lang;
  listeners.forEach(notify=>notify());
}
window.addEventListener('storage',event=>{
  if(event.key===storageKey || event.key===null)apply(read());
});
export function setLang(lang:Language){
  try{localStorage.setItem(storageKey,lang);}catch{/* Keep the choice for this visit. */}
  apply(lang);
}
function subscribe(notify:()=>void){listeners.add(notify);return ()=>{listeners.delete(notify);};}
export function useLang(){return useSyncExternalStore(subscribe,()=>current);}
