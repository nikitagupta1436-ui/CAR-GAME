import * as THREE from "three";
import { createWorld, updateWorld } from "./world.js";
import { CAR_DEFINITIONS, createCar, updateCar, getSpeed, setCarNightMode } from "./car.js";
import { createTraffic, updateTraffic } from "./traffic.js";
import { createCoins, updateCoins } from "./coins.js";
import { createFuelSystem, consumeFuel, applyFuelResult } from "./fuel.js";
import { askQuestion, getQuestionPoolSize, resetUsedQuestions } from "./dsaQuiz.js";
import { getLevelConfig } from "./levels.js";
import { startAudio, updateEngineSound, playCrashSound, playRefuelSound, playCoinSound, toggleMute } from "./audio.js";
import { save } from "./save.js";
import { ECONOMY } from "./config/economy.js";
import { GAME_CONFIG } from "./config/game.js";
import { openGarage, bindGarage } from "./garage.js";
import { GameState, showScreen, showHowToPlay, setMenuHighScore, updateWallet, populateLanguageCards, populateLevelSelect, populateTopicFilters, updateHUD, showToast, shakeScreen, showLevelComplete, showGameOver, updatePracticeStats, bindTouchControls } from "./ui.js";

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
let camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.1, 1600);
let player;
let traffic = { vehicles: [], onCollision: () => {} };
let coins = { coins: [], onCollect: () => {} };
let fuel = createFuelSystem();
let config = getLevelConfig(1);
let state = GameState.MENU;
let level = 1;
let scoreBonus = 0;
let penalties = 0;
let distanceBeforeLevel = 0;
let levelBaseDistance = 0;
let elapsed = 0;
let correctAnswers = 0;
let answeredQuestions = 0;
let correctStreak = 0;
let correctAnswerThisLevel = false;
let world = { fuelStationZ: 1000, finishZ: 2000, length: 2000 };
const station = { triggered: false, completed: false, quizOpen: false };
let refuelProgress = -1;
let refuelTarget = 0;
let refuelStart = 0;
let resolveRefuelAnimation = null;
let reviveUsed = false;
const revivedLevels = new Set();
let practiceRunning = false;
let practiceScore = 0;
let practiceAnswered = 0;
let practiceCorrect = 0;
let practiceStreak = 0;
let practiceToken = 0;
let garageReturnState = GameState.MENU;
let languageNextState = GameState.LEVEL_SELECT;
const debugEnabled = new URLSearchParams(window.location.search).get("debug") === "1";
const debugPanel = document.getElementById("debug-panel");
if (debugEnabled) debugPanel.classList.remove("hidden");
const input = { left: false, right: false, accelerate: false, brake: false, handbrake: false };
const clock = new THREE.Clock();

setMenuHighScore();
updateWallet();
populateLanguageCards(selectLanguage);

function currentScore() {
  return Math.max(0, Math.floor(distanceBeforeLevel + (state === GameState.LEVEL_COMPLETE ? 0 : player.position.z) + scoreBonus - penalties));
}

function setState(next) {
  state = next;
  if (next !== GameState.PLAYING) updateEngineSound(0);
  showScreen(next);
}

function selectedCarDefinition() {
  return CAR_DEFINITIONS.find((car) => car.id === save.data.selectedCar) ?? CAR_DEFINITIONS[0];
}

function buildLevel(nextLevel) {
  level = nextLevel;
  config = getLevelConfig(level);
  scene.traverse((object) => {
    if (object.geometry && object.geometry !== undefined) object.geometry.dispose();
    if (object.material) {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => {
        for (const value of Object.values(material)) if (value?.isTexture) value.dispose();
        material.dispose();
      });
    }
  });
  scene = new THREE.Scene();
  world = createWorld(scene, { length: config.length, level, timeOfDay: config.timeOfDay });
  camera = new THREE.PerspectiveCamera(68, window.innerWidth, 0.1, 1600);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  player = createCar(selectedCarDefinition(), save.data.selectedPaint);
  player.userData.lives = GAME_CONFIG.STARTING_LIVES;
  player.userData.health = GAME_CONFIG.STARTING_LIVES;
  setCarNightMode(player, config.timeOfDay === "night");
  camera.position.set(0, 4.4, -9.5);
  camera.lookAt(0, 1.1, 13);
  scene.add(player);
  traffic = createTraffic(scene, level, (collision) => {
    if (collision.ignored) {
      showToast("DURABILITY BLOCKED THE HIT");
      return;
    }
    playCrashSound();
    shakeScreen();
    showToast(`CRASH · ${collision.lives} LIVES LEFT`);
  }, { count: config.trafficCount, speed: config.trafficSpeed });
  coins = createCoins(scene, world.finishZ, () => {
    const earned = save.rewardCoins(ECONOMY.ROAD_COIN_VALUE);
    if (earned) playCoinSound();
    updateWallet();
  });
  fuel = createFuelSystem();
  resetLevelState();
  elapsed = 0;
  answeredQuestions = 0;
  correctAnswers = 0;
  correctAnswerThisLevel = false;
  player.position.set(0, 0, 0);
  player.userData.finishZ = world.finishZ;
  updateHUD({ level, score: currentScore(), speed: 0, fuel: 100, lives: GAME_CONFIG.STARTING_LIVES, distance: 0, length: world.length });
}

