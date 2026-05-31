import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createRenderer } from "../core/renderer.js";
import { createScene } from "../core/scene.js";
import { createSizes } from "../core/sizes.js";

export function initDemoUi() {
  const canvas = document.getElementById("astro_canvas");
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

  // OrbitControls déjà en place
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 3;
  controls.maxDistance = 12;
  controls.minPolarAngle = Math.PI * 0.1;
  controls.maxPolarAngle = Math.PI * 0.85;
  controls.rotateSpeed = 0.8;
  controls.target.set(0, 1, 0);

  // Stockage des meshes par partie
  // Remplis après le chargement du modèle
  const parts = {
    helmet: [],
    suit: [],
  };

  // Chargement du modèle
  const loader = new GLTFLoader();

  loader.load(
    "/astronaut.glb",
    (gltf) => {
      const model = gltf.scene;

      // Centrage et normalisation
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const scale = 4 / Math.max(size.x, size.y, size.z);
      model.scale.setScalar(scale);
      model.position.sub(center.multiplyScalar(scale));

      scene.add(model);

      // traverse() : clone des matériaux + tri des meshes
      model.traverse((node) => {
        if (!node.isMesh) return;
        node.material = node.material.clone();
        node.castShadow = true;
        node.receiveShadow = true;

        const parentName = (node.parent?.name ?? "").toLowerCase();
        const nodeName = (node.name ?? "").toLowerCase();

        if (nodeName === "helmet") {
          parts.helmet.push(node);
        } else if (
          nodeName === "torso" ||
          parentName === "arm_left" ||
          parentName === "arm_right" ||
          parentName === "leg_left" ||
          parentName === "leg_right"
        ) {
          parts.suit.push(node);
        }
      });

      console.log("✅ Modèle chargé", {
        helmet: parts.helmet.length + " mesh(es)",
        suit: parts.suit.length + " mesh(es)",
      });
    },
    (xhr) => {
      if (xhr.total > 0) {
        console.log(`Chargement : ${Math.round((xhr.loaded / xhr.total) * 100)}%`);
      }
    },
    (error) => console.error("❌ GLTFLoader :", error)
  );

  //  TODO 1 : Brancher les boutons CASQUE (#config_helmet)

  //  TODO 2 : Brancher les boutons COMBINAISON (#config_suit)


  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();
}
