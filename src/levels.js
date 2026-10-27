export function getLevelConfig(level) {
  const timeOfDay = level <= 3 ? "day" : level <= 6 ? "sunset" : "night";
  return {
    level,
    length: 2000 + (level - 1) * 1000,
    trafficCount: Math.min(5 + Math.floor((level - 1) / 2), 14),
    trafficSpeed: Math.min(9 + level * 0.45, 17),
    difficulty: level <= 3 ? "easy" : level <= 6 ? "medium" : "hard",
    timeOfDay,
  };
}
