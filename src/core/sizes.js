export function createSizes(target) {
  const listeners = new Set();

  const getDpr = () => Math.min(window.devicePixelRatio || 1, 2);

  function read() {
    const el = target.parentElement ?? target;
    const rect = el.getBoundingClientRect();
    return {
      width: Math.max(1, Math.round(rect.width)),
      height: Math.max(1, Math.round(rect.height)),
      dpr: getDpr(),
    };
  }

  function notify() {
    const { width, height, dpr } = read();
    listeners.forEach((fn) => fn(width, height, dpr));
  }

  const ro = new ResizeObserver(notify);
  ro.observe(target.parentElement ?? target);
  window.addEventListener('resize', notify);

  return {
    on(fn) {
      listeners.add(fn);
      const { width, height, dpr } = read();
      fn(width, height, dpr);
      return () => listeners.delete(fn);
    },
    refresh: notify,
    dispose() {
      ro.disconnect();
      window.removeEventListener('resize', notify);
      listeners.clear();
    },
  };
}