import type { PlanDay } from '@/pages/tabs/plan/types';
import { CATEGORY_TYPES } from '@/pages/tabs/plan/types';
import type { PlanListItem } from '@/pages/tabs/plan/types';

export function formatDateInput(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

export function addDays(value: string, days: number): string {
	const date = new Date(`${value}T00:00:00`);
	date.setDate(date.getDate() + days);
	return formatDateInput(date);
}

export function formatDisplayDate(value: string): string {
	return new Intl.DateTimeFormat(undefined, {
		month: 'short',
		day: 'numeric',
	}).format(new Date(`${value}T00:00:00`));
}

export function isPlanActiveOnDate(plan: PlanListItem, date: string): boolean {
	return plan.startDate <= date && plan.endDate >= date;
}

export function isFuturePlan(plan: PlanListItem, date: string): boolean {
	return plan.startDate > date;
}

export function countDayRecipes(day: PlanDay): number {
	return CATEGORY_TYPES.reduce((n, cat) => n + day.categories[cat].length, 0);
}

export function toErrorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim()) {
		return error.message;
	}
	return fallback;
}
