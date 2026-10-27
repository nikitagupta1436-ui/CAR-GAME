import { CAR_DEFINITIONS } from "./car.js";
import { ECONOMY } from "./config/economy.js";
import { save } from "./save.js";

export const PAINT_COLORS = Object.freeze(["#d63837", "#358fc6", "#e5bf45", "#38afa7"]);

export function findCar(id) {
  return CAR_DEFINITIONS.find((car) => car.id === id) ?? CAR_DEFINITIONS[0];
}

export function purchaseCar(id, currency) {
  const car = findCar(id);
  const price = ECONOMY.CAR_PRICES[id];
  if (!price || !Object.hasOwn(price, currency)) return { success: false, reason: "unavailable" };
  if (save.data.ownedCars.includes(id)) return { success: false, reason: "owned" };
  if (!save.spendCurrency(currency, price[currency])) return { success: false, reason: "insufficient" };
  save.ownCar(id);
  return { success: true };
}

export function selectCar(id) {
  return save.selectCar(id);
}

export function purchasePaint(color) {
  if (save.data.ownedPaints.includes(color)) return { success: false, reason: "owned" };
  if (!save.spendCoins(ECONOMY.CAR_PAINT_COST_COINS)) return { success: false, reason: "insufficient" };
  save.ownPaint(color);
  return { success: true };
}

export function selectPaint(color) {
  return save.selectPaint(color);
}
