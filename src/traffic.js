import * as THREE from "three";
import { GAME_CONFIG } from "./config/game.js";

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
  const wheelGeometry = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 10);
  const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x151719 });
  for (const x of [-type.scale[0] / 2, type.scale[0] / 2]) {
    for (const z of [-type.scale[2] * 0.32, type.scale[2] * 0.32]) {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.position.set(x, 0.36, z);
      wheel.rotation.z = Math.PI / 2;
      group.add(wheel);
    }
  }
  group.userData = { speed: 0, type: type.name, invulnerability: 0 };
  return group;
}

function laneHasGap(vehicles, laneX, z, excluded) {
  return vehicles.every((vehicle) => vehicle === excluded
    || vehicle.position.x !== laneX
    || Math.abs(vehicle.position.z - z) >= 40);
}

export function createTraffic(scene, level, onCollision = () => {}, trafficConfig = {}) {
  const vehicles = [];
  const count = Math.min(trafficConfig.count ?? (5 + Math.floor((level - 1) / 2)), 14);
  const speedBase = Math.min(trafficConfig.speed ?? (9 + level * 0.45), 21);
  const rowCount = Math.ceil(count / 3);
  for (let row = 0; row < rowCount; row += 1) {
    const laneOrder = lanePositions.slice().sort(() => Math.random() - 0.5);
    for (let slot = 0; slot < 3 && vehicles.length < count; slot += 1) {
      const vehicle = makeVehicle(vehicles.length);
      vehicle.position.set(laneOrder[slot], 0, 60 + row * 72 + Math.random() * 5);
      vehicle.userData.speed = Math.min(speedBase * (0.75 + Math.random() * 0.18), 21);
      scene.add(vehicle);
      vehicles.push(vehicle);
    }
  }
  return { vehicles, onCollision };
}

export function updateTraffic(traffic, player, delta, onCollision = traffic.onCollision) {
  const playerSpeed = player.userData.speed;
  const box = new THREE.Box3().setFromObject(player);
  const center = box.getCenter(new THREE.Vector3());
  const halfSize = box.getSize(new THREE.Vector3()).multiplyScalar(GAME_CONFIG.COLLISION_HITBOX_SCALE * 0.5);
  const forgivingPlayerBox = new THREE.Box3().setFromCenterAndSize(center, halfSize);
  for (const vehicle of traffic.vehicles) {
    vehicle.position.z += Math.max(0, vehicle.userData.speed - playerSpeed) * delta;
    if (vehicle.position.z < player.position.z - 12) {
      const targetZ = player.position.z + 150 + Math.random() * 100;
      const candidates = lanePositions.filter((lane) => laneHasGap(traffic.vehicles, lane, targetZ, vehicle));
      const lane = candidates[Math.floor(Math.random() * candidates.length)];
      if (lane !== undefined) {
        vehicle.position.z = targetZ;
        vehicle.position.x = lane;
      } else {
        vehicle.position.z = targetZ + 80;
      }
    }
    const distance = Math.abs(vehicle.position.z - player.position.z);
    vehicle.visible = distance < 300;
    vehicle.userData.invulnerability = Math.max(0, vehicle.userData.invulnerability - delta);
    if (player.userData.invincibility > 0
      || vehicle.userData.invulnerability > 0
      || distance > 5.1
      || Math.abs(vehicle.position.x - player.position.x) > 1.65) continue;

    const vehicleBox = new THREE.Box3().setFromObject(vehicle);
    if (!forgivingPlayerBox.intersectsBox(vehicleBox)) continue;
    vehicle.userData.invulnerability = 2.5;
    const stats = player.userData.stats;
    const ignoresHit = Math.random() < stats.durability * 0.2;
    if (ignoresHit) {
      player.userData.invincibility = GAME_CONFIG.INVINCIBILITY_SECONDS * 0.5;
      player.userData.hitFlash = player.userData.invincibility;
      onCollision({ ignored: true, lives: player.userData.lives });
      continue;
    }
    player.userData.lives = Math.max(0, player.userData.lives - 1);
    player.userData.health = player.userData.lives;
    player.userData.speed *= 0.45;
    player.userData.invincibility = GAME_CONFIG.INVINCIBILITY_SECONDS + stats.durability * 1.5;
    player.userData.hitFlash = player.userData.invincibility;
    onCollision({ ignored: false, lives: player.userData.lives });
  }
}
