// =============================================================
//  src/modules/configurator.js
//  Module 2 — Interactions et Modèles 3D
//  Responsable : Étudiant 2
//
//  Structure du modèle astronaut.glb (inspectée) :
//  ┌─ astronaut (groupe racine)
//  │  ├─ helmet        → mat[0] blanc   ← couleur casque
//  │  ├─ visor         → mat[1] noir
//  │  ├─ trim          → mat[2] noir
//  │  ├─ torso         → mat[3] gris    ← couleur combinaison
//  │  ├─ hip           → mat[2] noir
//  │  ├─ chest_panel   → mat[2] noir
//  │  ├─ arm_left/right → mat[3] gris  ← couleur combinaison
//  │  ├─ leg_left/right → mat[3] gris  ← couleur combinaison
//  │  ├─ backpack       → mat[2] noir   ← accessoire jetpack
//  │  ├─ flag           → groupe       ← accessoire drapeau
//  │  └─ star           → mat[9] cyan  ← accessoire étoile
//
//  Ce fichier couvre :
//    2.1 OrbitControls + animations GSAP
//    2.2 Raycasting (hover + clic)
//    2.3 Chargement GLTFLoader + manipulation du modèle chargé
//    2.4 Synchronisation UI ↔ scène 3D
// =============================================================

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import gsap from "gsap";

import { createRenderer } from "../core/renderer.js";
import { createScene } from "../core/scene.js";
import { createSizes } from "../core/sizes.js";

