import * as THREE from '../vendor/three/three.module.js?v=20260422-pages2';

import {
	ACTOR_HITBOX,
	INITIAL_SPEED,
	LANE_POSITIONS,
	MAX_BLOCKED_LANES,
	PLAYER_HITBOX,
	PLAYER_START_LANE,
	PLAYER_Z,
	ROAD_LENGTH,
} from './config.js?v=20260422-pages2';
import { getUIRefs, clearToast, setOverlayState, setSettingsPanelOpen, showToast, tickToast, updateHud, updateLoadingMessage } from './ui.js?v=20260422-pages2';
import { buildPlayerCar, buildPoliceCar, buildTrafficVehicle, loadPlayerTemplate } from './vehicles.js?v=20260422-pages2';
import { applySceneAtmosphere, createWorld, getCycleFactor, resetRoadSegments, updateRoadSegments, updateWorldEnvironment } from './world.js?v=20260422-pages2';
import { clamp, chooseRandom, getContiguousLaneGroups, isOppositeDirectionLane, randomBetween } from './utils.js?v=20260422-pages2';

const ui = getUIRefs();

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
ui.root.append(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#7ccfff');
scene.fog = new THREE.Fog(0x9bd6ff, 36, 210);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 8.8, 20);
camera.lookAt(0, 3.8, -34);

const clock = new THREE.Clock();
const actors = [];

let world = null;
let playerCar = null;
let policeCar = null;
let spawnAccumulator = 0;
let collisionCooldown = 0;

const game = {
	loading: true,
	paused: false,
	gameOver: false,
	settingsOpen: false,
	dayNightCycle: true,
	trafficDensity: 1,
	score: 0,
	lives: 3,
	elapsed: 0,
	speed: 0,
	currentLane: PLAYER_START_LANE,
	targetLane: PLAYER_START_LANE,
	policeActive: false,
	policeThreat: 0,
};

function getDifficultyFactor() {
	return clamp(game.elapsed / 90, 0, 1);
}

function setPaused(nextValue) {
	if (game.loading || game.gameOver) {
		return;
	}

	game.paused = nextValue;
	if (!game.paused) {
		setOverlayState('hidden');
		return;
	}

	setOverlayState('paused', {
		onResume: () => {
			closeSettingsPanel();
			setPaused(false);
		},
		onRestart: restartRun,
	});
}

function openSettingsPanel() {
	if (game.loading || game.gameOver) {
		return;
	}

	game.settingsOpen = true;
	setSettingsPanelOpen(true);
	setPaused(true);
}

function closeSettingsPanel() {
	game.settingsOpen = false;
	setSettingsPanelOpen(false);
}

function getSpawnZForLane(laneIndex, spawnOrder, difficultyFactor) {
	const oppositeLane = isOppositeDirectionLane(laneIndex);
	const compression = 1 - difficultyFactor * 0.24;
	const waveOffset = spawnOrder * (oppositeLane ? 18 : 13) * compression;

	if (oppositeLane) {
		return -236 - Math.random() * 52 - waveOffset;
	}

	return -168 - Math.random() * 36 - waveOffset;
}

function clearActors() {
	while (actors.length) {
		const actor = actors.pop();
		scene.remove(actor);
	}
}

function createActor(laneIndex, spawnZ, options = {}) {
	const blocker = Boolean(options.blocker);
	const vehicle = buildTrafficVehicle(options);
	const difficultyFactor = getDifficultyFactor();
	const paceBoost = 1 + difficultyFactor * 0.28;

	vehicle.position.set(LANE_POSITIONS[laneIndex], 0, spawnZ);
	vehicle.userData.laneIndex = laneIndex;
	vehicle.userData.blocker = blocker;
	vehicle.userData.hitbox = { ...ACTOR_HITBOX };
	vehicle.userData.direction = isOppositeDirectionLane(laneIndex) ? 'opposite' : 'same';
	vehicle.userData.relativeSpeed =
		vehicle.userData.direction === 'opposite'
			? randomBetween(0.56, 1.02) * paceBoost
			: blocker
				? randomBetween(-0.92, -0.78)
				: randomBetween(-0.68, -0.32) * paceBoost;
	vehicle.userData.baseRotationY = vehicle.rotation.y;

	if (vehicle.userData.direction === 'opposite') {
		vehicle.rotation.y = vehicle.userData.baseRotationY + Math.PI;
	}

	scene.add(vehicle);
	actors.push(vehicle);
}

