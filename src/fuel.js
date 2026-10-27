import { GAME_CONFIG } from "./config/game.js";

let activeFuel;

export function createFuelSystem() {
  activeFuel = { value: 100, refueling: false };
  return activeFuel;
}

export function consumeFuel(fuel, speed, delta, efficiency = 1) {
  if (fuel.refueling || fuel.value <= 0) return;
  const speedFactor = 0.65 + Math.max(speed, 0) / 60;
  const efficiencyFactor = 1 / Math.max(0.5, efficiency);
  fuel.value = Math.max(0, fuel.value - (0.012 + speedFactor * 0.015) * efficiencyFactor * delta * 60);
}

export function applyFuelResult(correct) {
  if (!activeFuel) throw new Error("Fuel system must be initialized before applying a quiz result.");
  const start = activeFuel.value;
  const target = correct ? 100 : Math.min(100, start + GAME_CONFIG.EMERGENCY_FUEL_PERCENT);
  activeFuel.value = target;
  activeFuel.refueling = false;
  return { start, target };
}
