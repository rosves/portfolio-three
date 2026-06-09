import * as THREE from "three";

export function initLoadingScreen() {
  // 1) On récupère le conteneur HTML du loader et son canvas WebGL.
  // Si l'un des deux manque (ex: page différente), on retourne des
  // fonctions vides pour éviter de casser le reste de l'app.
  const loaderEl = document.getElementById("loader");
  const canvas = document.getElementById("loader_three");

  if (!loaderEl || !canvas) {
    return { setProgress: () => {}, complete: () => {} };
  }

  // 2) Scène Three.js dédiée UNIQUEMENT au loader.
  // C'est indépendant de la scène principale de l'astronaute.
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 300);
  camera.position.z = 90;

  // Renderer transparent car le fond est géré par le CSS du loader.
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
  });
  renderer.setClearColor(0x000000, 0);

  // 3) Création d'un champ d'étoiles (points) via BufferGeometry.
  // On stocke les positions dans des tableaux typés pour de bonnes perfs.
  const starCount = 1400;
  const positions = new Float32Array(starCount * 3);
  const seeds = new Float32Array(starCount);

  for (let i = 0; i < starCount; i += 1) {
    const i3 = i * 3;
    positions[i3] = (Math.random() - 0.5) * 240;
    positions[i3 + 1] = (Math.random() - 0.5) * 160;
    positions[i3 + 2] = (Math.random() - 0.5) * 120;
    seeds[i] = Math.random() * Math.PI * 2;
  }

  const starsGeometry = new THREE.BufferGeometry();
  starsGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  starsGeometry.setAttribute("seed", new THREE.BufferAttribute(seeds, 1));

  // ShaderMaterial = petit programme GPU custom.
  // Vertex shader: place les points + gère le scintillement.
  // Fragment shader: dessine chaque point en petit glow circulaire.
  const starsMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
      uAccent: { value: new THREE.Color("#22d3ee") },
    },
    vertexShader: `
      attribute float seed;
      uniform float uTime;
      uniform float uPixelRatio;
      varying float vAlpha;
      varying float vMixAccent;

      void main() {
        vec3 p = position;
        float twinkle = sin(uTime * 0.8 + seed * 5.0) * 0.5 + 0.5;
        p.z += sin(uTime * 0.25 + seed) * 1.8;

        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = (1.4 + twinkle * 1.8) * uPixelRatio;

        vAlpha = 0.22 + twinkle * 0.7;
        vMixAccent = step(0.87, fract(seed * 4.17));
      }
    `,
    fragmentShader: `
      uniform vec3 uAccent;
      varying float vAlpha;
      varying float vMixAccent;

      void main() {
        vec2 c = gl_PointCoord - vec2(0.5);
        float d = length(c);
        float glow = smoothstep(0.52, 0.0, d);
        vec3 color = mix(vec3(1.0), uAccent, vMixAccent);
        gl_FragColor = vec4(color, glow * vAlpha);
      }
    `,
  });

  const stars = new THREE.Points(starsGeometry, starsMaterial);
  scene.add(stars);

  // 4) Étoiles filantes:
  // Chaque "trail" est une ligne qui naît, se déplace en diagonale,
  // puis disparaît progressivement.
  // Un peu moins de traînées actives = rendu plus calme/élégant.
  const trailCount = 5;
  const trailHead = new THREE.Vector3();
  const trailTail = new THREE.Vector3();
  const trails = Array.from({ length: trailCount }, () => {
    const material = new THREE.LineBasicMaterial({
      color: Math.random() < 0.75 ? 0xffffff : 0x22d3ee,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
    });
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(),
      new THREE.Vector3(),
    ]);
    const line = new THREE.Line(geometry, material);
    line.visible = false;
    scene.add(line);

    return {
      line,
      life: 0,
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      ttl: 0,
      length: 0,
      wait: 0.6 + Math.random() * 1.8,
    };
  });

  function resetTrail(trail) {
    // Spawn depuis le haut ou la gauche, puis déplacement vers bas/droite
    // pour rester fidèle à la ref Brutalist.
    const fromTop = Math.random() < 0.5;
    const x = fromTop
      ? (Math.random() - 0.5) * 180
      : -120 + Math.random() * 60;
    const y = fromTop ? 70 + Math.random() * 22 : 45 + Math.random() * 28;
    const z = -15 + Math.random() * 40;
    // Vitesse réduite (avant: 70 -> 125), maintenant plus lisible en vidéo.
    const speed = 26 + Math.random() * 18;
    const angle = -0.62 + (Math.random() - 0.5) * 0.2;

    trail.x = x;
    trail.y = y;
    trail.z = z;
    trail.vx = Math.cos(angle) * speed;
    trail.vy = Math.sin(angle) * speed;
    trail.vz = -0.8 + Math.random() * 1.6;
    trail.length = 24 + Math.random() * 16;
    trail.ttl = 1.3 + Math.random() * 0.8;
    trail.life = trail.ttl;
    trail.line.visible = true;
    trail.line.material.opacity = 0.95;
  }

  function onResize() {
    // Important: garder un rendu net et non déformé au resize.
    const width = window.innerWidth;
    const height = window.innerHeight;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    renderer.setSize(width, height, false);
    renderer.setPixelRatio(pixelRatio);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    starsMaterial.uniforms.uPixelRatio.value = pixelRatio;
  }

  onResize();
  window.addEventListener("resize", onResize);

  // Clock deprecated -> on calcule delta/elapsed avec performance.now.
  let prevTime = performance.now();
  let elapsed = 0;
  let raf = null;
  let completed = false;
  const minDurationMs = 3000; // demandé: loader visible au moins 3 secondes
  const startedAt = performance.now();
  let completionRequested = false;
  let minDurationTimer = null;

  const animate = () => {
    raf = requestAnimationFrame(animate);
    const now = performance.now();
    const delta = (now - prevTime) / 1000;
    prevTime = now;
    elapsed += delta;
    starsMaterial.uniforms.uTime.value = elapsed;
    stars.rotation.y = elapsed * 0.03;
    stars.rotation.x = Math.sin(elapsed * 0.15) * 0.03;

    trails.forEach((trail) => {
      if (trail.life <= 0) {
        trail.wait -= delta;
        if (trail.wait <= 0) {
          resetTrail(trail);
          // Pause plus longue entre deux apparitions pour éviter un effet "mitraillette".
          trail.wait = 0.8 + Math.random() * 2.2;
        }
        return;
      }

      trail.life -= delta;
      trail.x += trail.vx * delta;
      trail.y += trail.vy * delta;
      trail.z += trail.vz * delta;

      const alpha = Math.max(trail.life / trail.ttl, 0);
      trail.line.material.opacity = alpha * 0.85;

      trailHead.set(trail.x, trail.y, trail.z);
      trailTail.set(
        trail.x - (trail.vx / 10) * (trail.length / 10),
        trail.y - (trail.vy / 10) * (trail.length / 10),
        trail.z - (trail.vz / 10) * (trail.length / 10),
      );
      trail.line.geometry.setFromPoints([trailTail, trailHead]);

      if (trail.life <= 0) {
        trail.line.visible = false;
      }
    });

    renderer.render(scene, camera);
  };
  animate();

  // Filet de sécurité: si on ne reçoit jamais "ready", on tente de sortir.
  const fallbackTimer = window.setTimeout(() => {
    requestComplete();
  }, 4500);

  function setProgress(value) {
    // Quand le modèle est à 100%, on demande la fermeture.
    if (Number.isFinite(value) && value >= 1) {
      requestComplete();
    }
  }

  function requestComplete() {
    // Cette fonction peut être appelée plusieurs fois (progress, ready, fallback).
    // On n'exécute la fermeture réelle qu'une seule fois.
    if (completionRequested || completed) return;
    completionRequested = true;

    const elapsedMs = performance.now() - startedAt;
    const remainingMs = Math.max(0, minDurationMs - elapsedMs);

    // Si 3s déjà passées: fermeture immédiate.
    // Sinon: on attend juste le temps restant pour garantir 3s à l'écran.
    if (remainingMs === 0) {
      complete();
      return;
    }

    minDurationTimer = window.setTimeout(() => {
      complete();
    }, remainingMs);
  }

  function complete() {
    if (completed) return;
    completed = true;
    clearTimeout(fallbackTimer);
    if (minDurationTimer) {
      clearTimeout(minDurationTimer);
    }

    // Transition CSS de sortie (fade out)
    loaderEl.classList.add("hidden");
    document.body.classList.remove("loading");

    // Après la transition, on détruit toutes les ressources WebGL
    // pour éviter les fuites mémoire/GPU.
    // Doit correspondre à la durée CSS de fade pour éviter une coupure brutale.
    window.setTimeout(() => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      starsGeometry.dispose();
      starsMaterial.dispose();
      trails.forEach((trail) => {
        trail.line.geometry.dispose();
        trail.line.material.dispose();
      });
      renderer.dispose();
      loaderEl.remove();
    }, 1400);
  }

  return { setProgress, complete: requestComplete };
}
