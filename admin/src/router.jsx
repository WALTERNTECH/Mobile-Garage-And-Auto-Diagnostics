import { useEffect, useState } from 'react';

const listeners = new Set();
export function navigate(to, { replace = false } = {}) {
  if (to === location.pathname + location.search) return;
  history[replace ? 'replaceState' : 'pushState'](null, '', to);
  listeners.forEach((fn) => fn());
  window.scrollTo(0, 0);
}
addEventListener('popstate', () => listeners.forEach((fn) => fn()));

export function usePath() {
  const [path, setPath] = useState(location.pathname);
  useEffect(() => {
    const fn = () => setPath(location.pathname);
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);
  return path;
}

export function Link({ to, children, className, onClick, ...rest }) {
  return (
    <a href={to} className={className} {...rest}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        onClick?.(e);
        navigate(to);
      }}>
      {children}
    </a>
  );
}
