import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { notesFromPlainText, type NotesDocument } from '@/lib/recipeNotes';
import { MeasurementProviders } from '@/test/MeasurementProviders';
import { RecipeNotesContent } from './RecipeNotesContent';

describe('recipe notes reading', () => {
	it('preserves legacy whitespace and renders HTML/Markdown literally', () => {
		render(<RecipeNotesContent notes={'  First\n\n<b>literal</b>  '} />, {
			wrapper: MeasurementProviders,
		});
		expect(screen.getByText(/First/).textContent).toBe('First\n\n<b>literal</b>');
		expect(document.querySelector('b')).toBeNull();
		expect(screen.getByText(/First/)).toHaveClass('notes-plain');
	});
	it('renders valid links safely in a new tab', () => {
		render(<RecipeNotesContent notes="" document={notesFromPlainText('https://example.com')} />, {
			wrapper: MeasurementProviders,
		});
		expect(screen.getByRole('link')).toHaveAttribute('target', '_blank');
		expect(screen.getByRole('link')).toHaveAttribute('rel', 'noopener noreferrer');
		expect(screen.getByRole('link')).toHaveTextContent('https://example.com');
	});
	it('shows an explicit error rather than interpreting an unsupported document', () => {
		const invalid = { version: 2, content: { type: 'doc', content: [] } };
		render(<RecipeNotesContent notes="Old text" document={invalid as NotesDocument} />, {
			wrapper: MeasurementProviders,
		});
		expect(screen.getByRole('alert')).toHaveTextContent('could not be opened');
	});
});
