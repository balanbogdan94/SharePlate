export type CategoryType = 'Unnamed' | 'Morning' | 'Breakfast' | 'Lunch' | 'Dinner';

export const CATEGORY_TYPES: CategoryType[] = [
	'Unnamed',
	'Morning',
	'Breakfast',
	'Lunch',
	'Dinner',
];

export type PlanListItem = {
	id: string;
	startDate: string;
	endDate: string;
	createdAt: string;
	updatedAt: string;
};

export type PlanDay = {
	date: string;
	categories: Record<CategoryType, string[]>;
};

export type PlanDetails = PlanListItem & {
	days: PlanDay[];
};

export type PlanPayload = {
	startDate: string;
	endDate: string;
	days: PlanDay[];
};