function resetLevelState() {
  station.triggered = false;
  station.completed = false;
  station.quizOpen = false;
  refuelProgress = -1;
  refuelTarget = 0;
  refuelStart = 0;
  resolveRefuelAnimation = null;
}

function launchLevel(nextLevel, freshRun = false) {
  if (freshRun) {
    scoreBonus = 0;
    penalties = 0;
    distanceBeforeLevel = 0;
    levelBaseDistance = 0;
    correctStreak = 0;
    resetUsedQuestions();
    revivedLevels.clear();
  }
  levelBaseDistance = distanceBeforeLevel;
  reviveUsed = revivedLevels.has(nextLevel);
  buildLevel(nextLevel);
  startAudio();
  setState(GameState.PLAYING);
}

function selectLanguage(language) {
  save.setLanguage(language);
  updateWallet();
  if (languageNextState === GameState.LEVEL_SELECT) openLevelSelect();
  else setState(languageNextState);
}

function openLevelSelect() {
  if (!save.data.language) {
    languageNextState = GameState.LEVEL_SELECT;
    populateLanguageCards(selectLanguage);
    setState(GameState.LANGUAGE);
    return;
  }
  populateLevelSelect(save.data.topic, (selectedLevel) => launchLevel(selectedLevel, true));
  setState(GameState.LEVEL_SELECT);
}

function applyTopicFilter() {
  save.setTopic(document.getElementById("topic-filter").value);
  populateLevelSelect(save.data.topic, (selectedLevel) => launchLevel(selectedLevel, true));
}

function stopRun(finalState) {
  resetInputs();
  save.setHighScore(currentScore());
  updateWallet();
  updateHUD({ level, score: currentScore(), speed: getSpeed(player), fuel: fuel.value, lives: player.userData.lives, distance: player.position.z, length: world.length });
  setState(finalState);
  showGameOver({ state: finalState, lives: player.userData.lives, reviveUsed, coins: save.data.coins });
}

function updateAnswerRewards(result, practice = false) {
  if (result.correct) {
    correctStreak += 1;
    correctAnswerThisLevel = true;
    const fastBonus = result.timeTaken <= 8 ? ECONOMY.FAST_ANSWER_BONUS_COINS : 0;
    const streakBonus = correctStreak > 1 ? ECONOMY.STREAK_BONUS_COINS * Math.min(correctStreak - 1, 5) : 0;
    const coinReward = ECONOMY.CORRECT_ANSWER_COINS + fastBonus + streakBonus;
    const earned = practice ? save.claimPracticeCoins(coinReward) : save.rewardCoins(coinReward);
    if (correctStreak > 0 && correctStreak % 5 === 0) save.rewardDollars(ECONOMY.FIVE_ANSWER_STREAK_DOLLARS);
    if (practice) {
      practiceCorrect += 1;
      practiceStreak += 1;
      practiceScore += 100 + (result.timeTaken <= 8 ? 25 : 0);
      showToast(`CORRECT · +${earned} COINS`);
    } else {
      correctAnswers += 1;
      scoreBonus += 250;
      showToast(`CORRECT · +${earned} COINS`);
    }
  } else {
    correctStreak = 0;
    if (practice) practiceStreak = 0;
  }
  if (practice) {
    practiceAnswered += 1;
    updatePracticeStats({ score: practiceScore, answered: practiceAnswered, correct: practiceCorrect, streak: practiceStreak });
  } else {
    answeredQuestions += 1;
  }
  updateWallet();
}