// -------------------------------------------------------------
//  EXPORT PRINCIPAL — appelé depuis main.js
// -------------------------------------------------------------
export function initConfigurator(options = {}) {
  // Callbacks optionnels fournis par main.js pour synchroniser l'UI
  // externe (ici: l'écran de chargement) avec l'état réel du GLB.
  const onProgress =
    typeof options.onProgress === "function" ? options.onProgress : () => {};
  const onReady =
    typeof options.onReady === "function" ? options.onReady : () => {};

  // ── Récupération du canvas HTML ─────────────────────────────
  // Le <canvas id="astro_canvas"> est la surface WebGL.
  const canvas = document.getElementById("astro_canvas");
  if (!canvas) return;

  // ===========================================================
  //  CORE — Scène, caméra, renderer
  //  On réutilise les utilitaires partagés de core/ pour ne pas
  //  recréer un renderer Three.js dans chaque module.
  // ===========================================================

  const { scene, camera } = createScene({
    bgColor: 0x0d0d0f,
    fog: false,
    fov: 45,
    cameraZ: 6,
  });

  const renderer = createRenderer(canvas, {
    clearColor: 0x0d0d0f,
  });

  // ── 2.4 RESPONSIVE ─────────────────────────────────────────
  // createSizes() observe le parent du canvas avec ResizeObserver.
  // À chaque changement de taille on reçoit (width, height, dpr)
  // et on met à jour renderer + caméra.
  const sizes = createSizes(canvas);

  sizes.on((width, height, dpr) => {
    renderer.setSize(width, height);
    renderer.setPixelRatio(dpr);

    // Recalculer l'aspect ratio — OBLIGATOIRE sinon image déformée
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  });

  // ===========================================================
  //  LUMIÈRES
  //  Le modèle a roughness élevé (mat) donc on a besoin d'une
  //  combinaison lumière ambiante + directionnelle pour révéler
  //  la géométrie sans être trop plat.
  // ===========================================================

  // Lumière ambiante : éclaire uniformément, pas d'ombre
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  // Lumière principale (key light) : crée le volume et les ombres
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
  keyLight.position.set(3, 5, 4);
  keyLight.castShadow = true;
  scene.add(keyLight);

  // Lumière de remplissage (fill light) : adoucit les ombres dures
  const fillLight = new THREE.DirectionalLight(0x8899ff, 0.3);
  fillLight.position.set(-3, 1, -2);
  scene.add(fillLight);

  // ===========================================================
  //  2.1 — ORBIT CONTROLS
  //
  //  OrbitControls permet à l'utilisateur de :
  //    - Clic gauche + drag  → tourner autour du modèle
  //    - Molette             → zoomer / dézoomer
  //    - Clic droit + drag   → déplacer (pan)
  //
  //  enableDamping = inertie : après relâchement de la souris,
  //  le mouvement continue légèrement avant de s'arrêter.
  //  ⚠️  Nécessite controls.update() dans la boucle animate().
  // ===========================================================
  const controls = new OrbitControls(camera, canvas);

  controls.enableDamping = true;
  controls.dampingFactor = 0.08; // inertie (0 = brusque, 0.3 = très fluide)
  controls.minDistance = 3; // zoom minimum en unités Three.js
  controls.maxDistance = 12; // zoom maximum
  controls.minPolarAngle = Math.PI * 0.1; // ~18° depuis le haut
  controls.maxPolarAngle = Math.PI * 0.85; // ~153° (presque sous le modèle)
  controls.rotateSpeed = 0.8;

  // Point regardé par la caméra — centre du modèle (~mi-hauteur)
  controls.target.set(0, 1, 0);

  // ===========================================================
  //  2.3 — CHARGEMENT DU MODÈLE GLTF/GLB
  //
  //  Pourquoi GLTF/GLB ?
  //  ✓ Un seul fichier binaire (.glb) : géométrie + matériaux
  //    + textures + animations + hiérarchie de nodes
  //  ✓ Standard ouvert Khronos Group ("le JPEG de la 3D")
  //  ✓ PBR (Physically Based Rendering) natif
  //  ✓ GLTFLoader intégré dans Three.js, bien maintenu
  //  ✓ Compatible Blender, Sketchfab, Poly Pizza, etc.
  //  ✗ OBJ : pas de PBR natif, plusieurs fichiers séparés
  //  ✗ FBX : propriétaire Autodesk, très lourd, mal supporté web
  //
  //  Ressources de modèles gratuits :
  //    → https://sketchfab.com   (grande bibliothèque, export GLB)
  //    → https://poly.pizza      (low-poly CC0, export GLB)
  //
  //  Le .glb est placé dans public/models/ → Vite le sert
  //  statiquement sans le transformer (important pour les assets 3D).
  // ===========================================================

  // Stockage des nodes par partie après chargement
  // Rempli lors du traverse() dans le callback de succès
  const parts = {
    helmet: [], // node "helmet"        → mat[0] blanc
    suit: [], // torso + bras + jambes → mat[3] gris
  };

  // Stockage des accessoires (nodes déjà dans le modèle)
  const accNodes = {
    flag: null, // node "flag"     → show/hide
    jetpack: null, // node "backpack" → show/hide
    star: null, // node "star"     → show/hide
  };

  let modelGroup = null; // référence au groupe racine gltf.scene

  function countTriangles(root) {
    let triangles = 0;
    root.traverse((node) => {
      if (!node.isMesh || !node.geometry) return;
      const index = node.geometry.index;
      const pos = node.geometry.attributes?.position;
      if (index?.count) {
        triangles += index.count / 3;
      } else if (pos?.count) {
        triangles += pos.count / 3;
      }
    });
    return Math.round(triangles);
  }

  const loader = new GLTFLoader();

  loader.load(
    // Chemin depuis public/ (servi à la racine par Vite)
    "/astronaut.glb",

    // ── Callback succès ──────────────────────────────────────
    (gltf) => {
      modelGroup = gltf.scene;

      // -- Normaliser taille et centrer le modèle -------------
      // Box3 calcule la boîte englobante du modèle (min/max xyz).
      // Sans ça, le modèle peut être trop grand ou décalé.
      const box = new THREE.Box3().setFromObject(modelGroup);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const scale = 3 / Math.max(size.x, size.y, size.z);

      modelGroup.scale.setScalar(scale);
      modelGroup.position.sub(center.multiplyScalar(scale));

      scene.add(modelGroup);

      // -- Traverser tous les nodes du modèle -----------------
      // traverse() parcourt récursivement toute la hiérarchie.
      // C'est ici qu'on identifie les parties et qu'on clone
      // les matériaux pour les recolorer indépendamment.
      modelGroup.traverse((node) => {
        if (!node.isMesh) return;

        // IMPORTANT : cloner le matériau avant de le modifier.
        // Dans un GLB, plusieurs meshes peuvent partager le même
        // objet Material. Sans clone(), changer la couleur du
        // casque changerait aussi tous les meshes avec ce matériau.
        node.material = node.material.clone();
        node.castShadow = true;
        node.receiveShadow = true;

        // Trier par nom de node parent (inspecté avec pygltflib)
        // node.parent.name = nom du groupe dans la hiérarchie GLB
        const parentName = (node.parent?.name ?? "").toLowerCase();
        const nodeName = (node.name ?? "").toLowerCase();

        if (nodeName === "helmet") {
          // Casque : node nommé "helmet" directement
          parts.helmet.push(node);
        } else if (
          nodeName === "torso" ||
          parentName === "arm_left" ||
          parentName === "arm_right" ||
          parentName === "leg_left" ||
          parentName === "leg_right"
        ) {
          // Combinaison : torso + tous les membres
          parts.suit.push(node);
        }
      });

      // -- Récupérer les accessoires (nodes groupes) ----------
      // Les accessoires sont des groupes dans la hiérarchie GLB.
      // On les masque par défaut, on les affiche au clic UI.
      modelGroup.traverse((node) => {
        if (node.name === "flag") accNodes.flag = node;
        if (node.name === "backpack") accNodes.jetpack = node;
        if (node.name === "star") accNodes.star = node;
      });

      // Masquer les accessoires au chargement
      if (accNodes.flag) accNodes.flag.visible = false;
      if (accNodes.jetpack) accNodes.jetpack.visible = false;
      if (accNodes.star) accNodes.star.visible = false;

      console.log("✅ astronaut.glb chargé", {
        helmet: parts.helmet.length + " mesh(es)",
        suit: parts.suit.length + " mesh(es)",
        accNodes: Object.keys(accNodes).filter((k) => accNodes[k]),
        triangles: countTriangles(modelGroup),
      });

      // -- Animation d'entrée GSAP ----------------------------
      // 2.1 : exemple d'animation déclenchée au chargement
      gsap.from(modelGroup.position, {
        y: modelGroup.position.y - 2,
        duration: 1.2,
        ease: "power3.out",
      });
      gsap.from(modelGroup.rotation, {
        y: -Math.PI * 0.5,
        duration: 1.4,
        ease: "power3.out",
      });

      // Informe le module loader que le modèle est prêt.
      onReady();
    },

    // ── Progression ──────────────────────────────────────────
    (xhr) => {
      if (xhr.total > 0) {
        const ratio = xhr.loaded / xhr.total;
        // Informe le loader de la progression (0 -> 1).
        onProgress(ratio);
        console.log(
          `Chargement : ${Math.round(ratio * 100)}%`,
        );
      }
    },

    // ── Erreur ───────────────────────────────────────────────
    (error) => console.error("❌ GLTFLoader :", error),
  );

  // ===========================================================
  //  2.2 — RAYCASTING
  //
  //  Principe :
  //  Un rayon est projeté depuis la caméra à travers la position
  //  de la souris dans l'espace 3D.
  //  Si ce rayon touche un mesh → la souris est dessus.
  //
  //  Étapes à chaque frame :
  //  1. Convertir coords souris (pixels) → NDC (-1 à +1)
  //  2. raycaster.setFromCamera(mouse, camera) → calcule le rayon
  //  3. raycaster.intersectObjects(meshes)     → tableau de hits
  //  4. hits[0] → mesh le plus proche de la caméra
  // ===========================================================
  const raycaster = new THREE.Raycaster();

  // Coordonnées souris en NDC (Normalized Device Coordinates)
  // (-1,-1) = bas-gauche du canvas / (+1,+1) = haut-droite
  // Initialisées hors champ pour éviter un faux hover au démarrage
  const mouse = new THREE.Vector2(-10, -10);

  let hoveredMesh = null;
  // Map pour sauvegarder la couleur emissive avant le hover
  const savedEmissive = new Map();

  // ── Mise à jour des coordonnées souris ──────────────────────
  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    // Conversion pixels → NDC
    // Y est inversé : HTML Y=0 en haut / Three.js Y=+1 en haut
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  });

  // Réinitialiser quand la souris quitte le canvas
  canvas.addEventListener("mouseleave", () => mouse.set(-10, -10));

  // ── Clic sur le modèle ──────────────────────────────────────
  // On refait une intersection au moment du clic (coords exactes)
  canvas.addEventListener("click", () => {
    if (!modelGroup) return;

    const meshes = [];
    modelGroup.traverse((n) => {
      if (n.isMesh) meshes.push(n);
    });

    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(meshes);

    if (hits.length > 0) {
      // Animation GSAP au clic : rotation complète du modèle
      gsap.to(modelGroup.rotation, {
        y: modelGroup.rotation.y + Math.PI * 2,
        duration: 1.0,
        ease: "power2.inOut",
      });
    }
  });

  // ── Hover — appelé chaque frame dans animate() ──────────────
  // Mis dans la boucle de rendu pour être synchronisé avec
  // la caméra (si la caméra bouge, le hover se met à jour aussi)
  // ── Utilitaire : vérifie si un matériau supporte emissive ────
  // Certains nodes du GLB utilisent MeshBasicMaterial (pas d'emissive)
  // ou un matériau custom sans cette propriété → on vérifie avant
  // d'y toucher pour éviter le crash.
  function hasEmissive(mesh) {
    return mesh?.material?.emissive instanceof THREE.Color;
  }

  function updateHover() {
    if (!modelGroup) return;

    const meshes = [];
    modelGroup.traverse((n) => {
      if (n.isMesh) meshes.push(n);
    });

    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(meshes);

    if (hits.length > 0) {
      const hit = hits[0].object;

      if (hoveredMesh !== hit) {
        // Restaurer l'ancien mesh survolé (si emissive supporté)
        if (hoveredMesh && hasEmissive(hoveredMesh)) {
          const saved = savedEmissive.get(hoveredMesh);
          if (saved) hoveredMesh.material.emissive.copy(saved);
        }

        hoveredMesh = hit;

        // Sauvegarder + appliquer hover uniquement si emissive existe
        if (hasEmissive(hit)) {
          if (!savedEmissive.has(hit)) {
            // .clone() peut échouer sur certains matériaux → on copie
            // manuellement r/g/b dans un nouveau THREE.Color
            const e = hit.material.emissive;
            savedEmissive.set(hit, new THREE.Color(e.r, e.g, e.b));
          }
          hit.material.emissive.set(0x222222);
        }

        canvas.style.cursor = "pointer";
      }
    } else {
      // Plus rien survolé → restaurer
      if (hoveredMesh) {
        if (hasEmissive(hoveredMesh)) {
          const saved = savedEmissive.get(hoveredMesh);
          if (saved) hoveredMesh.material.emissive.copy(saved);
        }
        hoveredMesh = null;
        canvas.style.cursor = "grab";
      }
    }
  }

  // ===========================================================
  //  2.4 — INTERFACE UTILISATEUR
  //
  //  Synchronisation boutons HTML ↔ scène 3D.
  //
  //  Ce modèle a des matériaux séparés par partie :
  //    - parts.helmet → mat[0] (blanc)
  //    - parts.suit   → mat[3] (gris)
  //  On peut donc changer chaque zone indépendamment via
  //  mesh.material.color.set(hex).
  //
  //  Pour les accessoires, ils sont déjà dans le GLB :
  //  on les affiche/masque avec node.visible = true/false.
  // ===========================================================

  // ── Utilitaire : changer la couleur d'une liste de meshes ───
  function setPartColor(meshList, hexColor) {
    const color = new THREE.Color(hexColor);
    meshList.forEach((mesh) => {
      mesh.material.color.set(color);
    });
  }

  // ── Utilitaire : gérer l'état "active" d'un groupe ─────────
  // Retire la classe active de tous les boutons du conteneur
  // et l'ajoute uniquement au bouton cliqué.
  function setActiveBtn(container, clicked, cls = "active") {
    container
      .querySelectorAll("." + cls)
      .forEach((b) => b.classList.remove(cls));
    clicked.classList.add(cls);
  }

  // ── Feedback visuel GSAP au changement de couleur ───────────
  function pulseModel() {
    if (!modelGroup) return;
    gsap.from(modelGroup.scale, {
      x: 0.95,
      y: 0.95,
      z: 0.95,
      duration: 0.25,
      ease: "back.out(2)",
    });
  }

  // ── Boutons CASQUE (#config_helmet) ─────────────────────────
  // data-color="#dc2626" lu depuis l'attribut HTML
  // → colorie uniquement les meshes de parts.helmet
  const helmetContainer = document.getElementById("config_helmet");
  helmetContainer?.querySelectorAll(".btn_config").forEach((btn) => {
    btn.addEventListener("click", () => {
      setActiveBtn(helmetContainer, btn);
      setPartColor(parts.helmet, btn.dataset.color);
      pulseModel();
    });
  });

  // ── Boutons COMBINAISON (#config_suit) ──────────────────────
  // → colorie uniquement les meshes de parts.suit (torso + membres)
  const suitContainer = document.getElementById("config_suit");
  suitContainer?.querySelectorAll(".btn_config").forEach((btn) => {
    btn.addEventListener("click", () => {
      setActiveBtn(suitContainer, btn);
      setPartColor(parts.suit, btn.dataset.color);
      pulseModel();
    });
  });

  // ── Boutons ACCESSOIRES (#config_objet) ─────────────────────
  // Les accessoires sont des nodes déjà présents dans le GLB.
  // On les affiche/masque avec .visible plutôt que add/remove,
  // ce qui est plus performant (le mesh reste en mémoire GPU).
  const accessoryContainer = document.getElementById("config_objet");

  function setAccessory(name) {
    // Masquer tous les accessoires
    Object.values(accNodes).forEach((node) => {
      if (node) node.visible = false;
    });

    // Afficher celui demandé
    if (name !== "none" && accNodes[name]) {
      accNodes[name].visible = true;

      // Animation d'apparition GSAP (2.1)
      accNodes[name].scale.set(0, 0, 0);
      gsap.to(accNodes[name].scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: 0.45,
        ease: "back.out(1.7)",
      });
    }
  }

  accessoryContainer?.querySelectorAll(".config_objet_btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      // Ce groupe utilise "btn_active" (pas "active")
      accessoryContainer
        .querySelectorAll(".config_objet_btn")
        .forEach((b) => b.classList.remove("btn_active"));
      btn.classList.add("btn_active");

      setAccessory(btn.dataset.acc); // data-acc="flag" | "jetpack" | "star" | "none"
    });
  });

  // ===========================================================
  //  2.1 — ANIMATION CAMÉRA GSAP
  //
  //  Anime camera.position vers une position cible avec easing.
  //  controls.target est mis à jour en parallèle via onUpdate
  //  pour que la caméra continue de regarder le bon point.
  //
  //  Exemple d'appel :
  //  animateCamera({ x:0, y:2, z:5 }, new THREE.Vector3(0,1,0))
  // ===========================================================
  function animateCamera(toPos, toTarget, duration = 1.2) {
    gsap.to(camera.position, {
      ...toPos,
      duration,
      ease: "power3.inOut",
      onUpdate() {
        controls.target.lerp(toTarget, 0.1);
        controls.update();
      },
    });
  }

  // ===========================================================
  //  BOUCLE D'ANIMATION
  //
  //  requestAnimationFrame → ~60fps, synchronisé avec l'écran.
  //  Ordre des appels à chaque frame :
  //    1. controls.update()  → applique le damping OrbitControls
  //    2. updateHover()      → raycasting hover en temps réel
  //    3. renderer.render()  → dessine la scène sur le canvas
  // ===========================================================
  let rafId = null;

  function animate() {
    rafId = requestAnimationFrame(animate);
    controls.update(); // 1. damping OrbitControls (obligatoire)
    updateHover(); // 2. raycasting hover
    renderer.render(scene, camera); // 3. rendu
  }

  animate();

  // ===========================================================
  //  CLEANUP
  //  Libère les ressources si le module est détruit (SPA, HMR).
  // ===========================================================
  function dispose() {
    cancelAnimationFrame(rafId);
    controls.dispose();
    sizes.dispose();
    renderer.dispose();
  }

  // ===========================================================
  //  API PUBLIQUE
  //  Exposée pour main.js ou d'autres modules si besoin.
  // ===========================================================
  return { animateCamera, setAccessory, setPartColor, dispose, scene, camera };
}
