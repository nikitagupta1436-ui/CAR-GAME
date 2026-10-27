import * as THREE from "three";
import { CAR_DEFINITIONS, createCar } from "./car.js";
import { ECONOMY } from "./config/economy.js";
import { save } from "./save.js";
import { PAINT_COLORS, purchaseCar, purchasePaint, selectCar, selectPaint } from "./shop.js";
import { showToast } from "./ui.js";

let previewRenderer;
let previewScene;
let previewCamera;
let previewCar;
let selectedIndex = 0;
let garageOpen = false;
let onBack = () => {};

function priceText(car, currency) {
  const price = ECONOMY.CAR_PRICES[car.id];
  if (!price) return "FREE";
  if (currency && price[currency]) return `${price[currency]} ${currency.toUpperCase()}`;
  return Object.entries(price).map(([type, amount]) => `${amount} ${type.toUpperCase()}`).join(" OR ");
}

function setPreviewCar() {
  const definition = CAR_DEFINITIONS[selectedIndex];
  if (previewCar) previewScene.remove(previewCar);
  previewCar = createCar(definition, save.data.selectedPaint);
  previewCar.position.y = -0.1;
  previewScene.add(previewCar);
  const owned = save.data.ownedCars.includes(definition.id);
  const stats = Object.entries(definition.stats).map(([key, value]) => {
    const percent = key === "topSpeed" ? value / 80 * 100
      : key === "acceleration" ? value / 32 * 100
        : value / (key === "handling" ? 1.4 : 1.3) * 100;
    const label = { topSpeed: "TOP SPEED", acceleration: "ACCELERATION", handling: "HANDLING", efficiency: "FUEL EFFICIENCY", durability: "DURABILITY" }[key];
    return `<div class="stat-row"><span>${label}</span><div class="stat-track"><i style="width:${Math.min(100, percent)}%"></i></div></div>`;
  }).join("");
  const selector = document.getElementById("garage-car-list");
  selector.replaceChildren(...CAR_DEFINITIONS.map((car, index) => {
    const button = document.createElement("button");
    button.className = `car-pick${index === selectedIndex ? " active" : ""}`;
    button.textContent = `${save.data.ownedCars.includes(car.id) ? "✓ " : "🔒 "}${car.name}`;
    button.addEventListener("click", () => { selectedIndex = index; setPreviewCar(); });
    return button;
  }));
  document.getElementById("garage-car-name").textContent = definition.name;
  document.getElementById("garage-car-price").textContent = owned ? "OWNED" : priceText(definition);
  document.getElementById("garage-stats").innerHTML = stats;
  document.getElementById("garage-wallet").textContent = `🪙 ${save.data.coins}  ·  $${save.data.dollars}`;
  const selectButton = document.getElementById("garage-select-button");
  selectButton.disabled = !owned;
  document.getElementById("garage-buy-button").classList.toggle("hidden", owned);
  document.getElementById("garage-buy-button").textContent = `BUY · ${priceText(definition)}`;
  const paintTray = document.getElementById("paint-options");
  paintTray.replaceChildren(...PAINT_COLORS.map((color) => {
    const button = document.createElement("button");
    button.className = "paint-swatch";
    button.style.backgroundColor = color;
    button.title = save.data.ownedPaints.includes(color) ? "Select paint" : `Buy paint for ${ECONOMY.CAR_PAINT_COST_COINS} coins`;
    button.addEventListener("click", () => {
      if (save.data.ownedPaints.includes(color)) {
        selectPaint(color);
        setPreviewCar();
        return;
      }
      const result = purchasePaint(color);
      if (result.success) { showToast("PAINT UNLOCKED"); setPreviewCar(); }
      else showToast("NOT ENOUGH COINS FOR PAINT");
    });
    paintTray.append(button);
  }));
}

function ensurePreview() {
  if (previewRenderer) return;
  const canvas = document.getElementById("garage-preview");
  previewRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  previewRenderer.setSize(canvas.clientWidth || 420, canvas.clientHeight || 240, false);
  previewRenderer.outputColorSpace = THREE.SRGBColorSpace;
  previewRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  previewScene = new THREE.Scene();
  previewScene.background = new THREE.Color(0x10212b);
  previewScene.add(new THREE.HemisphereLight(0xc8e8ff, 0x39402a, 2));
  const key = new THREE.DirectionalLight(0xffedcf, 2.5);
  key.position.set(-5, 9, -6);
  previewScene.add(key);
  previewCamera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  previewCamera.position.set(6, 4, -8);
  previewCamera.lookAt(0, 0.7, 0);
  previewCamera.aspect = (canvas.clientWidth || 420) / (canvas.clientHeight || 240);
  previewCamera.updateProjectionMatrix();
}

function animatePreview() {
  if (!garageOpen) return;
  requestAnimationFrame(animatePreview);
  if (previewCar) previewCar.rotation.y += 0.006;
  previewRenderer.render(previewScene, previewCamera);
}

export function openGarage(back = () => {}) {
  onBack = back;
  garageOpen = true;
  ensurePreview();
  const selected = Math.max(0, CAR_DEFINITIONS.findIndex((car) => car.id === save.data.selectedCar));
  selectedIndex = selected;
  setPreviewCar();
  document.getElementById("garage-screen").classList.remove("hidden");
  animatePreview();
}

export function closeGarage() {
  garageOpen = false;
  document.getElementById("garage-screen").classList.add("hidden");
  onBack();
}

export function bindGarage() {
  document.getElementById("garage-close-button").addEventListener("click", closeGarage);
  document.getElementById("garage-select-button").addEventListener("click", () => {
    const definition = CAR_DEFINITIONS[selectedIndex];
    if (!save.data.ownedCars.includes(definition.id)) return;
    selectCar(definition.id);
    showToast(`${definition.name.toUpperCase()} SELECTED`);
    setPreviewCar();
  });
  document.getElementById("garage-buy-button").addEventListener("click", () => {
    const definition = CAR_DEFINITIONS[selectedIndex];
    const price = ECONOMY.CAR_PRICES[definition.id];
    if (!price) { showToast("STARTER CAR IS FREE"); return; }
    const currencies = Object.keys(price);
    const canAfford = currencies.find((currency) => save.data[currency] >= price[currency]);
    if (!canAfford) { showToast("NOT ENOUGH CURRENCY"); return; }
    const result = purchaseCar(definition.id, canAfford);
    if (!result.success) { showToast("PURCHASE FAILED"); return; }
    selectCar(definition.id);
    showToast(`${definition.name.toUpperCase()} UNLOCKED`);
    setPreviewCar();
  });
  window.addEventListener("resize", () => {
    if (!previewRenderer) return;
    const canvas = document.getElementById("garage-preview");
    previewCamera.aspect = (canvas.clientWidth || 420) / (canvas.clientHeight || 240);
    previewCamera.updateProjectionMatrix();
    previewRenderer.setSize(canvas.clientWidth || 420, canvas.clientHeight || 240, false);
  });
}
