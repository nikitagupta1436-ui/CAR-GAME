import * as THREE from "three";

export const CAR_DEFINITIONS = Object.freeze([
  { id: "starter", name: "Starter Hatchback", style: "hatch", color: "#d63837", stats: { topSpeed: 48, acceleration: 20, handling: 1, efficiency: 1, durability: 0.5 } },
  { id: "city", name: "City Sedan", style: "sedan", color: "#358fc6", stats: { topSpeed: 52, acceleration: 21, handling: 1.08, efficiency: 1.12, durability: 0.6 } },
  { id: "coupe", name: "Sports Coupe", style: "coupe", color: "#e5bf45", stats: { topSpeed: 60, acceleration: 25, handling: 1.2, efficiency: 0.92, durability: 0.55 } },
  { id: "muscle", name: "Muscle Car", style: "muscle", color: "#9255c5", stats: { topSpeed: 63, acceleration: 28, handling: 0.82, efficiency: 0.78, durability: 0.75 } },
  { id: "jeep", name: "Off-road Jeep", style: "jeep", color: "#4c8f55", stats: { topSpeed: 50, acceleration: 19, handling: 0.92, efficiency: 0.8, durability: 1 } },
  { id: "supercar", name: "Supercar", style: "supercar", color: "#e46e32", stats: { topSpeed: 69, acceleration: 29, handling: 1.2, efficiency: 0.82, durability: 0.65 } },
  { id: "hyper", name: "Hyper Car", style: "hyper", color: "#38afa7", stats: { topSpeed: 76, acceleration: 31, handling: 1.26, efficiency: 0.72, durability: 0.72 } },
  { id: "legend", name: "Legend Car", style: "legend", color: "#f0eadd", stats: { topSpeed: 68, acceleration: 27, handling: 1.3, efficiency: 1.08, durability: 0.9 } },
]);

const wheelGeometry = new THREE.CylinderGeometry(0.39, 0.39, 0.28, 12);
const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x15191b, roughness: 0.7 });

function part(geometry, material, parent, x, y, z) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function createCar(definition = CAR_DEFINITIONS[0], paint = definition.color) {
  const car = new THREE.Group();
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: paint, metalness: 0.4, roughness: 0.32 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x183441, metalness: 0.25, roughness: 0.2 });
  const black = new THREE.MeshStandardMaterial({ color: 0x15191b, roughness: 0.7 });
  const headlamp = new THREE.MeshStandardMaterial({ color: 0xfff2c9, emissive: 0xffd887, emissiveIntensity: 1.3 });
  const brakeLamp = new THREE.MeshStandardMaterial({ color: 0xfa2634, emissive: 0xe01825, emissiveIntensity: 1.5 });
  const bodyLength = definition.style === "jeep" ? 4.1 : 4;
  const bodyHeight = definition.style === "muscle" ? 0.68 : definition.style === "jeep" ? 0.82 : 0.55;
  part(new THREE.BoxGeometry(1.9, bodyHeight, bodyLength), bodyMaterial, car, 0, 0.76, 0);
  const cabinShape = definition.style === "coupe" || definition.style === "supercar" || definition.style === "hyper"
    ? [1.4, 0.62, 1.65]
    : definition.style === "jeep" ? [1.48, 0.95, 1.95] : [1.42, 0.78, 1.85];
  part(new THREE.BoxGeometry(...cabinShape), glass, car, 0, 1.34, -0.12);
  if (definition.style === "muscle" || definition.style === "supercar" || definition.style === "hyper") {
    part(new THREE.BoxGeometry(1.35, 0.12, 0.08), black, car, 0, 1.08, -1.96);
  }
  if (definition.style === "jeep") {
    for (const x of [-0.62, 0.62]) part(new THREE.BoxGeometry(0.1, 0.95, 0.12), black, car, x, 1.75, -0.12);
  }
  for (const x of [-0.57, 0.57]) {
    part(new THREE.BoxGeometry(0.38, 0.22, 0.12), headlamp, car, x, 0.74, 2.03);
    part(new THREE.BoxGeometry(0.38, 0.22, 0.12), brakeLamp, car, x, 0.76, -2.03);
  }
  const wheels = [];
  for (const x of [-0.98, 0.98]) {
    for (const z of [-1.3, 1.3]) {
      const wheel = part(wheelGeometry, wheelMaterial, car, x, 0.43, z);
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
  car.userData = {
    speed: 0,
    wheels,
    body: car,
    bodyMaterial,
    headlights,
    health: 100,
    lives: 5,
    invincibility: 0,
    hitFlash: 0,
    stats: { ...definition.stats },
    carId: definition.id,
  };
  return car;
}

export function updateCar(car, input, delta) {
  const data = car.userData;
  const dt = Math.min(delta, 0.05);
  const acceleration = 20 * (data.stats.acceleration / 20);
  if (input.accelerate) data.speed += acceleration * dt;
  else data.speed -= 3.8 * dt;
  if (input.brake) data.speed -= 34 * dt;
  if (input.handbrake) data.speed -= 18 * dt;
  data.speed = THREE.MathUtils.clamp(data.speed, 0, data.stats.topSpeed);
  const steer = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  car.position.x += steer * (2 + data.speed * 0.07) * data.stats.handling * dt;
  car.position.x = THREE.MathUtils.clamp(car.position.x, -6.3, 6.3);
  car.position.z += data.speed * dt;
  data.body.rotation.z = THREE.MathUtils.damp(data.body.rotation.z, -steer * 0.085, 8, dt);
  data.wheels.forEach((wheel) => { wheel.rotation.x += data.speed * dt * 2.2; });
  data.headlights.children.forEach((child) => {
    if (child.isSpotLight) child.intensity = data.night ? 2.3 : 0;
  });
  data.invincibility = Math.max(0, data.invincibility - dt);
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

export function setCarPaint(car, color) {
  car.userData.bodyMaterial.color.set(color);
}
