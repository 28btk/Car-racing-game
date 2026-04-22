import * as THREE from '../vendor/three/three.module.js?v=20260422-pages2';

import {
	BUILDING_BLOCK_HEIGHT,
	BUILDING_BLOCK_SIZE,
	BUILDING_EDGE_GAP,
	BUILDING_MAX_HEIGHT_BLOCKS,
	BUILDING_MIN_HEIGHT_BLOCKS,
	BUILDING_PALETTE,
	BUILDING_STRIP_GAP,
	DAY_FOG,
	DAY_GROUND,
	DAY_SKY,
	LANE_MARK_DAY,
	LANE_MARK_NIGHT,
	NIGHT_FOG,
	NIGHT_GROUND,
	NIGHT_SKY,
	ROAD_COLOR,
	ROAD_LENGTH,
	ROAD_NIGHT,
	ROAD_SEGMENTS,
	ROAD_WIDTH,
	STREET_LIGHT_COLOR,
	STREET_LIGHT_NIGHT,
} from './config.js';
import { chooseRandom, randomBetween } from './utils.js?v=20260422-pages2';
import { createMaterial } from './vehicles.js?v=20260422-pages2';

function createFallbackBuilding() {
	const frontageBlocks = THREE.MathUtils.randInt(2, 3);
	const depthBlocks = THREE.MathUtils.randInt(2, 3);
	const heightBlocks = THREE.MathUtils.randInt(BUILDING_MIN_HEIGHT_BLOCKS, BUILDING_MAX_HEIGHT_BLOCKS);
	const frontage = frontageBlocks * BUILDING_BLOCK_SIZE;
	const depth = depthBlocks * BUILDING_BLOCK_SIZE;
	const palette = chooseRandom(BUILDING_PALETTE);
	const building = new THREE.Group();

	const plinth = new THREE.Mesh(
		new THREE.BoxGeometry(frontage + 0.18, 0.14, depth + 0.18),
		createMaterial('#4f4d4a', 0.97, 0.01)
	);
	plinth.position.y = 0.07;
	building.add(plinth);

	for (let level = 0; level < heightBlocks; level += 1) {
		const taper = level * 0.12 + randomBetween(0.02, 0.08);
		const levelWidth = Math.max(BUILDING_BLOCK_SIZE * 0.76, frontage - taper);
		const levelDepth = Math.max(BUILDING_BLOCK_SIZE * 0.76, depth - taper * 0.9);
		const sectionColor = new THREE.Color(palette.body).offsetHSL(0, 0, level * 0.02);
		const section = new THREE.Mesh(
			new THREE.BoxGeometry(levelWidth, BUILDING_BLOCK_HEIGHT - 0.06, levelDepth),
			createMaterial(sectionColor, 0.9, 0.04)
		);
		section.position.set(
			randomBetween(-0.04, 0.04),
			level * BUILDING_BLOCK_HEIGHT + BUILDING_BLOCK_HEIGHT / 2,
			randomBetween(-0.04, 0.04)
		);
		building.add(section);

		if (level < heightBlocks - 1) {
			const trim = new THREE.Mesh(
				new THREE.BoxGeometry(levelWidth + 0.08, 0.11, levelDepth + 0.08),
				createMaterial(palette.trim, 0.8, 0.06)
			);
			trim.position.set(section.position.x, section.position.y + BUILDING_BLOCK_HEIGHT / 2 - 0.04, section.position.z);
			building.add(trim);
		}
	}

	if (heightBlocks >= 2) {
		const roofBox = new THREE.Mesh(
			new THREE.BoxGeometry(frontage * 0.28, 0.28, depth * 0.28),
			createMaterial(palette.roof, 0.72, 0.08)
		);
		roofBox.position.y = heightBlocks * BUILDING_BLOCK_HEIGHT + 0.18;
		roofBox.position.x = randomBetween(-0.22, 0.22);
		roofBox.position.z = randomBetween(-0.22, 0.22);
		building.add(roofBox);
	}

	building.userData.frontage = frontage;
	building.userData.depth = depth;
	return building;
}

