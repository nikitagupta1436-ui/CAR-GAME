export function getLevelConfig(level) {
  const timeOfDay = level <= 3 ? "day" : level <= 6 ? "sunset" : "night";
  return {
    level,
    length: 2000 + (level - 1) * 1000,
    trafficCount: Math.min(5 + level * 2, 24),
    trafficSpeed: Math.min(10 + level * 1.8, 28),
    difficulty: level <= 3 ? "easy" : level <= 6 ? "medium" : "hard",
    timeOfDay,
  };
}
