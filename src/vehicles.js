import * as THREE from '../vendor/three/three.module.js?v=20260422-pages2';
import { GLTFLoader } from '../vendor/three/loaders/GLTFLoader.js?v=20260422-pages2';

import {
	ASSET_LOAD_TIMEOUT_MS,
	LANE_POSITIONS,
	PLAYER_MODEL_TARGET_SIZE,
	PLAYER_MODEL_URL,
	PLAYER_Z,
	TRAFFIC_BUS_CHANCE,
	TRAFFIC_PALETTES,
} from './config.js';
import { chooseRandom } from './utils.js?v=20260422-pages2';

const loader = new GLTFLoader();
loader.setCrossOrigin('anonymous');

let playerTemplate = null;

export function createMaterial(color, roughness = 0.72, metalness = 0.2) {
	return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function addVehicleWheels(target, axlePositions, halfWidth, radius, wheelDepth) {
	const wheelGeo = new THREE.CylinderGeometry(radius, radius, wheelDepth, 18);
	const wheelMat = createMaterial('#121212', 0.92, 0.08);

	axlePositions.forEach((z) => {
		[-halfWidth, halfWidth].forEach((x) => {
			const wheel = new THREE.Mesh(wheelGeo, wheelMat);
			wheel.rotation.z = Math.PI / 2;
			wheel.position.set(x, radius + 0.02, z);
			target.add(wheel);
		});
	});
}

export function createProceduralCar(bodyColor, glassColor, accentColor = '#f5f7fb') {
	const car = new THREE.Group();
	const body = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.5, 3.24), createMaterial(bodyColor, 0.35, 0.28));
	body.position.y = 0.72;

	const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.52, 1.72), createMaterial(glassColor, 0.12, 0.55));
	cabin.position.set(0, 1.12, 0.12);

	const hoodAccent = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.08, 0.76), createMaterial(accentColor, 0.42, 0.08));
	hoodAccent.position.set(0, 0.98, 1.06);

	const rearAccent = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.08, 0.48), createMaterial(accentColor, 0.42, 0.08));
	rearAccent.position.set(0, 0.9, -1.12);

	car.add(body, cabin, hoodAccent, rearAccent);
	addVehicleWheels(car, [1.12, -1.12], 0.84, 0.38, 0.35);
	return car;
}

export function createProceduralBus(bodyColor, accentColor) {
	const bus = new THREE.Group();

	const body = new THREE.Mesh(new THREE.BoxGeometry(1.96, 1.16, 4.96), createMaterial(bodyColor, 0.4, 0.14));
	body.position.y = 1;

	const roof = new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.16, 4.6), createMaterial(accentColor, 0.42, 0.08));
	roof.position.y = 1.66;

	const belt = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.16, 4.82), createMaterial('#f4f7fb', 0.5, 0.06));
	belt.position.y = 1.18;

	bus.add(body, roof, belt);

	const windowMat = createMaterial('#c9e8ff', 0.12, 0.46);
	for (let index = -2; index <= 2; index += 1) {
		if (index === 0) {
			continue;
		}

		const z = index * 0.8;
		[-0.94, 0.94].forEach((x) => {
			const windowPanel = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.46, 0.54), windowMat);
			windowPanel.position.set(x, 1.28, z);
			bus.add(windowPanel);
		});
	}

	const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.44, 0.08), windowMat);
	frontGlass.position.set(0, 1.28, 2.14);

	const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.38, 0.08), windowMat);
	rearGlass.position.set(0, 1.2, -2.14);

	const door = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.84, 0.78), createMaterial('#f7fbff', 0.52, 0.08));
	door.position.set(0.98, 0.84, 0.54);

	bus.add(frontGlass, rearGlass, door);
	addVehicleWheels(bus, [1.7, 0, -1.7], 0.96, 0.4, 0.38);
	return bus;
}