function spawnActors() {
	const occupiedLanes = new Set(
		actors
			.filter((actor) => actor.position.z < -100)
			.map((actor) => LANE_POSITIONS.findIndex((laneX) => Math.abs(laneX - actor.position.x) < 0.5))
	);

	const availableLanes = LANE_POSITIONS.map((_, index) => index).filter((index) => !occupiedLanes.has(index));
	if (!availableLanes.length) {
		return;
	}

	const difficultyFactor = getDifficultyFactor();
	let targetBlockedLanes = 1;

	if (availableLanes.length >= 3 && Math.random() < 0.12 + difficultyFactor * 0.5) {
		targetBlockedLanes = 3;
	} else if (availableLanes.length >= 2 && Math.random() < 0.3 + difficultyFactor * 0.42) {
		targetBlockedLanes = 2;
	}

	targetBlockedLanes = Math.min(targetBlockedLanes, availableLanes.length, MAX_BLOCKED_LANES);

	let selectedLanes = null;
	for (let size = targetBlockedLanes; size >= 1; size -= 1) {
		const groups = getContiguousLaneGroups(availableLanes, size);
		if (!groups.length) {
			continue;
		}

		selectedLanes = chooseRandom(groups);
		break;
	}

	if (!selectedLanes) {
		selectedLanes = [chooseRandom(availableLanes)];
	}

	selectedLanes.forEach((laneIndex, spawnOrder) => {
		const sameDirectionLane = !isOppositeDirectionLane(laneIndex);
		const blockerChance = sameDirectionLane
			? selectedLanes.length >= 2
				? 0.44 + difficultyFactor * 0.32
				: 0.1 + difficultyFactor * 0.18
			: 0;
		const shouldBlock = Math.random() < blockerChance;
		const vehicleType =
			shouldBlock || (selectedLanes.length >= 3 && spawnOrder === 1)
				? 'bus'
				: Math.random() < 0.3
					? 'bus'
					: 'car';

		createActor(laneIndex, getSpawnZForLane(laneIndex, spawnOrder, difficultyFactor), {
			blocker: shouldBlock,
			vehicleType,
		});
	});
}

function handleCollision(actor) {
	if (collisionCooldown > 0 || game.gameOver) {
		return;
	}

	collisionCooldown = 1;
	game.lives -= 1;
	game.policeThreat += 1;
	game.policeActive = true;
	game.score = Math.max(0, game.score - 70);
	scene.remove(actor);
	actors.splice(actors.indexOf(actor), 1);

	if (game.lives > 0) {
		showToast(game.lives === 2 ? 'First hit. Police are on your tail.' : 'Second hit. The cops are getting closer.');
	} else {
		showToast('Third hit. The chase is over.');
	}

	updateHud(game);

	if (game.lives <= 0) {
		game.gameOver = true;
		game.paused = true;
		closeSettingsPanel();
		setOverlayState('gameover', {
			finalScore: game.score,
			onRestart: restartRun,
		});
	}
}

function updatePlayer(delta) {
	const targetX = LANE_POSITIONS[game.targetLane];
	playerCar.position.x = THREE.MathUtils.damp(playerCar.position.x, targetX, 7.5, delta);
	if (Math.abs(targetX - playerCar.position.x) < 0.12) {
		game.currentLane = game.targetLane;
	}

	const laneVelocity = targetX - playerCar.position.x;
	playerCar.rotation.z = THREE.MathUtils.damp(playerCar.rotation.z, -laneVelocity * 0.08, 8, delta);
	playerCar.rotation.x = THREE.MathUtils.damp(playerCar.rotation.x, 0.03 + Math.sin(game.elapsed * 8) * 0.015, 6, delta);

	camera.position.x = THREE.MathUtils.damp(camera.position.x, playerCar.position.x * 0.32, 4.5, delta);
	camera.lookAt(playerCar.position.x * 0.12, 2.6, -26);
}

