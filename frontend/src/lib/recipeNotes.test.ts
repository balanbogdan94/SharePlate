import { describe, expect, it } from 'vitest';
import {
	findNotesUrls,
	isNotesUrl,
	listDepth,
	notesFromPlainText,
	notesToPlainText,
	parseNotesDocument,
} from './recipeNotes';

describe('recipe notes document', () => {
	it.each([
		'',
		'one\nline',
		'one\n\nparagraph',
		'\nleading\n\n\ntrailing\n',
		'<b>literal</b> *text*',
	])('imports plain text without changing whitespace or interpreting markup: %j', (text) => {
		expect(notesToPlainText(notesFromPlainText(text))).toBe(text);
	});

	it('exports mixed nested lists, paragraph breaks, hard breaks and URLs as readable text', () => {
		const document = parseNotesDocument({
			version: 1,
			content: {
				type: 'doc',
				content: [
					{ type: 'paragraph', content: [{ type: 'text', text: 'Method' }] },
					{
						type: 'orderedList',
						attrs: { start: 2 },
						content: [
							{
								type: 'listItem',
								content: [
									{ type: 'paragraph', content: [{ type: 'text', text: 'Mix' }] },
									{
										type: 'bulletList',
										content: [
											{
												type: 'listItem',
												content: [
													{
														type: 'paragraph',
														content: [
															{ type: 'text', text: 'Gently' },
															{ type: 'hardBreak' },
															{ type: 'text', text: 'For 2 minutes' },
														],
													},
												],
											},
										],
									},
								],
							},
							{
								type: 'listItem',
								content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Bake' }] }],
							},
						],
					},
					notesFromPlainText('https://example.com/recipe').content.content[0],
				],
			},
		});
		expect(listDepth(document.content.content)).toBe(2);
		expect(notesToPlainText(document)).toBe(
			'Method\n\n2. Mix\n  - Gently\n    For 2 minutes\n3. Bake\n\nhttps://example.com/recipe',
		);
	});

	it.each([
		'javascript:alert(1)',
		'ftp://example.com',
		'example.com',
		'//example.com',
		'https://',
		'https://user:pass@example.com',
		'https://exam ple.com',
	])('does not link invalid or unsupported URL %j', (url) => {
		expect(isNotesUrl(url)).toBe(false);
	});

	it('recognizes explicit URLs without trailing punctuation and keeps balanced parentheses', () => {
		expect(
			findNotesUrls('See (https://example.com/a). https://example.com/a_(b)!').map(
				(match) => match.href,
			),
		).toEqual(['https://example.com/a', 'https://example.com/a_(b)']);
	});

	it('rejects unknown document versions and unsupported nodes', () => {
		expect(() =>
			parseNotesDocument({ version: 2, content: { type: 'doc', content: [] } }),
		).toThrow();
		expect(() =>
			parseNotesDocument({
				version: 1,
				content: {
					type: 'doc',
					content: [{ type: 'image', attrs: { src: 'https://example.com' } }],
				},
			}),
		).toThrow();
	});
	it('exports additional item paragraphs with the same blank lines as the backend', () => {
		const paragraph = (text: string) => ({ type: 'paragraph', content: [{ type: 'text', text }] });
		const document = parseNotesDocument({
			version: 1,
			content: {
				type: 'doc',
				content: [
					{
						type: 'bulletList',
						content: [
							{
								type: 'listItem',
								content: [
									paragraph('A'),
									paragraph('B'),
									{
										type: 'bulletList',
										content: [{ type: 'listItem', content: [paragraph('C')] }],
									},
									paragraph('D'),
								],
							},
						],
					},
				],
			},
		});
		expect(notesToPlainText(document)).toBe('- A\n\n  B\n  - C\n\n  D');
	});
});
