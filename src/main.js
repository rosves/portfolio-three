import "./styles/main.css";
import "./styles/layout.css";
import "./styles/modules.css";
import { initHeroSection } from "./modules/hero.js";
import { initParticlesSection } from "./modules/particles.js";
import { initConfigurator } from "./modules/configurateur.js";

const heroCanvas = document.getElementById("hero_background");
const featuresCanvas = document.getElementById("projects-bg");
const featuresSection = document.getElementById("projects");

if (heroCanvas) {
  initHeroSection(heroCanvas);
}
if (featuresCanvas && featuresSection) {
  initParticlesSection(featuresCanvas, featuresSection);
}

initConfigurator();
