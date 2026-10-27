import * as THREE from "three";

const lanes = [-6, -2, 2, 6];
const coinGeometry = new THREE.TorusGeometry(0.42, 0.12, 8, 16);
const coinMaterial = new THREE.MeshStandardMaterial({ color: 0xffce42, emissive: 0x9b6500, emissiveIntensity: 0.35, metalness: 0.65, roughness: 0.28 });

export function createCoins(scene, length, onCollect) {
  const positions = [];
  for (let z = 25; z < length - 20; z += 45) {
    const lane = lanes[Math.floor(Math.random() * lanes.length)];
    for (let index = 0; index < 4; index += 1) {
      positions.push({ x: lane, y: 1.15, z: z + index * 2.1, phase: Math.random() * Math.PI * 2, collected: false, active: false });
    }
    if (Math.floor(z / 45) % 3 === 1) {
      for (let index = 0; index < 5; index += 1) {
        const offset = index - 2;
        positions.push({ x: offset * 1.25, y: 1.1 + (2 - Math.abs(offset)) * 0.75, z: z + 10, phase: Math.random() * Math.PI * 2, collected: false, active: false });
      }
    }
  }
  const mesh = new THREE.InstancedMesh(coinGeometry, coinMaterial, positions.length);
  const transform = new THREE.Object3D();
  positions.forEach((coin, index) => {
    transform.position.set(coin.x, coin.y, coin.z);
    transform.scale.setScalar(0.001);
    transform.updateMatrix();
    mesh.setMatrixAt(index, transform.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  scene.add(mesh);
  return { mesh, positions, onCollect };
}

export function updateCoins(field, player, elapsed, onCollect = field.onCollect) {
  const transform = new THREE.Object3D();
  let dirty = false;
  field.positions.forEach((coin, index) => {
    if (coin.collected) return;
    const distance = Math.abs(coin.z - player.position.z);
    if (distance < 2.4 && Math.abs(coin.x - player.position.x) < 1.35) {
      coin.collected = true;
      coin.active = false;
      transform.position.set(coin.x, -100, coin.z);
      transform.scale.setScalar(0.001);
      transform.updateMatrix();
      field.mesh.setMatrixAt(index, transform.matrix);
      dirty = true;
      coin.active = true;
      onCollect();
      return;
    }
    if (distance >= 310) {
      if (coin.active) {
        transform.position.set(coin.x, coin.y, coin.z);
        transform.scale.setScalar(0.001);
        transform.updateMatrix();
        field.mesh.setMatrixAt(index, transform.matrix);
        coin.active = false;
        dirty = true;
      }
      return;
    }
    transform.position.set(coin.x, coin.y + Math.sin(elapsed * 3 + coin.phase) * 0.12, coin.z);
    transform.rotation.set(0, elapsed * 2.5 + coin.phase, 0);
    transform.scale.setScalar(1);
    transform.updateMatrix();
    field.mesh.setMatrixAt(index, transform.matrix);
    dirty = true;
  });
  if (dirty) {
    field.mesh.instanceMatrix.needsUpdate = true;
    field.mesh.computeBoundingSphere();
  }
}
