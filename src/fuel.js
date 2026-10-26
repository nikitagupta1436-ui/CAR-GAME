export function createFuelSystem() {
  return { value: 100, stationHandled: false, refueling: false };
}

export function consumeFuel(fuel, speed, delta) {
  if (fuel.refueling || fuel.value <= 0) return;
  const speedFactor = 0.65 + Math.max(speed, 0) / 60;
  fuel.value = Math.max(0, fuel.value - (0.012 + speedFactor * 0.015) * delta * 60);
}

export function refuel(fuel, amount) {
  fuel.value = Math.min(100, amount);
  fuel.refueling = false;
}