async function handleFuelStation() {
  if (station.completed || station.quizOpen || state !== GameState.PLAYING) return;
  station.triggered = true;
  station.quizOpen = true;
  player.position.z = world.fuelStationZ - 1;
  player.userData.speed = 0;
  fuel.refueling = true;
  input.accelerate = input.brake = false;
  setState(GameState.QUIZ);
  showToast("FUEL STOP · SOLVE TO REFILL");
  let quizCompleted = false;
  try {
    const result = await askQuestion(save.data.language, config.difficulty, save.data.topic, {
      onHint: () => { penalties += 10; showToast("HINT USED · −10 POINTS"); },
    });
    updateAnswerRewards(result);
    playRefuelSound();
    const refill = applyFuelResult(result.correct);
    refuelStart = refill.start;
    refuelTarget = refill.target;
    showToast(result.correct ? "CORRECT · FULL TANK" : `EMERGENCY REFILL · +${GAME_CONFIG.EMERGENCY_FUEL_PERCENT}%`);
    refuelProgress = 0;
    await new Promise((resolve) => { resolveRefuelAnimation = resolve; });
    quizCompleted = true;
  } catch (error) {
    console.error("Fuel-station quiz failed:", error);
    showToast("QUIZ ERROR · RETRYING");
    player.position.z = world.fuelStationZ - 5;
  } finally {
    station.quizOpen = false;
    station.completed = quizCompleted;
    station.triggered = !quizCompleted;
    fuel.refueling = false;
    refuelProgress = -1;
    resolveRefuelAnimation = null;
    setState(GameState.PLAYING);
  }
}

function levelStars() {
  if (correctAnswerThisLevel && player.userData.lives >= 4 && elapsed < world.length / 20) return 3;
  if (correctAnswerThisLevel || player.userData.lives >= 3) return 2;
  return 1;
}

function finishLevel() {
  if (state !== GameState.PLAYING) return;
  distanceBeforeLevel = levelBaseDistance + world.finishZ;
  setState(GameState.LEVEL_COMPLETE);
  const score = currentScore();
  const stars = levelStars();
  save.recordLevel(level, { score, stars });
  const earnedCoins = ECONOMY.LEVEL_CLEAR_COINS
    + (stars >= 2 ? ECONOMY.TWO_STAR_LEVEL_COINS : 0)
    + (stars === 3 ? ECONOMY.THREE_STAR_LEVEL_COINS : 0);
  save.rewardCoins(earnedCoins);
  let earnedDollars = 0;
  if (stars === 3) {
    earnedDollars += ECONOMY.THREE_STAR_LEVEL_DOLLARS;
    save.rewardDollars(ECONOMY.THREE_STAR_LEVEL_DOLLARS);
  }
  if (level % 5 === 0) {
    earnedDollars += ECONOMY.FIVE_LEVEL_DOLLARS;
    save.rewardDollars(ECONOMY.FIVE_LEVEL_DOLLARS);
  }
  const accuracy = answeredQuestions ? Math.round(correctAnswers / answeredQuestions * 100) : 0;
  showLevelComplete({ score, time: elapsed, accuracy, level, stars, coinsEarned: earnedCoins, dollarsEarned: earnedDollars });
  updateWallet();
}

function retryLevel() {
  distanceBeforeLevel = levelBaseDistance;
  launchLevel(level);
}

function nextLevel() {
  if (level >= GAME_CONFIG.MAX_LEVELS) {
    setState(GameState.LEVEL_SELECT);
    return;
  }
  distanceBeforeLevel = levelBaseDistance + world.finishZ;
  launchLevel(level + 1);
}

function setGarage(onCloseState) {
  garageReturnState = onCloseState;
  openGarage(() => {
    updateWallet();
    showScreen(garageReturnState);
  });
}

function startPractice() {
  if (!save.data.language) {
    languageNextState = GameState.PRACTICE;
    populateLanguageCards(selectLanguage);
    setState(GameState.LANGUAGE);
    return;
  }
  practiceRunning = !practiceRunning;
  const button = document.getElementById("practice-start-button");
  button.textContent = practiceRunning ? "STOP PRACTICE" : "START PRACTICE";
  if (!practiceRunning) {
    practiceToken += 1;
    setState(GameState.MENU);
    return;
  }
  practiceScore = 0;
  practiceAnswered = 0;
  practiceCorrect = 0;
  practiceStreak = 0;
  correctStreak = 0;
  resetUsedQuestions();
  updatePracticeStats({ score: 0, answered: 0, correct: 0, streak: 0 });
  setState(GameState.PRACTICE);
  void runPracticeQuestion(++practiceToken);
}