function createStreetLight(side, z, streetLights) {
	const group = new THREE.Group();
	const towardRoad = -side;

	const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 4.8, 10), createMaterial('#3b4048', 0.92, 0.08));
	pole.position.y = 2.4;

	const arm = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.1, 0.12), createMaterial('#3b4048', 0.92, 0.08));
	arm.position.set(towardRoad * 0.62, 4.72, 0);

	const hanger = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 0.08), createMaterial('#3b4048', 0.92, 0.08));
	hanger.position.set(towardRoad * 1.22, 4.5, 0);

	const lampHead = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.24), createMaterial('#2f333a', 0.82, 0.08));
	lampHead.position.set(towardRoad * 1.22, 4.3, 0);

	const bulbMaterial = new THREE.MeshStandardMaterial({
		color: STREET_LIGHT_COLOR,
		emissive: STREET_LIGHT_NIGHT,
		emissiveIntensity: 0,
		roughness: 0.3,
		metalness: 0.05,
	});
	const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), bulbMaterial);
	bulb.position.set(towardRoad * 1.22, 4.13, 0);

	const haloMaterial = new THREE.MeshBasicMaterial({
		color: STREET_LIGHT_COLOR,
		transparent: true,
		opacity: 0,
		depthWrite: false,
	});
	const halo = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 12), haloMaterial);
	halo.position.copy(bulb.position);

	const light = new THREE.PointLight(STREET_LIGHT_COLOR, 0, 18, 2.2);
	light.position.copy(bulb.position);

	group.position.set(side * (ROAD_WIDTH / 2 + 1.55), 0, z);
	group.add(pole, arm, hanger, lampHead, bulb, halo, light);

	streetLights.push({ bulbMaterial, haloMaterial, light });
	return group;
}

function createRoadSegment(streetLights) {
	const segment = new THREE.Group();

	const sideGround = new THREE.Mesh(
		new THREE.BoxGeometry(150, 0.12, ROAD_LENGTH),
		createMaterial(DAY_GROUND, 0.98, 0.01)
	);
	sideGround.position.y = -0.18;
	segment.userData.sideGround = sideGround;
	segment.add(sideGround);

	const road = new THREE.Mesh(
		new THREE.BoxGeometry(ROAD_WIDTH, 0.16, ROAD_LENGTH),
		createMaterial(ROAD_COLOR, 0.92, 0.04)
	);
	segment.userData.road = road;
	segment.add(road);

	const edgeLineGeo = new THREE.BoxGeometry(0.2, 0.05, ROAD_LENGTH - 3.8);
	const edgeLineMat = createMaterial(LANE_MARK_DAY, 0.3, 0.12);

	[-ROAD_WIDTH / 2 + 0.45, ROAD_WIDTH / 2 - 0.45].forEach((x) => {
		const edgeLine = new THREE.Mesh(edgeLineGeo, edgeLineMat.clone());
		edgeLine.position.set(x, 0.11, 0);
		segment.add(edgeLine);
	});

	const dashGeo = new THREE.BoxGeometry(0.22, 0.05, 4.3);
	const laneMat = createMaterial(LANE_MARK_DAY, 0.32, 0.14);
	segment.userData.laneMarks = [];

	for (let index = -2; index <= 2; index += 1) {
		[-0.26, 0.26].forEach((x) => {
			const dash = new THREE.Mesh(dashGeo, laneMat.clone());
			dash.position.set(x, 0.11, index * 12);
			segment.userData.laneMarks.push(dash);
			segment.add(dash);
		});
	}

	for (let side = -1; side <= 1; side += 2) {
		segment.add(createStreetLight(side, -16, streetLights));
		segment.add(createStreetLight(side, 16, streetLights));
	}

	const decor = new THREE.Group();
	segment.userData.decor = decor;
	segment.add(decor);
	refreshDecor(segment);

	return segment;
}

