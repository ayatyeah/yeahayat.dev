import type { ComponentType } from 'react';

type PageModule = { default: ComponentType };
function route(load: () => Promise<PageModule>) {
  let component: ComponentType | undefined;
  let pending: Promise<void> | undefined;
  function preload() {
    return pending ??= load().then(module => { component = module.default; });
  }
  return {
    preload,
    read() {
      if (!component) throw preload();
      return component;
    }
  };
}

export const routeModules = {
  '/': route(() => import('../pages/Home')),
  '/projects': route(() => import('../pages/Projects')),
  '/contact': route(() => import('../pages/Contact')),
  '/github': route(() => import('../pages/GitHubPage')),
  '/privacy': route(() => import('../pages/Privacy'))
};

export function getRouteModule(path: string) {
  return Object.prototype.hasOwnProperty.call(routeModules, path) ? routeModules[path as keyof typeof routeModules] : undefined;
}
