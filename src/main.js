import * as THREE from "three";
import { createWorld, updateWorld, FUEL_STATION_Z, FINISH_Z } from "./world.js";
import { createCar, updateCar, getSpeed, setCarNightMode } from "./car.js";
import { createTraffic, updateTraffic } from "./traffic.js";
import { createFuelSystem, consumeFuel, refuel } from "./fuel.js";
import { askQuestion, resetUsedQuestions } from "./dsaQuiz.js";
import { getLevelConfig } from "./levels.js";
import { startAudio, updateEngineSound, playCrashSound, playRefuelSound, toggleMute } from "./audio.js";
import { GameState, showScreen, showHowToPlay, setMenuHighScore, updateHUD, showToast, showResult, bindTouchControls } from "./ui.js";

const canvas = document.getElementById("game-canvas");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

let scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.1, 1100);
let player = createCar();
let traffic = { vehicles: [], onCollision: () => {} };
let fuel = createFuelSystem();
let config = getLevelConfig(1);
let state = GameState.MENU;
let level = 1;
let scoreBonus = 0;
let penalties = 0;
let distanceBeforeLevel = 0;
let elapsed = 0;
let correctAnswers = 0;
let answeredQuestions = 0;
let collisions = 0;
let stationResolved = false;
let refuelProgress = 0;
let refuelTarget = 0;
let highScore = Number(localStorage.getItem("dsaRacerHighScore") || 0);
const input = { left: false, right: false, accelerate: false, brake: false, handbrake: false };
const clock = new THREE.Clock();

setMenuHighScore(highScore);

function currentScore() {
  return Math.max(0, Math.floor(distanceBeforeLevel + (state === GameState.LEVEL_COMPLETE ? 0 : player.position.z) + scoreBonus - penalties));
}

function setState(next) {
  state = next;
  if (next !== GameState.PLAYING) updateEngineSound(0);
  showScreen(next);
}

function saveHighScore() {
  highScore = Math.max(highScore, currentScore());
  localStorage.setItem("dsaRacerHighScore", String(highScore));
  setMenuHighScore(highScore);
}

function buildLevel(nextLevel) {
  level = nextLevel;
  config = getLevelConfig(level);
  scene.traverse((object) => {
    if (object.geometry) object.geometry.dispose();
    if (object.material) {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => {
        for (const value of Object.values(material)) if (value?.isTexture) value.dispose();
        material.dispose();
      });
    }
  });
  scene = new THREE.Scene();
  const { finishZ } = createWorld(scene, { length: config.length, level, timeOfDay: config.timeOfDay });
  camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.1, 1100);
  player = createCar();
  setCarNightMode(player, config.timeOfDay === "night");
  camera.position.set(0, 4.4, -9.5);
  camera.lookAt(0, 1.1, 13);
  scene.add(player);
  traffic = createTraffic(scene, level, () => {
    collisions += 1;
    penalties += 100;
    playCrashSound();
    showToast("COLLISION · −100 POINTS");
  });
  fuel = createFuelSystem();
  stationResolved = false;
  refuelProgress = 0;
  elapsed = 0;
  player.position.set(0, 0, 0);
  player.userData.finishZ = finishZ;
  updateHUD({ level, score: currentScore(), speed: 0, fuel: 100, health: 100, distance: 0, length: config.length });
}

function beginRun() {
  level = 1;
  scoreBonus = 0;
  penalties = 0;
  distanceBeforeLevel = 0;
  elapsed = 0;
  correctAnswers = 0;
  answeredQuestions = 0;
  collisions = 0;
  resetUsedQuestions();
  buildLevel(1);
  startAudio();
  setState(GameState.PLAYING);
}

function stopRun(finalState) {
  input.left = input.right = input.accelerate = input.brake = input.handbrake = false;
  saveHighScore();
  const accuracy = answeredQuestions ? Math.round(correctAnswers / answeredQuestions * 100) : 0;
  setState(finalState);
  showResult({ state: finalState, score: currentScore(), time: elapsed, accuracy, highScore, level });
}

async function handleFuelStation() {
  if (stationResolved || state !== GameState.PLAYING) return;
  stationResolved = true;
  player.position.z = FUEL_STATION_Z - 1;
  player.userData.speed = 0;
  fuel.refueling = true;
  input.accelerate = input.brake = false;
  setState(GameState.QUIZ);
  showToast("FUEL STOP · SOLVE TO REFILL");
  const result = await askQuestion(config.difficulty, () => {
    penalties += 10;
    showToast("HINT USED · −10 POINTS");
  });
  answeredQuestions += 1;
  if (result.correct) {
    correctAnswers += 1;
    scoreBonus += 250;
    playRefuelSound();
    showToast("CORRECT · FULL TANK");
    refuelTarget = 100;
  } else {
    playRefuelSound();
    showToast(result.bankExhausted ? "QUESTION BANK COMPLETE · 30% FUEL" : result.timedOut ? "TIME UP · 30% FUEL" : "30% FUEL · KEEP RACING");
    refuelTarget = Math.min(100, fuel.value + 30);
  }
  refuelProgress = -1;
  fuel.refuelStart = fuel.value;
}

