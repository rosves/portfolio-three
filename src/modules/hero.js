import * as THREE from "three";
import { createRenderer } from "../core/renderer.js";
import { createSizes } from "../core/sizes.js";

export function initHeroSection(canvas) {
  const isMobile = window.matchMedia("(max-width: 768px)").matches;

  const renderer = createRenderer(canvas, {
    clearColor: 0x0a0a0a, // Fond noir
    exposure: 1.0,
  });

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a0a);

  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    200,
  );
  camera.position.set(0, 0, 22);

  //Météorite
  const meteorGeometry = new THREE.SphereGeometry(12, 12, 12);
  const manager = new THREE.LoadingManager();
  manager.onLoad = () => console.log("tout est chargé");

  const loader = new THREE.TextureLoader(manager);
  const colorMap = loader.load(
    "/textures/meteorite/rock_boulder_dry_diff_2k.jpg",
  );
  const normalMap = loader.load(
    "/textures/meteorite/rock_boulder_dry_nor_gl_2k.jpg",
  );
  const roughnessMap = loader.load(
    "/textures/meteorite/rock_boulder_dry_rough_2k.jpg",
  );
  const meteorMaterial = new THREE.MeshStandardMaterial({
    map: colorMap,
    normalMap: normalMap,
    roughnessMap: roughnessMap,
  });
  const meteor = new THREE.Mesh(meteorGeometry, meteorMaterial);
  meteor.position.set(isMobile ? 3 : 13, 0, 0);
  scene.add(meteor);


  // Lumières
  const ambientLight = new THREE.AmbientLight(0x1a1a1a, 0.4);
  scene.add(ambientLight);
  const mainLight = new THREE.DirectionalLight(0xffffff, 1.8);
  mainLight.position.set(25, 8, 15);
  scene.add(mainLight);
  const blueLight = new THREE.SpotLight(0x0088cc, 100);
  blueLight.position.set(-3, -6, 19);
  scene.add(blueLight);

  //   const sizes = createSizes(canvas);
  //   sizes.on((width, height, dpr) => {
  //     camera.aspect = width / height;
  //     camera.updateProjectionMatrix();
  //     renderer.setSize(width, height);
  //     renderer.setPixelRatio(dpr);
  //   });

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  window.addEventListener("resize", onResize);
  onResize();

  const animate = () => {
    requestAnimationFrame(animate);
    meteor.rotation.y += 0.003;
    meteor.rotation.x += 0.001;
    renderer.render(scene, camera);
    
  };
  animate();
}
