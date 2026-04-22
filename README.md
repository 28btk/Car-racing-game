# Car racing game

A browser-based arcade racing game built with Three.js. Dodge traffic, survive the police chase, and push your score as the road gets faster and more crowded.

## Live demo

Play online here:

[https://28btk.github.io/Car-racing-game/](https://28btk.github.io/Car-racing-game/)

## Overview

This project is a lightweight 3D racing experience designed for desktop browsers. The game features a custom road scene, procedural traffic, roadside city blocks, a day and night cycle, and a player car loaded from a Cloudinary-hosted GLB model.

## How to play

- Press `A` to move left.
- Press `D` to move right.
- Press `Esc` to pause or resume the game.
- Avoid every vehicle on the road.
- You have `3` lives per run.

## Game features

- Endless arcade-style racing loop
- Procedural traffic with cars and buses
- Increasing difficulty over time
- Day and night environment cycle
- Street-lit city atmosphere
- Live score, speed, and lives HUD
- GitHub Pages-ready static deployment

## Run locally

1. Open a terminal in the project folder.
2. Start the local static server:

```bash
node server.mjs
```

3. Open the game in your browser:

```text
http://127.0.0.1:4173
```

4. Hard refresh with `Ctrl + F5` if the browser is caching old files.

## Project structure

```text
.
├── index.html
├── main.js
├── styles.css
├── server.mjs
├── src/
│   ├── config.js
│   ├── game.js
│   ├── ui.js
│   ├── utils.js
│   ├── vehicles.js
│   └── world.js
└── vendor/
    └── three/
```

## Tech stack

- HTML
- CSS
- JavaScript
- Three.js

## Author

Created by `28_btk`.