function finishLevel() {
  if (state !== GameState.PLAYING) return;
  player.position.z = config.length;
  distanceBeforeLevel += config.length;
  setState(GameState.LEVEL_COMPLETE);
  saveHighScore();
  const accuracy = answeredQuestions ? Math.round(correctAnswers / answeredQuestions * 100) : 0;
  showResult({ state: GameState.LEVEL_COMPLETE, score: currentScore(), time: elapsed, accuracy, highScore, level });
}

function nextResultAction() {
  if (state === GameState.LEVEL_COMPLETE) {
    buildLevel(level + 1);
    setState(GameState.PLAYING);
  } else if (state === GameState.OUT_OF_FUEL) {
    buildLevel(level);
    setState(GameState.PLAYING);
  } else {
    beginRun();
  }
}

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  if (state === GameState.PLAYING) {
    elapsed += delta;
    const stationDistance = FUEL_STATION_Z - player.position.z;
    const speedBeforeBrake = getSpeed(player);
    const autoBrake = !stationResolved && stationDistance <= Math.max(28, speedBeforeBrake * speedBeforeBrake / 76 + 2) && stationDistance > 0;
    const activeInput = autoBrake ? { ...input, accelerate: false, brake: true } : input;
    updateCar(player, activeInput, delta);

    if (autoBrake && (stationDistance <= 2.2 || (getSpeed(player) < 0.35 && stationDistance < 14))) {
      player.position.z = FUEL_STATION_Z - 1;
      player.userData.speed = 0;
      void handleFuelStation();
    }

    consumeFuel(fuel, getSpeed(player), delta);
    updateTraffic(traffic, player, delta);
    if (fuel.value <= 0) {
      stopRun(GameState.OUT_OF_FUEL);
    } else if (player.userData.health <= 0) {
      stopRun(GameState.GAME_OVER);
    } else if (player.position.z >= config.length) {
      finishLevel();
    }

    if (state === GameState.PLAYING) {
      updateWorld(player.position.z, delta);
      camera.position.lerp(new THREE.Vector3(player.position.x * 0.55, 4.4, player.position.z - 9.5), 1 - Math.exp(-4.5 * delta));
      camera.lookAt(player.position.x * 0.35, 1.1, player.position.z + 13);
      camera.fov = THREE.MathUtils.damp(camera.fov, 66 + getSpeed(player) / 60 * 8, 2, delta);
      camera.updateProjectionMatrix();
      updateEngineSound(getSpeed(player));
      updateHUD({ level, score: currentScore(), speed: getSpeed(player), fuel: fuel.value, health: player.userData.health, distance: player.position.z, length: config.length });
    }
  } else if (state === GameState.QUIZ) {
    if (refuelProgress >= 0) {
      refuelProgress += delta;
      if (refuelProgress > 0) {
        const fill = Math.min(refuelProgress / 1.5, 1);
        fuel.value = fuel.refuelStart + (refuelTarget - fuel.refuelStart) * fill;
      }
      if (refuelProgress >= 1.5) {
        refuel(fuel, refuelTarget);
        state = GameState.PLAYING;
        showScreen(state);
      }
    }
  }
  renderer.render(scene, camera);
}

function resetInputs() {
  for (const key of Object.keys(input)) input[key] = false;
}

const keyMap = {
  ArrowLeft: "left", a: "left", A: "left",
  ArrowRight: "right", d: "right", D: "right",
  ArrowUp: "accelerate", w: "accelerate", W: "accelerate",
  ArrowDown: "brake", s: "brake", S: "brake",
  " ": "handbrake",
};
window.addEventListener("keydown", (event) => {
  if (event.key === "p" || event.key === "P" || event.key === "Escape") {
    if (event.repeat) return;
    if (state === GameState.PLAYING) { resetInputs(); setState(GameState.PAUSED); }
    else if (state === GameState.PAUSED) setState(GameState.PLAYING);
    return;
  }
  if (event.key in keyMap) {
    event.preventDefault();
    if (state === GameState.PLAYING) input[keyMap[event.key]] = true;
  }
});
window.addEventListener("keyup", (event) => {
  if (event.key in keyMap) input[keyMap[event.key]] = false;
});
window.addEventListener("blur", resetInputs);
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

document.getElementById("play-button").addEventListener("click", beginRun);
document.getElementById("how-button").addEventListener("click", showHowToPlay);
document.getElementById("back-menu-button").addEventListener("click", () => setState(GameState.MENU));
document.getElementById("pause-button").addEventListener("click", () => {
  if (state === GameState.PLAYING) { resetInputs(); setState(GameState.PAUSED); }
});
document.getElementById("resume-button").addEventListener("click", () => setState(GameState.PLAYING));
document.getElementById("quit-button").addEventListener("click", () => setState(GameState.MENU));
document.getElementById("result-button").addEventListener("click", nextResultAction);
document.getElementById("mute-button").addEventListener("click", (event) => {
  const muted = toggleMute();
  event.currentTarget.textContent = muted ? "×" : "♪";
  event.currentTarget.setAttribute("aria-label", muted ? "Unmute audio" : "Mute audio");
});
bindTouchControls(input);
buildLevel(1);
showScreen(GameState.MENU);
requestAnimationFrame((timestamp) => {
  document.getElementById("loading-screen").classList.add("hide");
  window.setTimeout(() => document.getElementById("loading-screen").remove(), 450);
  animate(timestamp);
});
