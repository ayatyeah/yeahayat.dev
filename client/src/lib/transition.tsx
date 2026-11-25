import { createContext, useCallback, useContext, useLayoutEffect, useRef, type ReactNode, type MouseEvent } from 'react';
import { flushSync } from 'react-dom';
import { Link, useLocation, useNavigate, useNavigationType, type LinkProps } from 'react-router-dom';

import { getRouteModule } from './routeModules';

type TransitionContextValue = { go: (to: LinkProps['to']) => void };
const TransitionContext = createContext<TransitionContextValue>({ go: () => {} });
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function TransitionProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const navigationType = useNavigationType();
  const active = useRef<ReturnType<Document['startViewTransition']> | null>(null);
  const revision = useRef(0);
  const positions = useRef(new Map<string, number>());
  const entry = location.key + location.pathname + location.search + location.hash;
  const current = useRef({ entry, path: location.pathname });

  useLayoutEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    const save = () => positions.current.set(current.current.entry, window.scrollY);
    const cancelSnapshot = () => {
      ++revision.current;
      active.current?.skipTransition();
    };
    window.addEventListener('scroll', save, { passive: true });
    window.addEventListener('popstate', cancelSnapshot);
    return () => {
      window.history.scrollRestoration = previous;
      window.removeEventListener('scroll', save);
      window.removeEventListener('popstate', cancelSnapshot);
      cancelSnapshot();
    };
  }, []);

  useLayoutEffect(() => {
    const previous = current.current;
    current.current = { entry, path: location.pathname };
    if (previous.path === location.pathname) return;
    const position = navigationType === 'POP' ? positions.current.get(entry) : 0;
    window.scrollTo({ top: position ?? 0, behavior: 'instant' });
    if (!active.current && !reduceMotion()) {
      document.querySelector('main')?.animate([{ opacity: .72 }, { opacity: 1 }], {
        duration: 210, easing: 'ease-out'
      });
    }
  }, [entry, location.pathname, navigationType]);

  const go = useCallback(async (to: LinkProps['to']) => {
    const path = typeof to === 'string' ? to.split(/[?#]/, 1)[0] : to.pathname;
    if (to === location.pathname && !location.hash && !location.search) return;
    positions.current.set(current.current.entry, window.scrollY);
    const ticket = ++revision.current;
    active.current?.skipTransition();
    if (path && path !== location.pathname) {
      try { await getRouteModule(path)?.preload(); }
      catch {
        if (ticket === revision.current && typeof to === 'string') window.location.assign(to);
        return;
      }
      if (ticket !== revision.current) return;
    }
    if (!path || path === location.pathname || reduceMotion() || !document.startViewTransition) {
      navigate(to);
      return;
    }
    const transition = document.startViewTransition(() => {
      if (ticket === revision.current) flushSync(() => navigate(to));
    });
    active.current = transition;
    // A superseding navigation rejects ready even when the route update succeeded.
    void Promise.allSettled([transition.ready, transition.updateCallbackDone, transition.finished]).then(([, update]) => {
      if (update.status === 'rejected') console.error('Route navigation failed', update.reason);
      if (active.current === transition) active.current = null;
    });
  }, [navigate, location.pathname, location.hash, location.search]);

  return <TransitionContext.Provider value={{ go }}>{children}</TransitionContext.Provider>;
}

export function useTransitionNav() {
  return useContext(TransitionContext);
}

export function TransitionLink({ to, onClick, children, ...rest }: LinkProps) {
  const { go } = useTransitionNav();
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || rest.reloadDocument || (rest.target && rest.target !== '_self')) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    go(to);
  };
  return <Link to={to} onClick={handleClick} data-nav-link="true" {...rest}>{children}</Link>;
}
