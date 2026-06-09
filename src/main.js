import "./styles/main.css";
import "./styles/layout.css";
import "./styles/modules.css";
import { initHeroSection } from "./modules/hero.js";
import { initParticlesSection } from "./modules/particles.js";
import { initConfigurator } from "./modules/configurateur.js";
import { initLoadingScreen } from "./modules/loader.js";
import { initPerformanceMonitor } from "./core/performance.js";

// Canvas des autres modules visuels.
const heroCanvas = document.getElementById("hero_background");
const featuresCanvas = document.getElementById("projects-bg");
const featuresSection = document.getElementById("projects");

// Démarre l'écran de chargement Three.js dès l'init de la page.
const loader = initLoadingScreen();
const stopPerfMonitor = initPerformanceMonitor();

if (heroCanvas) {
  initHeroSection(heroCanvas);
}
if (featuresCanvas && featuresSection) {
  initParticlesSection(featuresCanvas, featuresSection);
}

initConfigurator({
  // Progression du GLB -> transmise au loader.
  onProgress: (ratio) => loader.setProgress(ratio),
  // Modèle prêt -> demande de fermeture du loader.
  // La fermeture réelle respecte une durée minimale de 3s (dans loader.js).
  onReady: () => loader.complete(),
});

window.addEventListener("load", () => {
  // Sécurité: si un callback "ready" n'arrive pas, on demande quand même
  // la fermeture. Le module loader applique toujours la règle des 3s mini.
  loader.complete();
});

window.addEventListener("beforeunload", () => {
  stopPerfMonitor();
});