function refreshDecor(segment) {
	const decor = segment.userData.decor;
	decor.clear();

	for (let side = -1; side <= 1; side += 2) {
		let cursorZ = -ROAD_LENGTH / 2 + BUILDING_STRIP_GAP;
		while (cursorZ < ROAD_LENGTH / 2 - BUILDING_BLOCK_SIZE * 0.45) {
			const building = createFallbackBuilding();
			const frontage = building.userData.frontage || BUILDING_BLOCK_SIZE;
			const depth = building.userData.depth || BUILDING_BLOCK_SIZE;
			const innerFace = ROAD_WIDTH / 2 + BUILDING_EDGE_GAP;

			building.rotation.y = side === -1 ? 0 : Math.PI;
			building.position.set(side * (innerFace + depth / 2), 0, cursorZ + frontage / 2);

			decor.add(building);
			cursorZ += frontage + BUILDING_STRIP_GAP;
		}
	}
}

export function createWorld(scene) {
	const world = {
		roadSegments: [],
		streetLights: [],
		cloudPuffs: [],
		skyStars: null,
		grassMesh: null,
		hemiLight: null,
		sunLight: null,
	};

	const skyDome = new THREE.Mesh(
		new THREE.SphereGeometry(260, 32, 20),
		new THREE.MeshBasicMaterial({ color: DAY_SKY, side: THREE.BackSide })
	);
	skyDome.position.y = -22;
	scene.add(skyDome);

	const starGeometry = new THREE.BufferGeometry();
	const starPositions = [];
	for (let index = 0; index < 260; index += 1) {
		const radius = randomBetween(100, 180);
		const theta = randomBetween(0, Math.PI * 2);
		const phi = randomBetween(0.2, 1.25);
		starPositions.push(
			radius * Math.sin(phi) * Math.cos(theta),
			radius * Math.cos(phi) + 24,
			radius * Math.sin(phi) * Math.sin(theta)
		);
	}

	starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
	world.skyStars = new THREE.Points(
		starGeometry,
		new THREE.PointsMaterial({ color: '#f6f8ff', size: 1.15, transparent: true, opacity: 0 })
	);
	scene.add(world.skyStars);

	const cloudMaterial = new THREE.MeshStandardMaterial({
		color: '#ffffff',
		transparent: true,
		opacity: 0.92,
		roughness: 1,
	});

	for (let index = 0; index < 12; index += 1) {
		const puff = new THREE.Group();
		const pieces = THREE.MathUtils.randInt(3, 5);
		for (let piece = 0; piece < pieces; piece += 1) {
			const cloudPart = new THREE.Mesh(
				new THREE.SphereGeometry(randomBetween(1.8, 3.4), 14, 14),
				cloudMaterial.clone()
			);
			cloudPart.position.set(randomBetween(-2.8, 2.8), randomBetween(-0.4, 0.9), randomBetween(-1.8, 1.8));
			puff.add(cloudPart);
		}

		puff.position.set(randomBetween(-42, 42), randomBetween(18, 31), randomBetween(-170, -20));
		puff.userData.speed = randomBetween(1.2, 2.6);
		world.cloudPuffs.push(puff);
		scene.add(puff);
	}

	world.hemiLight = new THREE.HemisphereLight('#bde7ff', '#525863', 1.3);
	scene.add(world.hemiLight);

	world.sunLight = new THREE.DirectionalLight('#ffffff', 1.65);
	world.sunLight.position.set(-24, 42, 22);
	scene.add(world.sunLight);

	world.grassMesh = new THREE.Mesh(
		new THREE.BoxGeometry(170, 0.1, ROAD_LENGTH * ROAD_SEGMENTS + 40),
		createMaterial(DAY_GROUND, 0.98, 0.01)
	);
	world.grassMesh.position.set(0, -0.24, -ROAD_LENGTH * 2.2);
	scene.add(world.grassMesh);

	for (let index = 0; index < ROAD_SEGMENTS; index += 1) {
		const segment = createRoadSegment(world.streetLights);
		segment.position.z = -index * ROAD_LENGTH;
		world.roadSegments.push(segment);
		scene.add(segment);
	}

	return world;
}

