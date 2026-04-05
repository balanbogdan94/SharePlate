import { spawnSync } from 'node:child_process';
import path from 'node:path';

const mode = process.argv[2] === '--write' ? '--write' : '--check';
const diffTarget = process.argv[3] ?? 'HEAD';

const diffResult = spawnSync(
	'git',
	['diff', '--name-only', '--diff-filter=ACMR', '--relative=frontend', diffTarget],
	{ encoding: 'utf8' },
);
const untrackedResult = spawnSync(
	'git',
	['ls-files', '--others', '--exclude-standard', '--full-name'],
	{ encoding: 'utf8' },
);

if (diffResult.status !== 0 || untrackedResult.status !== 0) {
	console.error('Could not determine changed files for Prettier checks.');
	process.exit(diffResult.status ?? untrackedResult.status ?? 1);
}

const changedFiles = Array.from(
	new Set(
		`${diffResult.stdout}\n${untrackedResult.stdout}`
			.split('\n')
			.map((file) => file.trim())
			.map((file) => file.replace(/^frontend\//u, ''))
			.filter((file) => file.length > 0)
			.filter((file) => !file.startsWith('dist/'))
			.filter((file) => !file.startsWith('coverage/'))
			.filter((file) => !file.startsWith('node_modules/'))
			.filter((file) => file !== 'package-lock.json'),
	),
);

if (changedFiles.length === 0) {
	console.log('No changed frontend files to format.');
	process.exit(0);
}

const prettierBin = path.resolve(
	'node_modules',
	'.bin',
	process.platform === 'win32' ? 'prettier.cmd' : 'prettier',
);

const prettierResult = spawnSync(prettierBin, [mode, '--ignore-unknown', ...changedFiles], {
	stdio: 'inherit',
});

if (typeof prettierResult.status === 'number') {
	process.exit(prettierResult.status);
}

process.exit(1);
