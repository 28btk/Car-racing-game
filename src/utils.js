import { OPPOSITE_DIRECTION_LANE_END } from './config.js?v=20260422-pages2';

export function clamp(value, min, max) {
	return Math.min(max, Math.max(min, value));
}

export function randomBetween(min, max) {
	return min + Math.random() * (max - min);
}

export function chooseRandom(list) {
	return list[Math.floor(Math.random() * list.length)];
}

export function isOppositeDirectionLane(laneIndex) {
	return laneIndex <= OPPOSITE_DIRECTION_LANE_END;
}

export function getContiguousLaneGroups(lanes, groupSize) {
	const sorted = [...lanes].sort((left, right) => left - right);
	const groups = [];

	for (let index = 0; index <= sorted.length - groupSize; index += 1) {
		const group = sorted.slice(index, index + groupSize);
		const contiguous = group.every((lane, laneIndex) => laneIndex === 0 || lane - group[laneIndex - 1] === 1);
		if (contiguous) {
			groups.push(group);
		}
	}

	return groups;
}
