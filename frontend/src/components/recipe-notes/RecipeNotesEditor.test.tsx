import { useState } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { type NotesDocument } from '@/lib/recipeNotes';
import { MeasurementProviders } from '@/test/MeasurementProviders';
import { RecipeNotesEditor } from './RecipeNotesEditor';

function Harness({
	initial = '',
	saved = vi.fn(),
}: {
	initial?: string;
	saved?: (document: NotesDocument, text: string) => void;
}) {
	const [value, setValue] = useState<{ notes: string; document?: NotesDocument }>({
		notes: initial,
	});
	return (
		<RecipeNotesEditor
			{...value}
			onError={vi.fn()}
			onChange={(document, notes) => {
				setValue({ document, notes });
				saved(document, notes);
			}}
		/>
	);
}

describe('mobile notes editor controls', () => {
	it('initializes a structured document without changing legacy paragraphs or URLs', async () => {
		const saved = vi.fn();
		render(<Harness initial={'First\n\nhttps://example.com'} saved={saved} />, {
			wrapper: MeasurementProviders,
		});
		await waitFor(() => expect(saved).toHaveBeenCalled());
		expect(saved.mock.lastCall?.[1]).toBe('First\n\nhttps://example.com');
		expect(screen.getByRole('textbox', { name: "Chef's Notes" })).toHaveAttribute(
			'aria-multiline',
			'true',
		);
		expect(screen.getAllByRole('button')).toHaveLength(4);
		expect(screen.queryByRole('button', { name: /link/i })).not.toBeInTheDocument();
	});

	it('toggles lists and exposes touch controls without requiring a text selection or keyboard shortcut', async () => {
		render(<Harness />, { wrapper: MeasurementProviders });
		const user = userEvent.setup();
		const textbox = screen.getByRole('textbox');
		await user.click(screen.getByRole('button', { name: 'Bulleted list' }));
		expect(within(textbox).getByRole('list')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Bulleted list' })).toHaveAttribute(
			'aria-pressed',
			'true',
		);
		expect(screen.getByRole('button', { name: 'Indent list item' })).toBeDisabled();
		expect(screen.getByRole('button', { name: 'Outdent list item' })).toBeEnabled();
		await user.click(screen.getByRole('button', { name: 'Outdent list item' }));
		expect(within(textbox).queryByRole('list')).not.toBeInTheDocument();
	});
});
