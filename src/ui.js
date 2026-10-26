export const GameState = Object.freeze({
  MENU: "MENU",
  PLAYING: "PLAYING",
  QUIZ: "QUIZ",
  PAUSED: "PAUSED",
  LEVEL_COMPLETE: "LEVEL_COMPLETE",
  GAME_OVER: "GAME_OVER",
  OUT_OF_FUEL: "OUT_OF_FUEL",
});

const screens = {
  MENU: "menu-screen",
  HOW: "how-screen",
  PAUSED: "pause-screen",
  LEVEL_COMPLETE: "result-screen",
  GAME_OVER: "result-screen",
  OUT_OF_FUEL: "result-screen",
};
const screenIds = ["menu-screen", "how-screen", "pause-screen", "result-screen"];

export function showScreen(state) {
  const visible = screens[state];
  document.getElementById("screen-layer").classList.toggle("hidden", !visible);
  for (const id of screenIds) document.getElementById(id).classList.toggle("hidden", id !== visible);
  document.getElementById("hud").classList.toggle("hidden", state === GameState.MENU || state === "HOW");
  document.getElementById("touch-controls").classList.toggle("hidden", state !== GameState.PLAYING || !("ontouchstart" in window));
}

export function showHowToPlay() {
  showScreen("HOW");
}

export function setMenuHighScore(score) {
  document.getElementById("menu-high-score").textContent = Math.floor(score).toLocaleString();
}

export function updateHUD({ level, score, speed, fuel, health, distance, length }) {
  document.getElementById("level-value").textContent = level;
  document.getElementById("score-value").textContent = Math.max(0, Math.floor(score)).toLocaleString();
  document.getElementById("speed-value").textContent = Math.round(speed * 3.6);
  document.getElementById("gear-value").textContent = speed < 1 ? "N" : speed < 15 ? "1" : speed < 30 ? "2" : speed < 45 ? "3" : "4";
  document.getElementById("fuel-bar").style.width = `${Math.max(0, fuel)}%`;
  document.getElementById("fuel-value").textContent = `${Math.ceil(fuel)}%`;
  document.getElementById("health-bar").style.width = `${Math.max(0, health)}%`;
  document.getElementById("health-value").textContent = `${Math.ceil(health)}%`;
  document.getElementById("progress-bar").style.width = `${Math.max(0, Math.min(100, distance / length * 100))}%`;
  document.getElementById("distance-value").textContent = `${Math.floor(distance).toLocaleString()} / ${length.toLocaleString()} m`;
}

export function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.style.opacity = "1";
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => { toast.style.opacity = "0"; }, 1700);
}

export function showResult({ state, score, time, accuracy, highScore, level }) {
  const title = document.getElementById("result-title");
  const eyebrow = document.getElementById("result-eyebrow");
  const message = document.getElementById("result-message");
  const button = document.getElementById("result-button");
  title.textContent = state === GameState.LEVEL_COMPLETE ? "LEVEL COMPLETE" : state === GameState.OUT_OF_FUEL ? "OUT OF FUEL" : "GAME OVER";
  eyebrow.textContent = state === GameState.LEVEL_COMPLETE ? "RACE REPORT" : "RACE ENDED";
  message.textContent = state === GameState.LEVEL_COMPLETE
    ? `Level ${level} complete. ${score >= highScore ? "New personal best!" : "The next highway is waiting."}`
    : state === GameState.OUT_OF_FUEL ? "You ran dry before reaching the fuel station." : "Your car cannot continue. Reset and take another run.";
  document.getElementById("result-score").textContent = Math.floor(score).toLocaleString();
  document.getElementById("result-time").textContent = `${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, "0")}`;
  document.getElementById("result-accuracy").textContent = `${accuracy}%`;
  button.innerHTML = state === GameState.LEVEL_COMPLETE ? 'NEXT LEVEL <span>→</span>' : 'RETRY <span>↻</span>';
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
