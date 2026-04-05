import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

const strictRuleLevel = process.env.STRICT_LINT === '1' ? 'error' : 'off';
const toolingCommentPattern =
	/^(eslint-(disable|enable|disable-next-line|disable-line)|@ts-(expect-error|ignore|check|nocheck))/u;

const jsxA11yRules = Object.fromEntries(
	Object.keys(jsxA11y.flatConfigs.recommended.rules).map((ruleName) => [ruleName, strictRuleLevel]),
);

const noCommentsExceptToolingRule = {
	meta: {
		type: 'problem',
		docs: {
			description: 'disallow code comments except tooling-required directives',
		},
		messages: {
			unexpectedComment:
				'Code comments are not allowed. Keep only tooling directives (eslint-disable or @ts-expect-error style directives).',
		},
		schema: [],
	},
	create(context) {
		return {
			Program() {
				const sourceCode = context.getSourceCode();
				for (const comment of sourceCode.getAllComments()) {
					const value = comment.value.trim().replace(/^\*/u, '').trim();
					if (toolingCommentPattern.test(value)) {
						continue;
					}
					context.report({
						loc: comment.loc,
						messageId: 'unexpectedComment',
					});
				}
			},
		};
	},
};

export default defineConfig([
	globalIgnores(['dist', 'coverage']),
	{
		files: ['**/*.{ts,tsx}'],
		extends: [
			js.configs.recommended,
			tseslint.configs.recommended,
			reactHooks.configs.flat.recommended,
			reactRefresh.configs.vite,
			eslintConfigPrettier,
		],
		languageOptions: {
			ecmaVersion: 2020,
			globals: globals.browser,
			parserOptions: {
				ecmaFeatures: {
					jsx: true,
				},
			},
		},
		plugins: {
			'jsx-a11y': jsxA11y,
			local: {
				rules: {
					'no-comments-except-tooling': noCommentsExceptToolingRule,
				},
			},
		},
		rules: {
			...jsxA11yRules,
			'react-refresh/only-export-components': [
				'error',
				{
					allowConstantExport: true,
					allowExportNames: ['useAuth', 'useI18n', 'useUserSettings', 'buttonVariants'],
				},
			],
			'local/no-comments-except-tooling': strictRuleLevel,
			'max-lines': [
				strictRuleLevel,
				{
					max: 200,
					skipBlankLines: true,
					skipComments: false,
				},
			],
			'max-lines-per-function': [
				strictRuleLevel,
				{
					max: 80,
					skipBlankLines: true,
					skipComments: false,
					IIFEs: true,
				},
			],
			complexity: [strictRuleLevel, { max: 10 }],
			'max-depth': [strictRuleLevel, 3],
			'max-params': [strictRuleLevel, 4],
			'max-statements': [strictRuleLevel, 25],
			'max-nested-callbacks': [strictRuleLevel, 3],
			'no-console': [strictRuleLevel, { allow: ['warn', 'error'] }],
		},
	},
]);
