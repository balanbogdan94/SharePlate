import { spawnSync } from 'node:child_process';
import path from 'node:path';

const diffTarget = process.argv[2] ?? 'HEAD';
const diffResult = spawnSync(
	'git',
	['diff', '--name-only', '--diff-filter=ACMR', `--relative=frontend`, diffTarget],
	{ encoding: 'utf8' },
);
const untrackedResult = spawnSync(
	'git',
	['ls-files', '--others', '--exclude-standard', '--full-name'],
	{ encoding: 'utf8' },
);

if (diffResult.status !== 0 || untrackedResult.status !== 0) {
	console.error('Could not determine changed files for frontend linting.');
	process.exit(diffResult.status ?? untrackedResult.status ?? 1);
}

const changedFiles = Array.from(
	new Set(
		`${diffResult.stdout}\n${untrackedResult.stdout}`
			.split('\n')
			.map((file) => file.trim())
			.map((file) => file.replace(/^frontend\//u, ''))
			.filter((file) => file.length > 0)
			.filter((file) => /^src\/.*\.(ts|tsx|js|jsx)$/u.test(file)),
	),
);

if (changedFiles.length === 0) {
	console.log('No changed frontend source files to lint.');
	process.exit(0);
}

const eslintBin = path.resolve(
	'node_modules',
	'.bin',
	process.platform === 'win32' ? 'eslint.cmd' : 'eslint',
);

const lintResult = spawnSync(eslintBin, ['--max-warnings', '0', ...changedFiles], {
	stdio: 'inherit',
	env: {
		...process.env,
		STRICT_LINT: '1',
	},
});

if (typeof lintResult.status === 'number') {
	process.exit(lintResult.status);
}

process.exit(1);
