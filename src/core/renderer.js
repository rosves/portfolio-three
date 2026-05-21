import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';


export function createRenderer(canvas, opts = {}) {
  const {
    alpha = false,
    clearColor = 0x0a0a0a,
    exposure = 1.0,
  } = opts;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha,
    powerPreference: 'high-performance',
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = exposure;

  renderer.outputColorSpace = THREE.SRGBColorSpace;

  if (!alpha) renderer.setClearColor(clearColor, 1);

  return renderer;
}


export function createComposer(renderer, scene, camera, opts = {}) {
  const {
    bloomStrength = 0.8,
    bloomRadius = 0.6,
    bloomThreshold = 0.18,
  } = opts;

  const composer = new EffectComposer(renderer);

  composer.addPass(new RenderPass(scene, camera));

  const bloom = new UnrealBloomPass(
    new THREE.Vector2(1, 1), // resolution (sera updatée au resize)
    bloomStrength,
    bloomRadius,
    bloomThreshold,
  );
  composer.addPass(bloom);

  composer.addPass(new OutputPass());

  return { composer, bloom };
}