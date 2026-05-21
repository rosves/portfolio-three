import * as THREE from 'three';

export function createScene(opts = {}) {
  const {
    bgColor = 0x0a0a0a,
    fog = true,
    fogNear = 18,
    fogFar = 55,
    fov = 50,
    cameraZ = 28,
  } = opts;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(bgColor);

  if (fog) {
    scene.fog = new THREE.Fog(bgColor, fogNear, fogFar);
  }

  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 200);
  camera.position.set(0, 0, cameraZ);

  return { scene, camera };
}