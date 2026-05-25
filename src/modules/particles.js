import * as THREE from 'three';
import { createRenderer, createComposer } from '../core/renderer.js';
import { createScene } from '../core/scene.js';
import { createSizes } from '../core/sizes.js';

// ──────────────────────────────────────────────────────────────────────────────
//  PALETTE STELLAIRE — couleurs naturelles d'étoiles
// ──────────────────────────────────────────────────────────────────────────────

const STAR_COLORS = [
  new THREE.Color('#aaccff'), 
  new THREE.Color('#cfdfff'), 
  new THREE.Color('#ffffff'), 
  new THREE.Color('#fff4e6'), 
  new THREE.Color('#ffd9a8'), 
  new THREE.Color('#ffb074'), 
];

const COLOR_WEIGHTS = [0.05, 0.18, 0.35, 0.25, 0.12, 0.05];

function pickStarColor() {
  const r = Math.random();
  let acc = 0;
  for (let i = 0; i < COLOR_WEIGHTS.length; i++) {
    acc += COLOR_WEIGHTS[i];
    if (r <= acc) return STAR_COLORS[i];
  }
  return STAR_COLORS[2];
}

// ──────────────────────────────────────────────────────────────────────────────
//  SHADERS
// ──────────────────────────────────────────────────────────────────────────────

const VERT = /* glsl */ `
  uniform float uTime;
  uniform float uPixel;

  attribute float aSize;
  attribute float aPhase;
  attribute vec3  aColor;

  varying float vTwinkle;
  varying vec3  vColor;

  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;

    // Scintillement très doux. Phase propre à chaque étoile.
    float t = uTime * (0.4 + aPhase * 0.8) + aPhase * 6.2831;
    vTwinkle = 0.85 + 0.15 * sin(t);

    // Atténuation par la distance pour donner de la profondeur
    gl_PointSize = aSize * uPixel * (260.0 / -mv.z);

    vColor = aColor;
  }
`;


const FRAG = /* glsl */ `
  precision highp float;

  varying float vTwinkle;
  varying vec3  vColor;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d2 = dot(uv, uv);

    // Noyau lumineux (gaussienne serrée)
    float core = exp(-d2 * 45.0);
    // Halo plus large (gaussienne molle)
    float halo = exp(-d2 * 7.0) * 0.35;

    float i = (core + halo) * vTwinkle;
    if (i < 0.01) discard;

    // L'intensité > 1 sur le noyau nourrit le bloom
    gl_FragColor = vec4(vColor * (0.8 + core * 1.2), i);
  }
`;

// ──────────────────────────────────────────────────────────────────────────────
//  GÉNÉRATION DES ÉTOILES
// ──────────────────────────────────────────────────────────────────────────────

function buildStars(count, radiusRange, sizeRange) {
  const positions = new Float32Array(count * 3);
  const sizes     = new Float32Array(count);
  const phases    = new Float32Array(count);
  const colors    = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const u = Math.random();
    const v = Math.random();
    const theta = u * Math.PI * 2;
    const phi = Math.acos(2 * v - 1);
    const r = radiusRange[0] +
              (radiusRange[1] - radiusRange[0]) * Math.cbrt(Math.random());

    positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);

    const t = Math.pow(Math.random(), 2.5);
    sizes[i] = sizeRange[0] + (sizeRange[1] - sizeRange[0]) * t;

    phases[i] = Math.random();

    const c = pickStarColor();
    colors[i * 3]     = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('aSize',    new THREE.BufferAttribute(sizes, 1));
  geom.setAttribute('aPhase',   new THREE.BufferAttribute(phases, 1));
  geom.setAttribute('aColor',   new THREE.BufferAttribute(colors, 3));
  return geom;
}

// ──────────────────────────────────────────────────────────────────────────────
//  MODULE PRINCIPAL
// ──────────────────────────────────────────────────────────────────────────────

export function initParticlesSection(canvas, pointerTarget) {
  const renderer = createRenderer(canvas, { clearColor: 0x000000, exposure: 1.0 });
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  const { scene, camera } = createScene({
    bgColor: 0x000000,
    fog: false,
    fov: 60,
    cameraZ: 0, 
  });

  //  2. Layer "stars" — 5000 étoiles aux couleurs naturelles 
  const starsGeom = buildStars(5000, [30, 100], [1.0, 3.5]);
  const starsMat  = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uTime:  { value: 0 },
      uPixel: { value: dpr },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const stars = new THREE.Points(starsGeom, starsMat);
  scene.add(stars);

  //  3. Post-processing — bloom subtil 
  const { composer, bloom } = createComposer(renderer, scene, camera, {
    bloomStrength: 0.7,
    bloomRadius: 0.55,
    bloomThreshold: 0.28,
  });

  //  4. Resize 
  const sizes = createSizes(canvas);
  sizes.on((w, h, dprNew) => {
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloom.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    starsMat.uniforms.uPixel.value = dprNew;
  });

  //  5. Parallaxe souris — la caméra "regarde autour" 
  const pt = pointerTarget ?? canvas.parentElement ?? document.body;
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  pt.addEventListener('pointermove', (e) => {
    const r = pt.getBoundingClientRect();
    mouse.tx = (e.clientX - r.left) / r.width - 0.5;
    mouse.ty = (e.clientY - r.top) / r.height - 0.5;
  });

  //  6. Boucle de rendu 
  const clock = new THREE.Clock();
  let raf = 0;

  function tick() {
    const dt = clock.getDelta();
    const t  = clock.getElapsedTime();

    // Update du temps : scintillement
    starsMat.uniforms.uTime.value = t;

    // Rotation très lente du champ d'étoiles
    stars.rotation.y += dt * 0.008;

    // Parallaxe souris : on lisse pour éviter les à-coups
    mouse.x += (mouse.tx - mouse.x) * 0.04;
    mouse.y += (mouse.ty - mouse.y) * 0.04;
    camera.rotation.y = -mouse.x * 0.35;
    camera.rotation.x = -mouse.y * 0.22;

    composer.render();
    raf = requestAnimationFrame(tick);
  }
  tick();

  // ── 7. Nettoyage ────────────────────────────────────────────────────────────
  return {
    dispose() {
      cancelAnimationFrame(raf);
      sizes.dispose();
      stars.geometry.dispose();
      stars.material.dispose();
      scene.remove(stars);
      composer.dispose?.();
      renderer.dispose();
    },
  };
}