function updatePolice(delta) {
	if (!game.policeActive) {
		policeCar.visible = false;
		return;
	}

	policeCar.visible = true;
	const targetX = playerCar.position.x * 0.85;
	const targetZ = PLAYER_Z + 8.4 - game.policeThreat * 1.55 + Math.sin(game.elapsed * 7) * 0.08;
	policeCar.position.x = THREE.MathUtils.damp(policeCar.position.x, targetX, 3.8, delta);
	policeCar.position.z = THREE.MathUtils.damp(policeCar.position.z, targetZ, 4.5, delta);
	policeCar.rotation.z = THREE.MathUtils.damp(policeCar.rotation.z, -(targetX - policeCar.position.x) * 0.06, 7, delta);

	const sirenWave = Math.abs(Math.sin(game.elapsed * 13));
	policeCar.userData.sirenMaterials.forEach((material, index) => {
		material.emissiveIntensity = index % 2 === 0 ? 0.8 + sirenWave * 2.4 : 0.8 + (1 - sirenWave) * 2.4;
	});
}

function updateActors(delta) {
	for (let index = actors.length - 1; index >= 0; index -= 1) {
		const actor = actors[index];
		actor.position.z += game.speed * delta * (1 + actor.userData.relativeSpeed);

		const isBus = actor.userData.vehicleType === 'bus';
		const driftAmount = Math.sin(game.elapsed * (isBus ? 2.2 : 3.4) + index) * (isBus ? 0.008 : 0.012);
		actor.rotation.z = THREE.MathUtils.damp(actor.rotation.z, driftAmount, 6, delta);

		if (actor.position.z > 28) {
			scene.remove(actor);
			actors.splice(index, 1);
			continue;
		}

		const distanceX = Math.abs(actor.position.x - playerCar.position.x);
		const distanceZ = Math.abs(actor.position.z - PLAYER_Z);
		if (distanceX < actor.userData.hitbox.x + PLAYER_HITBOX.x && distanceZ < actor.userData.hitbox.z + PLAYER_HITBOX.z) {
			handleCollision(actor);
		}
	}
}

function restartRun() {
	clearActors();
	closeSettingsPanel();

	game.loading = false;
	game.paused = false;
	game.gameOver = false;
	game.settingsOpen = false;
	game.score = 0;
	game.lives = 3;
	game.elapsed = 0;
	game.speed = INITIAL_SPEED;
	game.currentLane = PLAYER_START_LANE;
	game.targetLane = PLAYER_START_LANE;
	game.policeActive = false;
	game.policeThreat = 0;

	spawnAccumulator = 0;
	collisionCooldown = 0;

	clearToast();
	resetRoadSegments(world);

	playerCar.position.set(LANE_POSITIONS[game.currentLane], 0, PLAYER_Z);
	playerCar.rotation.set(0, 0, 0);

	policeCar.position.set(LANE_POSITIONS[game.currentLane], 0, PLAYER_Z + 8.8);
	policeCar.rotation.set(0, 0, 0);
	policeCar.visible = false;

	camera.position.set(0, 8.8, 20);
	camera.lookAt(0, 3.8, -34);

	updateHud(game);
	setOverlayState('hidden');
	showToast('Fresh run. Keep the lane clean.');
}

function hydratePlayerModel() {
	scene.remove(playerCar);
	playerCar = buildPlayerCar(game.currentLane);
	scene.add(playerCar);
}

