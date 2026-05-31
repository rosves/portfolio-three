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

  const parts = {
    helmet:  [],
    suit:    [],
  };

  const accNodes = {
    flag:    null,
    jetpack: null,
    star:    null,
  };

  //  TODO 1 : Importer et instancier GLTFLoader
  const loader = new GLTFLoader();

  //  TODO 2 : Charger /astronaut.glb avec loader.load()
  loader.load(
    "/astronaut.glb",
    (gltf) => {
      const model = gltf.scene;
      const box   = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size   = box.getSize(new THREE.Vector3());
      const scale  = 3 / Math.max(size.x, size.y, size.z);
      model.scale.setScalar(scale);
      model.position.sub(center.multiplyScalar(scale));
      scene.add(model);
  
      // TODO 4 — traverse
      model.traverse((node) => {
        if (!node.isMesh) return;
        console.log(node.name);
        node.material = node.material.clone();
        node.castShadow    = true;
        node.receiveShadow = true;
  
        const nodeName   = node.name.toLowerCase();
        const parentName = (node.parent?.name ?? "").toLowerCase();
  
        if (nodeName === "helmet") {
          parts.helmet.push(node);
        } else if (
          nodeName === "torso"      ||
          parentName === "arm_left"  ||
          parentName === "arm_right" ||
          parentName === "leg_left"  ||
          parentName === "leg_right"
        ) {
          parts.suit.push(node);
        }
  
        model.traverse((node) => {
          if (node.name === "flag")     accNodes.flag    = node;
          if (node.name === "backpack") accNodes.jetpack = node;
          if (node.name === "star")     accNodes.star    = node;
        });
  
        // On les masque par défaut
        if (accNodes.flag)    accNodes.flag.visible    = false;
        if (accNodes.jetpack) accNodes.jetpack.visible = false;
        if (accNodes.star)    accNodes.star.visible    = false;
  
        console.log("parts :", parts);
        console.log("accNodes :", accNodes);
  
      });
    },
    (xhr) => {
      if (xhr.total > 0) console.log(Math.round(xhr.loaded / xhr.total * 100) + "%");
    },
    (error) => console.error(error)
  );

  function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }
  animate();

}

initDemoGltf();
