# DSA Racer

A browser-based low-poly 3D highway racer that turns a mid-race fuel stop into a data-structures-and-algorithms quiz. Built with Three.js, Vite, and vanilla JavaScript modules; all game state is local to the browser.

## Run locally

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. To create a production build, run `npm run build`; `npm run preview` serves that build.

## Controls

- **W / Up Arrow:** accelerate
- **S / Down Arrow:** brake
- **A / Left Arrow** and **D / Right Arrow:** steer
- **Space:** handbrake
- **P / Escape:** pause or resume
- Touch devices have on-screen steering, brake, and accelerator controls.

The highway length grows by 1,000 m per level. Drive to the marked station halfway through each road and answer the 30-second quiz: a correct answer gives a full tank, while a wrong answer or timeout gives 30%. Avoid traffic, reach the finish, and take on harder questions and denser traffic in later levels. The best score is stored in localStorage.

## Project layout

- `src/main.js` — renderer, game loop, input, and state transitions
- `src/world.js` — procedural Three.js highway, station, scenery, and lighting
- `src/car.js`, `src/traffic.js` — player handling and AI traffic
- `src/fuel.js`, `src/dsaQuiz.js` — fuel rules and question flow
- `src/questions/` — 15 original questions per difficulty tier
- `src/ui.js`, `src/audio.js`, `src/levels.js` — HUD, sound, and level configuration
