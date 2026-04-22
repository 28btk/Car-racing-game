import * as THREE from '../vendor/three/three.module.js?v=20260422-pages2';

export const PLAYER_MODEL_URL =
	'https://res.cloudinary.com/dca7qiz5w/image/upload/v1776762222/generic_supercar_cheetah_olkzjf.glb';
export const PLAYER_MODEL_TARGET_SIZE = 3.65;
export const ASSET_LOAD_TIMEOUT_MS = 4500;

export const ROAD_WIDTH = 18;
export const ROAD_LENGTH = 64;
export const ROAD_SEGMENTS = 9;
export const PLAYER_Z = 6;
export const LANE_POSITIONS = [-6, -2, 2, 6];
export const PLAYER_START_LANE = 2;
export const OPPOSITE_DIRECTION_LANE_END = 1;

export const DAY_SKY = new THREE.Color('#7ccfff');
export const NIGHT_SKY = new THREE.Color('#09121f');
export const DAY_FOG = new THREE.Color('#9bd6ff');
export const NIGHT_FOG = new THREE.Color('#05090f');
export const DAY_GROUND = new THREE.Color('#43474f');
export const NIGHT_GROUND = new THREE.Color('#15191f');
export const ROAD_COLOR = new THREE.Color('#0f1115');
export const ROAD_NIGHT = new THREE.Color('#05070a');
export const LANE_MARK_DAY = new THREE.Color('#f8fbff');
export const LANE_MARK_NIGHT = new THREE.Color('#ffe6ba');

export const BUILDING_BLOCK_SIZE = 2.8;
export const BUILDING_BLOCK_HEIGHT = 2.9;
export const BUILDING_MIN_HEIGHT_BLOCKS = 3;
export const BUILDING_MAX_HEIGHT_BLOCKS = 5;
export const BUILDING_STRIP_GAP = 0.08;
export const BUILDING_EDGE_GAP = 1.35;
export const BUILDING_PALETTE = [
	{ body: '#b6aa98', trim: '#847866', roof: '#ddd4c7' },
	{ body: '#9ea7b1', trim: '#707a86', roof: '#d7dde5' },
	{ body: '#c9b28a', trim: '#8f7458', roof: '#efe0c2' },
	{ body: '#b0b6a1', trim: '#727963', roof: '#dbe0cf' },
	{ body: '#af9aa5', trim: '#7d6872', roof: '#e0d2da' },
];

export const STREET_LIGHT_COLOR = new THREE.Color('#ffd58a');
export const STREET_LIGHT_NIGHT = new THREE.Color('#ffcf7a');

export const ACTOR_HITBOX = { x: 0.38, z: 0.44 };
export const PLAYER_HITBOX = { x: 0.26, z: 0.34 };
export const MAX_BLOCKED_LANES = 3;
export const TRAFFIC_BUS_CHANCE = 0.3;
export const TRAFFIC_PALETTES = [
	{ body: '#ffd166', accent: '#dce8ff' },
	{ body: '#7ee7b3', accent: '#d7f0ff' },
	{ body: '#ff8679', accent: '#f8f5ff' },
	{ body: '#72b7ff', accent: '#d7edf8' },
	{ body: '#f2a65a', accent: '#f7eadb' },
	{ body: '#d86c8c', accent: '#f5dfe7' },
];

export const INITIAL_SPEED = 16.2;
