import * as THREE from "three";
import { createRenderer } from "../core/renderer.js";
import { createScene } from "../core/scene.js";
import { createSizes } from "../core/sizes.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";


export function initDemoGltf() {
  const canvas = document.getElementById("demo_canvas");
  if (!canvas) return;

  const { scene, camera } = createScene({
    bgColor: 0x0d0d0f,
    fog: false,
    fov: 45,
    cameraZ: 6,
  });

  const renderer = createRenderer(canvas, {
    clearColor: 0x0d0d0f,
  });

  const sizes = createSizes(canvas);
  sizes.on((width, height, dpr) => {
    renderer.setSize(width, height);
    renderer.setPixelRatio(dpr);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  });

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
  keyLight.position.set(3, 5, 4);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x8899ff, 0.3);
  fillLight.position.set(-3, 1, -2);
  scene.add(fillLight);

  //  TODO 1 : Importer et instancier GLTFLoader
  

  //  TODO 2 : Charger /astronaut.glb avec loader.load()

  //  TODO 4 : traverse() pour inspecter les noms

  function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }
  animate();

}

initDemoGltf();