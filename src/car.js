import * as THREE from "three";

function part(geometry, material, parent, x, y, z) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function createCar() {
  const car = new THREE.Group();
  const red = new THREE.MeshStandardMaterial({ color: 0xd63837, metalness: 0.48, roughness: 0.31 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x183441, metalness: 0.25, roughness: 0.2 });
  const black = new THREE.MeshStandardMaterial({ color: 0x15191b, roughness: 0.7 });
  const headlamp = new THREE.MeshStandardMaterial({ color: 0xfff2c9, emissive: 0xffd887, emissiveIntensity: 1.3 });
  const brakeLamp = new THREE.MeshStandardMaterial({ color: 0xfa2634, emissive: 0xe01825, emissiveIntensity: 1.5 });
  part(new THREE.BoxGeometry(1.85, 0.55, 4), red, car, 0, 0.76, 0);
  part(new THREE.BoxGeometry(1.42, 0.78, 1.85), glass, car, 0, 1.34, -0.12);
  part(new THREE.BoxGeometry(1.68, 0.16, 0.18), red, car, 0, 1.05, 0.95);
  part(new THREE.BoxGeometry(1.55, 0.11, 0.08), black, car, 0, 1.73, 0.95);
  for (const x of [-0.57, 0.57]) {
    part(new THREE.BoxGeometry(0.38, 0.22, 0.12), headlamp, car, x, 0.74, 2.03);
    part(new THREE.BoxGeometry(0.38, 0.22, 0.12), brakeLamp, car, x, 0.76, -2.03);
  }
  const wheels = [];
  for (const x of [-0.98, 0.98]) {
    for (const z of [-1.3, 1.3]) {
      const wheel = part(new THREE.CylinderGeometry(0.39, 0.39, 0.28, 12), black, car, x, 0.43, z);
      wheel.rotation.z = Math.PI / 2;
      wheels.push(wheel);
    }
  }
  const headlights = new THREE.Group();
  headlights.position.set(0, 0.7, 2.12);
  const leftLight = new THREE.SpotLight(0xffedc6, 0, 65, Math.PI / 7, 0.5, 1.3);
  const rightLight = leftLight.clone();
  leftLight.position.x = -0.55;
  rightLight.position.x = 0.55;
  leftLight.target.position.set(-0.55, -0.1, 30);
  rightLight.target.position.set(0.55, -0.1, 30);
  headlights.add(leftLight, rightLight, leftLight.target, rightLight.target);
  car.add(headlights);
  car.userData = { speed: 0, wheels, body: car, headlights, leftLight, rightLight, health: 100, hitFlash: 0 };
  car.position.y = 0;
  return car;
}

export function updateCar(car, input, delta) {
  const data = car.userData;
  const dt = Math.min(delta, 0.05);
  if (input.accelerate) data.speed += 22 * dt;
  else data.speed -= 3.8 * dt;
  if (input.brake) data.speed -= 34 * dt;
  if (input.handbrake) data.speed -= 18 * dt;
  data.speed = THREE.MathUtils.clamp(data.speed, 0, 60);
  const steer = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  car.position.x += steer * (2 + data.speed * 0.07) * dt;
  car.position.x = THREE.MathUtils.clamp(car.position.x, -6.3, 6.3);
  car.position.z += data.speed * dt;
  data.body.rotation.z = THREE.MathUtils.damp(data.body.rotation.z, -steer * 0.085, 8, dt);
  data.wheels.forEach((wheel) => { wheel.rotation.x += data.speed * dt * 2.2; });
  data.headlights.children.forEach((child) => {
    if (child.isSpotLight) child.intensity = car.userData.night ? 2.3 : 0;
  });
  data.hitFlash = Math.max(0, data.hitFlash - dt);
  car.visible = data.hitFlash === 0 || Math.floor(data.hitFlash * 18) % 2 === 0;
  return data.speed;
}

export function getSpeed(car) {
  return car.userData.speed;
}

export function setCarNightMode(car, enabled) {
  car.userData.night = enabled;
}
