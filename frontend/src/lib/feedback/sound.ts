export type ToneKind = 'success' | 'error';

type ToneStep = { frequency: number; start: number; duration: number };

const WAVEFORMS: Record<ToneKind, OscillatorType> = {
	success: 'sine',
	error: 'square',
};

const TONE_STEPS: Record<ToneKind, ToneStep[]> = {
	success: [
		{ frequency: 659.25, start: 0, duration: 0.12 },
		{ frequency: 987.77, start: 0.1, duration: 0.16 },
	],
	error: [
		{ frequency: 311.13, start: 0, duration: 0.16 },
		{ frequency: 233.08, start: 0.14, duration: 0.22 },
	],
};

let audioContext: AudioContext | null = null;

function getContext(): AudioContext | null {
	if (typeof window === 'undefined' || typeof window.AudioContext === 'undefined') {
		return null;
	}
	if (!audioContext) {
		audioContext = new AudioContext();
	}
	return audioContext;
}

export function unlockAudio(): void {
	const ctx = getContext();
	if (ctx && ctx.state === 'suspended') {
		void ctx.resume();
	}
}

function scheduleStep(ctx: AudioContext, kind: ToneKind, step: ToneStep, startAt: number): void {
	const oscillator = ctx.createOscillator();
	const gain = ctx.createGain();
	const begin = startAt + step.start;
	const end = begin + step.duration;
	oscillator.type = WAVEFORMS[kind];
	oscillator.frequency.setValueAtTime(step.frequency, begin);
	gain.gain.setValueAtTime(0.0001, begin);
	gain.gain.exponentialRampToValueAtTime(0.18, begin + 0.02);
	gain.gain.exponentialRampToValueAtTime(0.0001, end);
	oscillator.connect(gain).connect(ctx.destination);
	oscillator.start(begin);
	oscillator.stop(end + 0.02);
}

export function playTone(kind: ToneKind, enabled: boolean): void {
	if (!enabled) {
		return;
	}
	const ctx = getContext();
	if (!ctx) {
		return;
	}
	if (ctx.state === 'suspended') {
		void ctx.resume();
	}
	const startAt = ctx.currentTime;
	for (const step of TONE_STEPS[kind]) {
		scheduleStep(ctx, kind, step, startAt);
	}
}
