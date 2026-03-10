export type UnitType =
	| 'Kilogram'
	| 'Gram'
	| 'Liter'
	| 'Milliliter'
	| 'Piece'
	| 'Portion';

export type Unit = {
	id: UnitType;
	name: string;
	symbol: string;
	category: string;
};

export type RecipeSummary = {
	id: string;
	title: string;
	notes: string;
	imageUrl: string;
	authorId: string;
	authorName: string;
	createdAt: string;
	updatedAt: string;
};

export type RecipeIngredient = {
	id: string;
	ingredientId: string;
	ingredientName: string;
	quantity: number;
	unitId: UnitType;
};

export type IngredientSearchItem = {
	id: string;
	name: string;
	defaultUnitId: UnitType;
};

export type RecipeDetail = RecipeSummary & {
	ingredients: RecipeIngredient[];
};

export type CreateRecipePayload = {
	form: FormState;
	ingredients: IngredientPayload[];
	imageFile: File | null;
};

export type IngredientPayload = {
	name: string;
	quantity: number;
	unit: UnitType;
};

export type IngredientEditPayload = {
	quantity: number;
	unitId: UnitType;
};

export type FormState = {
	title: string;
	notes: string;
	imageUrl: string;
};

export type IngredientFormState = {
	ingredientName: string;
	quantity: string;
	unitId: UnitType;
};
