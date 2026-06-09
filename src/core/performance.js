import Stats from "stats.js";

export function initPerformanceMonitor() {
  // Stats.js seulement en développement pour éviter du bruit en prod.
  if (!import.meta.env.DEV) {
    return () => {};
  }

  const stats = new Stats();
  stats.showPanel(0); // 0 = FPS
  stats.dom.style.left = "10px";
  stats.dom.style.top = "10px";
  stats.dom.style.zIndex = "12000";
  document.body.appendChild(stats.dom);

  let raf = 0;
  const loop = () => {
    stats.update();
    raf = requestAnimationFrame(loop);
  };
  loop();

  return () => {
    cancelAnimationFrame(raf);
    stats.dom.remove();
  };
}
