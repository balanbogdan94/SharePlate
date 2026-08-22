import { afterEach, describe, expect, it, vi } from 'vitest';

type FakeOscillator = { start: () => void; stop: () => void };

function installFakeAudio(state: 'running' | 'suspended' = 'running') {
	const oscillators: FakeOscillator[] = [];
	const resume = vi.fn();
	class FakeContext {
		state = state;
		currentTime = 0;
		destination = {};
		resume = resume;
		createOscillator() {
			const osc = {
				type: 'sine' as OscillatorType,
				frequency: { setValueAtTime: vi.fn() },
				connect: vi.fn((node: unknown) => node),
				start: vi.fn(),
				stop: vi.fn(),
			};
			oscillators.push(osc);
			return osc;
		}
		createGain() {
			return {
				gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
				connect: vi.fn(),
			};
		}
	}
	vi.stubGlobal('AudioContext', FakeContext);
	return { oscillators, resume };
}

describe('sound feedback', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.resetModules();
	});

	it('schedules two oscillators for a success tone', async () => {
		const { oscillators } = installFakeAudio();
		const { playTone } = await import('@/lib/feedback/sound');
		playTone('success', true);
		expect(oscillators).toHaveLength(2);
	});

	it('does not play when sound is disabled', async () => {
		const { oscillators } = installFakeAudio();
		const { playTone } = await import('@/lib/feedback/sound');
		playTone('success', false);
		expect(oscillators).toHaveLength(0);
	});

	it('resumes a suspended context on unlock', async () => {
		const { resume } = installFakeAudio('suspended');
		const { unlockAudio } = await import('@/lib/feedback/sound');
		unlockAudio();
		expect(resume).toHaveBeenCalled();
	});

	it('does not throw when AudioContext is unavailable', async () => {
		vi.stubGlobal('AudioContext', undefined);
		const { playTone } = await import('@/lib/feedback/sound');
		expect(() => playTone('success', true)).not.toThrow();
	});
});
