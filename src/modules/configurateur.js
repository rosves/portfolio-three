import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import gsap from 'gsap';
import { createRenderer } from '../core/renderer';
import { createScene }    from '../core/scene.js';
import { createSizes }    from '../core/sizes.js';

export function initConfigurator() {

  const canvas = document.getElementById('astro_canvas');
  if (!canvas) return;

  //  TODO 1 — Scène, caméra et renderer
  const { scene, camera } = createScene({
    bgColor: 0x0d0d0f,
    fog:     false,
    fov:     45,
    cameraZ: 7,
  });

  const renderer = createRenderer(canvas, {
    clearColor: 0x0d0d0f,
  });

  //  TODO 2 — Responsive
  const sizes = createSizes(canvas);
  sizes.on((width, height, dpr) => {
    renderer.setSize(width, height);
    renderer.setPixelRatio(dpr);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  });


  //  TODO 3 — Lumières
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
  keyLight.position.set(3, 5, 4);
  scene.add(keyLight);

  //  TODO 4 — OrbitControls
  const controls = new OrbitControls(camera, canvas);

  controls.enableDamping  = true;
  controls.dampingFactor  = 0.08;
  controls.minDistance    = 3;
  controls.maxDistance    = 12;
  controls.minPolarAngle  = Math.PI * 0.1;
  controls.maxPolarAngle  = Math.PI * 0.85;
  controls.target.set(0, 1, 0);

  // Stockage des meshes triés
  const parts = {
    helmet: [],
    suit:   [],
  };

  // Stockage des accessoires
  const accNodes = {
    flag:    null,
    jetpack: null,
    star:    null,
  };

  let model = null

  //  TODO 5 — Chargement du modèle
  const loader = new GLTFLoader();

  loader.load(
    '/astronaut.glb',

    (gltf) => {
      const modelScene = gltf.scene;

      // a) Centrer et normaliser avec Box3
      const box    = new THREE.Box3().setFromObject(modelScene);
      const center = box.getCenter(new THREE.Vector3());
      const size   = box.getSize(new THREE.Vector3());
      const scale  = 3 / Math.max(size.x, size.y, size.z);

      modelScene.scale.setScalar(scale);
      modelScene.position.sub(center.multiplyScalar(scale));

      // b) Ajouter à la scène et stocker la référence
      scene.add(modelScene);
      model = modelScene;

      // c) traverse() — clone + tri des meshes
      modelScene.traverse((node) => {
        if (!node.isMesh) return;

        node.material      = node.material.clone();
        node.castShadow    = true;
        node.receiveShadow = true;

        const nodeName   = node.name.toLowerCase();
        const parentName = (node.parent?.name ?? '').toLowerCase();

        if (nodeName === 'helmet') {
          parts.helmet.push(node);
        } else if (
          nodeName === 'torso'       ||
          parentName === 'arm_left'  ||
          parentName === 'arm_right' ||
          parentName === 'leg_left'  ||
          parentName === 'leg_right'
        ) {
          parts.suit.push(node);
        }
      });

      // d) Second traverse pour les accessoires
      modelScene.traverse((node) => {
        if (node.name === 'flag')     accNodes.flag    = node;
        if (node.name === 'backpack') accNodes.jetpack = node;
        if (node.name === 'star')     accNodes.star    = node;
      });

      // e) Masquer les accessoires par défaut
      if (accNodes.flag)    accNodes.flag.visible    = false;
      if (accNodes.jetpack) accNodes.jetpack.visible = false;
      if (accNodes.star)    accNodes.star.visible    = false;

      console.log('✅ Modèle chargé', {
        helmet  : parts.helmet.length  + ' mesh(es)',
        suit    : parts.suit.length    + ' mesh(es)',
        accNodes: Object.keys(accNodes).filter(k => accNodes[k]),
      });
    },

    (xhr) => {
      if (xhr.total > 0) {
        console.log(Math.round(xhr.loaded / xhr.total * 100) + '%');
      }
    },

    (error) => console.error('❌ GLTFLoader :', error)
  );

  //  TODO 6 — Boutons CASQUE
  const helmetContainer = document.getElementById('config_helmet');

  helmetContainer?.querySelectorAll('.btn_config').forEach((btn) => {
    btn.addEventListener('click', () => {
      helmetContainer.querySelectorAll('.btn_config')
        .forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      parts.helmet.forEach((mesh) => {
        mesh.material.color.set(btn.dataset.color);
      });
    });
  });

  //  TODO 7 — Boutons COMBINAISON
  const suitContainer = document.getElementById('config_suit');

  suitContainer?.querySelectorAll('.btn_config').forEach((btn) => {
    btn.addEventListener('click', () => {
      suitContainer.querySelectorAll('.btn_config')
        .forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      parts.suit.forEach((mesh) => {
        mesh.material.color.set(btn.dataset.color);
      });
    });
  });

  //  TODO 8 — Boutons ACCESSOIRES
  const accContainer = document.getElementById('config_objet');

  function setAccessory(name) {
    // Masquer tous les accessoires
    Object.values(accNodes).forEach((node) => {
      if (node) node.visible = false;
    });

    // Afficher et animer celui demandé
    if (name !== 'none' && accNodes[name]) {
      accNodes[name].visible = true;
      accNodes[name].scale.set(0, 0, 0);

      gsap.to(accNodes[name].scale, {
        x: 1, y: 1, z: 1,
        duration: 0.45,
        ease: 'back.out(1.7)',
      });
    }
  }

  accContainer?.querySelectorAll('.config_objet_btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      accContainer.querySelectorAll('.config_objet_btn')
        .forEach((b) => b.classList.remove('btn_active'));
      btn.classList.add('btn_active');

      setAccessory(btn.dataset.acc);
    });
  });

  //  TODO 9 — Boucle animate()
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }

  animate();
}