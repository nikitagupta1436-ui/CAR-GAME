import * as THREE from "three";

export let FUEL_STATION_Z = 0;
export let FINISH_Z = 0;

let worldObjects = [];
let clouds = [];

function makeAsphaltTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  context.fillStyle = "#34383a";
  context.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 5000; i += 1) {
    const shade = Math.floor(38 + Math.random() * 55);
    context.fillStyle = `rgba(${shade},${shade},${shade},${Math.random() * 0.22})`;
    context.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 20);
  return texture;
}

function makeGrassTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  context.fillStyle = "#71884e";
  context.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 3500; i += 1) {
    const green = Math.floor(75 + Math.random() * 65);
    context.fillStyle = `rgba(${35 + Math.floor(Math.random() * 24)},${green},${35 + Math.floor(Math.random() * 24)},${Math.random() * 0.35})`;
    context.fillRect(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function labelTexture(text, background, foreground = "#ffffff") {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = foreground;
  ctx.font = "bold 42px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function addBox(group, geometry, material, x, y, z, scale = null) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  if (scale) mesh.scale.set(...scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function createStation(scene, z) {
  const group = new THREE.Group();
  group.position.z = z;
  const concrete = new THREE.MeshStandardMaterial({ color: 0x777b78, roughness: 0.9 });
  const red = new THREE.MeshStandardMaterial({ color: 0xe7533e, roughness: 0.55 });
  const roof = new THREE.MeshStandardMaterial({ color: 0xe4e7df, roughness: 0.45 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x252d31, roughness: 0.8 });
  const sign = new THREE.MeshStandardMaterial({ map: labelTexture("FUEL STATION", "#103c40"), emissive: 0x0a5550, emissiveIntensity: 1.2 });
  addBox(group, new THREE.BoxGeometry(14, 0.15, 24), concrete, 17, 0.08, 0);
  addBox(group, new THREE.BoxGeometry(12, 0.35, 13), roof, 17, 5.2, -1);
  for (const x of [12, 22]) {
    for (const zOffset of [-6, 4]) addBox(group, new THREE.BoxGeometry(0.4, 5, 0.4), roof, x, 2.7, zOffset);
  }
  addBox(group, new THREE.BoxGeometry(0.2, 1.8, 8), sign, 17, 7, 0);
  addBox(group, new THREE.BoxGeometry(6, 3, 5), new THREE.MeshStandardMaterial({ color: 0x9a785b }), 29, 1.6, -4);
  addBox(group, new THREE.BoxGeometry(6.4, 0.3, 5.4), red, 29, 3.25, -4);
  for (const zOffset of [-4, 1]) {
    addBox(group, new THREE.BoxGeometry(0.9, 1.2, 0.8), red, 14, 0.8, zOffset);
    addBox(group, new THREE.BoxGeometry(0.55, 0.2, 0.55), dark, 14, 1.5, zOffset);
    addBox(group, new THREE.BoxGeometry(0.08, 0.7, 0.08), dark, 14.5, 0.85, zOffset - 0.35);
    const hosePath = new THREE.CatmullRomCurve3([
      new THREE.Vector3(14.48, 1.35, zOffset),
      new THREE.Vector3(14.8, 1.2, zOffset),
      new THREE.Vector3(14.85, 0.55, zOffset - 0.25),
      new THREE.Vector3(14.55, 0.45, zOffset - 0.45),
      new THREE.Vector3(14.52, 0.9, zOffset - 0.5),
    ]);
    const hose = new THREE.Mesh(new THREE.TubeGeometry(hosePath, 12, 0.035, 5, false), dark);
    group.add(hose);
  }
  for (let i = 0; i < 14; i += 1) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.035, 2), new THREE.MeshBasicMaterial({ color: i % 2 ? 0x171717 : 0xffd52a }));
    stripe.position.set(0.5 + i * 0.5, 0.03, 0);
    group.add(stripe);
  }
  scene.add(group);
  worldObjects.push(group);
}