function normalizeModel(instance, targetSize) {
	instance.updateMatrixWorld(true);
	const box = new THREE.Box3().setFromObject(instance);
	const size = box.getSize(new THREE.Vector3());
	const maxAxis = Math.max(size.x, size.y, size.z) || 1;
	const scale = targetSize / maxAxis;
	instance.scale.setScalar(scale);
	instance.updateMatrixWorld(true);

	const scaledBox = new THREE.Box3().setFromObject(instance);
	const center = scaledBox.getCenter(new THREE.Vector3());
	instance.position.x -= center.x;
	instance.position.z -= center.z;
	instance.position.y -= scaledBox.min.y;
	instance.updateMatrixWorld(true);
}

function clonePlayerTemplate() {
	if (!playerTemplate) {
		return null;
	}

	const clone = playerTemplate.clone(true);
	clone.traverse((child) => {
		if (!child.isMesh) {
			return;
		}

		child.castShadow = false;
		child.receiveShadow = false;
		if (Array.isArray(child.material)) {
			child.material = child.material.map((material) => material.clone());
		} else if (child.material) {
			child.material = child.material.clone();
		}
	});

	normalizeModel(clone, PLAYER_MODEL_TARGET_SIZE);
	return clone;
}

export async function loadPlayerTemplate(updateLoadingMessage, showToast) {
	try {
		const gltf = await Promise.race([
			loader.loadAsync(PLAYER_MODEL_URL),
			new Promise((_, reject) => {
				window.setTimeout(() => reject(new Error('Timed out loading player Cloudinary GLB')), ASSET_LOAD_TIMEOUT_MS);
			}),
		]);

		playerTemplate = gltf.scene || gltf.scenes[0];
		playerTemplate.rotation.y = Math.PI;
		showToast('Player Cloudinary car loaded.');
	} catch (error) {
		console.warn('Could not load player Cloudinary model.', error);
		playerTemplate = null;
		showToast('Player GLB failed, so a procedural car is being used.');
		updateLoadingMessage(
			'by author: 28_btk',
			'Rules: Use A and D to change lanes. Avoid every vehicle on the road. You lose after 3 crashes. Press Esc to pause.'
		);
	}
}

export function buildPlayerCar(currentLane) {
	const glbCar = clonePlayerTemplate();
	const car = glbCar || createProceduralCar('#ff4d6d', '#afe6ff');
	car.position.set(LANE_POSITIONS[currentLane], 0, PLAYER_Z);
	return car;
}

export function buildPoliceCar(currentLane) {
	const car = createProceduralCar('#f3f7ff', '#98b8ff', '#2f63ff');
	car.position.set(LANE_POSITIONS[currentLane], 0, PLAYER_Z + 8.8);

	const redLight = new THREE.Mesh(
		new THREE.BoxGeometry(0.22, 0.13, 0.28),
		new THREE.MeshStandardMaterial({ color: '#ff3649', emissive: '#ff3649', emissiveIntensity: 1.4 })
	);
	redLight.position.set(-0.3, 1.28, 0.12);

	const blueLight = new THREE.Mesh(
		new THREE.BoxGeometry(0.22, 0.13, 0.28),
		new THREE.MeshStandardMaterial({ color: '#62b8ff', emissive: '#62b8ff', emissiveIntensity: 1.4 })
	);
	blueLight.position.set(0.3, 1.28, 0.12);

	car.userData.sirenMaterials = [redLight.material, blueLight.material];
	car.add(redLight, blueLight);
	return car;
}

export function buildTrafficVehicle(options = {}) {
	const palette = chooseRandom(TRAFFIC_PALETTES);
	const forceBus = options.blocker || options.vehicleType === 'bus';
	const vehicleType = forceBus || Math.random() < TRAFFIC_BUS_CHANCE ? 'bus' : 'car';

	const vehicle =
		vehicleType === 'bus'
			? createProceduralBus(palette.body, palette.accent)
			: createProceduralCar(palette.body, palette.accent);

	vehicle.userData.vehicleType = vehicleType;
	return vehicle;
}
