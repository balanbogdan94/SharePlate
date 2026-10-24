import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMinimumDuration } from './useMinimumDuration';

describe('useMinimumDuration', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('turns true only after the duration has elapsed', () => {
		const { result } = renderHook(() => useMinimumDuration(600));
		expect(result.current).toBe(false);

		act(() => {
			vi.advanceTimersByTime(599);
		});
		expect(result.current).toBe(false);

		act(() => {
			vi.advanceTimersByTime(1);
		});
		expect(result.current).toBe(true);
	});

	it('is immediately true for a non-positive duration', () => {
		const { result } = renderHook(() => useMinimumDuration(0));
		expect(result.current).toBe(true);
	});
});
