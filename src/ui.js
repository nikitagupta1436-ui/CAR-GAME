import { GAME_CONFIG } from "./config/game.js";
import { ECONOMY } from "./config/economy.js";
import { save } from "./save.js";

export const GameState = Object.freeze({
  MENU: "MENU",
  LANGUAGE: "LANGUAGE",
  LEVEL_SELECT: "LEVEL_SELECT",
  PLAYING: "PLAYING",
  QUIZ: "QUIZ",
  PAUSED: "PAUSED",
  LEVEL_COMPLETE: "LEVEL_COMPLETE",
  GAME_OVER: "GAME_OVER",
  OUT_OF_FUEL: "OUT_OF_FUEL",
  PRACTICE: "PRACTICE",
});

const screens = {
  MENU: "menu-screen",
  LANGUAGE: "language-screen",
  LEVEL_SELECT: "levels-screen",
  PRACTICE: "practice-screen",
  HOW: "how-screen",
  PAUSED: "pause-screen",
  LEVEL_COMPLETE: "result-screen",
  GAME_OVER: "gameover-screen",
  OUT_OF_FUEL: "gameover-screen",
};
const screenIds = ["menu-screen", "language-screen", "levels-screen", "practice-screen", "how-screen", "pause-screen", "result-screen", "gameover-screen"];

export function showScreen(state) {
  const visible = screens[state];
  document.getElementById("screen-layer").classList.toggle("hidden", !visible);
  for (const id of screenIds) document.getElementById(id).classList.toggle("hidden", id !== visible);
  const hudVisible = [GameState.PLAYING, GameState.QUIZ, GameState.PAUSED, GameState.LEVEL_COMPLETE, GameState.GAME_OVER, GameState.OUT_OF_FUEL].includes(state);
  document.getElementById("hud").classList.toggle("hidden", !hudVisible);
  document.getElementById("touch-controls").classList.toggle("hidden", state !== GameState.PLAYING || !("ontouchstart" in window));
}

export function showHowToPlay() {
  showScreen("HOW");
}

export function setMenuHighScore(score = save.data.highScore) {
  document.getElementById("menu-high-score").textContent = Math.floor(score).toLocaleString();
}

export function updateWallet() {
  const { coins, dollars } = save.data;
  document.getElementById("menu-coins").textContent = coins.toLocaleString();
  document.getElementById("menu-dollars").textContent = dollars.toLocaleString();
  document.getElementById("coins-value").textContent = coins.toLocaleString();
  document.getElementById("dollars-value").textContent = dollars.toLocaleString();
  setMenuHighScore();
}

export function populateLanguageCards(onSelect) {
  const grid = document.getElementById("language-grid");
  grid.replaceChildren(...GAME_CONFIG.LANGUAGES.map((language) => {
    const button = document.createElement("button");
    button.className = `language-card${save.data.language === language ? " active" : ""}`;
    button.textContent = language;
    const description = document.createElement("span");
    description.textContent = language === "C++" ? "STL" : language === "JavaScript" ? "ES modules" : "Code snippets";
    button.append(description);
    button.addEventListener("click", () => onSelect(language));
    return button;
  }));
}

export function populateLevelSelect(topic, onSelect) {
  populateTopicFilters(topic);
  document.getElementById("level-language-label").textContent = `LANGUAGE · ${save.data.language ?? "NOT SELECTED"}`;
  const grid = document.getElementById("level-grid");
  grid.replaceChildren(...Array.from({ length: GAME_CONFIG.MAX_LEVELS }, (_, index) => {
    const level = index + 1;
    const record = save.data.levels[level];
    const unlocked = level <= save.data.unlockedLevel;
    const button = document.createElement("button");
    button.className = `level-card${unlocked ? "" : " locked"}`;
    button.disabled = !unlocked;
    button.innerHTML = `<strong>${unlocked ? "" : "🔒 "}${String(level).padStart(2, "0")}</strong><span>${record?.stars ? "★".repeat(record.stars) : unlocked ? "PLAY" : "LOCKED"}</span><small>${record?.bestScore ? record.bestScore.toLocaleString() : ""}</small>`;
    button.addEventListener("click", () => { if (unlocked) onSelect(level); });
    return button;
  }));
}

export function populateTopicFilters(topic) {
  for (const id of ["topic-filter", "practice-topic-filter"]) {
    const filter = document.getElementById(id);
    if (!filter.options.length) {
      for (const value of GAME_CONFIG.TOPIC_FILTERS) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        filter.append(option);
      }
    }
    filter.value = topic;
  }
}