async function runPracticeQuestion(token) {
  if (!practiceRunning || token !== practiceToken) return;
  const result = await askQuestion(save.data.language, "mixed", save.data.topic, { practice: true });
  if (!practiceRunning || token !== practiceToken) return;
  updateAnswerRewards(result, true);
  window.setTimeout(() => { void runPracticeQuestion(token); }, 650);
}

function resetInputs() {
  for (const key of Object.keys(input)) input[key] = false;
}

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  if (state === GameState.PLAYING) {
    elapsed += delta;
    const stationDistance = world.fuelStationZ - player.position.z;
    const speedBeforeBrake = getSpeed(player);
    const stoppingDistance = speedBeforeBrake * speedBeforeBrake / 68 + 3;
    if (!station.triggered && !station.completed && player.position.z >= world.fuelStationZ - Math.max(40, stoppingDistance)) {
      station.triggered = true;
    }
    const autoBrake = station.triggered && !station.completed;
    updateCar(player, autoBrake ? { ...input, accelerate: false, brake: true } : input, delta);
    if (autoBrake && (player.position.z >= world.fuelStationZ - 1 || getSpeed(player) < 0.35 && stationDistance < 14)) {
      player.position.z = world.fuelStationZ - 1;
      player.userData.speed = 0;
      void handleFuelStation();
    }
    if (!station.completed && player.position.z >= world.fuelStationZ) {
      station.triggered = true;
      player.position.z = world.fuelStationZ - 1;
      player.userData.speed = 0;
      void handleFuelStation();
    }

    consumeFuel(fuel, getSpeed(player), delta, player.userData.stats.efficiency);
    updateTraffic(traffic, player, delta);
    updateCoins(coins, player, elapsed);
    if (fuel.value <= 0) stopRun(GameState.OUT_OF_FUEL);
    else if (player.userData.lives <= 0) stopRun(GameState.GAME_OVER);
    else if (player.position.z >= world.finishZ) finishLevel();
    if (player.position.z > world.finishZ + 50) {
      player.position.z = world.finishZ + 50;
      finishLevel();
    }

    if (state === GameState.PLAYING) {
      updateWorld(player.position.z, delta);
      camera.position.lerp(new THREE.Vector3(player.position.x * 0.55, 4.4, player.position.z - 9.5), 1 - Math.exp(-4.5 * delta));
      camera.lookAt(player.position.x * 0.35, 1.1, player.position.z + 13);
      camera.fov = THREE.MathUtils.damp(camera.fov, 66 + getSpeed(player) / player.userData.stats.topSpeed * 8, 2, delta);
      camera.updateProjectionMatrix();
      updateEngineSound(getSpeed(player));
      updateHUD({ level, score: currentScore(), speed: getSpeed(player), fuel: fuel.value, lives: player.userData.lives, distance: player.position.z, length: world.length });
    }
  } else if (state === GameState.QUIZ && refuelProgress >= 0) {
    refuelProgress += delta;
    const fill = Math.min(refuelProgress / 1.5, 1);
    const displayedFuel = refuelStart + (refuelTarget - refuelStart) * fill;
    updateHUD({ level, score: currentScore(), speed: 0, fuel: displayedFuel, lives: player.userData.lives, distance: player.position.z, length: world.length });
    if (refuelProgress >= 1.5) {
      refuelProgress = -1;
      if (resolveRefuelAnimation) resolveRefuelAnimation();
    }
  }
  if (debugEnabled) {
    debugPanel.textContent = [
      `Level: ${level} | Road: ${world.length}m`,
      `Car z: ${player.position.z.toFixed(1)} | Fuel station z: ${world.fuelStationZ} | Finish z: ${world.finishZ}`,
      `Fuel: ${fuel.value.toFixed(1)}% | Station triggered: ${station.triggered}`,
      `State: ${state} | Question pool: ${getQuestionPoolSize(save.data.language, config.difficulty, save.data.topic)}`,
      "F: station · G: finish",
    ].join("\n");
  }
  renderer.render(scene, camera);
}

