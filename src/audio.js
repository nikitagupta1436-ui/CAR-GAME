let context;
let master;
let engineOscillator;
let engineGain;
let muted = false;

function ensureAudio() {
  if (context) {
    if (context.state === "suspended") context.resume();
    return;
  }
  context = new AudioContext();
  master = context.createGain();
  master.gain.value = muted ? 0 : 0.18;
  master.connect(context.destination);
  engineOscillator = context.createOscillator();
  engineOscillator.type = "sawtooth";
  engineGain = context.createGain();
  engineGain.gain.value = 0;
  engineOscillator.connect(engineGain).connect(master);
  engineOscillator.start();
}

export function startAudio() {
  ensureAudio();
}

export function updateEngineSound(speed) {
  if (!context) return;
  const now = context.currentTime;
  engineOscillator.frequency.setTargetAtTime(55 + speed * 3.2, now, 0.08);
  engineGain.gain.setTargetAtTime(speed > 0.5 ? 0.035 : 0.008, now, 0.1);
}

function tone(frequency, duration, type = "sine", volume = 0.16) {
  ensureAudio();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, context.currentTime);
  gain.gain.setValueAtTime(volume, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
  oscillator.connect(gain).connect(master);
  oscillator.start();
  oscillator.stop(context.currentTime + duration);
}

export function playCrashSound() {
  tone(90, 0.35, "sawtooth", 0.3);
}

export function playRefuelSound() {
  tone(520, 0.12);
  window.setTimeout(() => tone(780, 0.2), 110);
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.setTargetAtTime(muted ? 0 : 0.18, context.currentTime, 0.04);
  return muted;
}
