import './styles/main.css';
import './styles/layout.css';
import './styles/modules.css';

import { initParticlesSection } from './modules/particles.js';

const featuresCanvas = document.getElementById('projects-bg');
const featuresSection = document.getElementById('projects');

if (featuresCanvas && featuresSection) {
  initParticlesSection(featuresCanvas, featuresSection);
}