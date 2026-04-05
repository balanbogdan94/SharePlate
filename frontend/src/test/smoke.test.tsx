import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Button } from '@/components/ui/button';

describe('frontend test setup', () => {
	it('renders a ui component', async () => {
		render(<Button>Save</Button>);
		const button = screen.getByRole('button', { name: 'Save' });
		const user = userEvent.setup();
		await user.click(button);
		expect(button).toBeInTheDocument();
	});
});