function handleKeydown(event) {
	if (event.repeat) {
		return;
	}

	if (event.key === 'Escape') {
		event.preventDefault();

		if (game.loading || game.gameOver) {
			return;
		}

		if (game.settingsOpen) {
			closeSettingsPanel();
			setPaused(false);
			return;
		}

		setPaused(!game.paused);
		return;
	}

	if (game.loading || game.paused || game.gameOver) {
		return;
	}

	if (event.key.toLowerCase() === 'a') {
		game.targetLane = clamp(game.targetLane - 1, 0, LANE_POSITIONS.length - 1);
		showToast(`Lane ${game.targetLane + 1} engaged.`);
	}

	if (event.key.toLowerCase() === 'd') {
		game.targetLane = clamp(game.targetLane + 1, 0, LANE_POSITIONS.length - 1);
		showToast(`Lane ${game.targetLane + 1} engaged.`);
	}
}

function onResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
}

function createScene() {
	world = createWorld(scene);
	playerCar = buildPlayerCar(game.currentLane);
	scene.add(playerCar);

	policeCar = buildPoliceCar(game.currentLane);
	policeCar.visible = false;
	scene.add(policeCar);

	updateHud(game);
}

function animate() {
	requestAnimationFrame(animate);
	const delta = Math.min(clock.getDelta(), 0.05);

	tickToast(delta);

	if (game.loading) {
		renderer.render(scene, camera);
		return;
	}

	if (!game.paused && !game.gameOver) {
		game.elapsed += delta;
		game.speed = 16 + Math.sin(game.elapsed * 0.92) * 1 + game.elapsed * 0.2;
		game.score += delta * (game.speed * 8.4 + 12);
		spawnAccumulator -= delta;
		collisionCooldown = Math.max(0, collisionCooldown - delta);

		const difficultyFactor = getDifficultyFactor();
		const spawnInterval = clamp(
			(1.18 - game.speed * 0.02 - difficultyFactor * 0.34) / (game.trafficDensity * (1 + difficultyFactor * 0.42)),
			0.28,
			1.35
		);

		if (spawnAccumulator <= 0) {
			spawnActors();
			spawnAccumulator = spawnInterval * randomBetween(0.82, 1.18);
		}

		updateRoadSegments(world, game.speed * delta);
		updatePlayer(delta);
		updateActors(delta);
		updatePolice(delta);
		updateHud(game);
	}

	const cycleFactor = getCycleFactor(game.elapsed, game.dayNightCycle);
	applySceneAtmosphere(scene, cycleFactor);
	updateWorldEnvironment(world, cycleFactor, delta);
	renderer.render(scene, camera);
}

export async function bootstrapGame() {
	setOverlayState('loading');
	createScene();

	ui.settingsButton.addEventListener('click', () => {
		if (game.settingsOpen) {
			closeSettingsPanel();
			setPaused(false);
			return;
		}

		openSettingsPanel();
	});

	ui.resumeButton.addEventListener('click', () => {
		closeSettingsPanel();
		setPaused(false);
	});

	ui.restartButton.addEventListener('click', restartRun);

	ui.cycleToggle.addEventListener('change', () => {
		game.dayNightCycle = ui.cycleToggle.checked;
		showToast(game.dayNightCycle ? 'Day/night cycle enabled.' : 'Sky locked to daylight.');
	});

	ui.densityRange.addEventListener('input', () => {
		game.trafficDensity = Number(ui.densityRange.value);
		showToast(`Traffic density ${Math.round(game.trafficDensity * 100)}%.`);
	});

	window.addEventListener('keydown', handleKeydown);
	window.addEventListener('resize', onResize);
	window.addEventListener('blur', () => {
		if (!game.loading && !game.gameOver) {
			setPaused(true);
		}
	});

	animate();

	try {
		updateLoadingMessage(
			'by author: 28_btk',
			'Rules: Use A and D to change lanes. Avoid every vehicle on the road. You lose after 3 crashes. Press Esc to pause.'
		);
		await loadPlayerTemplate(updateLoadingMessage, showToast);
		hydratePlayerModel();
		game.loading = false;
		restartRun();
	} catch (error) {
		console.error(error);
		game.loading = false;
		restartRun();
		showToast('Started with the procedural player car because loading failed.');
	}
}
