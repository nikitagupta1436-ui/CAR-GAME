import * as THREE from "three";

const lanePositions = [-6, -2, 2, 6];
const vehicleTypes = [
  { name: "sedan", scale: [1.8, 1.3, 3.8], y: 0.65 },
  { name: "truck", scale: [2, 2.7, 6], y: 1.35 },
  { name: "bus", scale: [2.2, 2.8, 7.2], y: 1.4 },
];
const colors = [0x398bd1, 0xe5bc45, 0x53a16e, 0xb15ba6, 0xeeeeea, 0xd96549];

function makeVehicle(index) {
  const type = vehicleTypes[Math.random() < 0.72 ? 0 : Math.random() < 0.65 ? 1 : 2];
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: colors[index % colors.length], roughness: 0.38, metalness: 0.18 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(...type.scale), material);
  body.position.y = type.y;
  body.castShadow = true;
  group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(type.scale[0] * 0.78, type.scale[1] * 0.48, type.scale[2] * 0.42), new THREE.MeshStandardMaterial({ color: 0x253a44, roughness: 0.22 }));
  cabin.position.set(0, type.y + type.scale[1] * 0.42, -0.3);
  group.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 10);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x151719 });
  for (const x of [-type.scale[0] / 2, type.scale[0] / 2]) {
    for (const z of [-type.scale[2] * 0.32, type.scale[2] * 0.32]) {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.position.set(x, 0.36, z);
      wheel.rotation.z = Math.PI / 2;
      group.add(wheel);
    }
  }
  group.userData = { speed: 0, type: type.name, cooldown: 0 };
  return group;
}

export function createTraffic(scene, level, onCollision = () => {}) {
  const vehicles = [];
  const count = Math.min(5 + level * 2, 24);
  const speedBase = Math.min(10 + level * 1.8, 28);
  for (let i = 0; i < count; i += 1) {
    const vehicle = makeVehicle(i);
    vehicle.position.set(lanePositions[i % 4], 0, 45 + i * 23 + Math.random() * 20);
    vehicle.userData.speed = speedBase * (0.65 + Math.random() * 0.55);
    scene.add(vehicle);
    vehicles.push(vehicle);
  }
  return { vehicles, onCollision };
}

export function updateTraffic(traffic, player, delta, onCollision = traffic.onCollision) {
  const speed = player.userData.speed;
  const playerBox = new THREE.Box3().setFromObject(player);
  for (const vehicle of traffic.vehicles) {
    vehicle.position.z += Math.max(0, vehicle.userData.speed - speed) * delta;
    vehicle.userData.cooldown = Math.max(0, vehicle.userData.cooldown - delta);
    if (vehicle.position.z < player.position.z - 12) {
      vehicle.position.z = player.position.z + 130 + Math.random() * 190;
      const occupied = traffic.vehicles.some((other) => other !== vehicle && Math.abs(other.position.z - vehicle.position.z) < 24 && other.position.x === vehicle.position.x);
      vehicle.position.x = lanePositions[Math.floor(Math.random() * lanePositions.length)];
      if (occupied) vehicle.position.x = lanePositions[(lanePositions.indexOf(vehicle.position.x) + 1) % lanePositions.length];
    }
    if (!vehicle.visible && Math.abs(vehicle.position.z - player.position.z) < 300) vehicle.visible = true;
    else if (Math.abs(vehicle.position.z - player.position.z) > 340) vehicle.visible = false;
    if (vehicle.userData.cooldown === 0 && Math.abs(vehicle.position.z - player.position.z) < 5.1 && Math.abs(vehicle.position.x - player.position.x) < 1.65) {
      const vehicleBox = new THREE.Box3().setFromObject(vehicle);
      if (playerBox.intersectsBox(vehicleBox)) {
        vehicle.userData.cooldown = 1.4;
        player.userData.health = Math.max(0, player.userData.health - 24);
        player.userData.speed *= 0.45;
        player.userData.hitFlash = 1.1;
        onCollision(player.userData.health);
      }
    }
  }
}