export function createWorld(scene, { length, level = 1, timeOfDay } = {}) {
  if (!Number.isFinite(length) || length <= 0) throw new Error("createWorld requires a positive road length.");
  FUEL_STATION_Z = length / 2;
  FINISH_Z = length;
  worldObjects = [];
  clouds = [];
  scene.background = new THREE.Color(timeOfDay === "night" ? 0x10192a : timeOfDay === "sunset" ? 0xd38662 : 0x9cc9e6);
  scene.fog = new THREE.Fog(timeOfDay === "night" ? 0x28394b : timeOfDay === "sunset" ? 0xd99a77 : 0xa7c8d9, 230, 750);
  scene.environment = null;
  const night = timeOfDay === "night";
  const sunset = timeOfDay === "sunset";
  const ambient = new THREE.HemisphereLight(night ? 0x6e85bb : 0xe9f4ff, night ? 0x293824 : 0x697742, night ? 0.65 : 1.45);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(night ? 0x9ab7ff : sunset ? 0xffc18b : 0xfff3dc, night ? 1.1 : 2.1);
  sun.position.set(-80, 140, -30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -95;
  sun.shadow.camera.right = 95;
  sun.shadow.camera.top = 300;
  sun.shadow.camera.bottom = -80;
  sun.shadow.bias = -0.00015;
  scene.add(sun);

  const sky = new THREE.Mesh(new THREE.SphereGeometry(1000, 24, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: { topColor: { value: new THREE.Color(night ? 0x10192a : sunset ? 0x41678b : 0x398bc4) }, horizonColor: { value: new THREE.Color(night ? 0x8892a2 : sunset ? 0xe8a073 : 0xe6c4a0) } },
    vertexShader: "varying vec3 vWorldPosition; void main(){vec4 p=modelMatrix*vec4(position,1.0);vWorldPosition=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}",
    fragmentShader: "uniform vec3 topColor;uniform vec3 horizonColor;varying vec3 vWorldPosition;void main(){float h=normalize(vWorldPosition).y;float t=smoothstep(-0.06,0.5,h);gl_FragColor=vec4(mix(horizonColor,topColor,t),1.0);}",
  }));
  scene.add(sky);

  const groundTexture = makeGrassTexture();
  groundTexture.repeat.set(35, Math.ceil(length / 100));
  const groundMaterial = new THREE.MeshStandardMaterial({ color: night ? 0x607254 : 0x779052, map: groundTexture, roughness: 1 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1600, length + 500), groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.16, length / 2);
  ground.receiveShadow = true;
  scene.add(ground);
  const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x55595b, map: makeAsphaltTexture(), roughness: 0.94 });
  const road = new THREE.Mesh(new THREE.PlaneGeometry(16, length), roadMaterial);
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0, length / 2);
  road.receiveShadow = true;
  scene.add(road);

  const white = new THREE.MeshStandardMaterial({ color: 0xf2f0e8, roughness: 0.8 });
  const yellow = new THREE.MeshStandardMaterial({ color: 0xf3c939, roughness: 0.7 });
  const lineGeometry = new THREE.BoxGeometry(0.12, 0.025, 4);
  for (const x of [-4, 4]) {
    const dashes = new THREE.InstancedMesh(lineGeometry, white, Math.ceil(length / 8));
    const matrix = new THREE.Object3D();
    let count = 0;
    for (let z = 4; z < length; z += 8) {
      matrix.position.set(x, 0.025, z);
      matrix.updateMatrix();
      dashes.setMatrixAt(count++, matrix.matrix);
    }
    dashes.count = count;
    dashes.instanceMatrix.needsUpdate = true;
    scene.add(dashes);
  }
  for (const x of [-0.14, 0.14, -7.82, 7.82]) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, length), x > -1 && x < 1 ? yellow : white);
    stripe.position.set(x, 0.03, length / 2);
    scene.add(stripe);
  }
  const curbMaterial = new THREE.MeshStandardMaterial({ color: 0xbbbdb8 });
  const railMaterial = new THREE.MeshStandardMaterial({ color: 0x687279, metalness: 0.65, roughness: 0.38 });
  const postGeometry = new THREE.BoxGeometry(0.18, 0.75, 0.18);
  for (const x of [-8.3, 8.3]) {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.28, length), curbMaterial);
    curb.position.set(x, 0.08, length / 2);
    curb.castShadow = true;
    scene.add(curb);
    const railSegments = x > 0
      ? [[0, Math.max(0, FUEL_STATION_Z - 15)], [FUEL_STATION_Z + 15, length]]
      : [[0, length]];
    for (const [start, end] of railSegments) {
      if (end <= start) continue;
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.65, end - start), railMaterial);
      rail.position.set(x > 0 ? 9.1 : -9.1, 0.95, (start + end) / 2);
      rail.castShadow = true;
      scene.add(rail);
    }
    const postCount = Math.ceil(length / 6);
    const posts = new THREE.InstancedMesh(postGeometry, curbMaterial, postCount);
    const transform = new THREE.Object3D();
    let postIndex = 0;
    for (let z = 0; z < length; z += 6) {
      if (x > 0 && Math.abs(z - FUEL_STATION_Z) < 15) continue;
      transform.position.set(x > 0 ? 9.1 : -9.1, 0.55, z);
      transform.updateMatrix();
      posts.setMatrixAt(postIndex++, transform.matrix);
    }
    posts.count = postIndex;
    posts.instanceMatrix.needsUpdate = true;
    scene.add(posts);
  }

  const treeGeometry = new THREE.ConeGeometry(1.7, 5, 5);
  const treeMaterials = [new THREE.MeshStandardMaterial({ color: 0x315e42 }), new THREE.MeshStandardMaterial({ color: 0x43734b }), new THREE.MeshStandardMaterial({ color: 0x597a4c })];
  const treeCount = Math.min(1200, Math.floor(length * 0.35));
  for (let variant = 0; variant < treeMaterials.length; variant += 1) {
    const instances = new THREE.InstancedMesh(treeGeometry, treeMaterials[variant], Math.ceil(treeCount / treeMaterials.length));
    const dummy = new THREE.Object3D();
    let index = 0;
    for (let i = variant; i < treeCount; i += treeMaterials.length) {
      const side = i % 2 ? 1 : -1;
      const z = Math.random() * length;
      const x = side * (16 + Math.random() * 170);
      dummy.position.set(x, 2.3, z);
      const scale = 0.55 + Math.random() * 1.4;
      dummy.scale.set(scale, scale, scale);
      dummy.rotation.y = Math.random() * Math.PI;
      dummy.updateMatrix();
      instances.setMatrixAt(index++, dummy.matrix);
    }
    instances.count = index;
    instances.instanceMatrix.needsUpdate = true;
    scene.add(instances);
  }
  const rockCount = Math.min(500, Math.floor(length * 0.12));
  const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1.2, 0), new THREE.MeshStandardMaterial({ color: 0x777a73, roughness: 1 }), rockCount);
  const rockTransform = new THREE.Object3D();
  for (let index = 0; index < rockCount; index += 1) {
    const scale = 0.35 + Math.random() * 1.3;
    rockTransform.position.set((Math.random() < 0.5 ? -1 : 1) * (16 + Math.random() * 100), scale * 0.55, Math.random() * length);
    rockTransform.scale.set(scale * 1.3, scale, scale);
    rockTransform.rotation.set(Math.random(), Math.random() * Math.PI, Math.random());
    rockTransform.updateMatrix();
    rocks.setMatrixAt(index, rockTransform.matrix);
  }
  scene.add(rocks);
  const bushCount = Math.min(600, Math.floor(length * 0.14));
  const bushes = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.2, 0), new THREE.MeshStandardMaterial({ color: 0x436440, roughness: 1 }), bushCount);
  const bushTransform = new THREE.Object3D();
  for (let index = 0; index < bushCount; index += 1) {
    const scale = 0.45 + Math.random() * 1.2;
    bushTransform.position.set((Math.random() < 0.5 ? -1 : 1) * (15 + Math.random() * 75), scale * 0.65, Math.random() * length);
    bushTransform.scale.set(scale * 1.4, scale, scale);
    bushTransform.rotation.y = Math.random() * Math.PI;
    bushTransform.updateMatrix();
    bushes.setMatrixAt(index, bushTransform.matrix);
  }
  scene.add(bushes);

  const lampMaterial = new THREE.MeshStandardMaterial({ color: 0x272e31, metalness: 0.65, roughness: 0.4 });
  const lampGlow = new THREE.MeshStandardMaterial({ color: night ? 0xffedb0 : 0xffe7b7, emissive: night ? 0xffce68 : 0xffd596, emissiveIntensity: night ? 2 : 0.15 });
  const lampCount = Math.ceil((length - 30) / 40) * 2;
  const poleInstances = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.11, 0.16, 7, 6), lampMaterial, lampCount);
  const armInstances = new THREE.InstancedMesh(new THREE.BoxGeometry(2.2, 0.12, 0.12), lampMaterial, lampCount);
  const bulbInstances = new THREE.InstancedMesh(new THREE.BoxGeometry(0.6, 0.16, 0.35), lampGlow, lampCount);
  const lampTransform = new THREE.Object3D();
  let lampIndex = 0;
  for (let z = 30; z < length; z += 40) {
    for (const side of [-1, 1]) {
      lampTransform.position.set(side * 11, 3.5, z);
      lampTransform.rotation.set(0, 0, 0);
      lampTransform.updateMatrix();
      poleInstances.setMatrixAt(lampIndex, lampTransform.matrix);
      lampTransform.position.set(side * 10, 6.7, z);
      lampTransform.rotation.y = side > 0 ? 0 : Math.PI;
      lampTransform.updateMatrix();
      armInstances.setMatrixAt(lampIndex, lampTransform.matrix);
      lampTransform.position.set(side * 9, 6.55, z);
      lampTransform.rotation.set(0, 0, 0);
      lampTransform.updateMatrix();
      bulbInstances.setMatrixAt(lampIndex, lampTransform.matrix);
      lampIndex += 1;
      if (night && z % 400 === 30) {
        const light = new THREE.PointLight(0xffd995, 0.8, 30);
        light.position.set(side * 9, 6.3, z);
        scene.add(light);
      }
    }
  }
  scene.add(poleInstances, armInstances, bulbInstances);
  for (let z = 150; z < length; z += 250) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3, 0.18), lampMaterial);
    post.position.set(-12, 1.5, z);
    scene.add(post);
    const board = new THREE.Mesh(new THREE.BoxGeometry(5.5, 1.25, 0.22), new THREE.MeshStandardMaterial({ map: labelTexture(`${Math.max(0, Math.round(length - z))}m TO FINISH`, "#17464b"), emissive: 0x12312f, emissiveIntensity: 0.25 }));
    board.position.set(-12, 3.1, z);
    scene.add(board);
  }

  const mountainMaterial = new THREE.MeshStandardMaterial({ color: night ? 0x48566a : sunset ? 0xa37a70 : 0x86968d, roughness: 1, fog: true });
  for (let i = 0; i < 42; i += 1) {
    const angle = (i / 42) * Math.PI * 2;
    const height = 90 + Math.random() * 110;
    const mountain = new THREE.Mesh(new THREE.ConeGeometry(45 + Math.random() * 40, height, 5), mountainMaterial);
    mountain.position.set(Math.cos(angle) * 760, height / 2 - 8, length / 2 + Math.sin(angle) * 760);
    scene.add(mountain);
  }
  const cloudMaterial = new THREE.MeshStandardMaterial({ color: 0xf0eee8, roughness: 1, transparent: true, opacity: night ? 0.28 : 0.7 });
  if (!night) {
    for (let i = 0; i < 9; i += 1) {
      const cloud = new THREE.Group();
      const z = Math.random() * length;
      for (let j = 0; j < 5; j += 1) {
        const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(3 + Math.random() * 3, 0), cloudMaterial);
        puff.position.set(j * 3, Math.random() * 2, 0);
        cloud.add(puff);
      }
      cloud.position.set((Math.random() - 0.5) * 180, 60 + Math.random() * 45, z);
      scene.add(cloud);
      clouds.push(cloud);
    }
  }

  createStation(scene, FUEL_STATION_Z);
  const startLine = new THREE.Mesh(new THREE.BoxGeometry(16, 0.04, 1.4), white);
  startLine.position.set(0, 0.05, 2);
  scene.add(startLine);
  const finishGroup = new THREE.Group();
  finishGroup.position.z = length - 3;
  for (const x of [-8, 8]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 10, 0.5), white);
    pillar.position.set(x, 5, 0);
    finishGroup.add(pillar);
  }
  const banner = new THREE.Mesh(new THREE.BoxGeometry(16, 1.8, 0.3), new THREE.MeshStandardMaterial({ map: labelTexture("FINISH", "#112530"), emissive: 0x18333c, emissiveIntensity: 0.5 }));
  banner.position.y = 9.2;
  finishGroup.add(banner);
  for (let i = 0; i < 16; i += 1) {
    const tile = new THREE.Mesh(new THREE.BoxGeometry(1, 0.45, 0.05), new THREE.MeshBasicMaterial({ color: i % 2 ? 0x111111 : 0xffffff }));
    tile.position.set(-7.5 + i, 8.05, 0.2);
    finishGroup.add(tile);
  }
  scene.add(finishGroup);
  scene.userData.timeOfDay = timeOfDay ?? (level >= 7 ? "night" : level >= 4 ? "sunset" : "day");
  return { fuelStationZ: FUEL_STATION_Z, finishZ: FINISH_Z };
}

export function updateWorld(playerZ, delta) {
  for (const cloud of clouds) {
    cloud.position.x += delta * 1.5;
    if (cloud.position.x > 130) cloud.position.x = -130;
  }
  for (const object of worldObjects) {
    const distance = Math.abs(object.position.z - playerZ);
    object.visible = distance < 320;
  }
}
