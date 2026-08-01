// Бесшовные переходы между страницами с фирменным YA-оверлеем.
// Логика повторяет старый navigateSeamlessly, но поверх react-router:
// body.page-leave → навигация → body.page-enter. Вся анимация уже описана в CSS.

import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode, type MouseEvent } from 'react';
import { Link, useLocation, useNavigate, type LinkProps } from 'react-router-dom';

const LEAVE_MS = 520;
const ENTER_MS = 850;

type TransitionContextValue = {
  go: (to: string) => void;
};

const TransitionContext = createContext<TransitionContextValue>({ go: () => {} });

export function TransitionProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const busy = useRef(false);
  const firstRender = useRef(true);

  // При каждой смене маршрута проигрываем page-enter (в т.ч. при первой загрузке).
  useEffect(() => {
    document.body.classList.remove('page-leave', 'is-routing');
    document.body.classList.add('page-enter');
    const timer = window.setTimeout(() => document.body.classList.remove('page-enter'), ENTER_MS);
    if (!firstRender.current) {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
    firstRender.current = false;
    return () => window.clearTimeout(timer);
  }, [location.pathname]);

  const go = useCallback(
    (to: string) => {
      if (busy.current) return;
      if (to === location.pathname) return;

      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced) {
        navigate(to);
        return;
      }

      busy.current = true;
      document.body.classList.add('is-routing', 'page-leave');
      window.setTimeout(() => {
        navigate(to);
        busy.current = false;
      }, LEAVE_MS);
    },
    [navigate, location.pathname]
  );

  return <TransitionContext.Provider value={{ go }}>{children}</TransitionContext.Provider>;
}

export function useTransitionNav() {
  return useContext(TransitionContext);
}

// Ссылка, которая ходит через YA-переход.
export function TransitionLink({ to, onClick, children, ...rest }: LinkProps) {
  const { go } = useTransitionNav();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    go(typeof to === 'string' ? to : to.pathname ?? '/');
  };

  return (
    <Link to={to} onClick={handleClick} data-nav-link="true" {...rest}>
      {children}
    </Link>
  );
}
