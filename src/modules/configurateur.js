import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import gsap from "gsap";
import { createRenderer } from "../core/renderer.js";
import { createScene } from "../core/scene.js";
import { createSizes } from "../core/sizes.js";

export function initConfigurator() {

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

    const controls = new OrbitControls(camera, canvas);

    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 3;
    controls.maxDistance = 12;
    controls.minPolarAngle = Math.PI * 0.1;
    controls.maxPolarAngle = Math.PI * 0.85;
    controls.rotateSpeed = 0.8;
    controls.target.set(0, 1, 0);

    const parts = {
        helmet: [],
        suit: [],
    };

    const accNodes = {
        flag: null,
        jetpack: null,
        star: null,
    };

    let modelGroup = null;

    const loader = new GLTFLoader();

    loader.load(
        "/astronaut.glb",

        (gltf) => {
            modelGroup = gltf.scene;

            const box = new THREE.Box3().setFromObject(modelGroup);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const scale = 3 / Math.max(size.x, size.y, size.z);

            modelGroup.scale.setScalar(scale);
            modelGroup.position.sub(center.multiplyScalar(scale));

            scene.add(modelGroup);

            modelGroup.traverse((node) => {
                if (!node.isMesh) return;

                node.material = node.material.clone();
                node.castShadow = true;
                node.receiveShadow = true;

                const nodeName = (node.name ?? "").toLowerCase();
                const parentName = (node.parent?.name ?? "").toLowerCase();

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

            modelGroup.traverse((node) => {
                if (node.name === "flag") accNodes.flag = node;
                if (node.name === "backpack") accNodes.jetpack = node;
                if (node.name === "star") accNodes.star = node;
            });

            if (accNodes.flag) accNodes.flag.visible = false;
            if (accNodes.jetpack) accNodes.jetpack.visible = false;
            if (accNodes.star) accNodes.star.visible = false;


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
        },

        (xhr) => {
            if (xhr.total > 0) {
                console.log(Math.round(xhr.loaded / xhr.total * 100) + "%");
            }
        },

        (error) => console.error("❌ GLTFLoader :", error)
    );


    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-10, -10);
    let hoveredMesh = null;
    const savedEmissive = new Map();

    canvas.addEventListener("mousemove", (e) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    });

    canvas.addEventListener("mouseleave", () => mouse.set(-10, -10));

    canvas.addEventListener("click", () => {
        if (!modelGroup) return;

        const meshes = [];
        modelGroup.traverse((n) => { if (n.isMesh) meshes.push(n); });

        raycaster.setFromCamera(mouse, camera);
        const hits = raycaster.intersectObjects(meshes);

        if (hits.length > 0) {
            gsap.to(modelGroup.rotation, {
                y: modelGroup.rotation.y + Math.PI * 2,
                duration: 1.0,
                ease: "power2.inOut",
            });
        }
    });

    function hasEmissive(mesh) {
        return mesh?.material?.emissive instanceof THREE.Color;
    }

    function updateHover() {
        if (!modelGroup) return;

        const meshes = [];
        modelGroup.traverse((n) => { if (n.isMesh) meshes.push(n); });

        raycaster.setFromCamera(mouse, camera);
        const hits = raycaster.intersectObjects(meshes);

        if (hits.length > 0) {
            const hit = hits[0].object;

            if (hoveredMesh !== hit) {
                if (hoveredMesh && hasEmissive(hoveredMesh)) {
                    const saved = savedEmissive.get(hoveredMesh);
                    if (saved) hoveredMesh.material.emissive.copy(saved);
                }

                hoveredMesh = hit;

                if (hasEmissive(hit)) {
                    if (!savedEmissive.has(hit)) {
                        const e = hit.material.emissive;
                        savedEmissive.set(hit, new THREE.Color(e.r, e.g, e.b));
                    }
                    hit.material.emissive.set(0x222222);
                }

                canvas.style.cursor = "pointer";
            }
        } else {
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


    function setPartColor(meshList, hexColor) {
        const color = new THREE.Color(hexColor);
        meshList.forEach((mesh) => {
            mesh.material.color.set(color);
        });
    }

    function setActiveBtn(container, clicked, cls = "active") {
        container.querySelectorAll("." + cls)
            .forEach((b) => b.classList.remove(cls));
        clicked.classList.add(cls);
    }

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

    const helmetContainer = document.getElementById("config_helmet");
    helmetContainer?.querySelectorAll(".btn_config").forEach((btn) => {
        btn.addEventListener("click", () => {
            setActiveBtn(helmetContainer, btn);
            setPartColor(parts.helmet, btn.dataset.color);
            pulseModel();
        });
    });

    const suitContainer = document.getElementById("config_suit");
    suitContainer?.querySelectorAll(".btn_config").forEach((btn) => {
        btn.addEventListener("click", () => {
            setActiveBtn(suitContainer, btn);
            setPartColor(parts.suit, btn.dataset.color);
            pulseModel();
        });
    });

    const accessoryContainer = document.getElementById("config_objet");

    function setAccessory(name) {
        Object.values(accNodes).forEach((node) => {
            if (node) node.visible = false;
        });

        if (name !== "none" && accNodes[name]) {
            accNodes[name].visible = true;
            accNodes[name].scale.set(0, 0, 0);
            gsap.to(accNodes[name].scale, {
                x: 1, y: 1, z: 1,
                duration: 0.45,
                ease: "back.out(1.7)",
            });
        }
    }

    accessoryContainer?.querySelectorAll(".config_objet_btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            accessoryContainer.querySelectorAll(".config_objet_btn")
                .forEach((b) => b.classList.remove("btn_active"));
            btn.classList.add("btn_active");
            setAccessory(btn.dataset.acc);
        });
    });


    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        updateHover();
        renderer.render(scene, camera);
    }

    animate();
}