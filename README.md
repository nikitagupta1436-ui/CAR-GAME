# DSA Racer

DSA Racer is a browser-based low-poly 3D highway racer and coding quiz, built with Three.js, Vite, and vanilla JavaScript modules. Game progress and the entirely in-game economy are stored locally; there is no backend or real-money purchase flow.

## Run locally

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Run `npm run build` for a production build and `npm run preview` to serve it locally.

## Game flow

Choose C++, Java, Python, JavaScript, or C, then select an unlocked level and optional question topic. Complete the highway to earn stars and unlock the next level. Each road has a fuel station halfway through: a correct answer fills the tank, and a wrong answer or timeout gives a 10% emergency refill. After a wrong answer, 50 coins can buy an optional additional 30% fuel. Explanations and the correct answer are shown after every response.

Collect spinning road coins, avoid the reduced and spaced-out traffic, and use your five lives carefully. Each car has different top speed, acceleration, handling, fuel efficiency, and durability. Level completion, quiz streaks, and the daily login bonus award in-game dollars for premium garage cars. There are no real-money transactions. Practice mode has no driving pressure and awards a limited number of coins per day.

The versioned save module (`src/save.js`) stores the chosen language and topic, unlocked levels and best stars/scores, currencies, owned and selected cars/paint, and daily reward tracking. Invalid save data safely falls back to fresh progress.

## Controls

- **W / Up Arrow:** accelerate
- **S / Down Arrow:** brake
- **A / Left Arrow** and **D / Right Arrow:** steer
- **Space:** handbrake
- **P / Escape:** pause or resume
- Touch devices have on-screen steering, brake, and accelerator controls.

## Project layout

- `src/main.js` — renderer, input, game loop, and game/practice/progression flow
- `src/world.js`, `src/car.js`, `src/traffic.js`, `src/coins.js` — world, vehicles, traffic, and pickups
- `src/fuel.js`, `src/dsaQuiz.js`, `src/questions/{language}/{difficulty}.json` — refueling and language-tagged quizzes
- `src/save.js`, `src/shop.js`, `src/garage.js` — local progression, economy, purchases, and car preview
- `src/config/` — gameplay settings, prices, and reward tuning
- `src/ui.js`, `src/audio.js`, `src/levels.js` — screens/HUD, Web Audio effects, and level setup

Each of the five language folders contains at least ten questions for each of the easy, medium, and hard tiers, including language-specific code snippets and output-prediction questions.