const keyMap = {
  ArrowLeft: "left", a: "left", A: "left",
  ArrowRight: "right", d: "right", D: "right",
  ArrowUp: "accelerate", w: "accelerate", W: "accelerate",
  ArrowDown: "brake", s: "brake", S: "brake",
  " ": "handbrake",
};
window.addEventListener("keydown", (event) => {
  if (debugEnabled && (event.key === "f" || event.key === "F")) {
    player.position.z = world.fuelStationZ - 1;
    player.userData.speed = 0;
    station.triggered = true;
    if (state !== GameState.PLAYING) setState(GameState.PLAYING);
    return;
  }
  if (debugEnabled && (event.key === "g" || event.key === "G")) {
    player.position.z = world.finishZ;
    player.userData.speed = 0;
    station.completed = true;
    if (state !== GameState.PLAYING) setState(GameState.PLAYING);
    return;
  }
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
window.addEventListener("keyup", (event) => { if (event.key in keyMap) input[keyMap[event.key]] = false; });
window.addEventListener("blur", resetInputs);
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

document.getElementById("play-button").addEventListener("click", openLevelSelect);
document.getElementById("practice-button").addEventListener("click", () => {
  populateTopicFilters(save.data.topic);
  document.getElementById("practice-start-button").textContent = "START PRACTICE";
  updatePracticeStats({ score: 0, answered: 0, correct: 0, streak: 0 });
  setState(GameState.PRACTICE);
});
document.getElementById("practice-start-button").addEventListener("click", startPractice);
document.getElementById("practice-back-button").addEventListener("click", () => { practiceRunning = false; practiceToken += 1; setState(GameState.MENU); });
document.getElementById("garage-menu-button").addEventListener("click", () => setGarage(GameState.MENU));
document.getElementById("language-menu-button").addEventListener("click", () => { languageNextState = GameState.MENU; populateLanguageCards(selectLanguage); setState(GameState.LANGUAGE); });
document.getElementById("language-back-button").addEventListener("click", () => setState(GameState.MENU));
document.getElementById("levels-back-button").addEventListener("click", () => setState(GameState.MENU));
document.getElementById("topic-filter").addEventListener("change", applyTopicFilter);
document.getElementById("practice-topic-filter").addEventListener("change", (event) => {
  save.setTopic(event.target.value);
  populateTopicFilters(save.data.topic);
});
document.getElementById("how-button").addEventListener("click", showHowToPlay);
document.getElementById("back-menu-button").addEventListener("click", () => setState(GameState.MENU));
document.getElementById("pause-button").addEventListener("click", () => {
  if (state === GameState.PLAYING) { resetInputs(); setState(GameState.PAUSED); }
});
document.getElementById("resume-button").addEventListener("click", () => setState(GameState.PLAYING));
document.getElementById("quit-button").addEventListener("click", () => setState(GameState.MENU));
document.getElementById("next-level-button").addEventListener("click", nextLevel);
document.getElementById("replay-button").addEventListener("click", retryLevel);
document.getElementById("result-garage-button").addEventListener("click", () => setGarage(GameState.LEVEL_COMPLETE));
document.getElementById("result-menu-button").addEventListener("click", () => setState(GameState.MENU));
document.getElementById("retry-level-button").addEventListener("click", retryLevel);
document.getElementById("revive-button").addEventListener("click", () => {
  if (reviveUsed || !save.spendCoins(ECONOMY.REVIVE_COST_COINS)) { showToast(`REVIVE COSTS ${ECONOMY.REVIVE_COST_COINS} COINS`); return; }
  reviveUsed = true;
  revivedLevels.add(level);
  player.userData.lives = 3;
  player.userData.health = 3;
  player.userData.invincibility = GAME_CONFIG.INVINCIBILITY_SECONDS + 1;
  player.userData.hitFlash = player.userData.invincibility;
  player.userData.speed = 0;
  if (!station.completed) resetLevelState();
  updateWallet();
  setState(GameState.PLAYING);
});
document.getElementById("gameover-menu-button").addEventListener("click", () => setState(GameState.MENU));
document.getElementById("mute-button").addEventListener("click", (event) => {
  const muted = toggleMute();
  event.currentTarget.textContent = muted ? "×" : "♪";
  event.currentTarget.setAttribute("aria-label", muted ? "Unmute audio" : "Mute audio");
});
bindTouchControls(input);
bindGarage();
buildLevel(1);
setState(GameState.MENU);
requestAnimationFrame(() => {
  document.getElementById("loading-screen").classList.add("hide");
  window.setTimeout(() => document.getElementById("loading-screen").remove(), 450);
  animate();
});
