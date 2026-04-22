const refs = {
	root: document.getElementById('scene-root'),
	scoreValue: document.getElementById('score-value'),
	livesValue: document.getElementById('lives-value'),
	speedValue: document.getElementById('speed-value'),
	settingsButton: document.getElementById('settings-button'),
	settingsPanel: document.getElementById('settings-panel'),
	cycleToggle: document.getElementById('cycle-toggle'),
	densityRange: document.getElementById('density-range'),
	resumeButton: document.getElementById('resume-button'),
	restartButton: document.getElementById('restart-button'),
	overlay: document.getElementById('status-overlay'),
	overlayEyebrow: document.getElementById('overlay-eyebrow'),
	overlayTitle: document.getElementById('overlay-title'),
	overlayMessage: document.getElementById('overlay-message'),
	overlayActions: document.getElementById('overlay-actions'),
	toast: document.getElementById('toast'),
};

let toastTimer = 0;

export function getUIRefs() {
	return refs;
}

export function showToast(message) {
	refs.toast.textContent = message;
	refs.toast.classList.add('is-visible');
	toastTimer = 2.4;
}

export function tickToast(delta) {
	if (toastTimer <= 0) {
		return;
	}

	toastTimer -= delta;
	if (toastTimer <= 0) {
		refs.toast.classList.remove('is-visible');
	}
}

export function clearToast() {
	toastTimer = 0;
	refs.toast.classList.remove('is-visible');
}

export function updateHud(game) {
	refs.scoreValue.textContent = Math.floor(game.score).toLocaleString();
	refs.livesValue.textContent = String(game.lives);
	refs.speedValue.textContent = String(Math.round(110 + game.speed * 8)).padStart(3, '0');
}

export function updateLoadingMessage(label, detail) {
	refs.overlayEyebrow.textContent = label;
	refs.overlayMessage.textContent = detail;
}

export function setSettingsPanelOpen(isOpen) {
	refs.settingsPanel.classList.toggle('is-open', isOpen);
	refs.settingsPanel.setAttribute('aria-hidden', String(!isOpen));
	refs.settingsButton.setAttribute('aria-expanded', String(isOpen));
}

export function setOverlayState(mode, options = {}) {
	refs.overlay.classList.toggle('is-visible', mode !== 'hidden');
	refs.overlayActions.innerHTML = '';

	if (mode === 'loading') {
		refs.overlayEyebrow.textContent = 'by author: 28_btk';
		refs.overlayTitle.textContent = 'Car racing game';
		refs.overlayMessage.textContent =
			'Rules: Use A and D to change lanes. Avoid every vehicle on the road. You lose after 3 crashes. Press Esc to pause.';
		return;
	}

	if (mode === 'paused') {
		refs.overlayEyebrow.textContent = 'Game paused';
		refs.overlayTitle.textContent = 'Catch your breath';
		refs.overlayMessage.textContent = 'Press Esc or Resume to drop back into the chase.';

		const resume = document.createElement('button');
		resume.className = 'panel-button';
		resume.type = 'button';
		resume.textContent = 'Resume';
		resume.addEventListener('click', options.onResume);

		const restart = document.createElement('button');
		restart.className = 'panel-button panel-button--ghost';
		restart.type = 'button';
		restart.textContent = 'Restart';
		restart.addEventListener('click', options.onRestart);

		refs.overlayActions.append(resume, restart);
		return;
	}

	if (mode === 'gameover') {
		refs.overlayEyebrow.textContent = 'Police lockdown';
		refs.overlayTitle.textContent = "YOU'RE BUSTED !!";
		refs.overlayMessage.textContent = `Final score: ${Math.floor(options.finalScore || 0).toLocaleString()}. Three crashes were one too many.`;

		const restart = document.createElement('button');
		restart.className = 'panel-button';
		restart.type = 'button';
		restart.textContent = 'Run It Back';
		restart.addEventListener('click', options.onRestart);
		refs.overlayActions.append(restart);
	}
}