export function resetRoadSegments(world) {
	world.roadSegments.forEach((segment, index) => {
		segment.position.set(0, 0, -index * ROAD_LENGTH);
		refreshDecor(segment);
	});
}

export function updateRoadSegments(world, travel) {
	for (const segment of world.roadSegments) {
		segment.position.z += travel;
		if (segment.position.z > ROAD_LENGTH) {
			segment.position.z -= ROAD_LENGTH * ROAD_SEGMENTS;
			refreshDecor(segment);
		}
	}
}

export function getCycleFactor(elapsed, dayNightCycle) {
	if (!dayNightCycle) {
		return 0;
	}

	const phase = (elapsed % 80) / 80;
	if (phase < 0.44) {
		return 0;
	}
	if (phase < 0.68) {
		return THREE.MathUtils.smoothstep(phase, 0.44, 0.68);
	}
	if (phase < 0.88) {
		return 1;
	}
	return 1 - THREE.MathUtils.smoothstep(phase, 0.88, 1);
}

export function updateWorldEnvironment(world, cycleFactor, delta) {
	world.grassMesh.material.color.copy(DAY_GROUND).lerp(NIGHT_GROUND, cycleFactor);

	for (const segment of world.roadSegments) {
		segment.userData.sideGround.material.color.copy(DAY_GROUND).lerp(NIGHT_GROUND, cycleFactor);
		segment.userData.road.material.color.copy(ROAD_COLOR).lerp(ROAD_NIGHT, cycleFactor);
		segment.userData.laneMarks.forEach((dash) => {
			dash.material.color.copy(LANE_MARK_DAY).lerp(LANE_MARK_NIGHT, cycleFactor);
			dash.material.emissive.copy(LANE_MARK_DAY).lerp(LANE_MARK_NIGHT, cycleFactor).multiplyScalar(cycleFactor * 0.18);
		});
	}

	world.hemiLight.intensity = THREE.MathUtils.lerp(1.32, 0.42, cycleFactor);
	world.hemiLight.color.copy(new THREE.Color('#bde7ff')).lerp(new THREE.Color('#5272b3'), cycleFactor);
	world.hemiLight.groundColor.copy(new THREE.Color('#525863')).lerp(new THREE.Color('#101419'), cycleFactor);

	world.sunLight.intensity = THREE.MathUtils.lerp(1.62, 0.35, cycleFactor);
	world.sunLight.color.copy(new THREE.Color('#fff7cf')).lerp(new THREE.Color('#88a7ff'), cycleFactor);

	world.skyStars.material.opacity = cycleFactor * 0.92;

	const lampFactor = THREE.MathUtils.smoothstep(cycleFactor, 0.45, 0.9);
	world.streetLights.forEach((streetLight) => {
		streetLight.bulbMaterial.emissive.copy(STREET_LIGHT_NIGHT);
		streetLight.bulbMaterial.emissiveIntensity = lampFactor * 2.2;
		streetLight.haloMaterial.opacity = lampFactor * 0.28;
		streetLight.light.intensity = lampFactor * 1.7;
	});

	for (const cloud of world.cloudPuffs) {
		cloud.position.z += delta * cloud.userData.speed * 0.55;
		if (cloud.position.z > 24) {
			cloud.position.z = -170;
			cloud.position.x = randomBetween(-42, 42);
			cloud.position.y = randomBetween(18, 31);
		}

		cloud.children.forEach((child) => {
			child.material.opacity = THREE.MathUtils.lerp(0.92, 0.16, cycleFactor);
			child.material.color.copy(new THREE.Color('#ffffff')).lerp(new THREE.Color('#9bb3d7'), cycleFactor);
		});
	}
}

export function applySceneAtmosphere(scene, cycleFactor) {
	scene.background.copy(DAY_SKY).lerp(NIGHT_SKY, cycleFactor);
	scene.fog.color.copy(DAY_FOG).lerp(NIGHT_FOG, cycleFactor);
	scene.fog.near = 34;
	scene.fog.far = THREE.MathUtils.lerp(215, 170, cycleFactor);
}