export function updateHUD({ level, score, speed, fuel, lives, distance, length }) {
  document.getElementById("level-value").textContent = level;
  document.getElementById("score-value").textContent = Math.max(0, Math.floor(score)).toLocaleString();
  document.getElementById("speed-value").textContent = Math.round(speed * 3.6);
  document.getElementById("gear-value").textContent = speed < 1 ? "N" : speed < 15 ? "1" : speed < 30 ? "2" : speed < 45 ? "3" : "4";
  document.getElementById("fuel-bar").style.width = `${Math.max(0, fuel)}%`;
  document.getElementById("fuel-value").textContent = `${Math.ceil(fuel)}%`;
  const safeLives = Math.max(0, Math.min(GAME_CONFIG.STARTING_LIVES, lives));
  document.getElementById("lives-value").innerHTML = `${"♥ ".repeat(safeLives)}<span class="empty-heart">${"♥ ".repeat(GAME_CONFIG.STARTING_LIVES - safeLives)}</span>`;
  document.getElementById("lives-count").textContent = `${safeLives}/${GAME_CONFIG.STARTING_LIVES}`;
  document.getElementById("progress-bar").style.width = `${Math.max(0, Math.min(100, distance / length * 100))}%`;
  document.getElementById("distance-value").textContent = `${Math.floor(distance).toLocaleString()} / ${length.toLocaleString()} m`;
  updateWallet();
}

export function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.style.opacity = "1";
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => { toast.style.opacity = "0"; }, 1700);
}

export function shakeScreen() {
  const target = document.getElementById("game");
  target.classList.remove("active");
  void target.offsetWidth;
  target.classList.add("active");
}

function formatTime(seconds) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

export function showLevelComplete({ score, time, accuracy, level, stars, coinsEarned, dollarsEarned }) {
  document.getElementById("result-title").textContent = `LEVEL ${level} COMPLETE`;
  document.getElementById("result-eyebrow").textContent = "RACE REPORT";
  document.getElementById("result-message").textContent = `You earned ${stars} star${stars === 1 ? "" : "s"}. Level ${Math.min(GAME_CONFIG.MAX_LEVELS, level + 1)} is ready.`;
  document.getElementById("result-score").textContent = Math.floor(score).toLocaleString();
  document.getElementById("result-time").textContent = formatTime(time);
  document.getElementById("result-accuracy").textContent = `${accuracy}%`;
  document.getElementById("result-rewards").textContent = `+${coinsEarned} 🪙  ·  +$${dollarsEarned}`;
  document.getElementById("result-stars").textContent = `${"★".repeat(stars)}${"☆".repeat(3 - stars)}`;
  document.getElementById("next-level-button").classList.toggle("hidden", level >= GAME_CONFIG.MAX_LEVELS);
  document.getElementById("retry-level-button").classList.add("hidden");
}

export function showGameOver({ state, lives, reviveUsed, coins }) {
  const outOfFuel = state === GameState.OUT_OF_FUEL;
  document.getElementById("gameover-title").textContent = outOfFuel ? "OUT OF FUEL" : "GAME OVER";
  document.getElementById("gameover-message").textContent = outOfFuel
    ? "You ran dry before reaching the fuel station."
    : `${lives} lives left. Tune your car and try again.`;
  document.getElementById("retry-level-button").classList.remove("hidden");
  const reviveButton = document.getElementById("revive-button");
  reviveButton.textContent = `REVIVE · ${ECONOMY.REVIVE_COST_COINS} COINS`;
  reviveButton.classList.toggle("hidden", outOfFuel || reviveUsed || coins < ECONOMY.REVIVE_COST_COINS);
}

export function updatePracticeStats({ score, answered, correct, streak }) {
  document.getElementById("practice-score").textContent = score.toLocaleString();
  document.getElementById("practice-accuracy").textContent = `${answered ? Math.round(correct / answered * 100) : 0}%`;
  document.getElementById("practice-streak").textContent = streak;
}

export function bindTouchControls(controls) {
  document.querySelectorAll("[data-control]").forEach((button) => {
    const control = button.dataset.control;
    const set = (active) => { controls[control] = active; };
    button.addEventListener("pointerdown", (event) => { event.preventDefault(); set(true); button.setPointerCapture(event.pointerId); });
    button.addEventListener("pointerup", () => set(false));
    button.addEventListener("pointercancel", () => set(false));
    button.addEventListener("lostpointercapture", () => set(false));
  });
}
