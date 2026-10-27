import { GAME_CONFIG } from "./config/game.js";
import { ECONOMY } from "./config/economy.js";

const STORAGE_KEY = "dsaRacerSave";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function createDefaultSave() {
  return {
    version: GAME_CONFIG.SAVE_VERSION,
    language: null,
    topic: "All",
    unlockedLevel: 1,
    levels: {},
    coins: GAME_CONFIG.STARTING_COINS,
    dollars: 0,
    ownedCars: ["starter"],
    selectedCar: "starter",
    ownedPaints: ["#d63837"],
    selectedPaint: "#d63837",
    highScore: 0,
    practiceDate: todayKey(),
    practiceCoinsToday: 0,
    loginDate: null,
  };
}

function isValidSave(value) {
  return value && value.version === GAME_CONFIG.SAVE_VERSION
    && Number.isInteger(value.unlockedLevel) && value.unlockedLevel >= 1 && value.unlockedLevel <= GAME_CONFIG.MAX_LEVELS
    && Number.isFinite(value.coins) && value.coins >= 0
    && Number.isFinite(value.dollars) && value.dollars >= 0
    && Array.isArray(value.ownedCars) && value.ownedCars.includes("starter") && value.ownedCars.every((car) => typeof car === "string")
    && typeof value.selectedCar === "string" && value.ownedCars.includes(value.selectedCar)
    && Array.isArray(value.ownedPaints) && value.ownedPaints.includes(value.selectedPaint) && value.ownedPaints.every((paint) => typeof paint === "string")
    && value.levels && typeof value.levels === "object" && !Array.isArray(value.levels)
    && Object.entries(value.levels).every(([level, record]) => Number.isInteger(Number(level))
      && Number(level) >= 1 && Number(level) <= GAME_CONFIG.MAX_LEVELS
      && record && Number.isInteger(record.stars) && record.stars >= 0 && record.stars <= 3
      && Number.isFinite(record.bestScore) && record.bestScore >= 0)
    && Number.isFinite(value.practiceCoinsToday) && value.practiceCoinsToday >= 0
    && (value.language === null || GAME_CONFIG.LANGUAGES.includes(value.language))
    && GAME_CONFIG.TOPIC_FILTERS.includes(value.topic)
    && typeof value.practiceDate === "string"
    && (value.loginDate === null || typeof value.loginDate === "string")
    && Number.isFinite(value.highScore) && value.highScore >= 0;
}

function readSave() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultSave();
    const parsed = JSON.parse(raw);
    if (!isValidSave(parsed)) return createDefaultSave();
    const save = { ...createDefaultSave(), ...parsed };
    if (save.practiceDate !== todayKey()) {
      save.practiceDate = todayKey();
      save.practiceCoinsToday = 0;
    }
    return save;
  } catch {
    return createDefaultSave();
  }
}

let data = readSave();
let dirty = true;

function persist() {
  if (!dirty) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    dirty = false;
  } catch {
    dirty = true;
  }
}

function update(mutator) {
  mutator(data);
  dirty = true;
  persist();
}

function rewardCoins(amount, practice = false) {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  let earned = Math.floor(amount);
  update((save) => {
    if (practice) {
      const remaining = Math.max(0, ECONOMY.PRACTICE_DAILY_COIN_CAP - save.practiceCoinsToday);
      earned = Math.min(earned, remaining);
      save.practiceCoinsToday += earned;
    }
    save.coins += earned;
  });
  return earned;
}

export const save = {
  get data() {
    if (data.practiceDate !== todayKey()) {
      update((value) => {
        value.practiceDate = todayKey();
        value.practiceCoinsToday = 0;
      });
    }
    return data;
  },
  save() {
    dirty = true;
    persist();
  },
  setLanguage(language) { update((value) => { value.language = language; }); },
  setTopic(topic) { update((value) => { value.topic = topic; }); },
  rewardCoins,
  spendCoins(amount) {
    if (!Number.isFinite(amount) || amount < 0 || data.coins < amount) return false;
    update((value) => { value.coins -= amount; });
    return true;
  },
  rewardDollars(amount) {
    if (!Number.isFinite(amount) || amount <= 0) return;
    update((value) => { value.dollars += Math.floor(amount); });
  },
  spendDollars(amount) {
    if (!Number.isFinite(amount) || amount < 0 || data.dollars < amount) return false;
    update((value) => { value.dollars -= amount; });
    return true;
  },
  recordLevel(level, { score, stars }) {
    update((value) => {
      const current = value.levels[level] ?? { stars: 0, bestScore: 0 };
      value.levels[level] = {
        stars: Math.max(current.stars, stars),
        bestScore: Math.max(current.bestScore, Math.floor(score)),
      };
      value.unlockedLevel = Math.min(GAME_CONFIG.MAX_LEVELS, Math.max(value.unlockedLevel, level + 1));
      value.highScore = Math.max(value.highScore, Math.floor(score));
    });
  },
  setHighScore(score) {
    update((value) => { value.highScore = Math.max(value.highScore, Math.floor(score)); });
  },
  ownCar(id) {
    update((value) => {
      if (!value.ownedCars.includes(id)) value.ownedCars.push(id);
    });
  },
  selectCar(id) {
    if (!data.ownedCars.includes(id)) return false;
    update((value) => { value.selectedCar = id; });
    return true;
  },
  ownPaint(color) {
    update((value) => {
      if (!value.ownedPaints.includes(color)) value.ownedPaints.push(color);
    });
  },
  selectPaint(color) {
    if (!data.ownedPaints.includes(color)) return false;
    update((value) => { value.selectedPaint = color; });
    return true;
  },
  claimDailyLogin() {
    if (data.loginDate === todayKey()) return false;
    update((value) => { value.loginDate = todayKey(); value.dollars += ECONOMY.DAILY_LOGIN_DOLLARS; });
    return true;
  },
  claimPracticeCoins(amount) {
    return rewardCoins(Math.min(amount, ECONOMY.PRACTICE_COIN_REWARD), true);
  },
  spendCurrency(currency, amount) {
    return currency === "dollars" ? this.spendDollars(amount) : this.spendCoins(amount);
  },
  getSnapshot() {
    return JSON.parse(JSON.stringify(this.data));
  },
};

save.claimDailyLogin();
